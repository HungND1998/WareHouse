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
}

initSchema();

module.exports = db;

