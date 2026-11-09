import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TelesomLogo from '../components/TelesomLogo';
import './Login.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isStudent, setIsStudent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = () => {
    setIsStudent((current) => !current);
    setError('');
    setPassword('');
    setShowPassword(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credentials = isStudent
        ? { studentId: studentId.trim().toUpperCase(), role: 'student' }
        : { email: email.trim().toLowerCase(), password };
      const user = await login(credentials);
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page-wrapper portal-login">
      <div className="auth-centered-container">
        <section className="auth-card" aria-labelledby="login-title">
          <header className="auth-card-header">
            <div className="header-brand-wrap"><TelesomLogo /></div>
            <h1 id="login-title">{isStudent ? 'Student sign in' : 'Sign in to the portal'}</h1>
            <p>{isStudent ? 'Enter your assigned Student ID.' : 'Access your Telesom Academy account.'}</p>
          </header>

          <form className="auth-form" onSubmit={submit} aria-labelledby="login-title" aria-busy={loading}>
            {error && <div className="auth-alert error" role="alert">{error}</div>}
            {isStudent ? (
              <div className="form-field-group" key="student">
                <label htmlFor="login-student-id">Student ID</label>
                <div className="input-with-icon">
                  <input
                    id="login-student-id"
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    placeholder="TL-2026-01"
                    autoComplete="username"
                    autoCapitalize="characters"
                    spellCheck={false}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="form-field-group" key="staff">
                <label htmlFor="login-username">Username</label>
                <div className="input-with-icon">
                  <input
                    id="login-username"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your registered email"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {!isStudent && (
              <div className="form-field-group">
                <label htmlFor="login-password">Password</label>
                <div className="input-with-icon">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn-auth-primary green-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <footer className="auth-card-footer">
            <button type="button" className="portal-login-switch" onClick={switchMode} disabled={loading}>
              {isStudent ? 'Use username and password' : 'Sign in with Student ID'}
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}
