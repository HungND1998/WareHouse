import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          background: 'var(--ink)',
          color: 'var(--text-on-ink)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.03em',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--amber)' }}>◈</span> KHOVẬN
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-on-ink-muted)', marginTop: 3, letterSpacing: '0.08em' }}>
            HỆ THỐNG QUẢN LÝ KHO
          </div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 12px',
                borderRadius: 4,
                fontSize: 13.5,
                fontWeight: 500,
                marginBottom: 2,
                textDecoration: 'none',
                color: isActive ? 'var(--ink)' : 'var(--text-on-ink-muted)',
                background: isActive ? 'var(--amber)' : 'transparent',
                transition: 'background 0.12s ease, color 0.12s ease',
              })}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user?.full_name || user?.username}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-on-ink-muted)', marginBottom: 10 }}>
            {user?.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN'}
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', color: 'var(--text-on-ink-muted)', borderColor: 'rgba(255,255,255,0.18)' }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '28px 32px 60px' }}>
        <Outlet />
      </main>
    </div>
  );
}
