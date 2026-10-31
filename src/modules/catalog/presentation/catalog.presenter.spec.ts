import * as fx from '../../../../test/fixtures/catalog.fixtures';
import { buildCatalog } from '../domain/catalog-builder';
import { calculatePrice } from '../domain/price-calculator';
import { presentCatalogCategory, presentPriceQuote } from './catalog.presenter';

describe('catalog.presenter', () => {
  it('memetakan katalog ke kontrak JSON snake_case', () => {
    const [espresso] = buildCatalog(fx.categories, fx.products, fx.links).map(presentCatalogCategory);
    expect(Object.keys(espresso)).toEqual(['id', 'name', 'slug', 'display_order', 'icon_url', 'products']);
    const latte = espresso.products[0];
    expect(latte).toMatchObject({
      id: fx.IDS.prodLatte,
      category_id: fx.IDS.catEspresso,
      base_price: 28000,
      is_best_seller: true,
      is_available: true,
    });
    expect(latte.modifier_groups[0]).toEqual({
      id: fx.IDS.grpSuhu,
      name: 'Suhu',
      is_required: true,
      min_selection: 1,
      max_selection: 1,
      modifiers: [
        { id: fx.IDS.modIce, name: 'Ice', extra_price: 0, is_default: true },
        { id: fx.IDS.modHot, name: 'Hot', extra_price: 0, is_default: false },
      ],
    });
  });

  it('memetakan price quote', () => {
    const product = buildCatalog(fx.categories, fx.products, fx.links)
      .flatMap((c) => c.products)
      .find((p) => p.id === fx.IDS.prodLatte)!;
    const out = presentPriceQuote(calculatePrice(product, [fx.IDS.modLarge]));
    expect(out).toMatchObject({ product_id: fx.IDS.prodLatte, unit_price: 34000, modifiers_total: 6000 });
    expect(out.selected_modifiers[1]).toEqual({
      group_id: fx.IDS.grpUkuran,
      group_name: 'Ukuran',
      modifier_id: fx.IDS.modLarge,
      name: 'Large',
      extra_price: 6000,
    });
  });
});
