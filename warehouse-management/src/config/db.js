const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/warehouse.db');
const SCHEMA_PATH = path.join(__dirname, '../../database/schema.sql');

// Đảm bảo thư mục chứa file DB tồn tại
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tự động khởi tạo schema nếu database chưa có bảng nào
function initSchema() {
  const tableCount = db
    .prepare("SELECT count(*) AS c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .get().c;

  if (tableCount === 0) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('✅ Đã khởi tạo schema cơ sở dữ liệu.');
  }

  // Đảm bảo luôn có ít nhất tài khoản admin
  const userCount = db.prepare("SELECT count(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(
      'admin', hash, 'Quản trị viên', 'admin'
    );
    console.log('✅ Đã tự động tạo tài khoản admin (username: admin / password: admin123)');
  }

  // Đảm bảo bảng notifications và notification_reads tồn tại
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      action      TEXT NOT NULL,
      title       TEXT NOT NULL,
      message     TEXT NOT NULL,
      link        TEXT,
      entity_id   INTEGER,
      actor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at         TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (notification_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
  `);

  // Bảng phân quyền động: roles, permissions, role_permissions
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      is_system   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id          TEXT PRIMARY KEY,
      module      TEXT NOT NULL,
      name        TEXT NOT NULL,
      action      TEXT NOT NULL DEFAULT 'view'
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
  `);

  // Seed default roles
  const rolesCount = db.prepare('SELECT count(*) AS c FROM roles').get().c;
  if (rolesCount === 0) {
    db.prepare('INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)').run(
      'admin',
      'Quản trị viên',
      'Toàn quyền quản trị hệ thống, dữ liệu hàng hóa, tài khoản người dùng và thiết lập phân quyền.',
      1
    );
    db.prepare('INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)').run(
      'staff',
      'Nhân viên kho',
      'Thực hiện các thao tác nhập xuất kho thực tế, tra cứu thẻ kho, danh mục và quản lý chứng từ vận hành.',
      1
    );
  }

  // Seed permission definitions
  const PERMISSION_DEFINITIONS = [
    { id: 'products.view', module: 'products', name: 'Xem danh sách sản phẩm', action: 'view' },
    { id: 'products.create', module: 'products', name: 'Thêm sản phẩm mới', action: 'create' },
    { id: 'products.edit', module: 'products', name: 'Chỉnh sửa sản phẩm & giá bán', action: 'edit' },
    { id: 'products.delete', module: 'products', name: 'Xóa sản phẩm', action: 'delete' },
    { id: 'products.view_cost', module: 'products', name: 'Xem giá vốn hàng hóa', action: 'special' },

    { id: 'categories.view', module: 'categories', name: 'Xem danh mục sản phẩm', action: 'view' },
    { id: 'categories.create', module: 'categories', name: 'Thêm danh mục mới', action: 'create' },
    { id: 'categories.edit', module: 'categories', name: 'Chỉnh sửa danh mục', action: 'edit' },
    { id: 'categories.delete', module: 'categories', name: 'Xóa danh mục', action: 'delete' },

    { id: 'suppliers.view', module: 'suppliers', name: 'Xem danh sách nhà cung cấp', action: 'view' },
    { id: 'suppliers.create', module: 'suppliers', name: 'Thêm nhà cung cấp mới', action: 'create' },
    { id: 'suppliers.edit', module: 'suppliers', name: 'Chỉnh sửa thông tin NCC', action: 'edit' },
    { id: 'suppliers.delete', module: 'suppliers', name: 'Xóa nhà cung cấp', action: 'delete' },

    { id: 'warehouses.view', module: 'warehouses', name: 'Xem danh sách kho hàng', action: 'view' },
    { id: 'warehouses.create', module: 'warehouses', name: 'Thêm cơ sở kho mới', action: 'create' },
    { id: 'warehouses.edit', module: 'warehouses', name: 'Chỉnh sửa thông tin kho', action: 'edit' },
    { id: 'warehouses.delete', module: 'warehouses', name: 'Xóa cơ sở kho', action: 'delete' },

    { id: 'stock_in.view', module: 'stock_in', name: 'Xem danh sách & chi tiết phiếu nhập', action: 'view' },
    { id: 'stock_in.create', module: 'stock_in', name: 'Tạo phiếu nhập kho mới', action: 'create' },
    { id: 'stock_in.export', module: 'stock_in', name: 'Xuất file Excel phiếu nhập', action: 'special' },

    { id: 'stock_out.view', module: 'stock_out', name: 'Xem danh sách & chi tiết phiếu xuất', action: 'view' },
    { id: 'stock_out.create', module: 'stock_out', name: 'Tạo phiếu xuất kho mới', action: 'create' },
    { id: 'stock_out.export', module: 'stock_out', name: 'Xuất file Excel phiếu xuất', action: 'special' },

    { id: 'inventory.view', module: 'inventory', name: 'Tra cứu tồn kho theo vị trí', action: 'view' },
    { id: 'inventory.transactions', module: 'inventory', name: 'Xem thẻ kho & lịch sử biến động', action: 'view' },
    { id: 'inventory.dashboard', module: 'inventory', name: 'Xem Dashboard thống kê tổng quan', action: 'view' },
    { id: 'inventory.export', module: 'inventory', name: 'Xuất file Excel tồn kho', action: 'special' },

    { id: 'users.view', module: 'users', name: 'Xem danh sách tài khoản', action: 'view' },
    { id: 'users.create', module: 'users', name: 'Tạo tài khoản người dùng mới', action: 'create' },
    { id: 'users.edit', module: 'users', name: 'Chỉnh sửa tài khoản & vai trò', action: 'edit' },
    { id: 'users.toggle_status', module: 'users', name: 'Khóa / Kích hoạt tài khoản', action: 'special' },
    { id: 'users.delete', module: 'users', name: 'Xóa tài khoản người dùng', action: 'delete' },

    { id: 'roles.view', module: 'roles', name: 'Xem ma trận phân quyền', action: 'view' },
    { id: 'roles.edit', module: 'roles', name: 'Thiết lập & lưu phân quyền vai trò', action: 'edit' },
  ];

  const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (id, module, name, action) VALUES (?, ?, ?, ?)');
  for (const p of PERMISSION_DEFINITIONS) {
    insertPerm.run(p.id, p.module, p.name, p.action);
  }

  // Seed default role_permissions
  const rpCount = db.prepare('SELECT count(*) AS c FROM role_permissions').get().c;
  if (rpCount === 0) {
    const insertRolePerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    // Admin có tất cả quyền
    for (const p of PERMISSION_DEFINITIONS) {
      insertRolePerm.run('admin', p.id);
    }
    // Staff có quyền nghiệp vụ vận hành
    const DEFAULT_STAFF_PERMS = [
      'products.view',
      'categories.view',
      'suppliers.view',
      'warehouses.view',
      'stock_in.view',
      'stock_in.create',
      'stock_in.export',
      'stock_out.view',
      'stock_out.create',
      'stock_out.export',
      'inventory.view',
      'inventory.transactions',
      'inventory.dashboard',
      'inventory.export',
    ];
    for (const pid of DEFAULT_STAFF_PERMS) {
      insertRolePerm.run('staff', pid);
    }
  }
}

initSchema();

module.exports = db;

