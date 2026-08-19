const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/products?search=&category_id=&page=1&limit=20
const getAll = asyncHandler(async (req, res) => {
  const { search, category_id, page = 1, limit = 20 } = req.query;
  let where = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    where += ' AND p.category_id = ?';
    params.push(category_id);
  }

  const offset = (Number(page) - 1) * Number(limit);
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name,
              COALESCE(SUM(i.quantity), 0) AS total_stock
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) AS c FROM products p ${where}`).get(...params).c;

  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total } });
});

const getOne = asyncHandler(async (req, res) => {
  const product = db
    .prepare(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`)
    .get(req.params.id);
  if (!product) throw new AppError('Không tìm thấy sản phẩm.', 404);

  const stockByWarehouse = db
    .prepare(
      `SELECT w.id AS warehouse_id, w.name AS warehouse_name, COALESCE(i.quantity, 0) AS quantity
       FROM warehouses w
       LEFT JOIN inventory i ON i.warehouse_id = w.id AND i.product_id = ?`
    )
    .all(req.params.id);

  res.json({ success: true, data: { ...product, stockByWarehouse } });
});

const create = asyncHandler(async (req, res) => {
  const { sku, name, category_id, unit, cost_price, sale_price, min_stock, description } = req.body;
  if (!sku || !name) throw new AppError('Thiếu SKU hoặc tên sản phẩm.');

  const info = db
    .prepare(
      `INSERT INTO products (sku, name, category_id, unit, cost_price, sale_price, min_stock, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(sku, name, category_id || null, unit || 'cái', cost_price || 0, sale_price || 0, min_stock || 0, description || null);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ success: true, data: product });
});

const update = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) throw new AppError('Không tìm thấy sản phẩm.', 404);

  const fields = ['sku', 'name', 'category_id', 'unit', 'cost_price', 'sale_price', 'min_stock', 'description', 'is_active'];
  const values = fields.map((f) => (req.body[f] !== undefined ? req.body[f] : existing[f]));

  db.prepare(`UPDATE products SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`).run(...values, req.params.id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: product });
});

const remove = asyncHandler(async (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) throw new AppError('Không tìm thấy sản phẩm.', 404);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Đã xóa sản phẩm.' });
});

// GET /api/products/low-stock?warehouse_id=
const lowStock = asyncHandler(async (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.sku, p.name, p.min_stock, COALESCE(SUM(i.quantity), 0) AS total_stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.is_active = 1
       GROUP BY p.id
       HAVING total_stock <= p.min_stock
       ORDER BY total_stock ASC`
    )
    .all();
  res.json({ success: true, data: rows });
});

module.exports = { getAll, getOne, create, update, remove, lowStock };
