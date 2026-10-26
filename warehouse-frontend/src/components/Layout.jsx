import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import UserDropdown from './UserDropdown';
import NotificationBell from './NotificationBell';

const NAV_SECTIONS = [
  {
    title: 'TỔNG QUAN',
    items: [
      { to: '/', label: 'Bảng điều khiển', icon: '📊', end: true, perm: 'inventory.dashboard' },
    ],
  },
  {
    title: 'KHO & HÀNG HÓA',
    items: [
      { to: '/products', label: 'Sản phẩm', icon: '📦', perm: 'products.view' },
      { to: '/inventory', label: 'Tồn kho', icon: '📋', perm: 'inventory.view' },
      { to: '/stock-in', label: 'Phiếu nhập kho', icon: '📥', perm: 'stock_in.view' },
      { to: '/stock-out', label: 'Phiếu xuất kho', icon: '📤', perm: 'stock_out.view' },
    ],
  },
  {
    title: 'DANH MỤC & ĐỐI TÁC',
    items: [
      { to: '/categories', label: 'Danh mục hàng', icon: '🏷️', perm: 'categories.view' },
      { to: '/suppliers', label: 'Nhà cung cấp', icon: '🏢', perm: 'suppliers.view' },
      { to: '/warehouses', label: 'Kho lưu trữ', icon: '🏬', perm: 'warehouses.view' },
    ],
  },
  {
    title: 'HỆ THỐNG QUẢN TRỊ',
    items: [
      { to: '/users', label: 'Tài khoản người dùng', icon: '👥', adminOnly: true, perm: 'users.view' },
      { to: '/roles', label: 'Phân quyền vai trò', icon: '🛡️', adminOnly: true, perm: 'roles.view' },
    ],
  },
];

const ROUTE_TITLES = {
  '/': { title: 'Bảng điều khiển', subtitle: 'Tổng quan tồn kho và hoạt động vận hành' },
  '/products': { title: 'Quản lý Sản phẩm', subtitle: 'Danh mục mặt hàng, giá bán và định mức tồn kho' },
  '/inventory': { title: 'Báo cáo Tồn kho', subtitle: 'Kiểm soát số lượng tồn theo từng vị trí kho' },
  '/stock-in': { title: 'Phiếu Nhập kho', subtitle: 'Lịch sử tiếp nhận hàng hóa từ đối tác' },
  '/stock-out': { title: 'Phiếu Xuất kho', subtitle: 'Lịch sử xuất giao hàng và điều chuyển' },
  '/categories': { title: 'Danh mục Hàng hóa', subtitle: 'Phân loại nhóm sản phẩm trong hệ thống' },
  '/suppliers': { title: 'Nhà Cung cấp', subtitle: 'Đối tác cung ứng hàng hóa và thông tin liên hệ' },
  '/warehouses': { title: 'Hệ thống Kho hàng', subtitle: 'Cơ sở lưu trữ và phân phối hàng hóa' },
  '/users': { title: 'Quản lý Người dùng', subtitle: 'Danh sách tài khoản và phân cấp nhân sự' },
  '/roles': { title: 'Phân quyền Truy cập', subtitle: 'Ma trận quyền hạn chi tiết theo từng vai trò' },
};

export default function Layout() {
  const { user, hasPerm } = useAuth();
  const location = useLocation();

  // Kiểm tra quyền hiển thị từng mục
  const canSeeItem = (item) => {
    if (user?.role === 'admin') return true;
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.perm) return hasPerm(item.perm);
    return true;
  };

  const currentRouteMeta = ROUTE_TITLES[location.pathname] || {
    title: 'KhoVận Logistics',
    subtitle: 'Hệ thống quản lý xuất nhập tồn',
  };

  return (
    <div className="app-container">
      {/* ========================================================================= */}
      {/* 1. MODERN SLATE SIDEBAR                                                   */}
      {/* ========================================================================= */}
      <aside className="app-sidebar">
        {/* Brand Header */}
        <div className="app-sidebar-brand">
          <div className="app-sidebar-logo">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
              }}
            >
              ◈
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
                KhoVận
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
                Quản lý kho thông minh
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Nav List grouped by sections */}
        <nav className="app-sidebar-nav">
          {NAV_SECTIONS.map((sec) => {
            const visibleItems = sec.items.filter(canSeeItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.title} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '0 12px 6px',
                  }}
                >
                  {sec.title}
                </div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: isActive ? 700 : 500,
                      marginBottom: 3,
                      textDecoration: 'none',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      background: isActive
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : 'transparent',
                      boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
                      transition: 'all 0.15s ease',
                    })}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="app-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: user?.role === 'admin' ? '#7c3aed' : '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.full_name || user?.username}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE (Header + Main + Footer)                                */}
      {/* ========================================================================= */}
      <div className="app-content">
        <header className="app-header">
          {/* Breadcrumb & Current Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>KhoVận</span>
              <span>/</span>
              <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                {currentRouteMeta.title}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text-muted)',
                background: '#ffffff',
                border: '1px solid var(--line-strong)',
                padding: '6px 12px',
                borderRadius: 8,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span>📅</span>
              <span>
                {(() => {
                  const now = new Date();
                  const pad = (n) => String(n).padStart(2, '0');
                  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  return `${days[now.getDay()]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
                })()}
              </span>
            </div>

            {/* 🔔 Chuông Thông Báo Hoạt Động */}
            <NotificationBell />

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
            <span>Hệ thống quản lý xuất nhập tồn thông minh</span>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
            © {new Date().getFullYear()} Bản quyền thuộc Nguyễn Đình Hùng
          </div>
        </footer>
      </div>
    </div>
  );
}
