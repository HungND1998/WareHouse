const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createNotification } = require('../utils/notification');

const TABLE_METAS = {
  categories: { label: 'danh mục', link: '/categories', type: 'category' },
  suppliers: { label: 'nhà cung cấp', link: '/suppliers', type: 'supplier' },
  warehouses: { label: 'kho hàng', link: '/warehouses', type: 'warehouse' },
};

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

    if (TABLE_METAS[table]) {
      const meta = TABLE_METAS[table];
      const name = row.name || `ID #${row.id}`;
      createNotification({
        type: meta.type,
        action: 'create',
        title: `Thêm ${meta.label} mới`,
        message: `Đã thêm ${meta.label} "${name}" vào hệ thống.`,
        link: meta.link,
        entity_id: row.id,
        actor: req.user,
      });
    }

    res.status(201).json({ success: true, data: row });
  });

  const update = asyncHandler(async (req, res) => {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!existing) throw new AppError('Không tìm thấy bản ghi.', 404);
    const values = fields.map((f) => req.body[f] ?? existing[f]);
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);

    if (TABLE_METAS[table]) {
      const meta = TABLE_METAS[table];
      const name = row.name || `ID #${row.id}`;
      createNotification({
        type: meta.type,
        action: 'update',
        title: `Cập nhật ${meta.label}`,
        message: `Đã cập nhật thông tin ${meta.label} "${name}".`,
        link: meta.link,
        entity_id: row.id,
        actor: req.user,
      });
    }

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
