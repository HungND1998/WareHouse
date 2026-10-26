const db = require('../config/db');

/**
 * Ghi nhận một thông báo hoạt động mới vào hệ thống
 * @param {Object} options
 * @param {string} options.type - 'user' | 'product' | 'inventory' | 'stock_in' | 'stock_out' | 'category' | 'supplier' | 'warehouse'
 * @param {string} options.action - 'create' | 'update' | 'delete' | 'adjust'
 * @param {string} options.title - Tiêu đề thông báo
 * @param {string} options.message - Nội dung chi tiết
 * @param {string} [options.link] - Đường dẫn xem chi tiết (ví dụ: '/products', '/stock-in')
 * @param {number} [options.entity_id] - ID của bản ghi liên quan
 * @param {Object} [options.actor] - Thông tin người thực hiện (req.user)
 */
function createNotification({ type, action, title, message, link, entity_id = null, actor = null }) {
  try {
    let actorId = actor?.id || null;
    let actorName = actor?.full_name || actor?.username || 'Hệ thống';

    if (actorId && !actor?.full_name) {
      const u = db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(actorId);
      if (u) {
        actorName = u.full_name || u.username;
      }
    }

    db.prepare(`
      INSERT INTO notifications (type, action, title, message, link, entity_id, actor_id, actor_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type,
      action,
      title,
      message,
      link || null,
      entity_id,
      actorId,
      actorName
    );
  } catch (err) {
    console.error('❌ Lỗi khi ghi nhận thông báo:', err.message);
  }
}

module.exports = {
  createNotification,
};
