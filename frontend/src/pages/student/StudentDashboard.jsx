import {AssessmentProgress} from '../../components/AcademyWorkspace';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';




export default function StudentDashboard() {
  const [search] = usePageSearch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [courses,    setCourses]    = useState([]);
  const [upcoming,   setUpcoming]   = useState([]);
  const [results,    setResults]    = useState([]);
  const [attendance, setAttendance] = useState({ present:0, total:0 });

  useAutoRefresh(async ({ signal, isCurrent }) => {
      try{
        const [cRes,eRes,rRes,aRes] = await Promise.allSettled([
          api.get('/student/courses', { signal }),
          api.get('/student/exams/upcoming', { signal }),
          api.get('/student/results', { signal }),
          api.get('/student/attendance/summary', { signal }),
        ]);
        if (!isCurrent()) return;
        setError('');
        if ([cRes,eRes,rRes,aRes].some(r=>r.status==='rejected')) setError('Some student data could not be loaded. Please refresh to try again.');
        if(cRes.status==='fulfilled'&&cRes.value.data?.courses)setCourses(cRes.value.data.courses);
        if(eRes.status==='fulfilled'&&eRes.value.data?.exams)setUpcoming(eRes.value.data.exams);
        if(rRes.status==='fulfilled'&&rRes.value.data?.results)setResults(rRes.value.data.results);
        if(aRes.status==='fulfilled')setAttendance(aRes.value.data);
      }catch(err){if (isCurrent()) setError(err.response?.data?.message || 'Unable to load student data. Please try again.');}finally{if (isCurrent()) setLoading(false);}
  });

  const visibleCourses = courses.filter(c => matchesPageSearch(search, c.name, c.code, c.teacher, c.semester));
  const visibleExams = upcoming.filter(e => matchesPageSearch(search, e.title, e.course, e.date, e.type));
  const avgPct = results.length
    ? Math.round(results.reduce((a,r)=>a+(r.marks/r.totalMarks)*100,0)/results.length)
    : 0;
  const attPct = attendance.total
    ? Math.round((attendance.present/attendance.total)*100)
    : 0;

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>;

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon green">📚</div><div className="stat-info"><div className="stat-value">{courses.length}</div><div className="stat-label">Enrolled Courses</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">📝</div><div className="stat-info"><div className="stat-value">{upcoming.length}</div><div className="stat-label">Upcoming Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">{avgPct}%</div><div className="stat-label">Average Marks</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">📅</div><div className="stat-info"><div className="stat-value">{attPct}%</div><div className="stat-label">Attendance</div></div></div>
      </div>

      <AssessmentProgress />
      <div className="grid-2">
        {/* Enrolled courses */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Courses</span>
            <a href="/student/courses" className="btn btn-sm btn-secondary">View All</a>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {visibleCourses.map(c=>(
              <div key={c._id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'0.75rem',background:'var(--body-bg)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                <div style={{width:40,height:40,background:'var(--primary-light)',color:'var(--primary)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>📚</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'0.875rem'}}>{c.name}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{c.code} • {c.teacher}</div>
                </div>
                <span className="badge badge-success">{c.semester}</span>
              </div>
            ))}
            {visibleCourses.length===0&&<div className="empty-state" style={{padding:'1rem'}}><h3>{search ? 'No matching courses' : 'No courses yet'}</h3></div>}
          </div>
        </div>

        {/* Upcoming exams */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Exams</span>
            <a href="/student/exams" className="btn btn-sm btn-secondary">Results</a>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {visibleExams.map(e=>(
              <div key={e._id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'0.75rem',background:'var(--body-bg)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                <div style={{width:40,height:40,background:'#fffbeb',color:'var(--accent-gold)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>📝</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'0.875rem'}}>{e.title}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>📅 {e.date}</div>
                </div>
                <span className={`badge badge-${e.type==='midterm'?'warning':'info'}`}>{e.type}</span>
              </div>
            ))}
            {visibleExams.length===0&&<div className="empty-state" style={{padding:'1rem'}}><h3>{search ? 'No matching exams' : 'No upcoming exams'}</h3></div>}
          </div>
        </div>
      </div>
    </>
  );
}
