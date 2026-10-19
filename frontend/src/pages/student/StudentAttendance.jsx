import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_RECORDS = [
  { _id:'a1', date:'2026-11-10', course:'CS101',  status:'present' },
  { _id:'a2', date:'2026-11-10', course:'BUS101', status:'present' },
  { _id:'a3', date:'2026-11-08', course:'CS101',  status:'absent' },
  { _id:'a4', date:'2026-11-06', course:'CS101',  status:'present' },
  { _id:'a5', date:'2026-11-06', course:'BUS101', status:'late' },
  { _id:'a6', date:'2026-11-04', course:'CS101',  status:'present' },
];

const STATUS_BADGE = { present:'success', absent:'danger', late:'warning', excused:'info' };

export default function StudentAttendance() {
  const [records, setRecords]     = useState(PLACEHOLDER_RECORDS);
  const [loading, setLoading]     = useState(false);
  const [selCourse, setSelCourse] = useState('All');

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{const res=await api.get('/student/attendance');if(res.data?.attendance)setRecords(res.data.attendance);}catch{}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const courses = ['All', ...new Set(records.map(r=>r.course))];
  const filtered = selCourse==='All'?records:records.filter(r=>r.course===selCourse);

  const total   = filtered.length;
  const present = filtered.filter(r=>r.status==='present').length;
  const absent  = filtered.filter(r=>r.status==='absent').length;
  const late    = filtered.filter(r=>r.status==='late').length;
  const attPct  = total?Math.round((present/total)*100):0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>My Attendance</h1><p>Track your attendance across all courses</p></div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card">
          <div className="stat-icon green">📅</div>
          <div className="stat-info">
            <div className="stat-value">{attPct}%</div>
            <div className="stat-label">Attendance Rate</div>
          </div>
        </div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><div className="stat-value">{present}</div><div className="stat-label">Present Days</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div className="stat-info"><div className="stat-value">{absent}</div><div className="stat-label">Absent Days</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">⏰</div><div className="stat-info"><div className="stat-value">{late}</div><div className="stat-label">Late Days</div></div></div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div className="card-body">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.6rem'}}>
            <span style={{fontWeight:700,fontSize:'0.9rem'}}>Overall Attendance</span>
            <span style={{fontWeight:800,color:attPct>=80?'var(--primary)':attPct>=60?'var(--accent-gold)':'var(--accent-red)',fontSize:'1rem'}}>{attPct}%</span>
          </div>
          <div style={{background:'var(--border)',borderRadius:8,height:14,overflow:'hidden'}}>
            <div style={{
              width:`${attPct}%`,height:'100%',
              background:attPct>=80?'var(--primary)':attPct>=60?'var(--accent-gold)':'var(--accent-red)',
              borderRadius:8,
              transition:'width 0.5s ease',
            }}/>
          </div>
          {attPct < 75 && (
            <div style={{marginTop:'0.6rem',fontSize:'0.8rem',color:'var(--accent-red)',fontWeight:600}}>
              ⚠️ Your attendance is below 75%. Please attend regularly.
            </div>
          )}
        </div>
      </div>

      {/* Records table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Attendance Records ({filtered.length})</span>
          <select className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
            {courses.map(c=><option key={c} value={c}>{c==='All'?'All Courses':c}</option>)}
          </select>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :filtered.length===0?<div className="empty-state"><div className="empty-state-icon">📅</div><h3>No records found</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Date</th><th>Course</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={r._id}>
                    <td>{i+1}</td>
                    <td>{r.date}</td>
                    <td><span className="badge badge-info">{r.course}</span></td>
                    <td><span className={`badge badge-${STATUS_BADGE[r.status]||'muted'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
