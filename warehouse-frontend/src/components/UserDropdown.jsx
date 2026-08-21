import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toast';
import { api } from '../api/client';
import { formatDateTime } from './Badge';
import Modal from './Modal';
import PasswordInput from './PasswordInput';

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const { push } = useToast();

  const [open, setOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdErrors, setPwdErrors] = useState({ old: '', new: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Sync fullName when user loads
  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  async function handleSaveProfile(e) {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      return push('Họ và tên không được để trống.', 'error');
    }
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', { full_name: fullName.trim() });
      push('Cập nhật thông tin thành công!');
      setProfileModal(false);
      window.location.reload();
    } catch (err) {
      push(err.message || 'Không thể cập nhật thông tin.', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    if (e) e.preventDefault();
    const errors = { old: '', new: '', confirm: '' };
    let hasError = false;

    if (!oldPassword) {
      errors.old = 'Vui lòng nhập mật khẩu hiện tại.';
      hasError = true;
    }
    if (!newPassword || newPassword.length < 6) {
      errors.new = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      hasError = true;
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirm = 'Mật khẩu xác nhận không khớp với mật khẩu mới.';
      hasError = true;
    } else if (!confirmPassword) {
      errors.confirm = 'Vui lòng xác nhận mật khẩu mới.';
      hasError = true;
    }

    if (hasError) {
      setPwdErrors(errors);
      return;
    }

    setPwdErrors({ old: '', new: '', confirm: '' });
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      push('Đổi mật khẩu thành công!');
      setPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdErrors({ old: '', new: '', confirm: '' });
    } catch (err) {
      const msg = err.message || 'Không thể đổi mật khẩu.';
      if (msg.includes('hiện tại không chính xác') || msg.includes('Mật khẩu cũ')) {
        setPwdErrors((prev) => ({ ...prev, old: 'Mật khẩu hiện tại không chính xác.' }));
      } else {
        push(msg, 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  }

  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên kho';

  return (
    <div className="user-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Header Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn btn-ghost"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: open ? '#f1f5f9' : '#ffffff',
          borderColor: open ? 'var(--primary)' : 'var(--line-strong)',
          borderRadius: 8,
          color: 'var(--ink)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'var(--shadow-sm)',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 15 }}>👤</span>
        <span>{roleLabel}</span>
        <span style={{ fontSize: 10, color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          ▼
        </span>
      </button>

      {/* Floating Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 230,
            background: '#ffffff',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'menu-slide 0.15s ease',
          }}
        >
          {/* User Info Header */}
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 13.5 }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge badge-info" style={{ padding: '1px 6px', fontSize: 11 }}>
                {roleLabel}
              </span>
              <span className="mono" style={{ color: 'var(--text-faint)' }}>@{user?.username}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: 6 }}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setProfileModal(true);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>👤</span>
              <span>Thông tin tài khoản</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPasswordModal(true);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>🔑</span>
              <span>Đổi mật khẩu</span>
            </button>
          </div>

          {/* Logout button */}
          <div style={{ borderTop: '1px solid var(--line)', padding: 6 }}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--danger)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: Thông tin tài khoản */}
      {profileModal && (
        <Modal
          title="Thông tin tài khoản"
          wide={480}
          onClose={() => setProfileModal(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setProfileModal(false)}>
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                style={{ minWidth: 120, fontWeight: 700 }}
              >
                {savingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveProfile}>
            <div className="form-card" style={{ marginBottom: 0 }}>
              <div className="form-card-title">
                <span>Hồ sơ người dùng</span>
                <span className="tag">HỆ THỐNG</span>
              </div>

              <div className="grid-2">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Tên đăng nhập</label>
                  <input
                    value={user?.username || ''}
                    disabled
                    style={{ background: '#f8fafc', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  />
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Vai trò hệ thống</label>
                  <input
                    value={roleLabel}
                    disabled
                    style={{ background: '#f8fafc', color: 'var(--text-muted)', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>
                  Họ và tên hiển thị <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ..."
                  required
                />
              </div>

              {user?.created_at && (
                <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                  <label>Ngày tạo tài khoản</label>
                  <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 4, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatDateTime(user.created_at)}
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 2: Đổi mật khẩu */}
      {passwordModal && (
        <Modal
          title="Đổi mật khẩu tài khoản"
          wide={480}
          onClose={() => setPasswordModal(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPasswordModal(false)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={savingPassword}
                style={{ minWidth: 140, fontWeight: 700 }}
              >
                {savingPassword ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleChangePassword}>
            <div className="form-card" style={{ marginBottom: 0 }}>
              <div className="form-card-title">
                <span>Bảo mật đăng nhập</span>
                <span className="tag">BẮT BUỘC</span>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>
                  Mật khẩu hiện tại <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    if (pwdErrors.old) setPwdErrors((prev) => ({ ...prev, old: '' }));
                  }}
                  placeholder="Nhập mật khẩu hiện tại..."
                  required
                  style={pwdErrors.old ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.12)' } : undefined}
                />
                {pwdErrors.old && (
                  <div
                    className="field-error"
                    style={{
                      color: 'var(--danger)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginTop: 5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>✕</span> {pwdErrors.old}
                  </div>
                )}
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>
                  Mật khẩu mới <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (pwdErrors.new) setPwdErrors((prev) => ({ ...prev, new: '' }));
                  }}
                  placeholder="Tối thiểu 6 ký tự..."
                  required
                  minLength={6}
                  style={pwdErrors.new ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.12)' } : undefined}
                />
                {pwdErrors.new && (
                  <div
                    className="field-error"
                    style={{
                      color: 'var(--danger)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginTop: 5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>✕</span> {pwdErrors.new}
                  </div>
                )}
              </div>

              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>
                  Xác nhận mật khẩu mới <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (pwdErrors.confirm) setPwdErrors((prev) => ({ ...prev, confirm: '' }));
                  }}
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                  minLength={6}
                  style={pwdErrors.confirm ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.12)' } : undefined}
                />
                {pwdErrors.confirm && (
                  <div
                    className="field-error"
                    style={{
                      color: 'var(--danger)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginTop: 5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>✕</span> {pwdErrors.confirm}
                  </div>
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
