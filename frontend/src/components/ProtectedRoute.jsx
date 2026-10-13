import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * Redirects to /login if not authenticated.
 * Optionally restrict by role: <ProtectedRoute roles={['admin']}> ...
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Authenticated but wrong role — go to their dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
