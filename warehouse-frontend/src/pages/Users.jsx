import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import StatCard from '../components/StatCard';
import TableState from '../components/TableState';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import PasswordInput from '../components/PasswordInput';
import { DateTime } from '../components/Badge';
import { exportToExcel } from '../utils/excelExport';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { push } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [togglingUser, setTogglingUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role: 'staff',
    is_active: 1,
    password: '',
    confirm_password: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const loadUsers = useCallback(() => {
    if (currentUser?.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get('/users')
      .then((res) => {
        setUsers(res.data || []);
        setError(null);
      })
      .catch((err) => {
        const msg = err.message || 'Không thể tải danh sách người dùng.';
        setError(msg);
        push(msg, 'error');
      })
      .finally(() => setLoading(false));
  }, [currentUser, push]);

  useEffect(() => {
    loadUsers();
    if (currentUser?.role === 'admin') {
      api.get('/roles').then((res) => setRoleOptions(res.data || [])).catch(() => {});
    }
  }, [loadUsers, currentUser]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // Open Create Modal
  function handleOpenCreate() {
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      role: 'staff',
      is_active: 1,
      password: '',
      confirm_password: '',
    });
    setFormErrors({});
    setModalOpen(true);
  }

  // Open Edit Modal
  function handleOpenEdit(user) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
      password: '',
      confirm_password: '',
    });
    setFormErrors({});
    setModalOpen(true);
  }

  // Form Validation
  function validateForm() {
    const errors = {};
    if (!editingUser) {
      if (!formData.username || !formData.username.trim()) {
        errors.username = 'Vui lòng nhập tên đăng nhập.';
      } else if (formData.username.trim().length < 3) {
        errors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự.';
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username.trim())) {
        errors.username = 'Chỉ cho phép chữ cái, chữ số, gạch dưới (_), gạch ngang (-) hoặc chấm (.).';
      }

      if (!formData.password) {
        errors.password = 'Vui lòng nhập mật khẩu khởi tạo.';
      } else if (formData.password.length < 6) {
        errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
      }

      if (formData.password && formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Mật khẩu xác nhận không khớp.';
      }
    } else {
      if (formData.password && formData.password.length < 6) {
        errors.password = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      }
      if (formData.password && formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Mật khẩu xác nhận không khớp.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Submit Create or Update
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingUser) {
        const payload = {
          full_name: formData.full_name.trim(),
          role: formData.role,
          is_active: Number(formData.is_active),
        };
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        await api.put(`/users/${editingUser.id}`, payload);
        push(`Đã cập nhật thông tin người dùng "${editingUser.username}" thành công!`);
      } else {
        const payload = {
          username: formData.username.trim().toLowerCase(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          is_active: Number(formData.is_active),
          password: formData.password.trim(),
        };

        await api.post('/users', payload);
        push(`Đã thêm người dùng "${payload.username}" thành công!`);
      }

      setModalOpen(false);
      loadUsers();
    } catch (err) {
      push(err.message || 'Thao tác không thành công.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Quick Toggle Status Modal Trigger
  function handleOpenToggleStatus(user) {
    if (user.id === currentUser?.id) {
      return push('Bạn không thể tự khóa tài khoản của chính mình.', 'error');
    }
    setTogglingUser(user);
  }

  // Execute Toggle Status after confirmation in popup
  async function handleConfirmToggleStatus() {
    if (!togglingUser) return;
    const targetUser = togglingUser;
    setStatusLoadingId(targetUser.id);
    try {
      const res = await api.patch(`/users/${targetUser.id}/status`);
      const newStatus = res?.data?.is_active ?? (targetUser.is_active === 1 ? 0 : 1);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: newStatus } : u))
      );
      push(
        res.message ||
          (newStatus === 0
            ? `Đã khóa tài khoản "${targetUser.username}" thành công!`
            : `Đã kích hoạt tài khoản "${targetUser.username}" thành công!`)
      );
      setTogglingUser(null);
      loadUsers();
    } catch (err) {
      push(err.message || 'Không thể đổi trạng thái tài khoản.', 'error');
    } finally {
      setStatusLoadingId(null);
    }
  }

  // Delete User Confirm
  async function handleConfirmDelete() {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      const res = await api.del(`/users/${deletingUser.id}`);
      push(res.message || `Đã xóa người dùng "${deletingUser.username}".`);
      setDeletingUser(null);
      loadUsers();
    } catch (err) {
      push(err.message || 'Không thể xóa người dùng.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  }

  // Filtered & Paginated
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchUsername = u.username.toLowerCase().includes(term);
        const matchFullName = u.full_name && u.full_name.toLowerCase().includes(term);
        if (!matchUsername && !matchFullName) return false;
      }
      // Role filter
      if (roleFilter && u.role !== roleFilter) return false;
      // Status filter
      if (statusFilter !== '' && String(u.is_active) !== statusFilter) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const staff = users.filter((u) => u.role === 'staff').length;
    const active = users.filter((u) => u.is_active === 1).length;
    const locked = users.filter((u) => u.is_active === 0).length;

    return { total, admins, staff, active, locked };
  }, [users]);

  // Export to Excel
  function handleExportExcel() {
    const exportDataRows = filteredUsers.length > 0 ? filteredUsers : users;
    if (exportDataRows.length === 0) {
      return push('Không có dữ liệu người dùng để xuất.', 'error');
    }

    const headers = [
      'STT',
      'Tên đăng nhập',
      'Họ và tên',
      'Vai trò',
      'Trạng thái',
      'Phiếu nhập đã tạo',
      'Phiếu xuất đã tạo',
      'Ngày tạo tài khoản',
    ];

    const data = exportDataRows.map((u, idx) => [
      idx + 1,
      u.username,
      u.full_name || '—',
      u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên kho',
      u.is_active === 1 ? 'Đang hoạt động' : 'Đã khóa',
      u.stock_in_count || 0,
      u.stock_out_count || 0,
      u.created_at || '—',
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel({
      filename: `Danh_sach_nguoi_dung_${dateStr}`,
      sheetName: 'Người dùng',
      title: 'DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG HỆ THỐNG KHO',
      subtitleInfo: [
        `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
        `Tổng số người dùng: ${exportDataRows.length} (Admin: ${stats.admins}, Staff: ${stats.staff})`,
      ],
      headers,
      data,
    });

    push('Đã xuất file Excel danh sách người dùng thành công!');
  }

  // Non-admin permission shield
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div
          className="card"
          style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: 36,
            textAlign: 'center',
            borderColor: 'var(--warn-border)',
            background: 'var(--warn-bg)',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ color: 'var(--warn)', marginBottom: 8 }}>Quyền truy cập bị giới hạn</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Trang Quản lý người dùng chỉ dành riêng cho <strong>Quản trị viên (Admin)</strong>.
            Tài khoản hiện tại của bạn là Nhân viên kho.
          </p>
          <a href="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            <span>◧</span> Quay về Trang tổng quan
          </a>
        </div>
      </div>
    );
  }

  // Get Initials for Avatar
  function getInitials(name, username) {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.trim().slice(0, 2).toUpperCase();
    }
    return (username || 'U').slice(0, 2).toUpperCase();
  }

  return (
    <div>
      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Hệ thống & Phân quyền</div>
          <h1>Quản lý người dùng</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Quản lý tài khoản, cấp quyền vai trò, mở/khóa tài khoản và theo dõi hoạt động người dùng trong hệ thống
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-excel" onClick={handleExportExcel} title="Tải danh sách Excel (.xlsx)">
            <span>📊</span> Xuất Excel
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <span>+</span> Thêm người dùng mới
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Tổng người dùng"
          value={stats.total}
          icon="👥"
          color="blue"
          subtext="Tài khoản đã tạo trong hệ thống"
        />
        <StatCard
          label="Quản trị viên"
          value={stats.admins}
          icon="🛡️"
          color="purple"
          subtext="Toàn quyền điều hành & cài đặt"
        />
        <StatCard
          label="Nhân viên kho"
          value={stats.staff}
          icon="👷"
          color="blue"
          subtext="Quản lý hàng hóa, xuất nhập tồn"
        />
        <StatCard
          label="Trạng thái tài khoản"
          value={`${stats.active} hoạt động`}
          icon={stats.locked > 0 ? '⚠️' : '✓'}
          color={stats.locked > 0 ? 'amber' : 'green'}
          subtext={stats.locked > 0 ? `${stats.locked} tài khoản đang bị khóa` : '100% tài khoản đang hoạt động'}
        />
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="filter-bar">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm theo username hoặc họ tên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                background: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              <option value="">Tất cả vai trò</option>
              {roleOptions.length > 0 ? (
                roleOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id === 'admin' ? '🛡️' : '👷'} {r.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="admin">🛡️ Quản trị viên (Admin)</option>
                  <option value="staff">👷 Nhân viên kho (Staff)</option>
                </>
              )}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-sm)',
                background: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">● Đang hoạt động</option>
              <option value="0">✕ Đang bị khóa</option>
            </select>

            {/* Reset Filters */}
            {(Boolean(search) || Boolean(roleFilter) || statusFilter !== '') && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                title="Xóa bộ lọc"
              >
                <span>✕</span> Đặt lại bộ lọc
              </button>
            )}
          </div>

          <div className="record-count">
            Tổng số: <strong>{filteredUsers.length}</strong> / {users.length} tài khoản
          </div>
        </div>
      </div>

      {loading && <div className="loading-bar" style={{ marginBottom: 16 }} />}

      {/* 4. Users Data Table */}
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>#</th>
                <th style={{ minWidth: 200 }}>Tài khoản</th>
                <th style={{ minWidth: 170 }}>Họ và tên</th>
                <th style={{ width: 140 }}>Vai trò</th>
                <th style={{ width: 150 }}>Trạng thái</th>
                <th style={{ minWidth: 170 }}>Chứng từ đã tạo</th>
                <th style={{ width: 170, minWidth: 170 }}>Ngày tạo</th>
                <th style={{ width: 160, minWidth: 160, textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                error={error}
                rows={filteredUsers}
                colSpan={8}
                emptyIcon="👥"
                isFiltered={Boolean(search.trim() || roleFilter || statusFilter !== '')}
                onClearFilter={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                emptyTitle="Chưa có người dùng nào"
                emptySubtext="Tạo tài khoản người dùng đầu tiên để quản lý và vận hành hệ thống kho."
                actionText="+ Thêm người dùng mới"
                onAction={handleOpenCreate}
                onRetry={loadUsers}
              />

              {!loading &&
                !error &&
                paginatedUsers.map((u, idx) => {
                  const isCurrent = u.id === currentUser?.id;
                  const initials = getInitials(u.full_name, u.username);
                  const isStatusLoading = statusLoadingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        background: isCurrent ? 'rgba(37, 99, 235, 0.025)' : undefined,
                      }}
                    >
                      {/* # Number */}
                      <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12.5, fontWeight: 600 }}>
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* Username + Avatar + Self badge */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background:
                                u.role === 'admin'
                                  ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                                  : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              flexShrink: 0,
                              boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>{u.username}</strong>
                              {isCurrent && (
                                <span
                                  className="badge badge-info"
                                  style={{
                                    fontSize: 10,
                                    padding: '1px 5px',
                                    fontWeight: 700,
                                  }}
                                >
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Full Name */}
                      <td>
                        <span style={{ fontWeight: 600, color: u.full_name ? 'var(--ink)' : 'var(--text-faint)' }}>
                          {u.full_name || '—'}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td>
                        {(() => {
                          const roleObj = roleOptions.find((r) => r.id === u.role);
                          const roleName = roleObj ? roleObj.name : u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên kho';
                          const isAdmin = u.role === 'admin';
                          return (
                            <span
                              className="badge"
                              style={{
                                background: isAdmin ? '#faf5ff' : '#eff6ff',
                                color: isAdmin ? '#7c3aed' : '#1d4ed8',
                                border: isAdmin ? '1px solid #e9d5ff' : '1px solid #bfdbfe',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span>{isAdmin ? '🛡️' : '👷'}</span> {roleName}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status + Quick Toggle */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.is_active === 1 ? (
                            <span
                              className="badge badge-ok"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 700,
                              }}
                            >
                              <span style={{ fontSize: 8 }}>●</span> Hoạt động
                            </span>
                          ) : (
                            <span
                              className="badge badge-danger"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 700,
                              }}
                            >
                              <span>✕</span> Đã khóa
                            </span>
                          )}

                          {!isCurrent && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenToggleStatus(u);
                              }}
                              disabled={isStatusLoading}
                              title={u.is_active === 1 ? 'Khóa tài khoản này' : 'Mở khóa tài khoản này'}
                              style={{
                                padding: '2px 8px',
                                fontSize: 11.5,
                                height: 26,
                                fontWeight: 600,
                                color: u.is_active === 1 ? '#c2410c' : '#15803d',
                                background: u.is_active === 1 ? '#fff7ed' : '#f0fdf4',
                                border: u.is_active === 1 ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                                cursor: isStatusLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isStatusLoading ? 'Đang lưu…' : u.is_active === 1 ? '🔒 Khóa' : '🔓 Mở khóa'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Documents Activity */}
                      <td>
                        <div style={{ fontSize: 12.5 }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            {(u.stock_in_count || 0) + (u.stock_out_count || 0)}
                          </span>{' '}
                          <span style={{ color: 'var(--text-faint)' }}>chứng từ</span>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                            ↓ {u.stock_in_count || 0} nhập · ↑ {u.stock_out_count || 0} xuất
                          </div>
                        </div>
                      </td>

                      {/* Creation Date */}
                      <td>
                        <DateTime value={u.created_at} prefix="Tạo" />
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(u)}
                            style={{ height: 26, minHeight: 26, padding: '0 8px', fontSize: 11.5 }}
                          >
                            ✏️ Sửa
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeletingUser(u)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Bạn không thể tự xóa tài khoản của chính mình' : 'Xóa tài khoản người dùng'}
                            style={{ height: 26, minHeight: 26, padding: '0 8px', fontSize: 11.5 }}
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filteredUsers.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          hideOnSinglePage={false}
        />
      </div>

      {/* 6. Form Modal (Create / Edit) */}
      {modalOpen && (
        <Modal
          title={editingUser ? `Chỉnh sửa tài khoản: ${editingUser.username}` : 'Thêm người dùng mới'}
          wide={600}
          onClose={() => setModalOpen(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={saving}
                style={{ minWidth: 130, fontWeight: 700 }}
              >
                {saving ? 'Đang lưu…' : editingUser ? 'Lưu thay đổi' : '+ Tạo người dùng'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit}>
            <div className="form-card" style={{ marginBottom: 0 }}>
              <div className="form-card-title">
                <span>Thông tin tài khoản</span>
                <span className="tag">{editingUser ? 'CHỈNH SỬA' : 'TẠO MỚI'}</span>
              </div>

              {/* Username field */}
              <div className="field" style={{ marginBottom: 14 }}>
                <label>
                  Tên đăng nhập <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: nguyenvana, kho_hn01..."
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    if (formErrors.username) setFormErrors({ ...formErrors, username: '' });
                  }}
                  disabled={Boolean(editingUser)}
                  style={{
                    background: editingUser ? '#f8fafc' : '#ffffff',
                    cursor: editingUser ? 'not-allowed' : 'text',
                  }}
                />
                {editingUser && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
                    ℹ️ Tên đăng nhập là định danh cố định và không thể thay đổi sau khi tạo.
                  </div>
                )}
                {formErrors.username && (
                  <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                    {formErrors.username}
                  </div>
                )}
              </div>

              {/* Full Name field */}
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Họ và tên người dùng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              {/* Role & Status Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {/* Role */}
                <div className="field">
                  <label>
                    Vai trò hệ thống <span style={{ color: 'var(--warn)' }}>*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      padding: '9px 12px',
                      border: '1px solid var(--line-strong)',
                      borderRadius: 'var(--radius-sm)',
                      background: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      width: '100%',
                    }}
                  >
                    {roleOptions.length > 0 ? (
                      roleOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id === 'admin' ? '🛡️' : '👷'} {r.name} ({r.id})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="staff">👷 Nhân viên kho (Staff)</option>
                        <option value="admin">🛡️ Quản trị viên (Admin)</option>
                      </>
                    )}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                    {formData.role === 'admin'
                      ? 'Toàn quyền quản trị kho, bảo mật & phân quyền'
                      : 'Được thiết lập quyền hạn chi tiết trong menu Phân quyền'}
                  </div>
                </div>

                {/* Status */}
                <div className="field">
                  <label>
                    Trạng thái hoạt động <span style={{ color: 'var(--warn)' }}>*</span>
                  </label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: Number(e.target.value) })}
                    disabled={editingUser && editingUser.id === currentUser?.id}
                    style={{
                      padding: '9px 12px',
                      border: '1px solid var(--line-strong)',
                      borderRadius: 'var(--radius-sm)',
                      background: editingUser && editingUser.id === currentUser?.id ? '#f8fafc' : '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      width: '100%',
                      cursor: editingUser && editingUser.id === currentUser?.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value={1}>● Đang hoạt động</option>
                    <option value={0}>✕ Đã khóa tài khoản</option>
                  </select>
                  {editingUser && editingUser.id === currentUser?.id && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                      ℹ️ Không thể khóa tài khoản đang đăng nhập
                    </div>
                  )}
                </div>
              </div>

              {/* Password Section */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                  marginTop: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔑</span>
                  <span>{editingUser ? 'Thay đổi mật khẩu' : 'Mật khẩu khởi tạo'}</span>
                  {editingUser && (
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-faint)' }}>
                      (Để trống nếu giữ nguyên mật khẩu hiện tại)
                    </span>
                  )}
                </div>

                {/* Password field */}
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>
                    {editingUser ? 'Mật khẩu mới' : 'Mật khẩu'} {!editingUser && <span style={{ color: 'var(--warn)' }}>*</span>}
                  </label>
                  <PasswordInput
                    placeholder={editingUser ? 'Nhập mật khẩu mới nếu muốn đổi…' : 'Tối thiểu 6 ký tự…'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                  />
                  {formErrors.password && (
                    <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                      {formErrors.password}
                    </div>
                  )}
                </div>

                {/* Confirm Password field */}
                {(formData.password || !editingUser) && (
                  <div className="field">
                    <label>
                      Xác nhận mật khẩu {!editingUser && <span style={{ color: 'var(--warn)' }}>*</span>}
                    </label>
                    <PasswordInput
                      placeholder="Nhập lại mật khẩu để xác nhận…"
                      value={formData.confirm_password}
                      onChange={(e) => {
                        setFormData({ ...formData, confirm_password: e.target.value });
                        if (formErrors.confirm_password) setFormErrors({ ...formErrors, confirm_password: '' });
                      }}
                    />
                    {formErrors.confirm_password && (
                      <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                        {formErrors.confirm_password}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={Boolean(deletingUser)}
        title="Xác nhận xóa tài khoản người dùng"
        itemName={deletingUser ? `${deletingUser.full_name || deletingUser.username} (@${deletingUser.username})` : ''}
        itemType="tài khoản người dùng"
        warningText="Lưu ý: Xóa người dùng là thao tác không thể khôi phục. Nếu người dùng này đã tạo chứng từ nhập/xuất kho, hệ thống sẽ yêu cầu bạn chuyển sang trạng thái Khóa tài khoản để bảo toàn lịch sử số liệu."
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingUser(null)}
        loading={deleteLoading}
      />

      {/* 8. Confirm Lock / Unlock User Modal */}
      {togglingUser && (
        <Modal
          title={
            togglingUser.is_active === 1
              ? '🔒 Xác nhận khóa tài khoản'
              : '🔓 Xác nhận mở khóa tài khoản'
          }
          wide={500}
          onClose={() => {
            if (!statusLoadingId) setTogglingUser(null);
          }}
          footer={
            <div
              className="modal-actions"
              style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 10 }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTogglingUser(null)}
                disabled={Boolean(statusLoadingId)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={Boolean(statusLoadingId)}
                className="btn"
                style={
                  togglingUser.is_active === 1
                    ? {
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        minWidth: 130,
                        fontWeight: 700,
                      }
                    : {
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        minWidth: 140,
                        fontWeight: 700,
                      }
                }
              >
                {statusLoadingId ? (
                  'Đang xử lý…'
                ) : togglingUser.is_active === 1 ? (
                  '🔒 Khóa tài khoản'
                ) : (
                  '🔓 Mở khóa tài khoản'
                )}
              </button>
            </div>
          }
        >
          <div style={{ padding: '6px 2px 2px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: togglingUser.is_active === 1 ? '#fff7ed' : '#f0fdf4',
                border:
                  togglingUser.is_active === 1 ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '14px 18px',
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                {togglingUser.is_active === 1 ? '⚠️' : '✅'}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: togglingUser.is_active === 1 ? '#9a3412' : '#166534',
                    marginBottom: 4,
                  }}
                >
                  {togglingUser.is_active === 1
                    ? 'Bạn có chắc chắn muốn khóa tài khoản này?'
                    : 'Bạn có muốn mở khóa cho tài khoản này?'}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: togglingUser.is_active === 1 ? '#7c2d12' : '#14532d',
                    fontWeight: 700,
                    wordBreak: 'break-word',
                  }}
                >
                  « {togglingUser.full_name || togglingUser.username} (@{togglingUser.username}) »
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                background: '#f8fafc',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '12px 14px',
              }}
            >
              {togglingUser.is_active === 1 ? (
                <>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--ink)' }}>
                    ℹ️ Sau khi bị khóa:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
                    <li>Người dùng sẽ không thể đăng nhập vào hệ thống.</li>
                    <li>Phiên làm việc hiện tại (nếu có) sẽ bị từ chối truy cập ngay lập tức.</li>
                    <li>
                      Lịch sử tạo phiếu và số liệu kho của người dùng này vẫn được lưu trữ nguyên vẹn.
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--ink)' }}>
                    ℹ️ Sau khi mở khóa:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
                    <li>Người dùng có thể đăng nhập bình thường vào hệ thống.</li>
                    <li>
                      Quyền hạn được áp dụng theo vai trò:{' '}
                      <strong>{togglingUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên kho'}</strong>.
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
