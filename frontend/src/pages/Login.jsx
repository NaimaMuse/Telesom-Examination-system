import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// Role display labels
const ROLES = [
  { key: 'student', label: 'Student' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'admin',   label: 'Admin'   },
];

/**
 * LoginPage
 *
 * - Student:        sends { studentId } — no password (backend requirement)
 * - Teacher/Admin:  sends { email, password }
 *
 * The role selector is a UI convenience only. The authenticated role is
 * always taken from the backend response; the frontend selector does not
 * grant any permissions.
 */
export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState('student');
  const [studentId,    setStudentId]    = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const isStudent = selectedRole === 'student';

  // Reset fields when switching roles to avoid stale data in the request
  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    setStudentId('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic client-side validation
    if (isStudent) {
      if (!studentId.trim()) {
        setError('Please enter your Student ID.');
        return;
      }
    } else {
      if (!email.trim())    { setError('Please enter your email address.'); return; }
      if (!password.trim()) { setError('Please enter your password.'); return; }
    }

    setLoading(true);

    try {
      // Build the exact payload the backend controller expects
      const credentials = isStudent
        ? { studentId: studentId.trim().toUpperCase() }
        : { email: email.trim().toLowerCase(), password };

      const user = await login(credentials);

      // Navigate based on the role returned by the backend — not the UI selector
      navigate('/dashboard', { replace: true });

      // Suppress linting warning — user is intentionally unused here;
      // navigation is role-agnostic at this stage. Role-based redirects
      // will be implemented when dashboards are built.
      void user;
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Unable to connect to the server. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ── Header ── */}
        <div className="login-header">
          <div className="login-logo-mark" aria-hidden="true">TA</div>
          <h1>Telesom Academy</h1>
          <p>Examination &amp; Academic Management System</p>
        </div>

        {/* ── Body ── */}
        <div className="login-body">

          {/* Role selector */}
          <div className="role-selector" role="group" aria-label="Select your role">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-btn${selectedRole === r.key ? ' active' : ''}`}
                onClick={() => handleRoleChange(r.key)}
                aria-pressed={selectedRole === r.key}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="error-alert" role="alert">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 10-2 0v4a1 1 0 002 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {/* Login form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {isStudent ? (
              /* Student: ID only */
              <div className="form-group">
                <label htmlFor="studentId">Student ID</label>
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STD-1001"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  aria-required="true"
                />
                <span className="form-hint">Enter your Student ID number exactly as issued.</span>
              </div>
            ) : (
              /* Teacher / Admin: Email + Password */
              <>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.name@telesom.com"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    aria-required="true"
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

          </form>
        </div>

        {/* ── Footer ── */}
        <div className="login-footer">
          <p>
            &copy; {new Date().getFullYear()} Telesom Academy. All rights reserved.
          </p>
          <div className="security-notice">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
            </svg>
            Secured connection
          </div>
        </div>

      </div>
    </div>
  );
}
