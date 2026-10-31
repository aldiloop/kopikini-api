import * as fx from '../../../../test/fixtures/catalog.fixtures';
import { buildCatalog } from './catalog-builder';
import { ProductWithModifiers } from './catalog.entities';
import { calculatePrice, ModifierSelectionError } from './price-calculator';

const { IDS } = fx;
const allProducts = buildCatalog(fx.categories, fx.products, fx.links).flatMap((c) => c.products);
const byId = (id: string) => allProducts.find((p) => p.id === id)!;

const aren = byId(IDS.prodAren); // base 22.000, grup MILK
const croissant = byId(IDS.prodCroissant); // base 22.000, tanpa modifier

function expectSelectionError(fn: () => unknown, issueMatch: RegExp) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ModifierSelectionError);
    expect((e as ModifierSelectionError).errors.map((x) => x.issue).join(' | ')).toMatch(issueMatch);
    return;
  }
  throw new Error('expected ModifierSelectionError');
}

describe('calculatePrice', () => {
  it('tanpa pilihan: memakai modifier default dan harga dasar', () => {
    const q = calculatePrice(aren, []);
    expect(q.unitPrice).toBe(22000);
    expect(q.modifiersTotal).toBe(0);
    expect(q.selectedModifiers.map((m) => m.name)).toEqual([
      'Ice',
      'Regular',
      'Normal Sugar 100%',
      'Normal Ice',
      'Fresh Milk',
    ]);
  });

  it('contoh AFD §3.2: Large + Oat Milk = 22.000 + 6.000 + 8.000', () => {
    const q = calculatePrice(aren, [IDS.modLarge, IDS.modOatMilk]);
    expect(q.unitPrice).toBe(36000);
    expect(q.modifiersTotal).toBe(14000);
  });

  it('pilihan eksplisit menggantikan default di group yang sama', () => {
    const q = calculatePrice(aren, [IDS.modSoyMilk]);
    const susu = q.selectedModifiers.filter((m) => m.groupId === IDS.grpSusu);
    expect(susu.map((m) => m.name)).toEqual(['Soy Milk']);
    expect(q.unitPrice).toBe(27000);
  });

  it('multi-select topping dijumlahkan', () => {
    const q = calculatePrice(aren, [IDS.modShot, IDS.modGrassJelly]);
    expect(q.unitPrice).toBe(22000 + 5000 + 4000);
  });

  it('total = harga satuan × quantity', () => {
    const q = calculatePrice(aren, [IDS.modNoIce], 3);
    expect(q.unitPrice).toBe(24000);
    expect(q.quantity).toBe(3);
    expect(q.totalPrice).toBe(72000);
  });

  it('produk tanpa modifier', () => {
    const q = calculatePrice(croissant, [], 2);
    expect(q).toMatchObject({ unitPrice: 22000, totalPrice: 44000, selectedModifiers: [] });
  });

  it('tolak melebihi max_selection (FR-03: batas maksimal modifier)', () => {
    expectSelectionError(
      () => calculatePrice(aren, [IDS.modShot, IDS.modGrassJelly, IDS.modCoffeeJelly]),
      /Tambahan Topping" allows at most 2/,
    );
  });

  it('tolak dua pilihan pada group single-choice', () => {
    expectSelectionError(() => calculatePrice(aren, [IDS.modIce, IDS.modHot]), /Suhu" allows at most 1/);
  });

  it('tolak modifier yang bukan milik produk (Oat Milk untuk Americano)', () => {
    expectSelectionError(
      () => calculatePrice(byId(IDS.prodAmericano), [IDS.modOatMilk]),
      /not available for this product/,
    );
  });

  it('tolak modifier duplikat', () => {
    expectSelectionError(() => calculatePrice(aren, [IDS.modShot, IDS.modShot]), /more than once/);
  });

  it('tolak group wajib tanpa default dan tanpa pilihan', () => {
    const noDefault: ProductWithModifiers = {
      ...aren,
      modifierGroups: [
        { ...fx.groups.susu, modifiers: fx.groups.susu.modifiers.map((m) => ({ ...m, isDefault: false })) },
      ],
    };
    expectSelectionError(() => calculatePrice(noDefault, []), /Jenis Susu" requires at least 1/);
  });

  it('tolak quantity tidak valid', () => {
    expectSelectionError(() => calculatePrice(aren, [], 0), /Quantity must be a positive integer/);
    expectSelectionError(() => calculatePrice(aren, [], 1.5), /Quantity must be a positive integer/);
  });

  it('aritmetika uang bebas galat floating point (harga desimal)', () => {
    const decimal: ProductWithModifiers = {
      ...croissant,
      basePrice: 0.1,
      modifierGroups: [
        {
          id: 'g',
          name: 'X',
          isRequired: false,
          minSelection: 0,
          maxSelection: 1,
          modifiers: [{ id: 'm', name: 'Y', extraPrice: 0.2, isDefault: false }],
        },
      ],
    };
    const q = calculatePrice(decimal, ['m'], 3);
    expect(q.unitPrice).toBe(0.3);
    expect(q.totalPrice).toBe(0.9);
  });
});
