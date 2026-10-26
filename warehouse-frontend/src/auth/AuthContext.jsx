import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(() => {
    api
      .get('/roles/my-permissions')
      .then((res) => setPermissions(res.data || []))
      .catch(() => setPermissions([]));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('khovan_token') || sessionStorage.getItem('khovan_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data);
        loadPermissions();
      })
      .catch(() => {
        localStorage.removeItem('khovan_token');
        sessionStorage.removeItem('khovan_token');
        setPermissions([]);
      })
      .finally(() => setLoading(false));
  }, [loadPermissions]);

  const login = useCallback(async (username, password, rememberMe = true) => {
    const res = await api.post('/auth/login', { username, password });
    if (rememberMe) {
      localStorage.setItem('khovan_token', res.data.token);
      localStorage.setItem('khovan_remember_user', username);
      sessionStorage.removeItem('khovan_token');
    } else {
      sessionStorage.setItem('khovan_token', res.data.token);
      localStorage.removeItem('khovan_token');
      localStorage.removeItem('khovan_remember_user');
    }
    setUser(res.data.user);
    loadPermissions();
    return res.data.user;
  }, [loadPermissions]);

  const logout = useCallback(() => {
    localStorage.removeItem('khovan_token');
    sessionStorage.removeItem('khovan_token');
    setUser(null);
    setPermissions([]);
  }, []);

  const hasPerm = useCallback(
    (code) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return permissions.includes(code);
    },
    [user, permissions]
  );

  return (
    <AuthContext.Provider value={{ user, permissions, hasPerm, reloadPermissions: loadPermissions, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
