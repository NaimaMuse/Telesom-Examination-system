import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TelesomLogo from '../components/TelesomLogo';
import GoogleSignIn from '../components/GoogleSignIn';
import TeachingIcon from '../components/TeachingIcon';
import './Login.css';

export default function LoginPage({ staff = false, recovery = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const studentRecovery = recovery && !staff;
  const linkToStaff = recovery ? staff : !staff;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = useCallback(async credentials => {
    setError('');
    setLoading(true);
    try {
      const user = await login(credentials);
      const destination = studentRecovery && !user.mustChangePassword
        ? '/student/profile?reset=password'
        : `/${user.role}`;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [login, navigate, studentRecovery]);

  const signInWithGoogle = useCallback(credential => signIn({credential}), [signIn]);
  const submit = event => {
    event.preventDefault();
    signIn({email:email.trim().toLowerCase(),password,...(!staff ? {role:'student'} : {})});
  };

  return (
    <main className={`auth-page-wrapper portal-login${staff ? ' staff-login' : !recovery ? ' student-login' : ''}`}>
      <div className="auth-centered-container">
        <section className="auth-card" aria-labelledby="login-title">
          <header className="auth-card-header">
            <div className="header-brand-wrap"><TelesomLogo size={staff || !recovery ? 'md' : 'sm'} /></div>
            {staff && !recovery && <h1 id="login-title">Staff sign in</h1>}
            {!staff && !recovery && <>
              <h1 id="login-title">Student sign in</h1>
            </>}
            {recovery && <h1 id="login-title">{staff ? 'Staff password help' : 'Reset student password'}</h1>}
            {studentRecovery && <p>Use your registered Google account to reset your portal password.</p>}
          </header>

          {error && <div className="auth-alert error" role="alert">{error}</div>}
          {staff && recovery ? (
            <div className="staff-password-help">
              <p>Teachers should contact the academy administrator. Administrators should contact the system operator.</p>
              <Link className="portal-forgot-password student-forgot-password" to="/student/forgot-password">
                Reset a student password
              </Link>
            </div>
          ) : studentRecovery ? (
            <div className="auth-form" aria-busy={loading}>
              <GoogleSignIn onCredential={signInWithGoogle} busy={loading} />
              {loading && <p className="google-sign-in-message" role="status">Signing in…</p>}
            </div>
          ) : (
            <>
            {!staff && <div className="student-google-option">
              <p>First time? Sign in with Google.</p>
              <GoogleSignIn onCredential={signInWithGoogle} busy={loading} />
            </div>}
            <form className="auth-form" onSubmit={submit} aria-label={staff ? 'Staff sign in' : 'Student password sign in'} aria-busy={loading}>
              <div className="form-field-group">
                <label htmlFor="login-username">Email</label>
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
                    title={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                  >
                    <TeachingIcon name={showPassword ? 'eyeOff' : 'eye'} size={19} />
                  </button>
                </div>
              </div>
              <Link className="portal-forgot-password" to={staff ? '/staff/forgot-password' : '/student/forgot-password'}>Forgot password?</Link>
              <button type="submit" className="btn-auth-primary green-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            </>
          )}

          <footer className="auth-card-footer">
            <Link className="portal-login-switch" to={linkToStaff ? '/staff/login' : '/login'}>
              {recovery ? (staff ? 'Back to staff sign in' : 'Back to student sign in') : staff ? 'Student sign in' : 'Staff sign in'}
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
