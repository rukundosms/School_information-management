import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireRole({ role, children }) {
  const { auth } = useAuth();
  const loc = useLocation();

  if (!auth?.token || auth.role !== role) {
    const to =
      role === 'student' ? '/login/student' : role === 'teacher' ? '/login/teacher' : '/login/admin';
    return <Navigate to={to} state={{ from: loc }} replace />;
  }

  return children;
}
