const db = require('../config/db');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /api/notifications
// Lấy danh sách thông báo kèm trạng thái đã đọc của người dùng hiện tại
const getAll = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  const notifications = db
    .prepare(`
      SELECT 
        n.id,
        n.type,
        n.action,
        n.title,
        n.message,
        n.link,
        n.entity_id,
        n.actor_id,
        n.actor_name,
        n.created_at,
        CASE WHEN nr.read_at IS NOT NULL THEN 1 ELSE 0 END AS is_read
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      ORDER BY n.id DESC
      LIMIT ?
    `)
    .all(userId, limit);

  const unreadCountRow = db
    .prepare(`
      SELECT COUNT(*) AS c
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE nr.read_at IS NULL
    `)
    .get(userId);

  res.json({
    success: true,
    data: notifications,
    unread_count: unreadCountRow ? unreadCountRow.c : 0,
  });
});

// GET /api/notifications/unread-count
// Endpoint siêu nhẹ phục vụ việc thăm dò (polling) định kỳ
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const row = db
    .prepare(`
      SELECT 
        COUNT(*) AS unread_count,
        MAX(n.id) AS latest_id
      FROM notifications n
      LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
      WHERE nr.read_at IS NULL
    `)
    .get(userId);

  res.json({
    success: true,
    data: {
      unread_count: row ? row.unread_count : 0,
      latest_id: row ? row.latest_id : null,
    },
  });
});

// POST /api/notifications/:id/read
// Đánh dấu 1 thông báo đã đọc
const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notificationId = Number(req.params.id);

  db.prepare(`
    INSERT OR IGNORE INTO notification_reads (notification_id, user_id)
    VALUES (?, ?)
  `).run(notificationId, userId);

  res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
});

// POST /api/notifications/read-all
// Đánh dấu tất cả thông báo đã đọc
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  db.prepare(`
    INSERT OR IGNORE INTO notification_reads (notification_id, user_id)
    SELECT id, ? FROM notifications
  `).run(userId);

  res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc.' });
});

module.exports = {
  getAll,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
