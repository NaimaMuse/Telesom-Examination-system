import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PLACEHOLDER_COURSES = [
  { _id:'c1', code:'CS101', name:'Introduction to Programming', teacher:'Dr. Abdullahi Said', schedule:'Mon/Wed 9:00', semester:'Semester 1' },
  { _id:'c2', code:'BUS101',name:'Principles of Business',      teacher:'Ms. Farhia Adan',    schedule:'Tue/Thu 11:00', semester:'Semester 1' },
];

const PLACEHOLDER_EXAMS = [
  { _id:'e1', title:'Midterm Exam – CS101', date:'2026-11-15', type:'midterm', course:'CS101' },
  { _id:'e2', title:'Quiz 1 – BUS101',     date:'2026-11-10', type:'quiz',    course:'BUS101' },
];

const PLACEHOLDER_RESULTS = [
  { _id:'r1', course:'CS101', exam:'Midterm', marks:78, totalMarks:100, grade:'B' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [courses,    setCourses]    = useState(PLACEHOLDER_COURSES);
  const [upcoming,   setUpcoming]   = useState(PLACEHOLDER_EXAMS);
  const [results,    setResults]    = useState(PLACEHOLDER_RESULTS);
  const [attendance, setAttendance] = useState({ present:0, total:0 });

  useEffect(()=>{
    const fetch=async()=>{
      try{
        const [cRes,eRes,rRes,aRes] = await Promise.allSettled([
          api.get('/student/courses'),
          api.get('/student/exams/upcoming'),
          api.get('/student/results'),
          api.get('/student/attendance/summary'),
        ]);
        if(cRes.status==='fulfilled'&&cRes.value.data?.courses)setCourses(cRes.value.data.courses);
        if(eRes.status==='fulfilled'&&eRes.value.data?.exams)setUpcoming(eRes.value.data.exams);
        if(rRes.status==='fulfilled'&&rRes.value.data?.results)setResults(rRes.value.data.results);
        if(aRes.status==='fulfilled')setAttendance(aRes.value.data);
      }catch{}
    };
    fetch();
  },[]);

  const avgPct = results.length
    ? Math.round(results.reduce((a,r)=>a+(r.marks/r.totalMarks)*100,0)/results.length)
    : 0;
  const attPct = attendance.total
    ? Math.round((attendance.present/attendance.total)*100)
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Welcome, {user?.name?.split(' ')[0] || 'Student'}! 👋</h1>
          <p>Track your courses, exams, results, and attendance</p>
        </div>
        {user?.studentId && (
          <div style={{background:'var(--primary-light)',color:'var(--primary)',padding:'0.5rem 1rem',borderRadius:'var(--radius-sm)',fontSize:'0.85rem',fontWeight:700,border:'1px solid rgba(26,124,74,0.2)'}}>
            ID: {user.studentId}
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon green">📚</div><div className="stat-info"><div className="stat-value">{courses.length}</div><div className="stat-label">Enrolled Courses</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">📝</div><div className="stat-info"><div className="stat-value">{upcoming.length}</div><div className="stat-label">Upcoming Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">{avgPct}%</div><div className="stat-label">Average Marks</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">📅</div><div className="stat-info"><div className="stat-value">{attPct}%</div><div className="stat-label">Attendance</div></div></div>
      </div>

      <div className="grid-2">
        {/* Enrolled courses */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Courses</span>
            <a href="/student/courses" className="btn btn-sm btn-secondary">View All</a>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {courses.map(c=>(
              <div key={c._id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'0.75rem',background:'var(--body-bg)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                <div style={{width:40,height:40,background:'var(--primary-light)',color:'var(--primary)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>📚</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'0.875rem'}}>{c.name}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{c.code} • {c.teacher}</div>
                </div>
                <span className="badge badge-success">{c.semester}</span>
              </div>
            ))}
            {courses.length===0&&<div className="empty-state" style={{padding:'1rem'}}><h3>No courses yet</h3></div>}
          </div>
        </div>

        {/* Upcoming exams */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Exams</span>
            <a href="/student/exams" className="btn btn-sm btn-secondary">Results</a>
          </div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {upcoming.map(e=>(
              <div key={e._id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'0.75rem',background:'var(--body-bg)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}}>
                <div style={{width:40,height:40,background:'#fffbeb',color:'var(--accent-gold)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>📝</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'0.875rem'}}>{e.title}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>📅 {e.date}</div>
                </div>
                <span className={`badge badge-${e.type==='midterm'?'warning':'info'}`}>{e.type}</span>
              </div>
            ))}
            {upcoming.length===0&&<div className="empty-state" style={{padding:'1rem'}}><h3>No upcoming exams</h3></div>}
          </div>
        </div>
      </div>
    </>
  );
}
