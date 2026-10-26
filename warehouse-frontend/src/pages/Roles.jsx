import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { formatDateTime } from '../components/Badge';
import Pagination from '../components/Pagination';
import TableState from '../components/TableState';

/**
 * Checkbox 3 trạng thái chuẩn HTML (Checked / Unchecked / Indeterminate)
 */
function TriStateCheckbox({ checked, indeterminate, disabled, onChange, title, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={onChange}
      title={title}
      style={{
        width: 17,
        height: 17,
        cursor: disabled ? 'default' : 'pointer',
        accentColor: 'var(--primary)',
        ...style,
      }}
    />
  );
}

export default function Roles() {
  const { user: currentUser, reloadPermissions } = useAuth();
  const { push } = useToast();

  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [totalPerms, setTotalPerms] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selected role state
  const [selectedRoleId, setSelectedRoleId] = useState('staff');
  const [selectedRoleData, setSelectedRoleData] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [originalPerms, setOriginalPerms] = useState(new Set());

  // UI state
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'users'
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Tab 2 (Users) Pagination
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // Tree View State
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'view' | 'create' | 'edit' | 'delete' | 'special'
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'grid'

  // Modal create role
  const [createModal, setCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({ id: '', name: '', description: '', copy_from: 'staff' });
  const [creatingRole, setCreatingRole] = useState(false);

  // Load roles & permission definitions
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);
      const loadedMods = permsRes.data?.modules || [];
      setRoles(rolesRes.data || []);
      setModules(loadedMods);
      setTotalPerms(permsRes.data?.total || 0);
      setExpandedModules(new Set(loadedMods.map((m) => m.module)));
    } catch (err) {
      push(err.message || 'Không thể tải danh mục phân quyền.', 'error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load specific role data when selectedRoleId changes
  const loadRoleDetail = useCallback(async (roleId) => {
    try {
      const res = await api.get(`/roles/${roleId}`);
      setSelectedRoleData(res.data);
      const permSet = new Set(res.data.permissions || []);
      setSelectedPerms(permSet);
      setOriginalPerms(new Set(res.data.permissions || []));
    } catch (err) {
      push(err.message || 'Không thể tải thông tin vai trò.', 'error');
    }
  }, [push]);

  useEffect(() => {
    if (selectedRoleId) {
      loadRoleDetail(selectedRoleId);
      setUserPage(1);
    }
  }, [selectedRoleId, loadRoleDetail]);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedRoleId === 'admin') return false;
    if (selectedPerms.size !== originalPerms.size) return true;
    for (const p of selectedPerms) {
      if (!originalPerms.has(p)) return true;
    }
    return false;
  }, [selectedPerms, originalPerms, selectedRoleId]);

  // Toggle single permission
  function togglePermission(permId) {
    if (selectedRoleId === 'admin') {
      return push('Quản trị viên (Admin) luôn sở hữu toàn bộ quyền hạn hệ thống.', 'info');
    }
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }

  // Toggle all permissions in a module
  function toggleModule(modulePerms) {
    if (selectedRoleId === 'admin') return;
    const allSelected = modulePerms.every((p) => selectedPerms.has(p.id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  }

  // Select all or deselect all
  function handleSelectAll(select) {
    if (selectedRoleId === 'admin') return;
    if (select) {
      const allIds = modules.flatMap((m) => m.permissions.map((p) => p.id));
      setSelectedPerms(new Set(allIds));
    } else {
      setSelectedPerms(new Set());
    }
  }

  // Save changes
  async function handleSavePermissions() {
    if (selectedRoleId === 'admin') {
      return push('Vai trò Admin luôn có toàn quyền.', 'info');
    }
    setSaving(true);
    try {
      const payload = { permissions: Array.from(selectedPerms) };
      await api.put(`/roles/${selectedRoleId}/permissions`, payload);
      push('Cập nhật phân quyền thành công! Quyền hạn mới đã có hiệu lực.');
      setOriginalPerms(new Set(selectedPerms));
      reloadPermissions();
      // Refresh role list stats
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data || []);
    } catch (err) {
      push(err.message || 'Không thể lưu phân quyền.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Reset to default
  async function handleResetDefault() {
    if (selectedRoleId === 'admin') return;
    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục quyền mặc định cho vai trò "${selectedRoleData?.name}"?`)) {
      return;
    }
    setResetting(true);
    try {
      const res = await api.post(`/roles/${selectedRoleId}/reset`);
      push(res.message || 'Đã khôi phục quyền mặc định!');
      const newPerms = new Set(res.data?.permissions || []);
      setSelectedPerms(newPerms);
      setOriginalPerms(new Set(newPerms));
      reloadPermissions();
      const rolesRes = await api.get('/roles');
      setRoles(rolesRes.data || []);
    } catch (err) {
      push(err.message || 'Không thể khôi phục quyền mặc định.', 'error');
    } finally {
      setResetting(false);
    }
  }

  // Create new role
  async function handleCreateRole(e) {
    e.preventDefault();
    if (!newRole.id || !newRole.name) {
      return push('Vui lòng điền mã và tên vai trò.', 'error');
    }
    setCreatingRole(true);
    try {
      const res = await api.post('/roles', newRole);
      push('Tạo vai trò mới thành công!');
      setCreateModal(false);
      setNewRole({ id: '', name: '', description: '', copy_from: 'staff' });
      await loadInitialData();
      setSelectedRoleId(res.data.id);
    } catch (err) {
      push(err.message || 'Không thể tạo vai trò mới.', 'error');
    } finally {
      setCreatingRole(false);
    }
  }

  // Toggle expansion of 1 module in tree
  function toggleExpand(moduleId) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  // Expand all tree modules
  function expandAll() {
    setExpandedModules(new Set(modules.map((m) => m.module)));
  }

  // Collapse all tree modules
  function collapseAll() {
    setExpandedModules(new Set());
  }

  // Action Icon helper
  function getActionIcon(action) {
    switch (action) {
      case 'view': return '👁️';
      case 'create': return '➕';
      case 'edit': return '✏️';
      case 'delete': return '🗑️';
      case 'special': return '🔒';
      default: return '⚙️';
    }
  }

  // Filter modules/permissions by search keyword and action filter
  const filteredModules = useMemo(() => {
    const term = search.trim().toLowerCase();
    return modules
      .map((m) => {
        let perms = m.permissions;
        if (actionFilter !== 'all') {
          perms = perms.filter((p) => p.action === actionFilter);
        }
        if (term) {
          const matchModule = m.label?.toLowerCase().includes(term) || m.module?.toLowerCase().includes(term);
          if (!matchModule) {
            perms = perms.filter(
              (p) =>
                p.name?.toLowerCase().includes(term) ||
                p.id?.toLowerCase().includes(term) ||
                p.action?.toLowerCase().includes(term)
            );
          }
        }
        if (perms.length === 0) return null;
        return { ...m, permissions: perms };
      })
      .filter(Boolean);
  }, [modules, search, actionFilter]);

  // Auto-expand all matching modules when searching or filtering
  useEffect(() => {
    if (search.trim() || actionFilter !== 'all') {
      setExpandedModules(new Set(modules.map((m) => m.module)));
    }
  }, [search, actionFilter, modules]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const assignedUsers = selectedRoleData?.users || [];
  const paginatedAssignedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return assignedUsers.slice(start, start + userPageSize);
  }, [assignedUsers, userPage, userPageSize]);
  const activePermsCount = selectedRoleId === 'admin' ? totalPerms : selectedPerms.size;
  const coveragePercent = totalPerms > 0 ? Math.round((activePermsCount / totalPerms) * 100) : 0;

  // Toggle master root checkbox (All 34 permissions)
  const isAllRootGranted = totalPerms > 0 && activePermsCount === totalPerms;
  const isSomeRootGranted = activePermsCount > 0 && activePermsCount < totalPerms;

  function handleToggleRoot() {
    if (selectedRoleId === 'admin') return;
    if (isAllRootGranted) {
      handleSelectAll(false);
    } else {
      handleSelectAll(true);
    }
  }

  // Render badge by action type
  function renderActionBadge(action) {
    switch (action) {
      case 'view':
        return <span className="badge badge-info" style={{ fontSize: 10.5, padding: '2px 7px', fontWeight: 700 }}>XEM</span>;
      case 'create':
        return <span className="badge badge-success" style={{ fontSize: 10.5, padding: '2px 7px', fontWeight: 700 }}>THÊM</span>;
      case 'edit':
        return <span className="badge badge-warning" style={{ fontSize: 10.5, padding: '2px 7px', fontWeight: 700 }}>SỬA</span>;
      case 'delete':
        return <span className="badge badge-danger" style={{ fontSize: 10.5, padding: '2px 7px', fontWeight: 700 }}>XÓA</span>;
      case 'special':
      default:
        return (
          <span
            className="badge"
            style={{
              fontSize: 10.5,
              padding: '2px 7px',
              background: '#f3e8ff',
              color: '#7e22ce',
              borderColor: '#e9d5ff',
              fontWeight: 700,
            }}
          >
            ĐẶC BIỆT
          </span>
        );
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">Bảo mật & Phân quyền hệ thống</div>
          <h1>Quản lý vai trò & Phân quyền truy cập</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCreateModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>+</span> Thêm vai trò
          </button>

          {selectedRoleId !== 'admin' && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleResetDefault}
              disabled={resetting}
              title="Khôi phục quyền theo tiêu chuẩn hệ thống"
            >
              <span>↺</span> {resetting ? 'Đang khôi phục…' : 'Mặc định'}
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSavePermissions}
            disabled={saving || !hasUnsavedChanges || selectedRoleId === 'admin'}
            style={{ minWidth: 140, fontWeight: 700 }}
          >
            {saving ? 'Đang lưu…' : hasUnsavedChanges ? '💾 Lưu thay đổi (*)' : '✓ Đã lưu quyền'}
          </button>
        </div>
      </div>

      {/* Loading Overlay State */}
      {loading ? (
        <div className="card" style={{ padding: '64px 20px', textAlign: 'center', background: '#ffffff' }}>
          <div className="table-state-box loading">
            <div className="spinner-wrap">
              <div className="spinner-pulse" />
              <div className="spinner" />
            </div>
            <div className="state-title">Đang tải cấu hình phân quyền…</div>
            <div className="state-subtext">Hệ thống đang tải danh sách vai trò và cây ma trận phân quyền từ máy chủ.</div>
            <span className="state-badge-loading">⏳ Đang xử lý...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard
              label="Tổng số vai trò"
              value={roles.length}
              icon="🛡️"
              color="blue"
              subtext="Các nhóm quyền trong hệ thống"
            />
        <StatCard
          label="Vai trò đang chọn"
          value={selectedRole?.name || '—'}
          icon={selectedRole?.id === 'admin' ? '👑' : '📦'}
          color={selectedRole?.id === 'admin' ? 'purple' : 'cyan'}
          valueStyle={{ fontSize: 20 }}
          subtext={`${activePermsCount} / ${totalPerms} quyền được cấp (${coveragePercent}%)`}
        />
        <StatCard
          label="Nhân sự thuộc vai trò"
          value={assignedUsers.length}
          icon="👥"
          color="green"
          subtext="Tài khoản đang gán vai trò này"
        />
        <StatCard
          label="Trạng thái phân quyền"
          value={selectedRoleId === 'admin' ? 'Toàn quyền' : hasUnsavedChanges ? 'Chưa lưu' : 'Đồng bộ'}
          icon={hasUnsavedChanges ? '⚠️' : '✓'}
          color={hasUnsavedChanges ? 'amber' : 'green'}
          subtext={hasUnsavedChanges ? 'Có thay đổi quyền hạn chưa lưu' : 'Quyền hạn đã đồng bộ ở backend'}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Role Selector & Overview                                    */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Danh sách vai trò
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId;
                const rPermsCount = r.id === 'admin' ? totalPerms : r.permission_count;
                const rPercent = totalPerms > 0 ? Math.round((rPermsCount / totalPerms) * 100) : 0;

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        if (!window.confirm('Bạn có thay đổi chưa lưu cho vai trò hiện tại. Chuyển vai trò sẽ bỏ qua các thay đổi này?')) {
                          return;
                        }
                      }
                      setSelectedRoleId(r.id);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--line-strong)',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{r.id === 'admin' ? '👑' : '🛡️'}</span>
                        <strong style={{ fontSize: 14, color: isSelected ? 'var(--primary)' : 'var(--ink)' }}>
                          {r.name}
                        </strong>
                      </div>
                      <span className="badge badge-info" style={{ padding: '2px 7px', fontSize: 11 }}>
                        {r.user_count} người
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                      {r.description || 'Không có mô tả chi tiết.'}
                    </div>

                    {/* Permission coverage bar */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 4 }}>
                        <span>Quyền hạn</span>
                        <span>{rPermsCount} / {totalPerms} ({rPercent}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${rPercent}%`,
                            height: '100%',
                            background: r.id === 'admin' ? 'linear-gradient(90deg, #7e22ce, #9333ea)' : 'linear-gradient(90deg, #2563eb, #3b82f6)',
                            borderRadius: 3,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCreateModal(true)}
              style={{ width: '100%', marginTop: 12, borderStyle: 'dashed', fontSize: 13, fontWeight: 600 }}
            >
              <span>+</span> Thêm vai trò tùy biến
            </button>
          </div>

          {/* Quick Notice Card */}
          <div className="card" style={{ padding: 16, background: '#f8fafc', borderColor: '#cbd5e1' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
              <span>💡</span> Cơ chế bảo mật đa lớp
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
              Mọi quyền hạn bạn thiết lập tại đây sẽ được <strong>kiểm tra trực tiếp tại Backend</strong> trước khi dữ liệu được xử lý.
              Nhân viên bị hạn chế quyền sẽ nhận phản hồi <code>403 Forbidden</code> ngay lập tức.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Permission Matrix or Assigned Users Tabs                    */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Unsaved Changes Banner */}
          {hasUnsavedChanges && (
            <div
              style={{
                padding: '10px 16px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                animation: 'fade-in 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                <span>⚠️</span>
                <span>Bạn có thay đổi phân quyền chưa được lưu cho vai trò <strong>{selectedRole?.name}</strong>.</span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSavePermissions}
                disabled={saving}
                style={{ fontWeight: 700 }}
              >
                {saving ? 'Đang lưu…' : 'Lưu thay đổi ngay'}
              </button>
            </div>
          )}

          {/* Role Header Banner */}
          <div className="card" style={{ padding: '16px 20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: 18, margin: 0, color: 'var(--ink)' }}>
                    Vai trò: {selectedRole?.name}
                  </h2>
                  <span className="sku-chip">{selectedRole?.id}</span>
                  {selectedRole?.is_system === 1 && (
                    <span className="badge badge-info" style={{ fontSize: 11 }}>HỆ THỐNG</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  {selectedRole?.description}
                </div>
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: activeTab === 'matrix' ? 700 : 500,
                    background: activeTab === 'matrix' ? '#ffffff' : 'transparent',
                    color: activeTab === 'matrix' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'matrix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Ma trận quyền hạn ({activePermsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: activeTab === 'users' ? 700 : 500,
                    background: activeTab === 'users' ? '#ffffff' : 'transparent',
                    color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'users' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Nhân sự gán vai trò ({assignedUsers.length})
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: PERMISSION MATRIX & TREE VIEW */}
          {activeTab === 'matrix' && (
            <div className="card" style={{ padding: 18 }}>
              {/* Matrix Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                {/* Search */}
                <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 360 }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 Tìm kiếm quyền hạn hoặc module…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* View Mode Switcher + Bulk Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* View Mode Toggle */}
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 6, border: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('tree')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 4,
                        background: viewMode === 'tree' ? '#ffffff' : 'transparent',
                        color: viewMode === 'tree' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: viewMode === 'tree' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>🌲</span> Dạng cây
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 4,
                        background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                        color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span>⊞</span> Dạng lưới
                    </button>
                  </div>

                  {/* Expand / Collapse buttons in tree mode */}
                  {viewMode === 'tree' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={expandAll}
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        title="Mở rộng tất cả các nhánh"
                      >
                        ▼ Mở tất cả
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={collapseAll}
                        style={{ fontSize: 12, padding: '4px 8px' }}
                        title="Thu gọn tất cả các nhánh"
                      >
                        ▶ Thu gọn
                      </button>
                    </div>
                  )}

                  {/* Select / Deselect All */}
                  {selectedRoleId !== 'admin' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSelectAll(true)}
                        style={{ fontSize: 12, padding: '4px 9px' }}
                      >
                        ✓ Chọn hết
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSelectAll(false)}
                        style={{ fontSize: 12, padding: '4px 9px' }}
                      >
                        ✕ Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Lọc theo thao tác:</span>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'view', label: '👁️ Xem' },
                  { id: 'create', label: '➕ Thêm' },
                  { id: 'edit', label: '✏️ Sửa' },
                  { id: 'delete', label: '🗑️ Xóa' },
                  { id: 'special', label: '🔒 Đặc biệt' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActionFilter(f.id)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 14,
                      border: actionFilter === f.id ? '1px solid var(--primary)' : '1px solid var(--line)',
                      background: actionFilter === f.id ? 'var(--primary-subtle)' : '#ffffff',
                      color: actionFilter === f.id ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: actionFilter === f.id ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
                {actionFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setActionFilter('all')}
                    style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11.5, textDecoration: 'underline' }}
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {selectedRoleId === 'admin' && (
                <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink)' }}>
                  <span style={{ fontSize: 20 }}>👑</span>
                  <div>
                    <strong>Quản trị viên (Admin) sở hữu toàn quyền:</strong> Mọi chức năng và thao tác trong hệ thống đều được kích hoạt tự động để bảo đảm quyền kiểm soát tối cao.
                  </div>
                </div>
              )}

              {/* EMPTY STATE */}
              {filteredModules.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontWeight: 600 }}>Không tìm thấy quyền hạn nào khớp với từ khóa tìm kiếm hoặc bộ lọc.</div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setSearch(''); setActionFilter('all'); }}
                    style={{ marginTop: 12 }}
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              )}

              {/* VIEW MODE 1: HIERARCHICAL TREE VIEW */}
              {viewMode === 'tree' && filteredModules.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--line-strong)',
                    borderRadius: 8,
                    background: '#ffffff',
                    overflow: 'hidden',
                  }}
                >
                  {/* TREE ROOT NODE */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderBottom: '2px solid var(--line-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <TriStateCheckbox
                        checked={isAllRootGranted}
                        indeterminate={isSomeRootGranted}
                        disabled={selectedRoleId === 'admin'}
                        onChange={handleToggleRoot}
                        title="Chọn/Bỏ chọn tất cả quyền trong toàn hệ thống"
                      />
                      <span style={{ fontSize: 19 }}>🌐</span>
                      <div>
                        <strong style={{ fontSize: 14, color: 'var(--ink)' }}>
                          HỆ THỐNG PHÂN QUYỀN TOÀN CỤC
                        </strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Đã cấp {activePermsCount}/{totalPerms} quyền hạn ({coveragePercent}%)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 120,
                          height: 7,
                          background: '#e2e8f0',
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                        title={`Tỷ lệ cấp quyền: ${coveragePercent}%`}
                      >
                        <div
                          style={{
                            width: `${coveragePercent}%`,
                            height: '100%',
                            background: coveragePercent === 100 ? '#10b981' : 'var(--primary)',
                            borderRadius: 999,
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: coveragePercent === 100 ? '#10b981' : 'var(--primary)' }}>
                        {coveragePercent}%
                      </span>
                    </div>
                  </div>

                  {/* TREE BRANCHES (MODULES) */}
                  <div style={{ padding: '8px 12px' }}>
                    {filteredModules.length === 0 ? (
                      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                        <div className="table-state-box empty is-filtered">
                          <div className="state-icon-wrap">🔍</div>
                          <div className="state-title">Không tìm thấy quyền hạn phù hợp</div>
                          <div className="state-subtext">
                            Không có quyền hạn nào khớp với từ khóa tìm kiếm "{search}" hoặc bộ lọc đang áp dụng.
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setSearch('');
                              setActionFilter('all');
                            }}
                            style={{ marginTop: 12, fontWeight: 700 }}
                          >
                            ✕ Xóa bộ lọc tìm kiếm
                          </button>
                        </div>
                      </div>
                    ) : (
                      filteredModules.map((m, mIdx) => {
                        const modulePerms = m.permissions;
                        const grantedInModule = modulePerms.filter((p) =>
                          selectedRoleId === 'admin' ? true : selectedPerms.has(p.id)
                        ).length;
                        const allModuleGranted = modulePerms.length > 0 && grantedInModule === modulePerms.length;
                        const someModuleGranted = grantedInModule > 0 && !allModuleGranted;
                        const isExpanded = expandedModules.has(m.module);
                        const isLastModule = mIdx === filteredModules.length - 1;

                      return (
                        <div
                          key={m.module}
                          style={{
                            marginBottom: isLastModule ? 0 : 8,
                            borderRadius: 6,
                            border: isExpanded ? '1px solid #e2e8f0' : '1px solid transparent',
                            background: isExpanded ? '#fafcff' : 'transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* MODULE BRANCH HEADER */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 6,
                              background: isExpanded ? '#f1f5f9' : '#f8fafc',
                              border: '1px solid #e2e8f0',
                              cursor: 'pointer',
                              userSelect: 'none',
                              gap: 10,
                            }}
                            onClick={() => toggleExpand(m.module)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                              {/* Expand / Collapse chevron arrow */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(m.module);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  width: 20,
                                  height: 20,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-muted)',
                                  fontSize: 11,
                                  transition: 'transform 0.18s ease',
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                }}
                                title={isExpanded ? 'Thu gọn module này' : 'Mở rộng module này'}
                              >
                                ▶
                              </button>

                              {/* Tri-state Module Checkbox */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <TriStateCheckbox
                                  checked={allModuleGranted}
                                  indeterminate={someModuleGranted}
                                  disabled={selectedRoleId === 'admin'}
                                  onChange={() => toggleModule(modulePerms)}
                                  title={allModuleGranted ? 'Bỏ chọn toàn bộ quyền trong module này' : 'Chọn toàn bộ quyền trong module này'}
                                />
                              </div>

                              {/* Module Icon & Name */}
                              <span style={{ fontSize: 17 }}>{m.icon}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: 13.5, color: 'var(--ink)' }}>{m.label}</strong>
                                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  ({m.module})
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                              {/* Status Badge */}
                              {allModuleGranted ? (
                                <span className="badge badge-success" style={{ fontSize: 11, padding: '2px 8px' }}>
                                  ✓ Đầy đủ ({grantedInModule}/{modulePerms.length})
                                </span>
                              ) : someModuleGranted ? (
                                <span className="badge badge-warning" style={{ fontSize: 11, padding: '2px 8px' }}>
                                  ~ Một phần ({grantedInModule}/{modulePerms.length})
                                </span>
                              ) : (
                                <span className="badge badge-neutral" style={{ fontSize: 11, padding: '2px 8px' }}>
                                  0/{modulePerms.length} quyền
                                </span>
                              )}

                              {/* Quick toggle button */}
                              {selectedRoleId !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => toggleModule(modulePerms)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11, padding: '3px 8px', color: allModuleGranted ? '#dc2626' : 'var(--primary)' }}
                                >
                                  {allModuleGranted ? 'Bỏ chọn nhánh' : 'Chọn nhánh'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* MODULE LEAF PERMISSIONS (TREE LEAVES) */}
                          {isExpanded && (
                            <div
                              style={{
                                padding: '8px 10px 10px 32px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 5,
                                position: 'relative',
                              }}
                            >
                              {modulePerms.map((p, pIdx) => {
                                const isChecked = selectedRoleId === 'admin' ? true : selectedPerms.has(p.id);
                                const isLastLeaf = pIdx === modulePerms.length - 1;

                                return (
                                  <label
                                    key={p.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: '7px 12px',
                                      borderRadius: 6,
                                      border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                      background: isChecked ? '#f8faff' : '#ffffff',
                                      cursor: selectedRoleId === 'admin' ? 'default' : 'pointer',
                                      transition: 'all 0.12s ease',
                                      userSelect: 'none',
                                      position: 'relative',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (selectedRoleId !== 'admin') e.currentTarget.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (selectedRoleId !== 'admin') {
                                        e.currentTarget.style.borderColor = isChecked ? '#bfdbfe' : '#e2e8f0';
                                      }
                                    }}
                                  >
                                    {/* Visual tree branch connector symbol */}
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        color: '#94a3b8',
                                        fontSize: 13,
                                        userSelect: 'none',
                                        lineHeight: 1,
                                      }}
                                    >
                                      {isLastLeaf ? '└─' : '├─'}
                                    </span>

                                    {/* Leaf Checkbox */}
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={selectedRoleId === 'admin'}
                                      onChange={() => togglePermission(p.id)}
                                      style={{
                                        width: 16,
                                        height: 16,
                                        accentColor: 'var(--primary)',
                                        cursor: selectedRoleId === 'admin' ? 'default' : 'pointer',
                                      }}
                                    />

                                    {/* Action icon */}
                                    <span style={{ fontSize: 15 }} title={`Thao tác: ${p.action}`}>
                                      {getActionIcon(p.action)}
                                    </span>

                                    {/* Permission Title & Info */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                          {p.name}
                                        </span>
                                        {renderActionBadge(p.action)}
                                      </div>

                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: 'var(--text-faint)',
                                          fontFamily: 'var(--font-mono)',
                                          background: '#f1f5f9',
                                          padding: '1px 6px',
                                          borderRadius: 4,
                                        }}
                                      >
                                        {p.id}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                </div>
              )}

              {/* VIEW MODE 2: CARD GRID VIEW */}
              {viewMode === 'grid' && filteredModules.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {filteredModules.map((m) => {
                    const modulePerms = m.permissions;
                    const grantedInModule = modulePerms.filter((p) =>
                      selectedRoleId === 'admin' ? true : selectedPerms.has(p.id)
                    ).length;
                    const allModuleGranted = modulePerms.length > 0 && grantedInModule === modulePerms.length;

                    return (
                      <div
                        key={m.module}
                        style={{
                          border: '1px solid var(--line-strong)',
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: '#ffffff',
                        }}
                      >
                        {/* Module Header */}
                        <div
                          style={{
                            padding: '10px 16px',
                            background: '#f8fafc',
                            borderBottom: '1px solid var(--line)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 18 }}>{m.icon}</span>
                            <div>
                              <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{m.label}</strong>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                                ({grantedInModule}/{modulePerms.length} quyền)
                              </span>
                            </div>
                          </div>

                          {selectedRoleId !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => toggleModule(modulePerms)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11.5, padding: '3px 8px' }}
                            >
                              {allModuleGranted ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                            </button>
                          )}
                        </div>

                        {/* Permission Items Grid */}
                        <div
                          style={{
                            padding: '12px 16px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: 10,
                          }}
                        >
                          {modulePerms.map((p) => {
                            const isChecked = selectedRoleId === 'admin' ? true : selectedPerms.has(p.id);

                            return (
                              <label
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                  background: isChecked ? '#f8faff' : '#ffffff',
                                  cursor: selectedRoleId === 'admin' ? 'default' : 'pointer',
                                  transition: 'all 0.12s ease',
                                  userSelect: 'none',
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedRoleId !== 'admin') e.currentTarget.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedRoleId !== 'admin') e.currentTarget.style.borderColor = isChecked ? '#bfdbfe' : '#e2e8f0';
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={selectedRoleId === 'admin'}
                                  onChange={() => togglePermission(p.id)}
                                  style={{
                                    width: 16,
                                    height: 16,
                                    accentColor: 'var(--primary)',
                                    cursor: selectedRoleId === 'admin' ? 'default' : 'pointer',
                                  }}
                                />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                      {p.name}
                                    </span>
                                    {renderActionBadge(p.action)}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                    {p.id}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGNED USERS */}
          {activeTab === 'users' && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                  Danh sách người dùng có vai trò: {selectedRole?.name}
                </div>
                <a href="/users" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                  <span>👥</span> Quản lý tài khoản
                </a>
              </div>

                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50, textAlign: 'center' }}>#</th>
                          <th>Tên đăng nhập</th>
                          <th>Họ và tên</th>
                          <th>Trạng thái</th>
                          <th>Thời gian tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <TableState
                          loading={false}
                          rows={assignedUsers}
                          colSpan={5}
                          emptyIcon="👤"
                          emptyTitle={`Chưa có người dùng nào thuộc vai trò "${selectedRole?.name}"`}
                          emptySubtext="Bạn có thể gán vai trò này cho nhân viên trong trang Quản lý tài khoản."
                          actionText="👥 Đến trang Quản lý tài khoản"
                          actionTo="/users"
                        />
                        {paginatedAssignedUsers.map((u, idx) => (
                          <tr key={u.id}>
                            <td style={{ textAlign: 'center', color: 'var(--text-faint)', fontWeight: 600 }}>
                              {(userPage - 1) * userPageSize + idx + 1}
                            </td>
                            <td>
                              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                                {u.username}
                              </strong>
                            </td>
                            <td>{u.full_name || '—'}</td>
                            <td>
                              <span className={u.is_active === 1 ? 'badge badge-success' : 'badge badge-danger'}>
                                {u.is_active === 1 ? 'Hoạt động' : 'Đã khóa'}
                              </span>
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                              {u.created_at ? formatDateTime(u.created_at) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {assignedUsers.length > userPageSize && (
                    <Pagination
                      page={userPage}
                      pageSize={userPageSize}
                      total={assignedUsers.length}
                      onPageChange={setUserPage}
                      onPageSizeChange={(newSize) => {
                        setUserPageSize(newSize);
                        setUserPage(1);
                      }}
                      pageSizeOptions={[5, 10, 20]}
                      hideOnSinglePage={false}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal: Thêm vai trò mới */}
      {createModal && (
        <Modal
          title="Thêm vai trò người dùng mới"
          wide={520}
          onClose={() => setCreateModal(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreateModal(false)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateRole}
                disabled={creatingRole}
                style={{ minWidth: 120, fontWeight: 700 }}
              >
                {creatingRole ? 'Đang tạo…' : '+ Tạo vai trò'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateRole}>
            <div className="form-card" style={{ marginBottom: 0 }}>
              <div className="form-card-title">
                <span>Thông tin vai trò</span>
                <span className="tag">MỚI</span>
              </div>

              <div className="field">
                <label>
                  Mã vai trò (Key) <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  value={newRole.id}
                  placeholder="VD: manager, accountant, auditor..."
                  required
                  onChange={(e) => setNewRole({ ...newRole, id: e.target.value })}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
                <div className="field-hint">Chỉ gồm chữ cái viết thường không dấu, số, dấu gạch dưới.</div>
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label>
                  Tên hiển thị <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  value={newRole.name}
                  placeholder="VD: Quản lý kho, Kế toán kho..."
                  required
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label>Mô tả nhiệm vụ & trách nhiệm</label>
                <textarea
                  rows={2}
                  value={newRole.description}
                  placeholder="Mô tả tóm tắt phạm vi công việc của vai trò này…"
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>Sao chép quyền ban đầu từ vai trò mẫu</label>
                <select
                  value={newRole.copy_from}
                  onChange={(e) => setNewRole({ ...newRole, copy_from: e.target.value })}
                >
                  <option value="staff">Nhân viên kho (Quyền vận hành cơ bản)</option>
                  <option value="admin">Quản trị viên (Toàn quyền)</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
