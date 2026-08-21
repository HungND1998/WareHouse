const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/inventory?warehouse_id=
const getAll = asyncHandler(async (req, res) => {
  const { warehouse_id } = req.query;
  let sql = `
    SELECT i.id, p.id AS product_id, p.sku, p.name AS product_name, p.unit,
           w.id AS warehouse_id, w.name AS warehouse_name, i.quantity, i.updated_at
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    JOIN warehouses w ON w.id = i.warehouse_id
    WHERE 1=1
  `;
  const params = [];
  if (warehouse_id) {
    sql += ' AND i.warehouse_id = ?';
    params.push(warehouse_id);
  }
  sql += ' ORDER BY p.name ASC';

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

// GET /api/inventory/transactions?product_id=&warehouse_id=
const getTransactions = asyncHandler(async (req, res) => {
  const { product_id, warehouse_id } = req.query;
  let sql = `
    SELECT st.*, p.sku, p.name AS product_name, w.name AS warehouse_name
    FROM stock_transactions st
    JOIN products p ON p.id = st.product_id
    JOIN warehouses w ON w.id = st.warehouse_id
    WHERE 1=1
  `;
  const params = [];
  if (product_id) {
    sql += ' AND st.product_id = ?';
    params.push(product_id);
  }
  if (warehouse_id) {
    sql += ' AND st.warehouse_id = ?';
    params.push(warehouse_id);
  }
  sql += ' ORDER BY st.id DESC LIMIT 200';

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

// GET /api/reports/dashboard - tổng quan nhanh
const dashboard = asyncHandler(async (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) AS c FROM products WHERE is_active = 1').get().c;
  const totalWarehouses = db.prepare('SELECT COUNT(*) AS c FROM warehouses').get().c;
  const totalStockQty = db
    .prepare(
      `SELECT COALESCE(SUM(i.quantity), 0) AS q
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE p.is_active = 1`
    )
    .get().q;
  const totalStockValue = db
    .prepare(
      `SELECT COALESCE(SUM(i.quantity * p.cost_price), 0) AS v
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE p.is_active = 1`
    )
    .get().v;
  const outOfStockCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
         SELECT p.id, COALESCE(SUM(i.quantity), 0) AS total_stock
         FROM products p LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.is_active = 1
         GROUP BY p.id
         HAVING total_stock <= 0
       )`
    )
    .get().c;
  const lowStockCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
         SELECT p.id, COALESCE(SUM(i.quantity), 0) AS total_stock
         FROM products p LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.is_active = 1
         GROUP BY p.id
         HAVING total_stock > 0 AND total_stock <= p.min_stock
       )`
    )
    .get().c;
  const inStockCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
         SELECT p.id, COALESCE(SUM(i.quantity), 0) AS total_stock
         FROM products p LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.is_active = 1
         GROUP BY p.id
         HAVING total_stock > 0
       )`
    )
    .get().c;
  const todayIn = db
    .prepare(`SELECT COUNT(*) AS c FROM stock_in WHERE date(created_at) = date('now')`)
    .get().c;
  const todayOut = db
    .prepare(`SELECT COUNT(*) AS c FROM stock_out WHERE date(created_at) = date('now')`)
    .get().c;

  // Thống kê xu hướng biến động 7 ngày gần nhất (Nhập & Xuất)
  const trends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const pad = (n) => String(n).padStart(2, '0');
    const label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = days[d.getDay()];

    const inData = db
      .prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount FROM stock_in WHERE date(created_at) = ?`)
      .get(dateStr);
    const outData = db
      .prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount FROM stock_out WHERE date(created_at) = ?`)
      .get(dateStr);

    trends.push({
      date: dateStr,
      label: `${label} (${dayName})`,
      shortLabel: label,
      dayName,
      inAmount: inData.amount || 0,
      inCount: inData.count || 0,
      outAmount: outData.amount || 0,
      outCount: outData.count || 0,
    });
  }

  res.json({
    success: true,
    data: {
      totalProducts,
      totalWarehouses,
      totalStockQty,
      totalStockValue,
      inStockCount,
      outOfStockCount,
      lowStockCount,
      todayIn,
      todayOut,
      trends,
    },
  });
});

module.exports = { getAll, getTransactions, dashboard };
