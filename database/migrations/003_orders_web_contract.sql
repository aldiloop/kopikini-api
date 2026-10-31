-- =============================================================================
-- KopiKini — 003_orders_web_contract.sql
-- Melengkapi tabel orders/payments/order_item_modifiers agar cocok dengan
-- kontrak Order yang diharapkan web (kopikini-web/src/shared/types.ts).
-- JANGAN mengubah 001/002; migrasi ini hanya menambah kolom baru yang
-- nullable atau punya default, sehingga database lama tetap bisa dimigrasi.
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS packaging_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS queue_number VARCHAR(20);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS snap_token TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE order_item_modifiers
  ADD COLUMN IF NOT EXISTS modifier_id UUID REFERENCES modifiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(50);
