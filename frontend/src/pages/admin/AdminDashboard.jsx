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

export default function AdminDashboard() {
  const [stats,setStats] = useState(null);
  const [recent,setRecent] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const [search] = usePageSearch();
  const visibleRecent = recent.filter(student => matchesPageSearch(search,student.title,student.description));
  useEffect(() => {
    let active=true,busy=false;
    const controller=new AbortController();
    const load=async()=>{
      if(busy)return;busy=true;
      try {
        const {data}=await api.get('/dashboard/admin',{signal:controller.signal});
        if(!active)return;
        setStats(data.data.totals);setRecent(data.data.recentActivities||[]);setError('');
      }catch(error){if(active)setError(error.response?.data?.message||'Dashboard could not refresh. Retrying automatically; previously loaded data may be out of date.');}
      finally{busy=false;if(active)setLoading(false);}
    };
    load();
    const refresh=()=>{if(!document.hidden)load();};
    const timer=setInterval(refresh,5000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[revision]);

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

      <div className="grid-2 admin-dashboard-panels">
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
        <section className="card" aria-labelledby="recent-activities-title">
          <div className="card-header">
            <span className="card-title" id="recent-activities-title">Recent Activities</span>
          </div>
          <div className="card-body">
            {!visibleRecent.length ? (
              <div className="empty-state" role="status">
                {loading ? 'Loading activities…' : search ? 'No activities match your search.' : error ? 'Recent activities unavailable.' : 'No recent activities yet.'}
              </div>
            ) : (
              <ul className="admin-activity-list">
                {visibleRecent.slice(0,3).map(student => (
                  <li key={student.id}>
                    <span className="admin-activity-dot" aria-hidden="true" />
                    <div className="admin-activity-content">
                      <Link to={student.to}>{student.title}</Link>
                      <p>{student.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
