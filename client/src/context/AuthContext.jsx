// src/context/AuthContext.jsx
import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  getStoredAuth,
  setStoredAuth as clientSetStoredAuth,
  clearStoredAuth,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(() => getStoredAuth());

  // Only sync from OTHER tabs — never write back on every render
  useEffect(() => {
    function onStorageChange(e) {
      if (e.key === 'school_portal_auth') setAuthState(getStoredAuth());
    }
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  const setAuth = useCallback((next) => {
    if (!next) {
      clearStoredAuth();
      setAuthState(null);
      return;
    }
    clientSetStoredAuth(next);
    setAuthState(getStoredAuth());
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuthState(null);
  }, []);

  const value = useMemo(
    () => ({
      auth,
      user: auth?.user || null,
      token: auth?.token || null,
      role: auth?.user?.role || null,
      isAuthenticated: !!auth?.token,
      setAuth,
      logout,
      isRole: (r) => auth?.user?.role === r,
    }),
    [auth, setAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}