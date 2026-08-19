require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./src/middleware/errorHandler');

require('./src/config/db'); // khởi tạo & kiểm tra schema database

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Warehouse Management API đang chạy 🚀' });
});

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/categories', require('./src/routes/categories.routes'));
app.use('/api/suppliers', require('./src/routes/suppliers.routes'));
app.use('/api/warehouses', require('./src/routes/warehouses.routes'));
app.use('/api/products', require('./src/routes/products.routes'));
app.use('/api/stock-in', require('./src/routes/stockIn.routes'));
app.use('/api/stock-out', require('./src/routes/stockOut.routes'));
app.use('/api/inventory', require('./src/routes/inventory.routes'));
app.use('/api/reports', require('./src/routes/reports.routes'));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Không tìm thấy endpoint.' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
