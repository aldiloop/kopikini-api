import {
  CatalogCategory,
  Category,
  ModifierGroup,
  ProductWithModifiers,
} from '../domain/catalog.entities';
import { PriceQuote } from '../domain/price-calculator';

/**
 * Mapper entitas domain (camelCase) -> kontrak JSON API (snake_case, selaras
 * dengan nama kolom BSD dan body request seperti `store_id`, `phone_number`).
 */
export const presentModifierGroup = (g: ModifierGroup) => ({
  id: g.id,
  name: g.name,
  is_required: g.isRequired,
  min_selection: g.minSelection,
  max_selection: g.maxSelection,
  modifiers: g.modifiers.map((m) => ({
    id: m.id,
    name: m.name,
    extra_price: m.extraPrice,
    is_default: m.isDefault,
  })),
});

export const presentProduct = (p: ProductWithModifiers) => ({
  id: p.id,
  category_id: p.categoryId,
  name: p.name,
  slug: p.slug,
  description: p.description,
  image_url: p.imageUrl,
  base_price: p.basePrice,
  is_best_seller: p.isBestSeller,
  is_available: p.isAvailable,
  modifier_groups: p.modifierGroups.map(presentModifierGroup),
});

export const presentCategory = (c: Category) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  display_order: c.displayOrder,
  icon_url: c.iconUrl,
});

export const presentCatalogCategory = (c: CatalogCategory) => ({
  ...presentCategory(c),
  products: c.products.map(presentProduct),
});

export const presentPriceQuote = (q: PriceQuote) => ({
  product_id: q.productId,
  base_price: q.basePrice,
  modifiers_total: q.modifiersTotal,
  unit_price: q.unitPrice,
  quantity: q.quantity,
  total_price: q.totalPrice,
  selected_modifiers: q.selectedModifiers.map((m) => ({
    group_id: m.groupId,
    group_name: m.groupName,
    modifier_id: m.modifierId,
    name: m.name,
    extra_price: m.extraPrice,
  })),
});
