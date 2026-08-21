import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('khovan_token') || sessionStorage.getItem('khovan_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('khovan_token');
        sessionStorage.removeItem('khovan_token');
      })
      .finally(() => setLoading(false));
  }, []);

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
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('khovan_token');
    sessionStorage.removeItem('khovan_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
