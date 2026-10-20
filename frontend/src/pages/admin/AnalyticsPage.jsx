// Analytics & Reports Page — charts and summary tables
// 📌 Connect to real backend endpoints for live data

const DEPARTMENTS = [
  { name: 'Computer Science', students: 120, avgGrade: 76 },
  { name: 'Business Admin',   students: 95,  avgGrade: 72 },
  { name: 'Engineering',      students: 80,  avgGrade: 78 },
  { name: 'Nursing',          students: 60,  avgGrade: 74 },
];

const MONTHLY_ATTENDANCE = [
  { label:'Aug', value:88 },
  { label:'Sep', value:82 },
  { label:'Oct', value:79 },
  { label:'Nov', value:91 },
  { label:'Dec', value:85 },
];

const GRADE_DIST = [
  { label:'A', value:22, color:'#1a7c4a' },
  { label:'B', value:35, color:'#2563eb' },
  { label:'C', value:25, color:'#d4a017' },
  { label:'D', value:12, color:'#f97316' },
  { label:'F', value:6,  color:'#dc2626' },
];

function BarChart({ data, maxH = 100 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:`${maxH}px`, padding:'0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
          <span style={{ fontSize:'0.65rem', color:'var(--text-secondary)', fontWeight:600 }}>{d.value}{d.label2||''}</span>
          <div style={{
            width:'100%',
            height:`${(d.value/max)*(maxH-24)}px`,
            background: d.color || 'var(--primary)',
            borderRadius:'4px 4px 0 0',
            minHeight:'4px',
            transition:'height 0.4s ease',
          }}/>
          <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', textAlign:'center' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Analytics &amp; Reports</h1>
          <p>Academic performance and attendance overview</p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-secondary">📥 Export PDF</button>
          <button className="btn btn-secondary">📊 Export CSV</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon green">🎓</div><div className="stat-info"><div className="stat-value">355</div><div className="stat-label">Total Students</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">75%</div><div className="stat-label">Avg Academic Score</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">📅</div><div className="stat-info"><div className="stat-value">85%</div><div className="stat-label">Avg Attendance</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">🏆</div><div className="stat-info"><div className="stat-value">22%</div><div className="stat-label">A-Grade Students</div></div></div>
      </div>

      <div className="grid-2">
        {/* Grade distribution */}
        <div className="card">
          <div className="card-header"><span className="card-title">Grade Distribution</span><span className="badge badge-info">All Courses</span></div>
          <div className="card-body">
            <BarChart data={GRADE_DIST} maxH={120} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'1rem' }}>
              {GRADE_DIST.map(g=>(
                <div key={g.label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.78rem' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:g.color }}/>
                  Grade {g.label}: {g.value}%
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly attendance */}
        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Attendance (%)</span></div>
          <div className="card-body">
            <BarChart data={MONTHLY_ATTENDANCE.map(d=>({...d,label2:'%'}))} maxH={120} />
          </div>
        </div>
      </div>

      {/* Course breakdown */}
      <div className="card">
        <div className="card-header"><span className="card-title">Course Performance</span></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Course</th><th>Students</th><th>Avg Grade (%)</th><th>Performance Bar</th></tr>
            </thead>
            <tbody>
              {DEPARTMENTS.map((d,i)=>(
                <tr key={d.name}>
                  <td>{i+1}</td>
                  <td style={{fontWeight:600}}>{d.name}</td>
                  <td>{d.students}</td>
                  <td><strong>{d.avgGrade}%</strong></td>
                  <td style={{width:'200px'}}>
                    <div style={{ background:'var(--border)', borderRadius:4, height:10, overflow:'hidden' }}>
                      <div style={{ width:`${d.avgGrade}%`, height:'100%', background:'var(--primary)', borderRadius:4, transition:'width 0.4s' }}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'0.75rem 1.4rem', fontSize:'0.75rem', color:'var(--text-muted)' }}>
          📌 Placeholder data — connect <code>GET /api/admin/analytics</code> to load real statistics.
        </div>
      </div>
    </>
  );
}
