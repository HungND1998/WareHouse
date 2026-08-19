const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register  (chỉ admin tạo user mới sau khi đã có admin đầu tiên -> xem seed.js)
const register = asyncHandler(async (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password) throw new AppError('Thiếu username hoặc password.');

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw new AppError('Tên đăng nhập đã tồn tại.', 409);

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    .run(username, password_hash, full_name || null, role === 'admin' ? 'admin' : 'staff');

  res.status(201).json({ success: true, data: { id: info.lastInsertRowid, username } });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new AppError('Thiếu username hoặc password.');

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) throw new AppError('Sai tên đăng nhập hoặc mật khẩu.', 401);

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) throw new AppError('Sai tên đăng nhập hoặc mật khẩu.', 401);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    success: true,
    data: { token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } },
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, data: user });
});

module.exports = { register, login, me };
