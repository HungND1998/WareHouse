const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Tạo bộ controller CRUD chuẩn cho một bảng đơn giản (categories, suppliers, warehouses)
function crudFactory(table, fields) {
  const cols = fields.join(', ');
  const placeholders = fields.map(() => '?').join(', ');
  const setClause = fields.map((f) => `${f} = ?`).join(', ');

  const getAll = asyncHandler(async (req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
    res.json({ success: true, data: rows });
  });

  const getOne = asyncHandler(async (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!row) throw new AppError('Không tìm thấy bản ghi.', 404);
    res.json({ success: true, data: row });
  });

  const create = asyncHandler(async (req, res) => {
    const values = fields.map((f) => req.body[f] ?? null);
    const info = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(...values);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: row });
  });

  const update = asyncHandler(async (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!existing) throw new AppError('Không tìm thấy bản ghi.', 404);
    const values = fields.map((f) => req.body[f] ?? existing[f]);
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    res.json({ success: true, data: row });
  });

  const remove = asyncHandler(async (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!existing) throw new AppError('Không tìm thấy bản ghi.', 404);
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.json({ success: true, message: 'Đã xóa.' });
  });

  return { getAll, getOne, create, update, remove };
}

module.exports = crudFactory;
