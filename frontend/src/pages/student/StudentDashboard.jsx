import StudentClassCalendar from './StudentClassCalendar';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { useState } from 'react';
import api from '../../services/api';




export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classSchedules, setClassSchedules] = useState([]);
  const [makeupClasses, setMakeupClasses] = useState([]);
  const [courses,    setCourses]    = useState([]);
  const [upcoming,   setUpcoming]   = useState([]);
  const [results,    setResults]    = useState([]);
  const [attendance, setAttendance] = useState({ present:0, total:0 });

  useAutoRefresh(async ({ signal, isCurrent }) => {
      try{
        const [cRes,eRes,rRes,aRes,mRes] = await Promise.allSettled([
          api.get('/student/courses', { signal }),
          api.get('/student/exams/upcoming', { signal }),
          api.get('/student/results', { signal }),
          api.get('/student/attendance/summary', { signal }),
          api.get('/academy/makeup-classes', { signal }),
        ]);
        if (!isCurrent()) return;
        setError('');
        if ([cRes,eRes,rRes,aRes,mRes].some(r=>r.status==='rejected')) setError('Some student data could not be loaded. Please refresh to try again.');
        if(cRes.status==='fulfilled'){
          setCourses(cRes.value.data.courses || []);
          setClassSchedules(cRes.value.data.classSchedules || []);
        }
        if(eRes.status==='fulfilled'&&eRes.value.data?.exams)setUpcoming(eRes.value.data.exams);
        if(rRes.status==='fulfilled'&&rRes.value.data?.results)setResults(rRes.value.data.results);
        if(aRes.status==='fulfilled')setAttendance(aRes.value.data);
        if(mRes.status==='fulfilled')setMakeupClasses(mRes.value.data.classes || []);
      }catch(err){if (isCurrent()) setError(err.response?.data?.message || 'Unable to load student data. Please try again.');}finally{if (isCurrent()) setLoading(false);}
  });

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
      <div className="stats-grid student-dashboard-stats">
        <div className="stat-card"><div className="stat-icon green">📚</div><div className="stat-info"><div className="stat-value">{courses.length}</div><div className="stat-label">Enrolled Courses</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">📝</div><div className="stat-info"><div className="stat-value">{upcoming.length}</div><div className="stat-label">Upcoming Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">{avgPct}%</div><div className="stat-label">Average Marks</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">📅</div><div className="stat-info"><div className="stat-value">{attPct}%</div><div className="stat-label">Attendance</div></div></div>
      </div>

      <StudentClassCalendar schedules={classSchedules} makeupClasses={makeupClasses}/>
    </>
  );
}
