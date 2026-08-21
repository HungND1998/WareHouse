import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import UserDropdown from './UserDropdown';

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', icon: '◧', end: true },
  { to: '/products', label: 'Sản phẩm', icon: '▤' },
  { to: '/inventory', label: 'Tồn kho', icon: '▦' },
  { to: '/stock-in', label: 'Phiếu nhập', icon: '↓' },
  { to: '/stock-out', label: 'Phiếu xuất', icon: '↑' },
  { to: '/categories', label: 'Danh mục', icon: '▧' },
  { to: '/suppliers', label: 'Nhà cung cấp', icon: '▨' },
  { to: '/warehouses', label: 'Kho hàng', icon: '▥' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-container">
      {/* ========================================================================= */}
      {/* 1. DARK NAVY SIDEBAR                                                      */}
      {/* ========================================================================= */}
      <aside className="app-sidebar">
        {/* Brand Header */}
        <div className="app-sidebar-brand">
          <div className="app-sidebar-logo">
            <span style={{ color: 'var(--amber)', fontSize: 22, lineHeight: 1 }}>◈</span> KhoVận
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-on-ink-muted)', marginTop: 3, fontWeight: 500 }}>
            Hệ thống quản lý kho
          </div>
        </div>

        {/* Vertical Nav List */}
        <nav className="app-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 13px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                marginBottom: 4,
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive
                  ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                  : 'transparent',
                boxShadow: isActive ? '0 2px 10px rgba(37, 99, 235, 0.4)' : 'none',
                transform: isActive ? 'translateX(3px)' : 'none',
                transition: 'all 0.16s ease',
              })}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Copyright Info */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'var(--text-on-ink-muted)', textAlign: 'center' }}>
          KhoVận v2.0 · Sẵn sàng
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE (Header + Main + Footer)                                */}
      {/* ========================================================================= */}
      <div className="app-content">
        <header className="app-header">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: 'var(--primary)', fontSize: 16 }}>◈</span>
            <span>KhoVận Logistics · Quản lý xuất nhập tồn chuyên nghiệp</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '5px 11px',
                borderRadius: 6,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              📅 {(() => {
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                return `${days[now.getDay()]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
              })()}
            </div>

            {/* 👤 Dropdown User Menu */}
            <UserDropdown />
          </div>
        </header>

        {/* Content Outlet */}
        <main className="app-main">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>◈ KhoVận Logistics</span>
            <span>—</span>
            <span>Hệ thống quản lý xuất nhập tồn chuyên nghiệp</span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
            © {new Date().getFullYear()} Bản quyền thuộc Nguyễn Đình Hùng
          </div>
        </footer>
      </div>
    </div>
  );
}
