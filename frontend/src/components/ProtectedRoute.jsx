import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * - If not authenticated → redirect to /login
 * - If authenticated but wrong role → redirect to user's own dashboard
 * - If authenticated + correct role → render children
 *
 * Usage:
 *   <ProtectedRoute>                        — any authenticated user
 *   <ProtectedRoute roles={['admin']}>      — admin only
 *   <ProtectedRoute roles={['teacher']}>    — teacher only
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Redirect to the correct role dashboard
    const roleHome = {
      admin:   '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
    };
    return <Navigate to={roleHome[user.role] || '/login'} replace />;
  }

  return children;
}
