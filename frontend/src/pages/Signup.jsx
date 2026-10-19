import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TelesomLogo from '../components/TelesomLogo';
import './Signup.css';

const DEPARTMENTS = [
  'Software Engineering & Web Technologies',
  'Cisco CCNA / Network Engineering',
  'Cybersecurity & Ethical Hacking',
  'Database Systems & Administration',
  'Cloud Computing & DevOps',
  'Pearson VUE IT Certification Track',
  'Telecommunications & Fiber Optics',
];

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: 'STD-' + Math.floor(1000 + Math.random() * 9000),
    phone: '',
    department: DEPARTMENTS[0],
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isStudent = role === 'student';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  // Generate new random Student ID
  const handleRegenerateId = () => {
    const newId = 'STD-' + Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, studentId: newId }));
  };

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Empty', color: '#cbd5e1' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { score: 2, label: 'Fair', color: '#f59e0b' };
    if (score <= 4) return { score: 3, label: 'Good', color: '#10b981' };
    return { score: 4, label: 'Strong', color: '#229948' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (isStudent && !formData.studentId.trim()) {
      setError('Please specify a Student ID.');
      return;
    }

    if (!formData.password) {
      setError('Please enter a secure password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.agreeTerms) {
      setError('You must accept Telesom Academy Examination policies to proceed.');
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        studentId: isStudent ? formData.studentId.trim().toUpperCase() : undefined,
        department: formData.department,
        password: formData.password,
        role: role,
      });

      setSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please verify your information or try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-centered-container">

        {/* ── The Centered Signup Card (Exact match to screenshot) ── */}
        <div className="auth-card signup-card-wrap">

          {/* Top Header */}
          <div className="auth-card-header">
            <div className="header-brand-wrap">
              <TelesomLogo size="sm" showText={true} />
            </div>
            <h2>Create Your Account</h2>
            <p>Register to take exams or manage academic courses</p>
          </div>

          {/* Mode Switch: Log in vs Sign Up (Active Gold) */}
          <div className="auth-mode-switch">
            <Link
              to="/login"
              className="switch-tab green-tab"
              aria-selected="false"
            >
              Log in
            </Link>
            <button
              type="button"
              className="switch-tab active gold-tab"
              aria-selected="true"
            >
              Sign Up
            </button>
          </div>

          {/* Success View */}
          {success ? (
            <div className="signup-success-view">
              <div className="success-icon-wrap">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#229948" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Account Created Successfully!</h3>
              <p>
                Welcome to Telesom Academy, <strong>{formData.name}</strong>.
                {isStudent && (
                  <>
                    <br />
                    Your assigned Student ID is: <strong className="student-id-callout">{formData.studentId}</strong>
                  </>
                )}
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  className="btn-auth-primary green-btn"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Log In
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Role Selector: Student vs Teacher */}
              <div className="role-selector" role="group" aria-label="Register as Student or Staff">
                <button
                  type="button"
                  className={`role-btn${role === 'student' ? ' active gold-role' : ''}`}
                  onClick={() => setRole('student')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                  <span>Student Registration</span>
                </button>

                <button
                  type="button"
                  className={`role-btn${role === 'teacher' ? ' active gold-role' : ''}`}
                  onClick={() => setRole('teacher')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <span>Instructor / Staff</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="auth-alert error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* ── Signup Form ── */}
              <form className="auth-form" onSubmit={handleSubmit} noValidate>

                {/* Full Name */}
                <div className="form-field-group">
                  <label htmlFor="name">Full Name *</label>
                  <div className="input-with-icon gold-focus">
                    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Ahmed Mohamed Ismail"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Student ID (Auto-generator & manual edit) */}
                {isStudent && (
                  <div className="form-field-group">
                    <div className="label-row">
                      <label htmlFor="studentId">Student ID Number *</label>
                      <button
                        type="button"
                        className="regenerate-id-btn"
                        onClick={handleRegenerateId}
                        title="Generate a new Student ID"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
                        </svg>
                        Auto-generate
                      </button>
                    </div>
                    <div className="input-with-icon gold-focus">
                      <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="3"/>
                        <circle cx="9" cy="10" r="2"/>
                        <line x1="15" y1="8" x2="17" y2="8"/>
                        <line x1="15" y1="12" x2="17" y2="12"/>
                        <line x1="7" y1="16" x2="17" y2="16"/>
                      </svg>
                      <input
                        id="studentId"
                        name="studentId"
                        type="text"
                        value={formData.studentId}
                        onChange={handleChange}
                        placeholder="e.g. STD-7237"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* Email & Phone side by side */}
                <div className="form-row-two-col">
                  <div className="form-field-group">
                    <label htmlFor="email">Email Address *</label>
                    <div className="input-with-icon gold-focus">
                      <svg className="field-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@telesom.com"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="phone">Phone / ZAAD</label>
                    <div className="input-with-icon gold-focus">
                      <svg className="field-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+252 63..."
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Program / Department */}
                <div className="form-field-group">
                  <label htmlFor="department">Department / Course Track</label>
                  <div className="input-with-icon gold-focus">
                    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="6" height="6" />
                      <line x1="9" y1="1" x2="9" y2="4" />
                      <line x1="15" y1="1" x2="15" y2="4" />
                      <line x1="9" y1="20" x2="9" y2="23" />
                      <line x1="15" y1="20" x2="15" y2="23" />
                    </svg>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="form-row-two-col">
                  <div className="form-field-group">
                    <label htmlFor="password">Password *</label>
                    <div className="input-with-icon gold-focus">
                      <svg className="field-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Min 6 chars"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="confirmPassword">Confirm Password *</label>
                    <div className="input-with-icon gold-focus">
                      <svg className="field-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="password-strength-box">
                    <div className="strength-bar-track">
                      <div
                        className="strength-bar-fill"
                        style={{
                          width: `${(strength.score / 4) * 100}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </div>
                    <span className="strength-label" style={{ color: strength.color }}>
                      Strength: {strength.label}
                    </span>
                  </div>
                )}

                {/* Terms Agreement Checkbox */}
                <div className="checkbox-row terms-check">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      required
                    />
                    <span>
                      I agree to the <a href="#policy" className="policy-link">Telesom Academy Academic Honor Code</a> and Examination Regulations.
                    </span>
                  </label>
                </div>

                {/* Submit Button: Brand Telesom Gold (#D68B29) */}
                <button
                  type="submit"
                  className="btn-auth-primary gold-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <span>Sign Up</span>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Bottom Card Footer */}
          <div className="auth-card-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-to-login">
                Log in here
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
