/**
 * Fixture katalog untuk test — subset dari database/seeds/001_seed_stores_catalog.sql
 * (UUID & harga sama dengan seed).
 */
import {
  Category,
  ModifierGroup,
  Product,
  ProductModifierGroupLink,
} from '../../src/modules/catalog/domain/catalog.entities';
import { Store } from '../../src/modules/store/domain/store.repository';

export const IDS = {
  storeSudirman: '10000000-0000-4000-8000-000000000001',
  storeThamrin: '10000000-0000-4000-8000-000000000002',
  storeBogor: '10000000-0000-4000-8000-000000000010',
  storePik: '10000000-0000-4000-8000-000000000006',
  storeInactive: '10000000-0000-4000-8000-000000000099',
  catEspresso: '20000000-0000-4000-8000-000000000001',
  catKopiSusu: '20000000-0000-4000-8000-000000000002',
  catTea: '20000000-0000-4000-8000-000000000004',
  catPastry: '20000000-0000-4000-8000-000000000005',
  grpSuhu: '30000000-0000-4000-8000-000000000001',
  grpUkuran: '30000000-0000-4000-8000-000000000002',
  grpGula: '30000000-0000-4000-8000-000000000003',
  grpEs: '30000000-0000-4000-8000-000000000004',
  grpSusu: '30000000-0000-4000-8000-000000000005',
  grpTopping: '30000000-0000-4000-8000-000000000006',
  modIce: '40000000-0000-4000-8000-000000000101',
  modHot: '40000000-0000-4000-8000-000000000102',
  modRegular: '40000000-0000-4000-8000-000000000201',
  modLarge: '40000000-0000-4000-8000-000000000202',
  modSugar100: '40000000-0000-4000-8000-000000000301',
  modSugar50: '40000000-0000-4000-8000-000000000303',
  modNormalIce: '40000000-0000-4000-8000-000000000401',
  modNoIce: '40000000-0000-4000-8000-000000000403',
  modFreshMilk: '40000000-0000-4000-8000-000000000501',
  modOatMilk: '40000000-0000-4000-8000-000000000502',
  modSoyMilk: '40000000-0000-4000-8000-000000000503',
  modShot: '40000000-0000-4000-8000-000000000601',
  modGrassJelly: '40000000-0000-4000-8000-000000000602',
  modCoffeeJelly: '40000000-0000-4000-8000-000000000603',
  prodAren: '50000000-0000-4000-8000-000000000001',
  prodLatte: '50000000-0000-4000-8000-000000000002',
  prodAmericano: '50000000-0000-4000-8000-000000000003',
  prodCroissant: '50000000-0000-4000-8000-000000000004',
  prodSoldOut: '50000000-0000-4000-8000-000000000005',
  prodPandan: '50000000-0000-4000-8000-000000000006',
  prodLemonTea: '50000000-0000-4000-8000-000000000007',
} as const;

export const categories: Category[] = [
  { id: IDS.catPastry, name: 'Pastry', slug: 'pastry', displayOrder: 5, iconUrl: null },
  { id: IDS.catEspresso, name: 'Espresso Based', slug: 'espresso-based', displayOrder: 1, iconUrl: null },
  { id: IDS.catKopiSusu, name: 'Signature Kopi Susu', slug: 'signature-kopi-susu', displayOrder: 2, iconUrl: null },
  // Kategori aktif tanpa produk — harus disembunyikan dari katalog.
  { id: IDS.catTea, name: 'Tea', slug: 'tea', displayOrder: 4, iconUrl: null },
];

const product = (p: Partial<Product> & Pick<Product, 'id' | 'categoryId' | 'name' | 'basePrice'>): Product => ({
  slug: p.name.toLowerCase().replace(/\s+/g, '-'),
  description: null,
  imageUrl: `https://cdn.kopikini.example/products/${p.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
  isBestSeller: false,
  isAvailable: true,
  ...p,
});

export const products: Product[] = [
  product({ id: IDS.prodPandan, categoryId: IDS.catKopiSusu, name: 'Kopi Susu Pandan', basePrice: 24000 }),
  product({ id: IDS.prodAren, categoryId: IDS.catKopiSusu, name: 'Kopi Susu Aren', basePrice: 22000, isBestSeller: true }),
  product({ id: IDS.prodAmericano, categoryId: IDS.catEspresso, name: 'Americano', basePrice: 22000 }),
  product({ id: IDS.prodLatte, categoryId: IDS.catEspresso, name: 'Caffe Latte', basePrice: 28000, isBestSeller: true }),
  product({ id: IDS.prodCroissant, categoryId: IDS.catPastry, name: 'Butter Croissant', basePrice: 22000 }),
  product({ id: IDS.prodSoldOut, categoryId: IDS.catPastry, name: 'Almond Croissant', basePrice: 28000, isAvailable: false }),
];

const single = (id: string, name: string, required: boolean, modifiers: ModifierGroup['modifiers']): ModifierGroup => ({
  id,
  name,
  isRequired: required,
  minSelection: required ? 1 : 0,
  maxSelection: 1,
  modifiers,
});

export const groups = {
  suhu: single(IDS.grpSuhu, 'Suhu', true, [
    { id: IDS.modIce, name: 'Ice', extraPrice: 0, isDefault: true },
    { id: IDS.modHot, name: 'Hot', extraPrice: 0, isDefault: false },
  ]),
  ukuran: single(IDS.grpUkuran, 'Ukuran', true, [
    { id: IDS.modRegular, name: 'Regular', extraPrice: 0, isDefault: true },
    { id: IDS.modLarge, name: 'Large', extraPrice: 6000, isDefault: false },
  ]),
  gula: single(IDS.grpGula, 'Level Gula', true, [
    { id: IDS.modSugar100, name: 'Normal Sugar 100%', extraPrice: 0, isDefault: true },
    { id: IDS.modSugar50, name: 'Half Sugar 50%', extraPrice: 0, isDefault: false },
  ]),
  es: single(IDS.grpEs, 'Jumlah Es', false, [
    { id: IDS.modNormalIce, name: 'Normal Ice', extraPrice: 0, isDefault: true },
    { id: IDS.modNoIce, name: 'No Ice', extraPrice: 2000, isDefault: false },
  ]),
  susu: single(IDS.grpSusu, 'Jenis Susu', true, [
    { id: IDS.modFreshMilk, name: 'Fresh Milk', extraPrice: 0, isDefault: true },
    { id: IDS.modOatMilk, name: 'Oat Milk', extraPrice: 8000, isDefault: false },
    { id: IDS.modSoyMilk, name: 'Soy Milk', extraPrice: 5000, isDefault: false },
  ]),
  topping: {
    id: IDS.grpTopping,
    name: 'Tambahan Topping',
    isRequired: false,
    minSelection: 0,
    maxSelection: 2,
    modifiers: [
      { id: IDS.modShot, name: 'Extra Espresso Shot', extraPrice: 5000, isDefault: false },
      { id: IDS.modGrassJelly, name: 'Grass Jelly', extraPrice: 4000, isDefault: false },
      { id: IDS.modCoffeeJelly, name: 'Coffee Jelly', extraPrice: 4000, isDefault: false },
    ],
  } as ModifierGroup,
};

const MILK = [groups.suhu, groups.ukuran, groups.gula, groups.es, groups.susu, groups.topping];
const BLACK = [groups.suhu, groups.ukuran, groups.gula, groups.es, groups.topping];

export const links: ProductModifierGroupLink[] = [
  ...MILK.map((group) => ({ productId: IDS.prodAren, group })),
  ...MILK.map((group) => ({ productId: IDS.prodPandan, group })),
  ...MILK.map((group) => ({ productId: IDS.prodLatte, group })),
  ...BLACK.map((group) => ({ productId: IDS.prodAmericano, group })),
];

export const stores: Store[] = [
  { id: IDS.storeSudirman, code: 'KK-SDR', name: 'KopiKini Sudirman', address: 'Jl. Jend. Sudirman, Jakarta Selatan', latitude: -6.2245, longitude: 106.809, isActive: true, openTime: '07:00:00', closeTime: '22:00:00' },
  { id: IDS.storeThamrin, code: 'KK-THM', name: 'KopiKini Thamrin', address: 'Jl. M.H. Thamrin, Jakarta Pusat', latitude: -6.1935, longitude: 106.823, isActive: true, openTime: '07:00:00', closeTime: '22:00:00' },
  { id: IDS.storePik, code: 'KK-PIK', name: 'KopiKini PIK Avenue', address: 'PIK, Jakarta Utara', latitude: -6.109, longitude: 106.74, isActive: true, openTime: '10:00:00', closeTime: '01:00:00' },
  { id: IDS.storeBogor, code: 'KK-BGR', name: 'KopiKini Pajajaran Bogor', address: 'Jl. Raya Pajajaran, Bogor', latitude: -6.595, longitude: 106.806, isActive: true, openTime: '07:00:00', closeTime: '21:00:00' },
  { id: IDS.storeInactive, code: 'KK-OFF', name: 'KopiKini Closed Forever', address: 'Jakarta', latitude: -6.2, longitude: 106.8, isActive: false, openTime: '07:00:00', closeTime: '22:00:00' },
];
