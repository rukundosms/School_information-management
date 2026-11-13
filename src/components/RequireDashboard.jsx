import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAdmin({ children }) {
  const { auth } = useAuth();
  // ✅ FIX: role lives inside auth.user, not auth
  if (!auth?.token || auth?.user?.role !== 'admin') {
    return <Navigate to="/login/admin" replace />;
  }
  if (Number(auth.user?.position) === 3) {
    return <Navigate to="/dod" replace />;
  }
  return children;
}

export function RequireDod({ children }) {
  const { auth } = useAuth();
  // ✅ FIX: role lives inside auth.user, not auth
  if (!auth?.token || auth?.user?.role !== 'admin') {
    return <Navigate to="/login/admin" replace />;
  }
  if (Number(auth.user?.position) !== 3) {
    return <Navigate to="/admin/home" replace />;
  }
  return children;
}