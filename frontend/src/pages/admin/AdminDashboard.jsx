import { Link } from 'react-router-dom';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';

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
  const [stats,setStats] = useState(null);
  const [recent,setRecent] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const [search] = usePageSearch();
  const visibleRecent = recent.filter(student => matchesPageSearch(search,student.name,student.studentId,student.email));
  useEffect(() => {
    let active=true,busy=false;
    const controller=new AbortController();
    const load=async()=>{
      if(busy)return;busy=true;
      try {
        const {data}=await api.get('/dashboard/admin',{signal:controller.signal});
        if(!active)return;
        setStats(data.data.totals);setRecent(data.data.recentStudents||[]);setError('');
      }catch(error){if(active)setError(error.response?.data?.message||'Dashboard could not refresh. Retrying automatically; previously loaded data may be out of date.');}
      finally{busy=false;if(active)setLoading(false);}
    };
    load();
    const refresh=()=>{if(!document.hidden)load();};
    const timer=setInterval(refresh,5000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[revision]);

  const chartData = [
    { label: 'Students',  value: stats?.students ?? 0 },
    { label: 'Teachers',  value: stats?.teachers ?? 0 },
    { label: 'Courses',   value: stats?.courses ?? 0 },
    { label: 'Assessments', value: stats?.assessments ?? 0 },
  ];

  return (
    <>
      {error && <div role="alert" style={{padding:'12px 16px',marginBottom:16,borderRadius:8,background:'#fff7ed',color:'#9a7847',fontSize:12}}>{error} <button className="btn btn-sm btn-secondary" onClick={()=>setRevision(value=>value+1)}>Retry</button></div>}
      {/* Stats */}
      <div className="stats-grid admin-dashboard-stats">
        <StatCard icon="🎓" label="Total Students"  value={stats?.students} color="green"   />
        <StatCard icon="👨‍🏫" label="Total Teachers"  value={stats?.teachers} color="gold"   />
        <StatCard icon="📚" label="Total Courses"   value={stats?.courses}  color="green"  />
        <StatCard icon="📝" label="Total Assessments"     value={stats?.assessments}    color="gold"   />
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
              stats ? <BarChart data={chartData} /> : <div className="empty-state">Dashboard data unavailable.</div>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Current records in the system.
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
              { label: 'View Assessments',     to: '/admin/exams',      icon: '📝' },
              { label: 'View Analytics',    to: '/admin/analytics',  icon: '📈' },
            ].map(a => (
              <Link key={a.to} to={a.to} className="quick-action-link">
                <span>{a.icon}</span> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent students */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Students</span>
          <Link to="/admin/students" className="btn btn-sm btn-secondary">View All</Link>
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
              {!visibleRecent.length && <tr><td colSpan={5} style={{textAlign:'center',padding:30,color:'var(--text-muted)'}}>{loading ? 'Loading students…' : search ? 'No recent students match your search.' : error ? 'Student records unavailable.' : 'No students registered yet.'}</td></tr>}
              {visibleRecent.map((s, i) => (
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

      </div>
    </>
  );
}
