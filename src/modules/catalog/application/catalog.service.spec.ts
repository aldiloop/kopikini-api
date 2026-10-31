import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import * as fx from '../../../../test/fixtures/catalog.fixtures';
import { InMemoryCatalogRepository } from '../../../../test/fakes/in-memory.repositories';
import { StoreService } from '../../store/application/store.service';
import { CatalogService } from './catalog.service';

const { IDS } = fx;

describe('CatalogService', () => {
  let repo: InMemoryCatalogRepository;
  let stores: { getActiveStore: jest.Mock };
  let service: CatalogService;

  beforeEach(() => {
    repo = new InMemoryCatalogRepository();
    stores = {
      getActiveStore: jest.fn(async (id: string) => {
        if (id !== IDS.storeSudirman) throw AppException.notFound('Store not found');
        return { id, code: 'KK-SDR', name: 'KopiKini Sudirman', status: 'OPEN' };
      }),
    };
    service = new CatalogService(repo, stores as unknown as StoreService);
  });

  describe('getStoreCatalog', () => {
    it('mengembalikan info gerai + kategori berisi produk dan modifier', async () => {
      const result = await service.getStoreCatalog(IDS.storeSudirman);
      expect(result.store).toEqual({
        id: IDS.storeSudirman,
        code: 'KK-SDR',
        name: 'KopiKini Sudirman',
        status: 'OPEN',
      });
      expect(result.categories.map((c) => c.slug)).toEqual([
        'espresso-based',
        'signature-kopi-susu',
        'pastry',
      ]);
      const latte = result.categories[0].products[0];
      expect(latte.id).toBe(IDS.prodLatte);
      expect(latte.modifierGroups).toHaveLength(6);
    });

    it('mengambil modifier group hanya untuk produk yang tersedia (satu query batch)', async () => {
      const spy = jest.spyOn(repo, 'findModifierGroupsForProducts');
      await service.getStoreCatalog(IDS.storeSudirman);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).not.toContain(IDS.prodSoldOut);
      expect(spy.mock.calls[0][0]).toHaveLength(5);
    });

    it('meneruskan 404 bila gerai tidak ada / tidak aktif, tanpa query katalog', async () => {
      const spy = jest.spyOn(repo, 'findAvailableProducts');
      await expect(service.getStoreCatalog(IDS.storeInactive)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('listCategories', () => {
    it('mengembalikan kategori aktif terurut', async () => {
      const cats = await service.listCategories();
      expect(cats.map((c) => c.displayOrder)).toEqual([1, 2, 4, 5]);
    });
  });

  describe('getProduct', () => {
    it('mengembalikan produk beserta modifier groups', async () => {
      const p = await service.getProduct(IDS.prodAmericano);
      expect(p.name).toBe('Americano');
      expect(p.modifierGroups.map((g) => g.name)).toEqual([
        'Suhu',
        'Ukuran',
        'Level Gula',
        'Jumlah Es',
        'Tambahan Topping',
      ]);
    });

    it('404 untuk produk tidak tersedia', async () => {
      await expect(service.getProduct(IDS.prodSoldOut)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('404 untuk produk yang tidak ada', async () => {
      await expect(service.getProduct('00000000-0000-4000-8000-000000000000')).rejects.toBeInstanceOf(
        AppException,
      );
    });
  });

  describe('quotePrice', () => {
    it('menghitung harga dengan modifier', async () => {
      const q = await service.quotePrice(IDS.prodLatte, [IDS.modLarge, IDS.modOatMilk], 2);
      expect(q.unitPrice).toBe(28000 + 6000 + 8000);
      expect(q.totalPrice).toBe(84000);
    });

    it('memetakan pilihan modifier tidak valid ke 422 dengan errors per-field', async () => {
      const err = await service
        .quotePrice(IDS.prodLatte, [IDS.modIce, IDS.modHot])
        .catch((e: AppException) => e);
      expect(err).toBeInstanceOf(AppException);
      const res = (err as AppException).getResponse() as { errors: { field: string }[] };
      expect((err as AppException).getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(res.errors[0].field).toBe('modifier_ids');
    });
  });
});
