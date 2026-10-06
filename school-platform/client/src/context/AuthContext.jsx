import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { getStoredAuth, setStoredAuth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    setStoredAuth(auth);
  }, [auth]);

  const value = useMemo(
    () => ({
      auth,
      setAuth,
      logout: () => setAuth(null),
      isRole: (r) => auth?.role === r,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
