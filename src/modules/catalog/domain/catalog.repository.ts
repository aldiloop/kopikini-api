import { Category, Product, ProductModifierGroupLink } from './catalog.entities';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

/** Port repository katalog — diimplementasikan oleh lapisan infrastruktur. */
export interface CatalogRepository {
  /** Kategori aktif, terurut `display_order`. */
  findActiveCategories(): Promise<Category[]>;
  /** Produk tersedia (`is_available`) di kategori aktif. */
  findAvailableProducts(): Promise<Product[]>;
  /** Produk tersedia berdasarkan id; null bila tidak ada / tidak tersedia. */
  findAvailableProductById(id: string): Promise<Product | null>;
  /** Modifier group (beserta modifier) untuk sekumpulan produk. */
  findModifierGroupsForProducts(productIds: string[]): Promise<ProductModifierGroupLink[]>;
}
