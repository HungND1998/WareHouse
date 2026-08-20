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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)' }}>
      {/* ========================================================================= */}
      {/* 1. DARK NAVY SIDEBAR (Menu dọc chuẩn phong cách Đăng nhập Login)          */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          background: 'linear-gradient(180deg, #16283f 0%, #0f1e33 100%)',
          color: 'var(--text-on-ink)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxShadow: '2px 0 12px rgba(15, 30, 51, 0.15)',
          zIndex: 100,
        }}
      >
        {/* Brand Header — Giống hệt màn hình Login */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--amber)', fontSize: 22, lineHeight: 1 }}>◈</span> KhoVận
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-on-ink-muted)', marginTop: 3, fontWeight: 500 }}>
            Hệ thống quản lý kho
          </div>
        </div>

        {/* Vertical Nav List */}
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
                padding: '9px 13px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                marginBottom: 3,
                textDecoration: 'none',
                color: isActive ? 'var(--amber-ink)' : 'var(--text-on-ink-muted)',
                background: isActive
                  ? 'linear-gradient(135deg, #f5b041 0%, #e89b25 100%)'
                  : 'transparent',
                boxShadow: isActive ? '0 2px 10px rgba(242, 169, 59, 0.35)' : 'none',
                transform: isActive ? 'translateX(3px)' : 'none',
                transition: 'all 0.16s ease',
              })}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer — User & Logout */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
            {user?.full_name || user?.username}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-on-ink-muted)', marginBottom: 10, fontWeight: 500 }}>
            {user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên kho'}
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{
              width: '100%',
              color: 'var(--text-on-ink-muted)',
              borderColor: 'rgba(255,255,255,0.2)',
              background: 'transparent',
              justifyContent: 'center',
              fontSize: 12,
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE (Thanh Header trên + Nội dung)                         */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: '0 1px 3px rgba(15, 30, 51, 0.02)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: 'var(--amber)', fontSize: 16 }}>◈</span>
            <span>KhoVận Logistics · Quản lý xuất nhập tồn chuyên nghiệp</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '3px 9px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              📅 {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              Xin chào, <strong style={{ color: 'var(--ink)' }}>{user?.full_name || user?.username}</strong>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main
          style={{
            flex: 1,
            padding: '24px 32px 64px',
            maxWidth: 1600,
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
