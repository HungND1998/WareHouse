const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Thiếu token xác thực.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
    }
    next();
  };
}

function hasPermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Thiếu token xác thực.' });
    }
    // Admin luôn có toàn quyền tuyệt đối
    if (req.user.role === 'admin') {
      return next();
    }
    // Tra cứu quyền hạn của vai trò trong database
    const row = db
      .prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?')
      .get(req.user.role, permissionCode);

    if (!row) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này.',
        requiredPermission: permissionCode,
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize, hasPermission, JWT_SECRET };

