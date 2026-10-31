/** Entitas katalog (BSD §2: categories, products, modifier_groups, modifiers). */

export interface Category {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  iconUrl: string | null;
}

export interface Modifier {
  id: string;
  name: string;
  extraPrice: number;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelection: number;
  maxSelection: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  basePrice: number;
  isBestSeller: boolean;
  isAvailable: boolean;
}

export interface ProductWithModifiers extends Product {
  modifierGroups: ModifierGroup[];
}

export interface CatalogCategory extends Category {
  products: ProductWithModifiers[];
}

/** Relasi product_modifier_groups beserta isi group-nya. */
export interface ProductModifierGroupLink {
  productId: string;
  group: ModifierGroup;
}
