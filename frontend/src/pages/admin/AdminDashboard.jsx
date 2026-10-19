import { useState, useEffect } from 'react';
import api from '../../services/api';

// ── Placeholder data (replace with real API when backend is ready) ──
const PLACEHOLDER_STATS = {
  students:  0,
  teachers:  0,
  courses:   0,
  exams:     0,
};

const PLACEHOLDER_RECENT_STUDENTS = [
  { _id: '1', name: 'Ahmed Ali Hassan',    studentId: 'STU-001', email: 'ahmed@example.com',  status: 'active' },
  { _id: '2', name: 'Faadumo Abdi Warsame', studentId: 'STU-002', email: 'faadumo@example.com', status: 'active' },
  { _id: '3', name: 'Mohamed Osman Jama',  studentId: 'STU-003', email: 'mohamed@example.com', status: 'active' },
];

function StatCard({ icon, label, value, color, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {trend && <div className={`stat-trend ${trend.dir}`}>{trend.text}</div>}
      </div>
    </div>
  );
}

// Simple inline bar chart
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar-value">{d.value}</div>
          <div className="bar-fill" style={{ height: `${(d.value / max) * 80}px` }} />
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]   = useState(PLACEHOLDER_STATS);
  const [recent, setRecent] = useState(PLACEHOLDER_RECENT_STUDENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt to fetch real stats — gracefully fall back to placeholders
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [studRes, teachRes, courseRes, examRes] = await Promise.allSettled([
          api.get('/admin/stats/students'),
          api.get('/admin/stats/teachers'),
          api.get('/admin/stats/courses'),
          api.get('/admin/stats/exams'),
        ]);
        setStats({
          students: studRes.status  === 'fulfilled' ? studRes.value.data.total  : PLACEHOLDER_STATS.students,
          teachers: teachRes.status === 'fulfilled' ? teachRes.value.data.total : PLACEHOLDER_STATS.teachers,
          courses:  courseRes.status === 'fulfilled' ? courseRes.value.data.total : PLACEHOLDER_STATS.courses,
          exams:    examRes.status   === 'fulfilled' ? examRes.value.data.total  : PLACEHOLDER_STATS.exams,
        });
      } catch {
        // keep placeholder
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const chartData = [
    { label: 'Students',  value: stats.students },
    { label: 'Teachers',  value: stats.teachers },
    { label: 'Courses',   value: stats.courses },
    { label: 'Exams',     value: stats.exams },
  ];

  return (
    <>
      {/* Stats */}
      <div className="stats-grid admin-dashboard-stats">
        <StatCard icon="🎓" label="Total Students"  value={stats.students} color="green"  trend={{ dir: 'up', text: '↑ Live data' }} />
        <StatCard icon="👨‍🏫" label="Total Teachers"  value={stats.teachers} color="gold"   />
        <StatCard icon="📚" label="Total Courses"   value={stats.courses}  color="green"  />
        <StatCard icon="📝" label="Total Exams"     value={stats.exams}    color="gold"   />
      </div>

      <div className="grid-2">
        {/* Overview chart */}
        <div className="card card--accent">
          <div className="card-header">
            <span className="card-title">System Overview</span>
            <span className="badge badge-info">Live</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : (
              <BarChart data={chartData} />
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              📌 Connect backend endpoints to see real data
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { label: 'Add New Student',   to: '/admin/students',   icon: '🎓' },
              { label: 'Add New Teacher',   to: '/admin/teachers',   icon: '👨‍🏫' },
              { label: 'Create Course',     to: '/admin/courses',    icon: '📚' },
              { label: 'Schedule Exam',     to: '/admin/exams',      icon: '📝' },
              { label: 'View Analytics',    to: '/admin/analytics',  icon: '📈' },
            ].map(a => (
              <a key={a.to} href={a.to} className="quick-action-link">
                <span>{a.icon}</span> {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent students */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Students</span>
          <a href="/admin/students" className="btn btn-sm btn-secondary">View All</a>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Student ID</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s, i) => (
                <tr key={s._id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td><code>{s.studentId}</code></td>
                  <td>{s.email}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'active' ? 'success' : 'muted'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0.75rem 1.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          📌 Placeholder data — connect <code>GET /api/admin/students</code> to load real records.
        </div>
      </div>
    </>
  );
}
