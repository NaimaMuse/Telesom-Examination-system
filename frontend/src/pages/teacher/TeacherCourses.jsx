import { usePageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_COURSES = [
  { _id:'c1', code:'CS101', name:'Introduction to Programming', students:32, semester:'Semester 1', schedule:'Mon/Wed 9:00–10:30',  description:'Core programming fundamentals.' },
  { _id:'c2', code:'CS201', name:'Data Structures',             students:28, semester:'Semester 2', schedule:'Tue/Thu 11:00–12:30', description:'Arrays, trees, graphs, and algorithms.' },
];

export default function TeacherCourses() {
  const [courses, setCourses] = useState(PLACEHOLDER_COURSES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = usePageSearch();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/teacher/courses');
        if (res.data?.courses) setCourses(res.data.courses);
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = courses.filter(c =>
    !search || [c.name,c.code].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>My Courses</h1><p>Courses assigned to you this semester</p></div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <span style={{color:'var(--text-muted)'}}>🔍</span>
          <input placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner"/></div>
        : filtered.length === 0 ? (
          <div className="empty-state card" style={{padding:'3rem'}}>
            <div className="empty-state-icon">📚</div>
            <h3>No courses found</h3>
            <p>You have no assigned courses yet. Contact the admin.</p>
          </div>
        ) : (
          <div className="grid-2">
            {filtered.map(c => (
              <div key={c._id} className="card" style={{marginBottom:0}}>
                <div className="card-body">
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>
                    <div style={{ width:52,height:52,background:'var(--primary-light)',color:'var(--primary)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',flexShrink:0 }}>📚</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-primary)', marginBottom:2 }}>{c.name}</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:8 }}>{c.description}</div>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        <span className="badge badge-info">{c.code}</span>
                        <span className="badge badge-success">{c.semester}</span>
                        <span className="badge badge-muted">🎓 {c.students} students</span>
                      </div>
                    </div>
                  </div>
                  {c.schedule && (
                    <div style={{ marginTop:'0.85rem', padding:'0.6rem 0.85rem', background:'var(--body-bg)', borderRadius:6, fontSize:'0.8rem', color:'var(--text-secondary)', border:'1px solid var(--border)' }}>
                      🕐 {c.schedule}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </>
  );
}
