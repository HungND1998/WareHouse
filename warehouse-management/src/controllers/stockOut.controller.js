const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const generateCode = require('../utils/generateCode');

const getAll = asyncHandler(async (req, res) => {
  const rows = db
    .prepare(
      `SELECT so.*, w.name AS warehouse_name, u.username AS created_by
       FROM stock_out so
       LEFT JOIN warehouses w ON w.id = so.warehouse_id
       LEFT JOIN users u ON u.id = so.user_id
       ORDER BY so.id DESC`
    )
    .all();
  res.json({ success: true, data: rows });
});

const getOne = asyncHandler(async (req, res) => {
  const header = db
    .prepare(
      `SELECT so.*, w.name AS warehouse_name, u.username AS created_by
       FROM stock_out so
       LEFT JOIN warehouses w ON w.id = so.warehouse_id
       LEFT JOIN users u ON u.id = so.user_id
       WHERE so.id = ?`
    )
    .get(req.params.id);
  if (!header) throw new AppError('Không tìm thấy phiếu xuất.', 404);
  const items = db
    .prepare(
      `SELECT soi.*, p.sku, p.name AS product_name, p.unit
       FROM stock_out_items soi JOIN products p ON p.id = soi.product_id
       WHERE soi.stock_out_id = ?`
    )
    .all(req.params.id);
  res.json({ success: true, data: { ...header, items } });
});

// POST /api/stock-out
// body: { warehouse_id, customer_name, note, items: [{ product_id, quantity, price }] }
const create = asyncHandler(async (req, res) => {
  const { warehouse_id, customer_name, note, items } = req.body;
  if (!warehouse_id) throw new AppError('Thiếu kho xuất hàng.');
  if (!Array.isArray(items) || items.length === 0) throw new AppError('Phiếu xuất phải có ít nhất 1 sản phẩm.');

  const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(warehouse_id);
  if (!warehouse) throw new AppError('Kho không tồn tại.', 404);

  const code = generateCode('PX');
  const total_amount = items.reduce((sum, it) => sum + it.quantity * (it.price || 0), 0);

  const runTransaction = db.transaction(() => {
    // Kiểm tra tồn kho đủ hàng trước khi trừ (đảm bảo không âm kho)
    for (const it of items) {
      if (!it.product_id || !it.quantity || it.quantity <= 0) {
        throw new AppError('Mỗi dòng hàng cần product_id và quantity > 0.');
      }
      const inv = db
        .prepare('SELECT quantity FROM inventory WHERE product_id = ? AND warehouse_id = ?')
        .get(it.product_id, warehouse_id);
      const available = inv ? inv.quantity : 0;
      if (available < it.quantity) {
        const product = db.prepare('SELECT name FROM products WHERE id = ?').get(it.product_id);
        throw new AppError(
          `Không đủ tồn kho cho sản phẩm "${product ? product.name : it.product_id}". Tồn: ${available}, yêu cầu: ${it.quantity}.`
        );
      }
    }

    const info = db
      .prepare('INSERT INTO stock_out (code, warehouse_id, user_id, customer_name, note, total_amount) VALUES (?, ?, ?, ?, ?, ?)')
      .run(code, warehouse_id, req.user?.id || null, customer_name || null, note || null, total_amount);
    const stockOutId = info.lastInsertRowid;

    const insertItem = db.prepare('INSERT INTO stock_out_items (stock_out_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    const decrementInventory = db.prepare(
      `UPDATE inventory SET quantity = quantity - ?, updated_at = datetime('now')
       WHERE product_id = ? AND warehouse_id = ?`
    );
    const logTx = db.prepare(
      `INSERT INTO stock_transactions (product_id, warehouse_id, type, quantity, ref_type, ref_id, note)
       VALUES (?, ?, 'OUT', ?, 'stock_out', ?, ?)`
    );

    for (const it of items) {
      insertItem.run(stockOutId, it.product_id, it.quantity, it.price || 0);
      decrementInventory.run(it.quantity, it.product_id, warehouse_id);
      logTx.run(it.product_id, warehouse_id, it.quantity, stockOutId, `Xuất kho theo phiếu ${code}`);
    }

    return stockOutId;
  });

  const stockOutId = runTransaction();
  const header = db.prepare('SELECT * FROM stock_out WHERE id = ?').get(stockOutId);
  res.status(201).json({ success: true, data: header });
});

module.exports = { getAll, getOne, create };
