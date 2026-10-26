const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createNotification } = require('../utils/notification');

const MODULE_METAS = {
  products: { label: 'Sản phẩm & Giá', icon: '📦', description: 'Thông tin mặt hàng, giá vốn, giá niêm yết' },
  categories: { label: 'Danh mục', icon: '🗂️', description: 'Phân loại nhóm hàng hóa trong kho' },
  suppliers: { label: 'Nhà cung cấp', icon: '🏢', description: 'Đối tác cung ứng hàng hóa' },
  warehouses: { label: 'Cơ sở kho hàng', icon: '▥', description: 'Quản lý các địa điểm và chi nhánh kho' },
  stock_in: { label: 'Phiếu nhập kho', icon: '📥', description: 'Quy trình nhập hàng từ nhà cung cấp' },
  stock_out: { label: 'Phiếu xuất kho', icon: '📤', description: 'Quy trình xuất kho cho khách hàng/đối tác' },
  inventory: { label: 'Tồn kho & Báo cáo', icon: '▦', description: 'Số lượng tồn thực tế, thẻ kho, dashboard' },
  users: { label: 'Quản lý người dùng', icon: '👥', description: 'Tài khoản nhân sự và bảo mật' },
  roles: { label: 'Phân quyền hệ thống', icon: '🛡️', description: 'Cấu hình và thiết lập quyền hạn vai trò' },
};

// GET /api/roles - Lấy danh sách vai trò kèm thống kê
const getAll = asyncHandler(async (req, res) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY is_system DESC, name ASC').all();
  const totalPerms = db.prepare('SELECT count(*) AS c FROM permissions').get().c;

  const rolesWithStats = roles.map((r) => {
    const userCount = db.prepare('SELECT count(*) AS c FROM users WHERE role = ?').get(r.id).c;
    const permCount = db.prepare('SELECT count(*) AS c FROM role_permissions WHERE role_id = ?').get(r.id).c;
    return {
      ...r,
      user_count: userCount,
      permission_count: r.id === 'admin' ? totalPerms : permCount,
      total_permissions: totalPerms,
    };
  });

  res.json({ success: true, data: rolesWithStats });
});

// GET /api/roles/permissions - Danh sách quyền hạn toàn hệ thống (nhóm theo module)
const getPermissionsMatrix = asyncHandler(async (req, res) => {
  const allPerms = db.prepare('SELECT * FROM permissions ORDER BY module ASC, id ASC').all();

  const grouped = {};
  for (const p of allPerms) {
    if (!grouped[p.module]) {
      grouped[p.module] = {
        module: p.module,
        ...(MODULE_METAS[p.module] || { label: p.module, icon: '⚙️', description: '' }),
        permissions: [],
      };
    }
    grouped[p.module].permissions.push(p);
  }

  res.json({
    success: true,
    data: {
      modules: Object.values(grouped),
      total: allPerms.length,
      module_metas: MODULE_METAS,
    },
  });
});

// GET /api/roles/my-permissions - Lấy danh sách quyền hạn của người dùng đang đăng nhập
const getMyPermissions = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const all = db.prepare('SELECT id FROM permissions').all();
    return res.json({ success: true, data: all.map((p) => p.id), role: 'admin' });
  }

  const rows = db
    .prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?')
    .all(req.user.role);

  res.json({
    success: true,
    data: rows.map((r) => r.permission_id),
    role: req.user.role,
  });
});

// GET /api/roles/:id - Chi tiết 1 vai trò kèm danh sách quyền đã cấp
const getOne = asyncHandler(async (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) throw new AppError('Không tìm thấy vai trò này.', 404);

  const grantedRows = db
    .prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?')
    .all(role.id);

  const assignedUsers = db
    .prepare('SELECT id, username, full_name, is_active, created_at FROM users WHERE role = ?')
    .all(role.id);

  res.json({
    success: true,
    data: {
      ...role,
      permissions: grantedRows.map((r) => r.permission_id),
      users: assignedUsers,
    },
  });
});

// PUT /api/roles/:id/permissions - Cập nhật phân quyền cho vai trò
const updatePermissions = asyncHandler(async (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) throw new AppError('Không tìm thấy vai trò này.', 404);

  const { permissions } = req.body;
  if (!Array.isArray(permissions)) {
    throw new AppError('Danh sách quyền hạn không hợp lệ.');
  }

  // Vai trò admin hệ thống luôn giữ toàn quyền để tránh mất quyền quản trị
  if (role.id === 'admin') {
    const allPerms = db.prepare('SELECT id FROM permissions').all().map((p) => p.id);
    return res.json({
      success: true,
      message: 'Vai trò Quản trị viên (Admin) luôn sở hữu toàn bộ quyền hạn hệ thống.',
      data: { role_id: role.id, permissions: allPerms },
    });
  }

  const validPerms = db.prepare('SELECT id FROM permissions').all().map((p) => p.id);
  const toInsert = permissions.filter((p) => validPerms.includes(p));

  const applyTx = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role.id);
    const insertStmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const pid of toInsert) {
      insertStmt.run(role.id, pid);
    }
  });

  applyTx();

  createNotification({
    type: 'role',
    action: 'update',
    title: 'Cập nhật phân quyền',
    message: `Đã thiết lập lại quyền hạn cho vai trò "${role.name}" (${toInsert.length} quyền).`,
    link: '/roles',
    actor: req.user,
  });

  res.json({
    success: true,
    message: `Đã cập nhật phân quyền cho vai trò "${role.name}" thành công!`,
    data: { role_id: role.id, permissions: toInsert },
  });
});

// POST /api/roles/:id/reset - Khôi phục quyền mặc định
const resetPermissions = asyncHandler(async (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) throw new AppError('Không tìm thấy vai trò này.', 404);

  let defaultPerms = [];
  if (role.id === 'admin') {
    defaultPerms = db.prepare('SELECT id FROM permissions').all().map((p) => p.id);
  } else {
    defaultPerms = [
      'products.view',
      'categories.view',
      'suppliers.view',
      'warehouses.view',
      'stock_in.view',
      'stock_in.create',
      'stock_in.export',
      'stock_out.view',
      'stock_out.create',
      'stock_out.export',
      'inventory.view',
      'inventory.transactions',
      'inventory.dashboard',
      'inventory.export',
    ];
  }

  const applyTx = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role.id);
    const insertStmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const pid of defaultPerms) {
      insertStmt.run(role.id, pid);
    }
  });

  applyTx();

  createNotification({
    type: 'role',
    action: 'update',
    title: 'Khôi phục phân quyền',
    message: `Đã khôi phục quyền hạn mặc định cho vai trò "${role.name}".`,
    link: '/roles',
    actor: req.user,
  });

  res.json({
    success: true,
    message: `Đã khôi phục quyền hạn mặc định cho vai trò "${role.name}".`,
    data: { role_id: role.id, permissions: defaultPerms },
  });
});

// POST /api/roles - Tạo vai trò mới
const createRole = asyncHandler(async (req, res) => {
  const { id, name, description, copy_from } = req.body;
  if (!id || !name) throw new AppError('Vui lòng nhập mã vai trò và tên vai trò.');

  const roleId = String(id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (['admin', 'staff'].includes(roleId)) {
    throw new AppError('Mã vai trò này đã được dành riêng cho hệ thống.');
  }

  const existing = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId);
  if (existing) throw new AppError('Mã vai trò đã tồn tại trong hệ thống.');

  const createTx = db.transaction(() => {
    db.prepare('INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, 0)').run(
      roleId,
      name.trim(),
      description?.trim() || null
    );

    // Sao chép quyền từ vai trò mẫu nếu có
    if (copy_from) {
      const srcPerms = db
        .prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?')
        .all(copy_from);
      const insertStmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
      for (const p of srcPerms) {
        insertStmt.run(roleId, p.permission_id);
      }
    }
  });

  createTx();

  const newRole = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);

  createNotification({
    type: 'role',
    action: 'create',
    title: 'Thêm vai trò mới',
    message: `Đã tạo vai trò người dùng mới "${newRole.name}" (${newRole.id}).`,
    link: '/roles',
    actor: req.user,
  });

  res.status(201).json({ success: true, data: newRole, message: 'Tạo vai trò mới thành công!' });
});

// DELETE /api/roles/:id - Xóa vai trò tùy biến
const deleteRole = asyncHandler(async (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) throw new AppError('Không tìm thấy vai trò này.', 404);

  if (role.is_system === 1 || ['admin', 'staff'].includes(role.id)) {
    throw new AppError('Không thể xóa vai trò mặc định của hệ thống.');
  }

  const userCount = db.prepare('SELECT count(*) AS c FROM users WHERE role = ?').get(role.id).c;
  if (userCount > 0) {
    throw new AppError(`Không thể xóa vai trò vì đang có ${userCount} người dùng thuộc vai trò này.`);
  }

  db.prepare('DELETE FROM roles WHERE id = ?').run(role.id);

  createNotification({
    type: 'role',
    action: 'delete',
    title: 'Xóa vai trò',
    message: `Đã xóa vai trò "${role.name}" khỏi hệ thống.`,
    link: '/roles',
    actor: req.user,
  });

  res.json({ success: true, message: `Đã xóa vai trò "${role.name}".` });
});

module.exports = {
  getAll,
  getPermissionsMatrix,
  getMyPermissions,
  getOne,
  updatePermissions,
  resetPermissions,
  createRole,
  deleteRole,
};
