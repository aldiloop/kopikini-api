import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../common/exceptions/app.exception';
import { StoreService, StoreView } from '../../store/application/store.service';
import { buildCatalog } from '../domain/catalog-builder';
import { CatalogCategory, Category, ProductWithModifiers } from '../domain/catalog.entities';
import { CATALOG_REPOSITORY, CatalogRepository } from '../domain/catalog.repository';
import { calculatePrice, ModifierSelectionError, PriceQuote } from '../domain/price-calculator';

export interface StoreCatalog {
  store: Pick<StoreView, 'id' | 'code' | 'name' | 'status'>;
  categories: CatalogCategory[];
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
    private readonly stores: StoreService,
  ) {}

  /**
   * Katalog aktif sebuah gerai (BSD §3 `GET /menu/catalog?store_id=`).
   * Catatan: tabel STORE_INVENTORY belum ada di DDL BSD, jadi seluruh gerai aktif
   * saat ini berbagi katalog yang sama; gerai divalidasi harus ada & aktif.
   */
  async getStoreCatalog(storeId: string): Promise<StoreCatalog> {
    const store = await this.stores.getActiveStore(storeId);
    const [categories, products] = await Promise.all([
      this.catalog.findActiveCategories(),
      this.catalog.findAvailableProducts(),
    ]);
    const links = await this.catalog.findModifierGroupsForProducts(products.map((p) => p.id));
    return {
      store: { id: store.id, code: store.code, name: store.name, status: store.status },
      categories: buildCatalog(categories, products, links),
    };
  }

  listCategories(): Promise<Category[]> {
    return this.catalog.findActiveCategories();
  }

  async getProduct(productId: string): Promise<ProductWithModifiers> {
    const product = await this.catalog.findAvailableProductById(productId);
    if (!product) {
      throw AppException.notFound('Product not found', [
        { field: 'product_id', issue: 'Product does not exist or is unavailable' },
      ]);
    }
    const links = await this.catalog.findModifierGroupsForProducts([product.id]);
    return { ...product, modifierGroups: links.map((l) => l.group) };
  }

  /** Validasi pilihan modifier dan hitung harga di sisi server (PRD FR-03). */
  async quotePrice(productId: string, modifierIds: string[], quantity = 1): Promise<PriceQuote> {
    const product = await this.getProduct(productId);
    try {
      return calculatePrice(product, modifierIds, quantity);
    } catch (err) {
      if (err instanceof ModifierSelectionError) {
        throw AppException.unprocessable('Invalid modifier selection', err.errors);
      }
      throw err;
    }
  }
}
