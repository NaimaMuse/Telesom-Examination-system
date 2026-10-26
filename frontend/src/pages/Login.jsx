import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TelesomLogo from '../components/TelesomLogo';
import './Login.css';

// System roles according to specification
const ROLES = [
  { key: 'student', label: 'Student', icon: 'graduation' },
  { key: 'teacher', label: 'Teacher', icon: 'chalkboard' },
  { key: 'admin',   label: 'Admin',   icon: 'shield' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState('student');

  // Student login mode: 'phone' (Official Spec) or 'studentId'
  const [studentLoginMode, setStudentLoginMode] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Student ID fallback & Staff credentials
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const isStudent = selectedRole === 'student';

  // OTP Countdown timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle switching roles
  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    setInfoMessage('');
    setOtpSent(false);
    setOtpCode('');
  };

  // Quick fill helper for easy testing of MERN stack roles
  const handleQuickFill = (role, val1, val2 = '') => {
    setSelectedRole(role);
    setError('');
    setInfoMessage('');
    setOtpSent(false);

    if (role === 'student') {
      if (val1.startsWith('STD-')) {
        setStudentLoginMode('studentId');
        setStudentId(val1);
      } else {
        setStudentLoginMode('phone');
        setPhone(val1);
        setOtpCode('123456');
      }
    } else {
      setEmail(val1);
      setPassword(val2);
    }
  };

  // Step 1: Send OTP to Student's Phone Number
  const handleSendOtp = (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!phone.trim()) {
      setError('Please enter your registered phone number (e.g., +252 63 4455667).');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setResendTimer(45);
      setInfoMessage('Verification code sent! For demo testing, use OTP: 123456');
    }, 600);
  };

  // Step 2: Verify OTP or Submit Standard Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (isStudent && studentLoginMode === 'phone') {
      if (!otpCode.trim() || otpCode.trim().length < 4) {
        setError('Please enter the 6-digit verification code sent to your phone.');
        return;
      }

      setLoading(true);
      try {
        // Authenticate student session via Phone OTP
        // If backend accepts studentId or identifier, we pass the verified credentials
        await login({
          identifier: phone.trim(),
          otp: otpCode.trim(),
          role: 'student',
        });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const msg = err.response?.data?.message || 'Invalid verification code. Please check and try again.';
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Student ID Login
    if (isStudent && studentLoginMode === 'studentId') {
      if (!studentId.trim()) {
        setError('Please enter your Student ID (e.g. STD-1001).');
        return;
      }

      setLoading(true);
      try {
        await login({ studentId: studentId.trim().toUpperCase() });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const msg = err.response?.data?.message || 'Invalid Student ID. Please contact the administrator.';
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Teacher / Admin Login (Email + Password)
    if (!email.trim()) {
      setError('Please enter your official email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-centered-container">

        {/* ── Centered Auth Card ── */}
        <div className="auth-card">

          {/* Top Brand Header */}
          <div className="auth-card-header">
            <div className="header-brand-wrap">
              <TelesomLogo size="sm" showText={true} />
            </div>
            <h2>Sign in to Portal</h2>
            <p>Access exams, courses, marks &amp; academic analytics</p>
          </div>

          {/* Pill Switcher: Log in (Green Active) vs Sign Up */}
          <div className="auth-mode-switch">
            <button
              type="button"
              className="switch-tab active green-tab"
              aria-selected="true"
            >
              Log in
            </button>
            <Link
              to="/signup"
              className="switch-tab gold-tab"
              aria-selected="false"
            >
              Sign Up
            </Link>
          </div>

          {/* System Role Selector */}
          <div className="role-selector" role="group" aria-label="Select portal role">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-btn${selectedRole === r.key ? ' active green-role' : ''}`}
                onClick={() => handleRoleChange(r.key)}
                aria-pressed={selectedRole === r.key}
              >
                {r.key === 'student' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                )}
                {r.key === 'teacher' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                )}
                {r.key === 'admin' && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Student Login Method Switch: Phone OTP (Spec 4) vs Student ID */}
          {isStudent && (
            <div className="student-subtabs">
              <button
                type="button"
                className={`subtab-btn${studentLoginMode === 'phone' ? ' active' : ''}`}
                onClick={() => {
                  setStudentLoginMode('phone');
                  setError('');
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Phone Number (OTP)
              </button>
              <button
                type="button"
                className={`subtab-btn${studentLoginMode === 'studentId' ? ' active' : ''}`}
                onClick={() => {
                  setStudentLoginMode('studentId');
                  setError('');
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="4" width="18" height="16" rx="3"/>
                  <circle cx="9" cy="10" r="2"/>
                  <line x1="15" y1="8" x2="17" y2="8"/>
                  <line x1="15" y1="12" x2="17" y2="12"/>
                </svg>
                Student ID
              </button>
            </div>
          )}

          {/* Quick Fill Demo Pills */}
          <div className="demo-pill-wrapper">
            <span className="demo-pill-label">Quick fill:</span>
            <button
              type="button"
              className="demo-pill"
              onClick={() => handleQuickFill('student', '+252 63 4455667')}
            >
              Student (Phone OTP)
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => handleQuickFill('student', 'STD-1001')}
            >
              Student (STD-1001)
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => handleQuickFill('teacher', 'teacher@telesom.com', 'password123')}
            >
              Teacher
            </button>
            <button
              type="button"
              className="demo-pill"
              onClick={() => handleQuickFill('admin', 'admin@telesom.com', 'admin123')}
            >
              Admin
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="auth-alert error" role="alert">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Info Message */}
          {infoMessage && (
            <div className="auth-alert info" role="status">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <span>{infoMessage}</span>
            </div>
          )}

          {/* ── Form: Student Phone OTP Login Flow ── */}
          {isStudent && studentLoginMode === 'phone' ? (
            !otpSent ? (
              /* Step 1: Enter Phone Number */
              <form className="auth-form" onSubmit={handleSendOtp} noValidate>
                <div className="form-field-group">
                  <label htmlFor="studentPhone">Registered Phone Number</label>
                  <div className="input-with-icon">
                    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <input
                      id="studentPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+252 63..."
                      autoFocus
                      disabled={loading}
                      required
                    />
                  </div>
                  <span className="field-hint">
                    As per academy rules, students receive an instant SMS verification code.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-auth-primary green-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      <span>Sending OTP…</span>
                    </>
                  ) : (
                    <span>Send Verification Code (OTP)</span>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Enter Verification Code */
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="otp-container">
                  <div className="otp-header">
                    <h4>Enter Verification Code</h4>
                    <p>We sent a 6-digit code to <strong>{phone}</strong></p>
                  </div>

                  <div className="form-field-group">
                    <input
                      id="otpCode"
                      type="text"
                      className="otp-input-field"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      maxLength={6}
                      autoFocus
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="otp-timer-row">
                    <button
                      type="button"
                      className="btn-change-number"
                      onClick={() => setOtpSent(false)}
                    >
                      Change Phone Number
                    </button>
                    {resendTimer > 0 ? (
                      <span className="field-hint">Resend code in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-resend-otp"
                        onClick={handleSendOtp}
                      >
                        Resend OTP Code
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-auth-primary green-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      <span>Verifying &amp; Logging In…</span>
                    </>
                  ) : (
                    <span>Verify &amp; Enter Dashboard</span>
                  )}
                </button>
              </form>
            )
          ) : (
            /* Standard Login Form: Student ID OR Teacher/Admin Email+Password */
            <form className="auth-form" onSubmit={handleSubmit} noValidate>

              {isStudent ? (
                /* Student ID Mode */
                <div className="form-field-group">
                  <label htmlFor="studentId">Student ID Number</label>
                  <div className="input-with-icon">
                    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="3"/>
                      <circle cx="9" cy="10" r="2"/>
                      <line x1="15" y1="8" x2="17" y2="8"/>
                      <line x1="15" y1="12" x2="17" y2="12"/>
                      <line x1="7" y1="16" x2="17" y2="16"/>
                    </svg>
                    <input
                      id="studentId"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. STD-1001"
                      autoComplete="username"
                      autoFocus
                      disabled={loading}
                      required
                    />
                  </div>
                  <span className="field-hint">
                    Enter your official Student ID issued by the academy office.
                  </span>
                </div>
              ) : (
                /* Teacher / Admin Mode: Email & Password */
                <>
                  <div className="form-field-group">
                    <label htmlFor="email">Official Email Address</label>
                    <div className="input-with-icon">
                      <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@telesom.com"
                        autoComplete="email"
                        autoFocus
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <div className="label-row">
                      <label htmlFor="password">Password</label>
                      <button
                        type="button"
                        className="forgot-link"
                        onClick={() => setInfoMessage('Please contact the Admin Office to reset your staff credentials.')}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="input-with-icon">
                      <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Remember Me */}
              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              {/* Submit Button: Brand Telesom Green (#229948) */}
              <button
                type="submit"
                className="btn-auth-primary green-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>Signing in to portal…</span>
                  </>
                ) : (
                  <span>Log in</span>
                )}
              </button>
            </form>
          )}

          {/* Bottom Card Footer */}
          <div className="auth-card-footer">
            <p>
              Don&apos;t have an account yet?{' '}
              <Link to="/signup" className="link-to-signup">
                Sign Up here
              </Link>
            </p>
          </div>

        </div>

        <div className="auth-bottom-tag">
          &copy; {new Date().getFullYear()} Telesom Academy. All rights reserved.
        </div>

      </div>
    </div>
  );
}
