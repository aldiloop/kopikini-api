import {
  CatalogCategory,
  Category,
  ModifierGroup,
  Product,
  ProductModifierGroupLink,
  ProductWithModifiers,
} from './catalog.entities';

/** Kelompokkan link product_modifier_groups per produk. */
export function groupLinksByProduct(links: ProductModifierGroupLink[]): Map<string, ModifierGroup[]> {
  const map = new Map<string, ModifierGroup[]>();
  for (const link of links) {
    const list = map.get(link.productId) ?? [];
    list.push(link.group);
    map.set(link.productId, list);
  }
  return map;
}

export function attachModifierGroups(
  products: Product[],
  links: ProductModifierGroupLink[],
): ProductWithModifiers[] {
  const byProduct = groupLinksByProduct(links);
  return products.map((p) => ({ ...p, modifierGroups: byProduct.get(p.id) ?? [] }));
}

/**
 * Susun katalog: kategori aktif terurut `displayOrder`, masing-masing berisi produk
 * tersedia (best seller dulu, lalu nama). Produk tidak tersedia dan kategori kosong
 * tidak ditampilkan.
 */
export function buildCatalog(
  categories: Category[],
  products: Product[],
  links: ProductModifierGroupLink[],
): CatalogCategory[] {
  const withModifiers = attachModifierGroups(
    products.filter((p) => p.isAvailable),
    links,
  );
  const byCategory = new Map<string, ProductWithModifiers[]>();
  for (const p of withModifiers) {
    const list = byCategory.get(p.categoryId) ?? [];
    list.push(p);
    byCategory.set(p.categoryId, list);
  }

  return [...categories]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .map((c) => ({
      ...c,
      products: (byCategory.get(c.id) ?? []).sort(
        (a, b) => Number(b.isBestSeller) - Number(a.isBestSeller) || a.name.localeCompare(b.name),
      ),
    }))
    .filter((c) => c.products.length > 0);
}
