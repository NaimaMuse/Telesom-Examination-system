import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState } from 'react';
import api from '../../services/api';


function gradeColor(g){ return !g?'':g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

export default function StudentQuizzes() {
  const [search] = usePageSearch();
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(async ({ signal, isCurrent }) => {
    try {
      const { data } = await api.get('/student/quizzes', { signal });
      if (!isCurrent()) return;
      setQuizzes(data.quizzes || []); setError('');
    } catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Data could not refresh. Retrying automatically.'); }
    finally { if (isCurrent()) setLoading(false); }
  });
  const graded   = quizzes.filter(q=>q.status==='graded' && matchesPageSearch(search, q.course, q.quiz, q.date, q.grade, q.marks));
  const upcoming = quizzes.filter(q=>q.status==='upcoming' && matchesPageSearch(search, q.course, q.quiz, q.date));
  const avg      = graded.length?Math.round(graded.reduce((a,q)=>a+(q.marks/q.totalMarks)*100,0)/graded.length):0;

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">{avg}%</div><div className="stat-label">Quiz Average</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><div className="stat-value">{graded.length}</div><div className="stat-label">Completed</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">⏳</div><div className="stat-info"><div className="stat-value">{upcoming.length}</div><div className="stat-label">Upcoming</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">🏆</div><div className="stat-info"><div className="stat-value">{graded.filter(q=>q.grade==='A').length}</div><div className="stat-label">A Grades</div></div></div>
      </div>

      {upcoming.length > 0 && (
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <div className="card-header"><span className="card-title">Upcoming Quizzes</span></div>
          <div className="card-body" style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>
            {upcoming.map(q=>(
              <div key={q._id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'0.75rem',background:'#fffbeb',borderRadius:'var(--radius-sm)',border:'1px solid #fef3c7'}}>
                <span style={{fontSize:'1.2rem'}}>🧩</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:'0.875rem'}}>{q.quiz}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{q.course} • {q.date}</div>
                </div>
                <span className="badge badge-warning">Upcoming</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><span className="card-title">Quiz Results ({graded.length})</span></div>
        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :graded.length===0?<div className="empty-state"><div className="empty-state-icon">🧩</div><h3>{search ? 'No matching quiz results' : 'No quiz results yet'}</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Course</th><th>Quiz</th><th>Date</th><th>Marks</th><th>%</th><th>Grade</th></tr></thead>
              <tbody>
                {graded.map((q,i)=>{
                  const pct=q.totalMarks?Math.round((q.marks/q.totalMarks)*100):0;
                  return (
                    <tr key={q._id}>
                      <td>{i+1}</td>
                      <td><span className="badge badge-info">{q.course}</span></td>
                      <td style={{fontWeight:600}}>{q.quiz}</td>
                      <td>{q.date}</td>
                      <td>{q.marks}/{q.totalMarks}</td>
                      <td>{pct}%</td>
                      <td><span className={gradeColor(q.grade)}>{q.grade||'—'}</span></td>
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
