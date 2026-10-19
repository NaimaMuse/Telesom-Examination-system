import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleRedirect — redirects authenticated users to their role's dashboard.
 * Used at /dashboard as an intermediate route after login.
 */
export default function RoleRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const role = (user.role || '').toLowerCase();
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'teacher') navigate('/teacher', { replace: true });
    else if (role === 'student') navigate('/student', { replace: true });
    else navigate('/login', { replace: true });
  }, [user, navigate]);

  return null;
}