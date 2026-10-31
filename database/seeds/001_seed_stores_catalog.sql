-- =============================================================================
-- KopiKini — seeds/001_seed_stores_catalog.sql
-- Data contoh untuk pengembangan lokal (IPD Hari 3):
--   * 10 gerai dummy di Jabodetabek
--   * 5 kategori (PRD §4.1), 25 produk kopi & makanan
--   * 6 modifier group + modifier (PRD §4.1, AFD §3.2)
-- Idempoten: aman dijalankan berulang (ON CONFLICT DO NOTHING).
-- Seluruh data FIKTIF. URL gambar memakai domain cadangan .example (RFC 2606).
-- Asumsi yang tidak tertulis di dokumen ditandai "ASUMSI".
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. GERAI (UUID tetap agar mudah dipakai di koleksi HTTP / pengujian manual)
-- -----------------------------------------------------------------------------
INSERT INTO stores (id, code, name, address, latitude, longitude, is_active, open_time, close_time) VALUES
  ('10000000-0000-4000-8000-000000000001', 'KK-SDR', 'KopiKini Sudirman',       'Jl. Jend. Sudirman Kav. 52-53, SCBD, Jakarta Selatan',        -6.22450000, 106.80900000, TRUE, '07:00', '22:00'),
  ('10000000-0000-4000-8000-000000000002', 'KK-THM', 'KopiKini Thamrin',        'Jl. M.H. Thamrin No. 1, Menteng, Jakarta Pusat',              -6.19350000, 106.82300000, TRUE, '07:00', '22:00'),
  ('10000000-0000-4000-8000-000000000003', 'KK-KNG', 'KopiKini Kuningan',       'Jl. H.R. Rasuna Said Kav. C-22, Setiabudi, Jakarta Selatan',  -6.22150000, 106.83200000, TRUE, '07:00', '21:00'),
  ('10000000-0000-4000-8000-000000000004', 'KK-KMG', 'KopiKini Kemang',         'Jl. Kemang Raya No. 8, Mampang Prapatan, Jakarta Selatan',     -6.26000000, 106.81400000, TRUE, '08:00', '23:00'),
  ('10000000-0000-4000-8000-000000000005', 'KK-KLG', 'KopiKini Kelapa Gading',  'Jl. Boulevard Raya Blok M, Kelapa Gading, Jakarta Utara',     -6.15800000, 106.90500000, TRUE, '08:00', '22:00'),
  -- ASUMSI: satu gerai buka melewati tengah malam untuk menguji jam operasional lintas hari
  ('10000000-0000-4000-8000-000000000006', 'KK-PIK', 'KopiKini PIK Avenue',     'Jl. Pantai Indah Kapuk Boulevard, Penjaringan, Jakarta Utara', -6.10900000, 106.74000000, TRUE, '10:00', '01:00'),
  ('10000000-0000-4000-8000-000000000007', 'KK-BSD', 'KopiKini BSD City',       'Jl. Pahlawan Seribu, BSD City, Tangerang Selatan',            -6.30100000, 106.65300000, TRUE, '07:00', '22:00'),
  ('10000000-0000-4000-8000-000000000008', 'KK-DPK', 'KopiKini Margonda Depok', 'Jl. Margonda Raya No. 358, Beji, Depok',                      -6.37200000, 106.83200000, TRUE, '07:00', '22:00'),
  ('10000000-0000-4000-8000-000000000009', 'KK-BKS', 'KopiKini Summarecon Bekasi','Jl. Boulevard Ahmad Yani, Summarecon, Bekasi',              -6.22500000, 106.99900000, TRUE, '08:00', '22:00'),
  ('10000000-0000-4000-8000-000000000010', 'KK-BGR', 'KopiKini Pajajaran Bogor','Jl. Raya Pajajaran No. 21, Bogor Tengah, Bogor',              -6.59500000, 106.80600000, TRUE, '07:00', '21:00')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. KATEGORI (PRD §4.1)
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, slug, display_order, icon_url, is_active) VALUES
  ('20000000-0000-4000-8000-000000000001', 'Espresso Based',      'espresso-based',      1, 'https://cdn.kopikini.example/icons/espresso-based.svg',      TRUE),
  ('20000000-0000-4000-8000-000000000002', 'Signature Kopi Susu', 'signature-kopi-susu', 2, 'https://cdn.kopikini.example/icons/signature-kopi-susu.svg', TRUE),
  ('20000000-0000-4000-8000-000000000003', 'Non-Coffee',          'non-coffee',          3, 'https://cdn.kopikini.example/icons/non-coffee.svg',          TRUE),
  ('20000000-0000-4000-8000-000000000004', 'Tea',                 'tea',                 4, 'https://cdn.kopikini.example/icons/tea.svg',                 TRUE),
  ('20000000-0000-4000-8000-000000000005', 'Pastry',              'pastry',              5, 'https://cdn.kopikini.example/icons/pastry.svg',              TRUE)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. MODIFIER GROUPS (AFD §3.2)
-- -----------------------------------------------------------------------------
INSERT INTO modifier_groups (id, name, is_required, min_selection, max_selection) VALUES
  ('30000000-0000-4000-8000-000000000001', 'Suhu',             TRUE,  1, 1),
  ('30000000-0000-4000-8000-000000000002', 'Ukuran',           TRUE,  1, 1),
  ('30000000-0000-4000-8000-000000000003', 'Level Gula',       TRUE,  1, 1),
  -- ASUMSI: Jumlah Es opsional (minuman Hot tidak memerlukan pilihan es)
  ('30000000-0000-4000-8000-000000000004', 'Jumlah Es',        FALSE, 0, 1),
  ('30000000-0000-4000-8000-000000000005', 'Jenis Susu',       TRUE,  1, 1),
  ('30000000-0000-4000-8000-000000000006', 'Tambahan Topping', FALSE, 0, 3)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. MODIFIERS (harga tambahan dari AFD §3.2)
-- -----------------------------------------------------------------------------
INSERT INTO modifiers (id, modifier_group_id, name, extra_price, is_default) VALUES
  -- Suhu
  ('40000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000001', 'Ice',               0,    TRUE),
  ('40000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000001', 'Hot',               0,    FALSE),
  -- Ukuran
  ('40000000-0000-4000-8000-000000000201', '30000000-0000-4000-8000-000000000002', 'Regular',           0,    TRUE),
  ('40000000-0000-4000-8000-000000000202', '30000000-0000-4000-8000-000000000002', 'Large',             6000, FALSE),
  -- Level Gula (PRD: 0/25/50/75/100%)
  ('40000000-0000-4000-8000-000000000301', '30000000-0000-4000-8000-000000000003', 'Normal Sugar 100%', 0,    TRUE),
  ('40000000-0000-4000-8000-000000000302', '30000000-0000-4000-8000-000000000003', 'Less Sugar 75%',    0,    FALSE),
  ('40000000-0000-4000-8000-000000000303', '30000000-0000-4000-8000-000000000003', 'Half Sugar 50%',    0,    FALSE),
  ('40000000-0000-4000-8000-000000000304', '30000000-0000-4000-8000-000000000003', 'Quarter Sugar 25%', 0,    FALSE),
  ('40000000-0000-4000-8000-000000000305', '30000000-0000-4000-8000-000000000003', 'No Sugar 0%',       0,    FALSE),
  -- Jumlah Es
  ('40000000-0000-4000-8000-000000000401', '30000000-0000-4000-8000-000000000004', 'Normal Ice',        0,    TRUE),
  ('40000000-0000-4000-8000-000000000402', '30000000-0000-4000-8000-000000000004', 'Less Ice',          0,    FALSE),
  ('40000000-0000-4000-8000-000000000403', '30000000-0000-4000-8000-000000000004', 'No Ice',            2000, FALSE),
  -- Jenis Susu
  ('40000000-0000-4000-8000-000000000501', '30000000-0000-4000-8000-000000000005', 'Fresh Milk',        0,    TRUE),
  ('40000000-0000-4000-8000-000000000502', '30000000-0000-4000-8000-000000000005', 'Oat Milk',          8000, FALSE),
  ('40000000-0000-4000-8000-000000000503', '30000000-0000-4000-8000-000000000005', 'Soy Milk',          5000, FALSE),
  -- ASUMSI: harga Almond Milk tidak disebut di dokumen; disamakan dengan Oat Milk
  ('40000000-0000-4000-8000-000000000504', '30000000-0000-4000-8000-000000000005', 'Almond Milk',       8000, FALSE),
  -- Tambahan Topping (multi-select)
  ('40000000-0000-4000-8000-000000000601', '30000000-0000-4000-8000-000000000006', 'Extra Espresso Shot', 5000, FALSE),
  ('40000000-0000-4000-8000-000000000602', '30000000-0000-4000-8000-000000000006', 'Grass Jelly',       4000, FALSE),
  ('40000000-0000-4000-8000-000000000603', '30000000-0000-4000-8000-000000000006', 'Coffee Jelly',      4000, FALSE)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. PRODUK (25 item) + PROFIL MODIFIER
--    Profil: ESPRESSO | BLACK | MILK | TEA | NONE
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE seed_products (
    category_slug VARCHAR(50),
    name VARCHAR(100),
    slug VARCHAR(100),
    description TEXT,
    base_price DECIMAL(12, 2),
    is_best_seller BOOLEAN,
    profile VARCHAR(20)
) ON COMMIT DROP;

INSERT INTO seed_products VALUES
  -- Espresso Based (6)
  ('espresso-based', 'Espresso',               'espresso',               'Satu shot espresso house blend, pekat dan bold.',                     18000, FALSE, 'ESPRESSO'),
  ('espresso-based', 'Americano',              'americano',              'Espresso dengan air, bersih dan ringan.',                             22000, FALSE, 'BLACK'),
  ('espresso-based', 'Cappuccino',             'cappuccino',             'Espresso, susu, dan foam tebal seimbang.',                            28000, FALSE, 'MILK'),
  ('espresso-based', 'Caffe Latte',            'caffe-latte',            'Espresso lembut dengan susu creamy.',                                 28000, TRUE,  'MILK'),
  ('espresso-based', 'Flat White',             'flat-white',             'Double ristretto dengan microfoam tipis.',                            30000, FALSE, 'MILK'),
  ('espresso-based', 'Caramel Macchiato',      'caramel-macchiato',      'Susu vanila, espresso, dan saus karamel.',                            33000, FALSE, 'MILK'),
  -- Signature Kopi Susu (6)
  ('signature-kopi-susu', 'Kopi Susu Aren',           'kopi-susu-aren',           'Kopi susu dengan gula aren asli, best seller KopiKini.',   22000, TRUE,  'MILK'),
  ('signature-kopi-susu', 'Kopi Susu Pandan',         'kopi-susu-pandan',         'Kopi susu dengan sirup pandan wangi.',                     24000, FALSE, 'MILK'),
  ('signature-kopi-susu', 'Kopi Susu Butterscotch',   'kopi-susu-butterscotch',   'Kopi susu dengan butterscotch gurih manis.',               25000, TRUE,  'MILK'),
  ('signature-kopi-susu', 'Kopi Susu Rum Regal',      'kopi-susu-rum-regal',      'Kopi susu rasa rum (non-alkohol) dan biskuit regal.',      26000, FALSE, 'MILK'),
  ('signature-kopi-susu', 'Kopi Susu Salted Caramel', 'kopi-susu-salted-caramel', 'Kopi susu dengan salted caramel.',                         26000, FALSE, 'MILK'),
  ('signature-kopi-susu', 'Kopi Susu Hazelnut',       'kopi-susu-hazelnut',       'Kopi susu dengan sirup hazelnut.',                         25000, FALSE, 'MILK'),
  -- Non-Coffee (5)
  ('non-coffee', 'Matcha Latte',      'matcha-latte',      'Matcha Jepang premium dengan susu.',          28000, TRUE,  'MILK'),
  ('non-coffee', 'Chocolate Classic', 'chocolate-classic', 'Cokelat belgia pekat dengan susu.',           26000, FALSE, 'MILK'),
  ('non-coffee', 'Red Velvet Latte',  'red-velvet-latte',  'Red velvet lembut dengan susu.',              27000, FALSE, 'MILK'),
  ('non-coffee', 'Taro Latte',        'taro-latte',        'Talas ungu creamy dengan susu.',              26000, FALSE, 'MILK'),
  ('non-coffee', 'Strawberry Milk',   'strawberry-milk',   'Susu segar dengan selai stroberi.',           25000, FALSE, 'MILK'),
  -- Tea (4)
  ('tea', 'Lychee Tea',  'lychee-tea',  'Teh hitam dengan buah leci.',            22000, FALSE, 'TEA'),
  ('tea', 'Lemon Tea',   'lemon-tea',   'Teh dengan perasan lemon segar.',         20000, FALSE, 'TEA'),
  ('tea', 'Jasmine Tea', 'jasmine-tea', 'Teh melati wangi.',                       18000, FALSE, 'TEA'),
  ('tea', 'Thai Tea',    'thai-tea',    'Teh Thailand dengan susu kental manis.',  23000, FALSE, 'TEA'),
  -- Pastry (4)
  ('pastry', 'Butter Croissant',  'butter-croissant',  'Croissant mentega renyah berlapis.',     22000, FALSE, 'NONE'),
  ('pastry', 'Almond Croissant',  'almond-croissant',  'Croissant isi krim almond panggang.',    28000, FALSE, 'NONE'),
  ('pastry', 'Pain au Chocolat',  'pain-au-chocolat',  'Pastry isi cokelat hitam.',             26000, FALSE, 'NONE'),
  ('pastry', 'Banana Bread',      'banana-bread',      'Roti pisang lembut dengan walnut.',     20000, FALSE, 'NONE');

INSERT INTO products (category_id, name, slug, description, image_url, base_price, is_best_seller, is_available)
SELECT c.id, sp.name, sp.slug, sp.description,
       'https://cdn.kopikini.example/products/' || sp.slug || '.jpg',
       sp.base_price, sp.is_best_seller, TRUE
FROM seed_products sp
JOIN categories c ON c.slug = sp.category_slug
ON CONFLICT (slug) DO NOTHING;

-- Peta profil -> modifier group
CREATE TEMP TABLE seed_profile_groups (
    profile VARCHAR(20),
    modifier_group_id UUID
) ON COMMIT DROP;

INSERT INTO seed_profile_groups VALUES
  -- ESPRESSO: Suhu, Topping
  ('ESPRESSO', '30000000-0000-4000-8000-000000000001'),
  ('ESPRESSO', '30000000-0000-4000-8000-000000000006'),
  -- BLACK: Suhu, Ukuran, Gula, Es, Topping (tanpa susu)
  ('BLACK', '30000000-0000-4000-8000-000000000001'),
  ('BLACK', '30000000-0000-4000-8000-000000000002'),
  ('BLACK', '30000000-0000-4000-8000-000000000003'),
  ('BLACK', '30000000-0000-4000-8000-000000000004'),
  ('BLACK', '30000000-0000-4000-8000-000000000006'),
  -- MILK: seluruh 6 group
  ('MILK', '30000000-0000-4000-8000-000000000001'),
  ('MILK', '30000000-0000-4000-8000-000000000002'),
  ('MILK', '30000000-0000-4000-8000-000000000003'),
  ('MILK', '30000000-0000-4000-8000-000000000004'),
  ('MILK', '30000000-0000-4000-8000-000000000005'),
  ('MILK', '30000000-0000-4000-8000-000000000006'),
  -- TEA: Suhu, Ukuran, Gula, Es
  ('TEA', '30000000-0000-4000-8000-000000000001'),
  ('TEA', '30000000-0000-4000-8000-000000000002'),
  ('TEA', '30000000-0000-4000-8000-000000000003'),
  ('TEA', '30000000-0000-4000-8000-000000000004');
  -- NONE (pastry): tanpa modifier

INSERT INTO product_modifier_groups (product_id, modifier_group_id)
SELECT p.id, spg.modifier_group_id
FROM seed_products sp
JOIN products p ON p.slug = sp.slug
JOIN seed_profile_groups spg ON spg.profile = sp.profile
ON CONFLICT DO NOTHING;

COMMIT;
