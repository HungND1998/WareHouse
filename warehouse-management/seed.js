// Chạy: node seed.js
// Tạo tài khoản admin mặc định + một số dữ liệu mẫu để test nhanh
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

function upsertAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!exists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(
      'admin', hash, 'Quản trị viên', 'admin'
    );
    console.log('✅ Đã tạo tài khoản admin (username: admin / password: admin123)');
  } else {
    console.log('ℹ️  Tài khoản admin đã tồn tại.');
  }
}

function seedSampleData() {
  const catCount = db.prepare('SELECT COUNT(*) c FROM categories').get().c;
  if (catCount > 0) {
    console.log('ℹ️  Dữ liệu mẫu đã tồn tại, bỏ qua seed.');
    return;
  }

  const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  const catElectronics = insertCat.run('Điện tử', 'Thiết bị điện tử, linh kiện').lastInsertRowid;
  const catOffice = insertCat.run('Văn phòng phẩm', 'Dụng cụ văn phòng').lastInsertRowid;

  const insertWarehouse = db.prepare('INSERT INTO warehouses (name, address) VALUES (?, ?)');
  const wh1 = insertWarehouse.run('Kho Hà Nội', 'Số 1 Đường Láng, Hà Nội').lastInsertRowid;
  const wh2 = insertWarehouse.run('Kho HCM', '123 Nguyễn Huệ, TP.HCM').lastInsertRowid;

  const insertSupplier = db.prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)');
  const sup1 = insertSupplier.run('Công ty TNHH ABC', '0901234567', 'abc@supplier.com', 'Hà Nội').lastInsertRowid;

  const insertProduct = db.prepare(
    `INSERT INTO products (sku, name, category_id, unit, cost_price, sale_price, min_stock, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const p1 = insertProduct.run('SKU001', 'Chuột không dây Logitech M185', catElectronics, 'cái', 150000, 220000, 10, 'Chuột văn phòng').lastInsertRowid;
  const p2 = insertProduct.run('SKU002', 'Bàn phím cơ AKKO', catElectronics, 'cái', 500000, 750000, 5, 'Bàn phím cơ 87 phím').lastInsertRowid;
  const p3 = insertProduct.run('SKU003', 'Giấy A4 Double A', catOffice, 'ram', 65000, 85000, 20, 'Giấy in A4 500 tờ').lastInsertRowid;

  console.log('✅ Đã seed dữ liệu mẫu: 2 danh mục, 2 kho, 1 NCC, 3 sản phẩm.');
  console.log({ wh1, wh2, sup1, p1, p2, p3 });
}

upsertAdmin();
seedSampleData();
console.log('🎉 Seed hoàn tất.');
