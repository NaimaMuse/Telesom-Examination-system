import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState } from 'react';
import api from '../../services/api';
import StudentAssessmentSchedule from './StudentAssessmentSchedule';


function gradeColor(g){ return !g?'':g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

export default function StudentQuizzes({resultsOnly = false}) {
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

  if (!resultsOnly) {
    return <StudentAssessmentSchedule kind="quizzes" items={upcoming} loading={loading} error={error} searching={Boolean(search)}/>;
  }

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      {graded.length > 0 && <div className="card">
        <div className="card-header"><span className="card-title">Quiz Results ({graded.length})</span></div>
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
      </div>}
    </>
  );
}
