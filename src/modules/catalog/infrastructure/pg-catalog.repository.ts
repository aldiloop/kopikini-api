import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { toNumber } from '../../../infrastructure/database/pg-mappers';
import {
  Category,
  ModifierGroup,
  Product,
  ProductModifierGroupLink,
} from '../domain/catalog.entities';
import { CatalogRepository } from '../domain/catalog.repository';

interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string;
  base_price: string;
  is_best_seller: boolean;
  is_available: boolean;
}

interface GroupModifierRow {
  product_id: string;
  group_id: string;
  group_name: string;
  is_required: boolean;
  min_selection: number;
  max_selection: number;
  modifier_id: string | null;
  modifier_name: string | null;
  extra_price: string | null;
  is_default: boolean | null;
}

const PRODUCT_COLUMNS = `p.id, p.category_id, p.name, p.slug, p.description, p.image_url,
  p.base_price, p.is_best_seller, p.is_available`;

const mapProduct = (r: ProductRow): Product => ({
  id: r.id,
  categoryId: r.category_id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  imageUrl: r.image_url,
  basePrice: toNumber(r.base_price),
  isBestSeller: r.is_best_seller,
  isAvailable: r.is_available,
});

@Injectable()
export class PgCatalogRepository implements CatalogRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findActiveCategories(): Promise<Category[]> {
    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      slug: string;
      display_order: number;
      icon_url: string | null;
    }>(
      `SELECT id, name, slug, display_order, icon_url
         FROM categories WHERE is_active = TRUE
        ORDER BY display_order ASC, name ASC`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      displayOrder: r.display_order ?? 0,
      iconUrl: r.icon_url,
    }));
  }

  async findAvailableProducts(): Promise<Product[]> {
    const { rows } = await this.pool.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.is_available = TRUE AND c.is_active = TRUE
        ORDER BY p.is_best_seller DESC, p.name ASC`,
    );
    return rows.map(mapProduct);
  }

  async findAvailableProductById(id: string): Promise<Product | null> {
    const { rows } = await this.pool.query<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1 AND p.is_available = TRUE AND c.is_active = TRUE`,
      [id],
    );
    return rows[0] ? mapProduct(rows[0]) : null;
  }

  async findModifierGroupsForProducts(productIds: string[]): Promise<ProductModifierGroupLink[]> {
    if (productIds.length === 0) return [];
    // BSD belum punya kolom urutan tampilan untuk group/modifier; urutan memakai
    // id (seed memakai UUID berurutan) dengan modifier default di depan.
    const { rows } = await this.pool.query<GroupModifierRow>(
      `SELECT pmg.product_id,
              mg.id AS group_id, mg.name AS group_name, mg.is_required,
              mg.min_selection, mg.max_selection,
              m.id AS modifier_id, m.name AS modifier_name, m.extra_price, m.is_default
         FROM product_modifier_groups pmg
         JOIN modifier_groups mg ON mg.id = pmg.modifier_group_id
         LEFT JOIN modifiers m ON m.modifier_group_id = mg.id
        WHERE pmg.product_id = ANY($1::uuid[])
        ORDER BY pmg.product_id, mg.id, m.is_default DESC, m.extra_price ASC, m.id ASC`,
      [productIds],
    );

    const links = new Map<string, ProductModifierGroupLink>();
    for (const r of rows) {
      const key = `${r.product_id}:${r.group_id}`;
      let link = links.get(key);
      if (!link) {
        const group: ModifierGroup = {
          id: r.group_id,
          name: r.group_name,
          isRequired: r.is_required ?? false,
          minSelection: r.min_selection ?? 0,
          maxSelection: r.max_selection ?? 1,
          modifiers: [],
        };
        link = { productId: r.product_id, group };
        links.set(key, link);
      }
      if (r.modifier_id) {
        link.group.modifiers.push({
          id: r.modifier_id,
          name: r.modifier_name ?? '',
          extraPrice: toNumber(r.extra_price),
          isDefault: r.is_default ?? false,
        });
      }
    }
    return [...links.values()];
  }
}
