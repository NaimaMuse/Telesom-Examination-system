import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState } from 'react';
import api from '../../services/api';


export default function StudentCourses() {
  const [search] = usePageSearch();
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(async ({ signal, isCurrent }) => {
    try {
      const { data } = await api.get('/student/courses', { signal });
      if (!isCurrent()) return;
      setCourses(data.courses || []); setError('');
    } catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Data could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) setLoading(false); }
  });
  const visibleCourses = courses.filter(c => matchesPageSearch(search, c.name, c.code, c.teacher, c.semester, c.description));

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      {loading?<div className="spinner-wrap"><div className="spinner"/></div>
        :visibleCourses.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon">📚</div><h3>{search ? 'No matching courses' : 'No courses enrolled'}</h3><p>{search ? 'Try another course name, teacher or semester.' : 'Contact the admin to enroll in courses.'}</p></div></div>
        :(
        <div className="grid-2">
          {visibleCourses.map(c=>(
            <div key={c._id} className="card student-course-card">
              <div className="card-body">
                <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                  <div className="student-course-icon" style={{width:50,height:50,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>📚</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:'1rem',color:'var(--text-primary)',marginBottom:2}}>{c.name}</div>
                    <div style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginBottom:8}}>{c.description}</div>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      <span className="badge badge-info">{c.code}</span>
                      <span className="badge badge-success">{c.semester}</span>
                      {c.credits&&<span className="badge badge-muted">{c.credits} Credits</span>}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:'6px'}}>
                  <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>👨‍🏫 <strong>Teacher:</strong> {c.teacher}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>🕐 <strong>Schedule:</strong> {c.schedule}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
