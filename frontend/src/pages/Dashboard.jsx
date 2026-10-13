import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

/**
 * Placeholder dashboard — shown after login.
 * Role-specific dashboards will be built in later steps.
 */
export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-brand">
            <span className="dashboard-logo-mark" aria-hidden="true">TA</span>
            <span className="dashboard-brand-name">Telesom Academy</span>
          </div>
          <div className="dashboard-header-right">
            <span className="dashboard-user-badge">
              {user?.role?.toUpperCase()}
            </span>
            <span className="dashboard-user-name">{user?.name}</span>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h1>Welcome back, {user?.name}!</h1>
          <p>
            You are signed in as <strong>{user?.role}</strong>.
            Your full dashboard will be available in the next development step.
          </p>
          {user?.studentId && (
            <p className="dashboard-meta">Student ID: <code>{user.studentId}</code></p>
          )}
        </div>
      </main>
    </div>
  );
}
