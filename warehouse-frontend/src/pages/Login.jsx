import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState(() => localStorage.getItem('khovan_remember_user') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, rememberMe);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card-container">
        <div className="login-brand-header">
          <div className="login-brand-title">
            <span style={{ color: 'var(--amber)', fontSize: 32, lineHeight: 1 }}>◈</span> KhoVận
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-on-ink-muted)', marginTop: 6, fontWeight: 500, letterSpacing: '0.01em' }}>
            Hệ thống quản lý kho chuyên nghiệp
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-card">
          <div className="field">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder="Nhập tên đăng nhập..."
              autoFocus
              required
              style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.12)' } : undefined}
            />
          </div>
          <div className="field" style={{ marginBottom: error ? 12 : 16 }}>
            <label htmlFor="password">Mật khẩu</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Nhập mật khẩu..."
              required
              style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.12)' } : undefined}
            />
            {error && (
              <div
                className="field-error"
                style={{
                  color: 'var(--danger)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>✕</span> {error === 'Sai tên đăng nhập hoặc mật khẩu.' ? 'Tên đăng nhập hoặc mật khẩu không đúng' : error}
              </div>
            )}
          </div>

          {/* Checkbox: Ghi nhớ đăng nhập */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--text-muted)',
                userSelect: 'none',
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: 'var(--primary)',
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      <footer className="login-footer">
        © {new Date().getFullYear()} Bản quyền thuộc Nguyễn Đình Hùng
      </footer>
    </div>
  );
}
