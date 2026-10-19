import { useAuth } from '../context/AuthContext';
import TelesomLogo from '../components/TelesomLogo';
import './Dashboard.css';

/**
 * Placeholder dashboard — shown after login.
 * Displays user session information with Telesom Academy branding.
 */
export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-brand">
            <TelesomLogo size="sm" showText={true} />
          </div>
          <div className="dashboard-header-right">
            <span className={`dashboard-user-badge ${user?.role === 'student' ? 'badge-student' : 'badge-staff'}`}>
              {user?.role?.toUpperCase()}
            </span>
            <span className="dashboard-user-name">{user?.name}</span>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <div className="welcome-tag">Telesom Academy Portal</div>
          <h1>Welcome back, {user?.name}!</h1>
          <p>
            You are signed in as <strong>{user?.role}</strong> to the Telesom Academy Examination &amp; Academic Management System.
          </p>
          {user?.studentId && (
            <div className="student-badge-info">
              Student ID: <code>{user.studentId}</code>
            </div>
          )}
          <div className="dashboard-quick-actions">
            <div className="quick-action-card">
              <div className="action-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h4>Upcoming Exams</h4>
              <p>Check your schedule for quizzes and semester assessments.</p>
            </div>

            <div className="quick-action-card">
              <div className="action-icon gold">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h4>Exam Results &amp; GPA</h4>
              <p>View your graded submissions and official academic transcript.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
