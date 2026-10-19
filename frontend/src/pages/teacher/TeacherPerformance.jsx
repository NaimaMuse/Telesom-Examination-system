import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_RESULTS = [
  { _id:'r1', student:'Ahmed Ali',    studentId:'STU-001', course:'CS101', exam:'Midterm', marks:78, totalMarks:100, grade:'B' },
  { _id:'r2', student:'Faadumo Abdi', studentId:'STU-002', course:'CS101', exam:'Quiz 1',  marks:19, totalMarks:20,  grade:'A' },
  { _id:'r3', student:'Mohamed Osman',studentId:'STU-003', course:'CS201', exam:'Quiz 2',  marks:15, totalMarks:20,  grade:'B' },
  { _id:'r4', student:'Hodan Yusuf',  studentId:'STU-004', course:'CS201', exam:'Midterm', marks:55, totalMarks:100, grade:'C' },
];

const PLACEHOLDER_COURSES = ['All','CS101','CS201'];

function gradeColor(g){ return g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

export default function TeacherPerformance() {
  const [results,   setResults]   = useState(PLACEHOLDER_RESULTS);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [selCourse, setSelCourse] = useState('All');

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{const res=await api.get('/teacher/performance');if(res.data?.results)setResults(res.data.results);}catch{}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const filtered = results.filter(r=>{
    const matchSearch = !search||[r.student,r.studentId].some(v=>v?.toLowerCase().includes(search.toLowerCase()));
    const matchCourse = selCourse==='All'||r.course===selCourse;
    return matchSearch&&matchCourse;
  });

  // Summary stats
  const avg = filtered.length ? Math.round(filtered.reduce((a,r)=>a+(r.marks/r.totalMarks)*100,0)/filtered.length) : 0;
  const highest = filtered.length ? Math.max(...filtered.map(r=>Math.round((r.marks/r.totalMarks)*100))) : 0;
  const passing  = filtered.filter(r=>r.grade!=='F').length;

  return (
    <>
      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card"><div className="stat-icon green">📊</div><div className="stat-info"><div className="stat-value">{avg}%</div><div className="stat-label">Class Average</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">🏆</div><div className="stat-info"><div className="stat-value">{highest}%</div><div className="stat-label">Highest Score</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">✅</div><div className="stat-info"><div className="stat-value">{passing}</div><div className="stat-label">Passing Students</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div className="stat-info"><div className="stat-value">{filtered.length-passing}</div><div className="stat-label">Failing Students</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Results ({filtered.length})</span>
          <div className="filter-bar" style={{marginBottom:0}}>
            <div className="search-input-wrap">
              <span style={{color:'var(--text-muted)'}}>🔍</span>
              <input placeholder="Search student…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
              {PLACEHOLDER_COURSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :filtered.length===0?<div className="empty-state"><div className="empty-state-icon">📊</div><h3>No results found</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Student</th><th>ID</th><th>Course</th><th>Exam</th><th>Marks</th><th>%</th><th>Grade</th><th>Progress</th></tr></thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const pct=r.totalMarks?Math.round((r.marks/r.totalMarks)*100):0;
                  return (
                    <tr key={r._id}>
                      <td>{i+1}</td>
                      <td style={{fontWeight:600}}>{r.student}</td>
                      <td><code>{r.studentId}</code></td>
                      <td><span className="badge badge-info">{r.course}</span></td>
                      <td>{r.exam}</td>
                      <td>{r.marks}/{r.totalMarks}</td>
                      <td>{pct}%</td>
                      <td><span className={gradeColor(r.grade)}>{r.grade||'—'}</span></td>
                      <td style={{width:120}}>
                        <div style={{background:'var(--border)',borderRadius:4,height:8,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:pct>=80?'var(--primary)':pct>=60?'var(--accent-gold)':'var(--accent-red)',borderRadius:4}}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
