-- =============================================================================
-- KopiKini — 001_init_schema.sql
-- Sumber: docs/05_BSD_Backend_Schema.md §2 (PostgreSQL 16 DDL), disalin apa adanya.
-- Jangan ubah file ini setelah dijalankan di lingkungan mana pun; buat migrasi baru.
-- Catatan: tabel STORE_INVENTORY, VOUCHERS, USER_VOUCHERS, LOYALTY_LEDGER ada di ERD
-- BSD §1 tetapi belum memiliki DDL di BSD §2, sehingga belum dibuat di Fase 1.
-- =============================================================================

-- Aktivasi ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'BARISTA', 'STORE_MANAGER', 'ADMIN');
CREATE TYPE order_type AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE order_status AS ENUM (
    'WAITING_PAYMENT',
    'PAYMENT_CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED'
);
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED');
CREATE TYPE payment_channel AS ENUM ('QRIS', 'GOPAY', 'SHOPEEPAY', 'BCA_VA', 'MANDIRI_VA');

-- 1. TABEL USERS & PROFILE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role user_role DEFAULT 'CUSTOMER',
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL GERAI / OUTLETS
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL KATALOG: KATEGORI & PRODUK
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    display_order INT DEFAULT 0,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    base_price DECIMAL(12, 2) NOT NULL,
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABEL MODIFIER & KUSTOMISASI (Ukuran, Es, Susu, Topping)
CREATE TABLE modifier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- e.g. "Ukuran", "Level Gula", "Jenis Susu"
    is_required BOOLEAN DEFAULT FALSE,
    min_selection INT DEFAULT 0,
    max_selection INT DEFAULT 1
);

CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. "Oat Milk", "Less Sugar 75%"
    extra_price DECIMAL(12, 2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE product_modifier_groups (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, modifier_group_id)
);

-- 5. TABEL ORDERS & TRANSACTION
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(30) UNIQUE NOT NULL, -- e.g. "ORD-20261031-0082"
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    order_type order_type NOT NULL,
    status order_status DEFAULT 'WAITING_PAYMENT',
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) NOT NULL, -- PB1 10%
    delivery_fee DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    pickup_pin VARCHAR(6), -- 4 digit PIN atau kode bar pengambilan
    delivery_address TEXT,
    notes TEXT,
    idempotency_key UUID UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    notes VARCHAR(255)
);

CREATE TABLE order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_name VARCHAR(50) NOT NULL,
    extra_price DECIMAL(12, 2) DEFAULT 0.00
);

-- 6. TABEL PEMBAYARAN
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    transaction_id VARCHAR(100), -- Gateway transaction id (Midtrans)
    payment_channel payment_channel NOT NULL,
    payment_status payment_status DEFAULT 'PENDING',
    gross_amount DECIMAL(12, 2) NOT NULL,
    qr_payload TEXT,
    payment_url TEXT,
    settlement_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL LOG STATUS PESANAN (Audit Trail)
CREATE TABLE order_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status order_status,
    new_status order_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. INDEXING OPTIMASI
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_stores_lat_lng ON stores(latitude, longitude);
CREATE INDEX idx_products_category ON products(category_id);
