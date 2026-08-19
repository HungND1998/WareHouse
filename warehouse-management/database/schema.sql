-- ============================================
-- CƠ SỞ DỮ LIỆU QUẢN LÝ KHO (Warehouse Management)
-- ============================================
PRAGMA foreign_keys = ON;

-- Người dùng hệ thống
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT,
    role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Danh mục sản phẩm
CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Nhà cung cấp
CREATE TABLE IF NOT EXISTS suppliers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT,
    email      TEXT,
    address    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Kho hàng (có thể có nhiều kho / chi nhánh)
CREATE TABLE IF NOT EXISTS warehouses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT UNIQUE NOT NULL,
    address    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sản phẩm / hàng hóa
CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sku         TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    unit        TEXT NOT NULL DEFAULT 'cái',
    cost_price  REAL NOT NULL DEFAULT 0,
    sale_price  REAL NOT NULL DEFAULT 0,
    min_stock   INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tồn kho: số lượng của 1 sản phẩm tại 1 kho
CREATE TABLE IF NOT EXISTS inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, warehouse_id)
);

-- Phiếu nhập kho
CREATE TABLE IF NOT EXISTS stock_in (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT UNIQUE NOT NULL,
    supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    user_id      INTEGER REFERENCES users(id),
    note         TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chi tiết phiếu nhập
CREATE TABLE IF NOT EXISTS stock_in_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_in_id INTEGER NOT NULL REFERENCES stock_in(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    price       REAL NOT NULL DEFAULT 0
);

-- Phiếu xuất kho
CREATE TABLE IF NOT EXISTS stock_out (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT UNIQUE NOT NULL,
    warehouse_id  INTEGER NOT NULL REFERENCES warehouses(id),
    user_id       INTEGER REFERENCES users(id),
    customer_name TEXT,
    note          TEXT,
    total_amount  REAL NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chi tiết phiếu xuất
CREATE TABLE IF NOT EXISTS stock_out_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_out_id INTEGER NOT NULL REFERENCES stock_out(id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    price        REAL NOT NULL DEFAULT 0
);

-- Lịch sử biến động tồn kho (audit trail)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    type         TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUST')),
    quantity     INTEGER NOT NULL,
    ref_type     TEXT,
    ref_id       INTEGER,
    note         TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_product ON stock_transactions(product_id);
