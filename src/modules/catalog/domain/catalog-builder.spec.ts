import * as fx from '../../../../test/fixtures/catalog.fixtures';
import { attachModifierGroups, buildCatalog } from './catalog-builder';

const { IDS } = fx;

describe('buildCatalog', () => {
  const catalog = buildCatalog(fx.categories, fx.products, fx.links);

  it('urutkan kategori berdasarkan display_order', () => {
    expect(catalog.map((c) => c.slug)).toEqual(['espresso-based', 'signature-kopi-susu', 'pastry']);
  });

  it('sembunyikan kategori tanpa produk tersedia', () => {
    expect(catalog.find((c) => c.slug === 'tea')).toBeUndefined();
  });

  it('kecualikan produk yang tidak tersedia (is_available=false)', () => {
    const pastry = catalog.find((c) => c.id === IDS.catPastry)!;
    expect(pastry.products.map((p) => p.id)).toEqual([IDS.prodCroissant]);
  });

  it('tempatkan best seller di depan, lalu urut nama', () => {
    const espresso = catalog.find((c) => c.id === IDS.catEspresso)!;
    expect(espresso.products.map((p) => p.name)).toEqual(['Caffe Latte', 'Americano']);
    const kopiSusu = catalog.find((c) => c.id === IDS.catKopiSusu)!;
    expect(kopiSusu.products.map((p) => p.name)).toEqual(['Kopi Susu Aren', 'Kopi Susu Pandan']);
  });

  it('lampirkan modifier groups sesuai relasi product_modifier_groups', () => {
    const aren = catalog.flatMap((c) => c.products).find((p) => p.id === IDS.prodAren)!;
    expect(aren.modifierGroups.map((g) => g.name)).toEqual([
      'Suhu',
      'Ukuran',
      'Level Gula',
      'Jumlah Es',
      'Jenis Susu',
      'Tambahan Topping',
    ]);
    const americano = catalog.flatMap((c) => c.products).find((p) => p.id === IDS.prodAmericano)!;
    expect(americano.modifierGroups.map((g) => g.id)).not.toContain(IDS.grpSusu);
  });

  it('produk tanpa modifier (pastry) mendapat array kosong', () => {
    const croissant = catalog.flatMap((c) => c.products).find((p) => p.id === IDS.prodCroissant)!;
    expect(croissant.modifierGroups).toEqual([]);
  });

  it('abaikan produk yang kategorinya tidak aktif / tidak dikenal', () => {
    const orphan = { ...fx.products[0], id: 'orphan', categoryId: 'unknown-category' };
    const result = buildCatalog(fx.categories, [...fx.products, orphan], fx.links);
    expect(result.flatMap((c) => c.products).map((p) => p.id)).not.toContain('orphan');
  });

  it('katalog kosong bila tidak ada produk', () => {
    expect(buildCatalog(fx.categories, [], [])).toEqual([]);
  });

  it('tidak memutasi array input', () => {
    const cats = [...fx.categories];
    const before = cats.map((c) => c.id);
    buildCatalog(cats, fx.products, fx.links);
    expect(cats.map((c) => c.id)).toEqual(before);
  });
});

describe('attachModifierGroups', () => {
  it('memetakan group ke tiap produk tanpa mencampur produk lain', () => {
    const [latte] = attachModifierGroups(
      fx.products.filter((p) => p.id === IDS.prodLatte),
      fx.links,
    );
    expect(latte.modifierGroups).toHaveLength(6);
  });
});
