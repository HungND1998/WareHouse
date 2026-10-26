import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { getRelativeTime } from './Badge';

// Âm thanh thông báo nhẹ nhàng tạo bằng Web Audio API (không cần file âm thanh ngoài)
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Không làm gián đoạn UI nếu trình duyệt chặn autoplay audio
  }
}

// Icon và màu sắc tương ứng cho từng loại hoạt động
function getNotificationMeta(type, _action) {
  switch (type) {
    case 'user':
      return { icon: '👤', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', label: 'Người dùng' };
    case 'product':
      return { icon: '📦', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Sản phẩm' };
    case 'inventory':
      return { icon: '▦', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Tồn kho' };
    case 'stock_in':
      return { icon: '📥', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', label: 'Nhập kho' };
    case 'stock_out':
      return { icon: '📤', color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Xuất kho' };
    case 'category':
      return { icon: '🗂️', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Danh mục' };
    case 'supplier':
      return { icon: '🏢', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', label: 'Nhà cung cấp' };
    case 'warehouse':
      return { icon: '▥', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', label: 'Kho hàng' };
    default:
      return { icon: '🔔', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Hệ thống' };
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [isAnimating, setIsAnimating] = useState(false);

  const prevLatestIdRef = useRef(null);
  const bellRef = useRef(null);
  const navigate = useNavigate();

  // 1. Tải danh sách thông báo đầy đủ khi mở dropdown
  const loadNotifications = useCallback(() => {
    setLoading(true);
    api
      .get('/notifications?limit=30')
      .then((res) => {
        setNotifications(res.data || []);
        setUnreadCount(res.unread_count || 0);
      })
      .catch((err) => {
        console.error('Lỗi khi tải thông báo:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Thăm dò (polling) số lượng thông báo chưa đọc định kỳ mỗi 8s
  const checkUnreadCount = useCallback(() => {
    api
      .get('/notifications/unread-count')
      .then((res) => {
        const count = res.data?.unread_count || 0;
        const latestId = res.data?.latest_id || null;

        // Nếu phát hiện có thông báo mới hơn lần trước
        if (prevLatestIdRef.current !== null && latestId && latestId > prevLatestIdRef.current) {
          setIsAnimating(true);
          playNotificationChime();
          setTimeout(() => setIsAnimating(false), 1200);

          // Nếu đang mở dropdown, tự refresh luôn danh sách
          if (open) {
            loadNotifications();
          }
        }

        prevLatestIdRef.current = latestId;
        setUnreadCount(count);
      })
      .catch(() => {
        // im lặng bỏ qua nếu lỗi mạng nhất thời
      });
  }, [open, loadNotifications]);

  // Polling chu kỳ 8 giây
  useEffect(() => {
    checkUnreadCount();
    const timer = setInterval(checkUnreadCount, 8000);
    return () => clearInterval(timer);
  }, [checkUnreadCount]);

  // Khi người dùng bấm mở dropdown
  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  // Đóng khi click ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Đánh dấu 1 thông báo đã đọc và chuyển hướng
  async function handleNotificationClick(item) {
    if (item.is_read === 0) {
      try {
        await api.post(`/notifications/${item.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Không thể đánh dấu đã đọc:', err);
      }
    }

    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  }

  // Đánh dấu tất cả là đã đọc
  async function handleMarkAllAsRead() {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err);
    }
  }

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => n.is_read === 0) : notifications;

  return (
    <div className="notification-bell-container" ref={bellRef} style={{ position: 'relative' }}>
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn-notification-trigger"
        aria-label="Thông báo hệ thống"
        title="Thông báo hoạt động hệ thống"
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 8,
          border: '1px solid var(--line-strong)',
          background: open ? '#f1f5f9' : '#ffffff',
          color: unreadCount > 0 ? '#1e293b' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 17,
          boxShadow: open ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'var(--shadow-sm)',
          transition: 'all 0.15s ease',
          transform: isAnimating ? 'scale(1.15) rotate(15deg)' : 'none',
        }}
      >
        <span style={{ display: 'inline-block', lineHeight: 1 }}>🔔</span>

        {/* Badge số lượng chưa đọc */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontSize: 10.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4)',
              border: '2px solid #ffffff',
              animation: 'pulse 1.8s infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Thông Báo */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 380,
            maxWidth: '92vw',
            background: '#ffffff',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 12px 30px -5px rgba(15, 23, 42, 0.22), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            zIndex: 1050,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 520,
            animation: 'menu-slide 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header Popover */}
          <div
            style={{
              padding: '12px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <strong style={{ fontSize: 14, color: 'var(--ink)' }}>Thông báo hoạt động</strong>
              {unreadCount > 0 && (
                <span
                  className="badge badge-danger"
                  style={{ fontSize: 11, padding: '1px 6px', fontWeight: 700 }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
                title="Đánh dấu tất cả thông báo là đã đọc"
              >
                ✓ Đã đọc hết
              </button>
            )}
          </div>

          {/* Filter Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--line)',
              background: '#ffffff',
              padding: '4px 8px',
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                background: filter === 'all' ? '#eff6ff' : 'transparent',
                color: filter === 'all' ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: filter === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                background: filter === 'unread' ? '#eff6ff' : 'transparent',
                color: filter === 'unread' ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: filter === 'unread' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Danh sách thông báo */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '6px 0',
              maxHeight: 380,
            }}
          >
            {loading && notifications.length === 0 && (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-faint)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 13 }}>Đang tải thông báo…</div>
              </div>
            )}

            {!loading && displayedNotifications.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                  {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
                  {filter === 'unread'
                    ? 'Bạn đã xem hết các thông báo gần nhất.'
                    : 'Các hoạt động thêm mới hoặc chỉnh sửa dữ liệu sẽ hiển thị tại đây.'}
                </div>
              </div>
            )}

            {displayedNotifications.map((item) => {
              const meta = getNotificationMeta(item.type, item.action);
              const isUnread = item.is_read === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: isUnread ? '#f0f9ff' : '#ffffff',
                    transition: 'background 0.12s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isUnread ? '#e0f2fe' : '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isUnread ? '#f0f9ff' : '#ffffff';
                  }}
                >
                  {/* Icon Loại hình */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: meta.bg,
                      color: meta.color,
                      border: `1px solid ${meta.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Nội dung thông báo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: meta.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                        {getRelativeTime(item.created_at) || 'vừa xong'}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isUnread ? 700 : 600,
                        color: 'var(--ink)',
                        marginTop: 2,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.message}
                    </div>

                    {/* Actor tag */}
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                      👤 Bởi <strong style={{ color: 'var(--ink)' }}>{item.actor_name || 'Hệ thống'}</strong>
                    </div>
                  </div>

                  {/* Chấm xanh báo chưa đọc */}
                  {isUnread && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        flexShrink: 0,
                        marginTop: 6,
                        boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)',
                      }}
                      title="Chưa đọc"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Dropdown */}
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderTop: '1px solid var(--line)',
              fontSize: 11.5,
              color: 'var(--text-faint)',
              textAlign: 'center',
            }}
          >
            Nhấp vào thông báo để chuyển nhanh tới màn hình tương ứng
          </div>
        </div>
      )}
    </div>
  );
}
