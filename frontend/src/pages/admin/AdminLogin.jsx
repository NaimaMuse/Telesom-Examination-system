import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TelesomLogo from '../../components/TelesomLogo';
import './AdminLogin.css';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your admin email and password.');
      return;
    }

    setLoading(true);

    try {
      const user = await login({
        email: email.trim().toLowerCase(),
        password,
        role: 'admin',
      });

      if (user?.role !== 'admin') {
        throw new Error('This account does not have admin access.');
      }

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Admin sign in failed. Please confirm your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-shell">
        <div className="admin-auth-panel">
          <div className="admin-auth-header">
            <div className="header-brand-wrap">
              <TelesomLogo size="lg" />
            </div>
            <span className="admin-badge">ADMIN PORTAL</span>
            <h1>Welcome back, admin</h1>
            <p>Sign in to manage students, teachers, exams, and academy operations.</p>
          </div>

          <form className="admin-auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-alert error" role="alert">
                {error}
              </div>
            )}

            <div className="form-field-group">
              <label htmlFor="admin-email">Admin email</label>
              <div className="input-with-icon">
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  placeholder="admin@telesom.academy"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-field-group">
              <label htmlFor="admin-password">Password</label>
              <div className="input-with-icon">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Access dashboard'}
            </button>

            <div className="admin-auth-footer">
              <Link to="/login">Back to portal selection</Link>
            </div>
          </form>
        </div>

        <div className="admin-auth-visual">
          <div className="visual-badge">Secure admin access</div>
          <h2>Academic operations, centralized.</h2>
          <ul>
            <li>Track student and teacher performance</li>
            <li>Review assessments and reports</li>
            <li>Manage courses, attendance, and enrollment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
