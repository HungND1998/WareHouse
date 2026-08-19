const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const generateCode = require('../utils/generateCode');

// GET /api/stock-in
const getAll = asyncHandler(async (req, res) => {
  const rows = db
    .prepare(
      `SELECT si.*, w.name AS warehouse_name, s.name AS supplier_name, u.username AS created_by
       FROM stock_in si
       LEFT JOIN warehouses w ON w.id = si.warehouse_id
       LEFT JOIN suppliers s ON s.id = si.supplier_id
       LEFT JOIN users u ON u.id = si.user_id
       ORDER BY si.id DESC`
    )
    .all();
  res.json({ success: true, data: rows });
});

// GET /api/stock-in/:id
const getOne = asyncHandler(async (req, res) => {
  const header = db.prepare('SELECT * FROM stock_in WHERE id = ?').get(req.params.id);
  if (!header) throw new AppError('Không tìm thấy phiếu nhập.', 404);
  const items = db
    .prepare(
      `SELECT sii.*, p.sku, p.name AS product_name
       FROM stock_in_items sii JOIN products p ON p.id = sii.product_id
       WHERE sii.stock_in_id = ?`
    )
    .all(req.params.id);
  res.json({ success: true, data: { ...header, items } });
});

// POST /api/stock-in
// body: { warehouse_id, supplier_id, note, items: [{ product_id, quantity, price }] }
const create = asyncHandler(async (req, res) => {
  const { warehouse_id, supplier_id, note, items } = req.body;
  if (!warehouse_id) throw new AppError('Thiếu kho nhập hàng.');
  if (!Array.isArray(items) || items.length === 0) throw new AppError('Phiếu nhập phải có ít nhất 1 sản phẩm.');

  const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(warehouse_id);
  if (!warehouse) throw new AppError('Kho không tồn tại.', 404);

  const code = generateCode('PN');
  const total_amount = items.reduce((sum, it) => sum + it.quantity * (it.price || 0), 0);

  const runTransaction = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO stock_in (code, supplier_id, warehouse_id, user_id, note, total_amount) VALUES (?, ?, ?, ?, ?, ?)')
      .run(code, supplier_id || null, warehouse_id, req.user?.id || null, note || null, total_amount);
    const stockInId = info.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO stock_in_items (stock_in_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    const upsertInventory = db.prepare(
      `INSERT INTO inventory (product_id, warehouse_id, quantity, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(product_id, warehouse_id) DO UPDATE SET
         quantity = quantity + excluded.quantity,
         updated_at = datetime('now')`
    );
    const logTx = db.prepare(
      `INSERT INTO stock_transactions (product_id, warehouse_id, type, quantity, ref_type, ref_id, note)
       VALUES (?, ?, 'IN', ?, 'stock_in', ?, ?)`
    );

    for (const it of items) {
      if (!it.product_id || !it.quantity || it.quantity <= 0) {
        throw new AppError('Mỗi dòng hàng cần product_id và quantity > 0.');
      }
      const product = db.prepare('SELECT id FROM products WHERE id = ?').get(it.product_id);
      if (!product) throw new AppError(`Sản phẩm ID ${it.product_id} không tồn tại.`, 404);

      insertItem.run(stockInId, it.product_id, it.quantity, it.price || 0);
      upsertInventory.run(it.product_id, warehouse_id, it.quantity);
      logTx.run(it.product_id, warehouse_id, it.quantity, stockInId, `Nhập kho theo phiếu ${code}`);
    }

    return stockInId;
  });

  const stockInId = runTransaction();
  const header = db.prepare('SELECT * FROM stock_in WHERE id = ?').get(stockInId);
  res.status(201).json({ success: true, data: header });
});

module.exports = { getAll, getOne, create };
