import {AssessmentProgress} from '../../components/AcademyWorkspace';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import './StudentExams.css';


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

  const visibleResults = results.filter(result => matchesPageSearch(
    search, result.course, result.exam, result.date, result.grade, result.marks
  ));
  const avg = results.length
    ? Math.round(results.reduce((sum, result) => sum + result.marks / result.totalMarks * 100, 0) / results.length)
    : 0;

  return (
    <section className="student-results" aria-labelledby="student-results-title">
      <header className="student-results-heading">
        <div><h1 id="student-results-title">Exams &amp; Results</h1><p>Review your published marks and grades.</p></div>
        {!loading && results.length > 0 && <div className="student-results-average"><span>Average score</span><strong>{avg}%</strong></div>}
      </header>
      {error && <p className="academy-error" role="alert">{error}</p>}
      <section className="student-results-list" aria-labelledby="published-results-title">
        <header><h2 id="published-results-title">My Results</h2><span>{visibleResults.length}</span></header>
        {loading ? <div className="spinner-wrap" role="status" aria-label="Loading results"><div className="spinner"/></div>
          : visibleResults.length === 0 ? (
            <div className="empty-state"><h3>{search ? 'No matching results' : 'No published results yet'}</h3><p>{search ? 'Try another course, assessment or grade.' : 'Your marks will appear here once published.'}</p></div>
          ) : (
            <ul>{visibleResults.map(result => (
              <li key={result._id}>
                <div className="student-result-name">
                  <strong>{result.exam}</strong>
                  <span>{result.course}{result.date && <> · <time dateTime={result.date}>{result.date.split('-').reverse().join('/')}</time></>}</span>
                </div>
                <div className="student-result-mark">
                  <strong>{result.marks}<span> / {result.totalMarks}</span></strong>
                  <span className={gradeColor(result.grade)}>{result.grade ? 'Grade '+result.grade : '—'}</span>
                </div>
              </li>
            ))}</ul>
          )}
      </section>
      <AssessmentProgress courseMarksOnly />
    </section>
  );
}
