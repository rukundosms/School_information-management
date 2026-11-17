import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireRole({ role, children }) {
  const { auth } = useAuth();
  const loc = useLocation();

  // ✅ FIX: role lives inside auth.user, not auth
  if (!auth?.token || auth?.user?.role !== role) {
    const to =
      role === 'student' ? '/login/student'
      : role === 'teacher' ? '/login/teacher'
      : '/login/admin';
    return <Navigate to={to} state={{ from: loc }} replace />;
  }

  return children;
}