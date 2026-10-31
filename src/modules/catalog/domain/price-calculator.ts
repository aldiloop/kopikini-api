import { ApiFieldError } from '../../../common/response/api-response.types';
import { ModifierGroup, ProductWithModifiers } from './catalog.entities';

/** Pilihan modifier tidak valid (PRD FR-03: validasi batas maksimal modifier). */
export class ModifierSelectionError extends Error {
  constructor(public readonly errors: ApiFieldError[]) {
    super('Invalid modifier selection');
  }
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  modifierId: string;
  name: string;
  extraPrice: number;
}

export interface PriceQuote {
  productId: string;
  basePrice: number;
  modifiersTotal: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedModifiers: SelectedModifier[];
}

/** Aritmetika uang dalam satuan sen agar bebas galat floating point. */
const toMinor = (v: number) => Math.round(v * 100);
const fromMinor = (v: number) => v / 100;

/**
 * Hitung harga satuan produk + modifier dan validasi aturan modifier group:
 * - modifier harus milik group yang terpasang di produk, tidak boleh duplikat;
 * - jumlah pilihan per group <= max_selection;
 * - bila group tidak dipilih sama sekali, modifier `is_default` dipakai otomatis
 *   (sesuai AFD §3.2, opsi default sudah terpilih di UI);
 * - jumlah pilihan per group >= min_selection (dan >= 1 bila is_required).
 */
export function calculatePrice(
  product: ProductWithModifiers,
  selectedModifierIds: string[],
  quantity = 1,
): PriceQuote {
  const errors: ApiFieldError[] = [];

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push({ field: 'quantity', issue: 'Quantity must be a positive integer' });
  }

  const index = new Map<string, { group: ModifierGroup; modifierIdx: number }>();
  product.modifierGroups.forEach((group) =>
    group.modifiers.forEach((m, modifierIdx) => index.set(m.id, { group, modifierIdx })),
  );

  const seen = new Set<string>();
  const chosenByGroup = new Map<string, string[]>();
  for (const id of selectedModifierIds) {
    if (seen.has(id)) {
      errors.push({ field: 'modifier_ids', issue: `Modifier ${id} selected more than once` });
      continue;
    }
    seen.add(id);
    const hit = index.get(id);
    if (!hit) {
      errors.push({ field: 'modifier_ids', issue: `Modifier ${id} is not available for this product` });
      continue;
    }
    const list = chosenByGroup.get(hit.group.id) ?? [];
    list.push(id);
    chosenByGroup.set(hit.group.id, list);
  }

  const selected: SelectedModifier[] = [];
  for (const group of product.modifierGroups) {
    let chosen = chosenByGroup.get(group.id) ?? [];
    if (chosen.length === 0) {
      chosen = group.modifiers.filter((m) => m.isDefault).map((m) => m.id);
    }
    const min = Math.max(group.minSelection, group.isRequired ? 1 : 0);
    if (chosen.length > group.maxSelection) {
      errors.push({
        field: 'modifier_ids',
        issue: `"${group.name}" allows at most ${group.maxSelection} selection(s)`,
      });
    } else if (chosen.length < min) {
      errors.push({
        field: 'modifier_ids',
        issue: `"${group.name}" requires at least ${min} selection(s)`,
      });
    }
    for (const id of chosen) {
      const m = group.modifiers.find((x) => x.id === id)!;
      selected.push({
        groupId: group.id,
        groupName: group.name,
        modifierId: m.id,
        name: m.name,
        extraPrice: m.extraPrice,
      });
    }
  }

  if (errors.length > 0) throw new ModifierSelectionError(errors);

  const modifiersMinor = selected.reduce((sum, m) => sum + toMinor(m.extraPrice), 0);
  const unitMinor = toMinor(product.basePrice) + modifiersMinor;

  return {
    productId: product.id,
    basePrice: product.basePrice,
    modifiersTotal: fromMinor(modifiersMinor),
    unitPrice: fromMinor(unitMinor),
    quantity,
    totalPrice: fromMinor(unitMinor * quantity),
    selectedModifiers: selected,
  };
}
