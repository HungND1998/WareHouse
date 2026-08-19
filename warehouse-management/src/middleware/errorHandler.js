// Bọc các hàm async controller để tự động bắt lỗi, khỏi phải try/catch lặp lại
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Middleware xử lý lỗi tập trung (đặt cuối cùng trong server.js)
function errorHandler(err, req, res, next) {
  console.error('❌', err.message);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ success: false, message: 'Dữ liệu bị trùng (unique constraint).' });
  }
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(400).json({ success: false, message: 'Ràng buộc dữ liệu không hợp lệ: ' + err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.',
  });
}

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

module.exports = { asyncHandler, errorHandler, AppError };
