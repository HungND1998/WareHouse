const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/warehouse.db');
const SCHEMA_PATH = path.join(__dirname, '../../database/schema.sql');

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
}

initSchema();

module.exports = db;
