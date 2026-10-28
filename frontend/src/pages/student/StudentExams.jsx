import {AssessmentProgress} from '../../components/AcademyWorkspace';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';


function gradeColor(g){ return g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

export default function StudentExams() {
  const [search] = usePageSearch();
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let busy = false;
    const controller = new AbortController();
    const loadResults = async () => {
      if (busy || !active) return;
      busy = true;
      try {
        const { data } = await api.get('/student/results', { signal: controller.signal });
        if (!active) return;
        setResults(data.results || []);
        setError('');
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Results could not refresh. Retrying automatically.');
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    const refresh = () => { if (!document.hidden) loadResults(); };
    loadResults();
    const timer = setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const visibleResults = results.filter(r => matchesPageSearch(search, r.course, r.exam, r.date, r.grade, r.status, r.marks));
  const avg = results.length ? Math.round(results.reduce((a,r)=>a+(r.marks/r.totalMarks)*100,0)/results.length) : 0;

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      <AssessmentProgress />
      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card"><div className="stat-icon blue">📊</div><div className="stat-info"><div className="stat-value">{avg}%</div><div className="stat-label">Average Score</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><div className="stat-value">{results.filter(r=>r.isPassed===true).length}</div><div className="stat-label">Passed Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div className="stat-info"><div className="stat-value">{results.filter(r=>r.isPassed===false).length}</div><div className="stat-label">Failed Exams</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">🏆</div><div className="stat-info"><div className="stat-value">{results.filter(r=>r.grade==='A').length}</div><div className="stat-label">A Grades</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">My Results ({visibleResults.length})</span>
          <span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Auto-refresh · every 10 seconds</span>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :visibleResults.length===0?<div className="empty-state"><div className="empty-state-icon">📊</div><h3>{search ? 'No matching results' : 'No results available'}</h3><p>{search ? 'Try another course, assessment or grade.' : 'Your results will appear here once published.'}</p></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Course</th><th>Exam / Assessment</th><th>Date</th><th>Marks</th><th>%</th><th>Grade</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {visibleResults.map((r,i)=>{
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
