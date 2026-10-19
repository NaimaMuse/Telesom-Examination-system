import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_RESULTS = [
  { _id:'r1', course:'CS101', exam:'Midterm Exam',   marks:78, totalMarks:100, grade:'B', date:'2026-11-15', status:'published' },
  { _id:'r2', course:'BUS101',exam:'Quiz 1',          marks:18, totalMarks:20,  grade:'A', date:'2026-11-10', status:'published' },
  { _id:'r3', course:'CS101', exam:'Assignment 1',    marks:9,  totalMarks:10,  grade:'A', date:'2026-10-20', status:'published' },
];

function gradeColor(g){ return g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

export default function StudentExams() {
  const [results, setResults] = useState(PLACEHOLDER_RESULTS);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{const res=await api.get('/student/results');if(res.data?.results)setResults(res.data.results);}catch{}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const filtered = results.filter(r=>!search||[r.course,r.exam].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  const avg = filtered.length ? Math.round(filtered.reduce((a,r)=>a+(r.marks/r.totalMarks)*100,0)/filtered.length) : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Exams &amp; Results</h1><p>Your marks, grades, and academic results</p></div>
      </div>

      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">{avg}%</div><div className="stat-label">Average Score</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><div className="stat-value">{filtered.filter(r=>r.grade!=='F').length}</div><div className="stat-label">Passed Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div className="stat-info"><div className="stat-value">{filtered.filter(r=>r.grade==='F').length}</div><div className="stat-label">Failed Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">🏆</div><div className="stat-info"><div className="stat-value">{filtered.filter(r=>r.grade==='A').length}</div><div className="stat-label">A Grades</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">My Results ({filtered.length})</span>
          <div className="search-input-wrap">
            <span style={{color:'var(--text-muted)'}}>🔍</span>
            <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :filtered.length===0?<div className="empty-state"><div className="empty-state-icon">📊</div><h3>No results available</h3><p>Your results will appear here once published.</p></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Course</th><th>Exam / Assessment</th><th>Date</th><th>Marks</th><th>%</th><th>Grade</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const pct=r.totalMarks?Math.round((r.marks/r.totalMarks)*100):0;
                  return (
                    <tr key={r._id}>
                      <td>{i+1}</td>
                      <td><span className="badge badge-info">{r.course}</span></td>
                      <td style={{fontWeight:600}}>{r.exam}</td>
                      <td>{r.date||'—'}</td>
                      <td><strong>{r.marks}</strong>/{r.totalMarks}</td>
                      <td>{pct}%</td>
                      <td><span className={gradeColor(r.grade)}>{r.grade||'—'}</span></td>
                      <td style={{width:100}}>
                        <div style={{background:'var(--border)',borderRadius:4,height:8,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:pct>=80?'var(--primary)':pct>=60?'var(--accent-gold)':'var(--accent-red)',borderRadius:4}}/>
                        </div>
                      </td>
                      <td><span className={`badge badge-${r.status==='published'?'success':'warning'}`}>{r.status||'pending'}</span></td>
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
