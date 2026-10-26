const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createNotification } = require('../utils/notification');

// GET /api/users
// Lấy danh sách toàn bộ người dùng kèm thống kê chứng từ đã tạo
const getAll = asyncHandler(async (req, res) => {
  const { search, role, is_active } = req.query;

  let sql = `
    SELECT 
      u.id, 
      u.username, 
      u.full_name, 
      u.role, 
      u.is_active, 
      u.created_at,
      (SELECT COUNT(*) FROM stock_in si WHERE si.user_id = u.id) AS stock_in_count,
      (SELECT COUNT(*) FROM stock_out so WHERE so.user_id = u.id) AS stock_out_count
    FROM users u
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    sql += ` AND (LOWER(u.username) LIKE ? OR LOWER(COALESCE(u.full_name, '')) LIKE ?)`;
    params.push(term, term);
  }

  if (role && (role === 'admin' || role === 'staff')) {
    sql += ` AND u.role = ?`;
    params.push(role);
  }

  if (is_active !== undefined && is_active !== '') {
    sql += ` AND u.is_active = ?`;
    params.push(Number(is_active) === 1 ? 1 : 0);
  }

  sql += ` ORDER BY u.id ASC`;

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

// GET /api/users/:id
const getOne = asyncHandler(async (req, res) => {
  const user = db
    .prepare(
      `SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.role, 
        u.is_active, 
        u.created_at,
        (SELECT COUNT(*) FROM stock_in si WHERE si.user_id = u.id) AS stock_in_count,
        (SELECT COUNT(*) FROM stock_out so WHERE so.user_id = u.id) AS stock_out_count
       FROM users u 
       WHERE u.id = ?`
    )
    .get(req.params.id);

  if (!user) {
    throw new AppError('Người dùng không tồn tại.', 404);
  }

  res.json({ success: true, data: user });
});

// POST /api/users
// Thêm mới người dùng
const create = asyncHandler(async (req, res) => {
  const { username, password, full_name, role = 'staff', is_active = 1 } = req.body;

  if (!username || !username.trim()) {
    throw new AppError('Tên đăng nhập không được để trống.', 400);
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    throw new AppError('Tên đăng nhập phải có ít nhất 3 ký tự.', 400);
  }

  // Cho phép chữ cái, chữ số, gạch dưới, gạch ngang, dấu chấm
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    throw new AppError('Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới (_), gạch ngang (-) hoặc chấm (.).', 400);
  }

  if (!password || String(password).length < 6) {
    throw new AppError('Mật khẩu khởi tạo phải có ít nhất 6 ký tự.', 400);
  }

  const validRole = role === 'admin' ? 'admin' : 'staff';
  const activeStatus = Number(is_active) === 0 ? 0 : 1;

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
  if (existing) {
    throw new AppError(`Tên đăng nhập "${cleanUsername}" đã tồn tại. Vui lòng chọn tên khác.`, 409);
  }

  const password_hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare(
      'INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)'
    )
    .run(cleanUsername, password_hash, full_name ? full_name.trim() : null, validRole, activeStatus);

  const newUser = db
    .prepare('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?')
    .get(info.lastInsertRowid);

  createNotification({
    type: 'user',
    action: 'create',
    title: 'Thêm người dùng mới',
    message: `Tài khoản "${cleanUsername}" (${validRole === 'admin' ? 'Quản trị viên' : 'Nhân viên kho'}) vừa được tạo mới.`,
    link: '/users',
    entity_id: newUser.id,
    actor: req.user,
  });

  res.status(201).json({
    success: true,
    data: newUser,
    message: `Đã tạo người dùng "${cleanUsername}" thành công.`,
  });
});

// PUT /api/users/:id
// Cập nhật thông tin người dùng
const update = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const currentUserId = req.user.id;
  const { full_name, role, is_active, password } = req.body;

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) {
    throw new AppError('Người dùng không tồn tại.', 404);
  }

  // 1. Kiểm tra an toàn khi đổi vai trò (role) hoặc trạng thái (is_active)
  if (target.role === 'admin' && (role === 'staff' || Number(is_active) === 0)) {
    // Đếm số lượng admin đang hoạt động khác
    const otherActiveAdmins = db
      .prepare('SELECT COUNT(*) AS c FROM users WHERE role = "admin" AND is_active = 1 AND id != ?')
      .get(userId).c;

    if (otherActiveAdmins === 0) {
      throw new AppError(
        'Không thể hạ quyền hoặc khóa Quản trị viên duy nhất đang hoạt động trong hệ thống.',
        400
      );
    }
  }

  // 2. Không cho phép tự khóa tài khoản của chính mình
  if (userId === currentUserId && is_active !== undefined && Number(is_active) === 0) {
    throw new AppError('Bạn không thể tự khóa tài khoản đang đăng nhập của chính mình.', 400);
  }

  // 3. Không cho phép tự hạ quyền admin của chính mình nếu không có admin nào khác
  if (userId === currentUserId && target.role === 'admin' && role === 'staff') {
    throw new AppError('Bạn không thể tự hạ quyền của chính mình khi đang đăng nhập.', 400);
  }

  const nextFullName = full_name !== undefined ? (full_name ? full_name.trim() : null) : target.full_name;
  const nextRole = role !== undefined ? (role === 'admin' ? 'admin' : 'staff') : target.role;
  const nextActive = is_active !== undefined ? (Number(is_active) === 0 ? 0 : 1) : target.is_active;

  // Cập nhật mật khẩu nếu có truyền vào
  if (password && String(password).trim().length > 0) {
    if (String(password).length < 6) {
      throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự.', 400);
    }
    const newHash = bcrypt.hashSync(String(password), 10);
    db.prepare(
      'UPDATE users SET full_name = ?, role = ?, is_active = ?, password_hash = ? WHERE id = ?'
    ).run(nextFullName, nextRole, nextActive, newHash, userId);
  } else {
    db.prepare('UPDATE users SET full_name = ?, role = ?, is_active = ? WHERE id = ?').run(
      nextFullName,
      nextRole,
      nextActive,
      userId
    );
  }

  const updatedUser = db
    .prepare(
      `SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.role, 
        u.is_active, 
        u.created_at,
        (SELECT COUNT(*) FROM stock_in si WHERE si.user_id = u.id) AS stock_in_count,
        (SELECT COUNT(*) FROM stock_out so WHERE so.user_id = u.id) AS stock_out_count
       FROM users u 
       WHERE u.id = ?`
    )
    .get(userId);

  createNotification({
    type: 'user',
    action: 'update',
    title: 'Cập nhật tài khoản người dùng',
    message: `Thông tin tài khoản "${target.username}" (${nextRole === 'admin' ? 'Quản trị viên' : 'Nhân viên kho'}) vừa được cập nhật.`,
    link: '/users',
    entity_id: userId,
    actor: req.user,
  });

  res.json({
    success: true,
    data: updatedUser,
    message: 'Cập nhật thông tin người dùng thành công.',
  });
});

// PATCH /api/users/:id/status
// Chuyển đổi nhanh trạng thái Khóa / Mở khóa
const toggleStatus = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const currentUserId = req.user.id;

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) {
    throw new AppError('Người dùng không tồn tại.', 404);
  }

  if (userId === currentUserId) {
    throw new AppError('Bạn không thể tự khóa tài khoản của chính mình.', 400);
  }

  const nextStatus = target.is_active === 1 ? 0 : 1;

  if (target.role === 'admin' && nextStatus === 0) {
    const otherActiveAdmins = db
      .prepare('SELECT COUNT(*) AS c FROM users WHERE role = "admin" AND is_active = 1 AND id != ?')
      .get(userId).c;

    if (otherActiveAdmins === 0) {
      throw new AppError(
        'Không thể khóa Quản trị viên duy nhất đang hoạt động trong hệ thống.',
        400
      );
    }
  }

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(nextStatus, userId);

  createNotification({
    type: 'user',
    action: 'update',
    title: nextStatus === 1 ? 'Mở khóa người dùng' : 'Khóa tài khoản người dùng',
    message: `Tài khoản "${target.username}" đã được ${nextStatus === 1 ? 'kích hoạt hoạt động' : 'khóa truy cập'}.`,
    link: '/users',
    entity_id: userId,
    actor: req.user,
  });

  res.json({
    success: true,
    data: { id: userId, is_active: nextStatus },
    message: nextStatus === 1 ? 'Đã kích hoạt tài khoản.' : 'Đã khóa tài khoản thành công.',
  });
});

// DELETE /api/users/:id
// Xóa người dùng
const remove = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const currentUserId = req.user.id;

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) {
    throw new AppError('Người dùng không tồn tại.', 404);
  }

  // 1. Không cho phép xóa chính mình
  if (userId === currentUserId) {
    throw new AppError('Bạn không thể tự xóa tài khoản của chính mình.', 400);
  }

  // 2. Không cho phép xóa admin nếu chỉ còn 1 admin
  if (target.role === 'admin') {
    const totalAdmins = db.prepare('SELECT COUNT(*) AS c FROM users WHERE role = "admin"').get().c;
    if (totalAdmins <= 1) {
      throw new AppError('Không thể xóa Quản trị viên duy nhất trong hệ thống.', 400);
    }
  }

  // 3. Kiểm tra ràng buộc khóa ngoại (foreign key): nếu người dùng đã lập phiếu nhập/xuất kho
  const stockInCount = db.prepare('SELECT COUNT(*) AS c FROM stock_in WHERE user_id = ?').get(userId).c;
  const stockOutCount = db.prepare('SELECT COUNT(*) AS c FROM stock_out WHERE user_id = ?').get(userId).c;

  if (stockInCount > 0 || stockOutCount > 0) {
    const totalDocs = stockInCount + stockOutCount;
    throw new AppError(
      `Người dùng "${target.username}" đã tạo ${totalDocs} chứng từ (${stockInCount} phiếu nhập, ${stockOutCount} phiếu xuất). Để bảo toàn lịch sử dữ liệu, bạn không thể xóa vĩnh viễn người dùng này. Vui lòng chọn "Khóa tài khoản" thay thế.`,
      400
    );
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  res.json({
    success: true,
    message: `Đã xóa người dùng "${target.username}" thành công.`,
  });
});

module.exports = {
  getAll,
  getOne,
  create,
  update,
  toggleStatus,
  remove,
};
