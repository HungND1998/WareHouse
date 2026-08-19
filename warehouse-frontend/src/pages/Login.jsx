import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ink)',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(242,169,59,0.035) 0, rgba(242,169,59,0.035) 2px, transparent 2px, transparent 26px)',
        padding: 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.03em',
            }}
          >
            <span style={{ color: 'var(--amber)' }}>◈</span> KHOVẬN
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-on-ink-muted)', marginTop: 6, letterSpacing: '0.1em' }}>
            HỆ THỐNG QUẢN LÝ KHO
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 26 }}>
          <div className="field">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="field-error" style={{ marginBottom: 14 }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <div className="field-hint" style={{ marginTop: 16, textAlign: 'center' }}>
            Tài khoản mặc định: <code className="mono">admin</code> / <code className="mono">admin123</code>
          </div>
        </form>
      </div>
    </div>
  );
}
