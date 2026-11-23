import {AssessmentProgress} from '../../components/AcademyWorkspace';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState } from 'react';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import api from '../../services/api';
import TeachingIcon from '../../components/TeachingIcon';
import StudentQuizzes from './StudentQuizzes';
import './StudentExams.css';


function gradeColor(g){ return g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

export default function StudentResults() {
  const [search] = usePageSearch();
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(async ({signal, isCurrent}) => {
    try {
      const {data} = await api.get('/student/results', {signal});
      if (isCurrent()) { setResults(data.results || []); setError(''); }
    } catch (err) {
      if (isCurrent()) setError(err.response?.data?.message || 'Results could not refresh. Retrying automatically.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  });

  const visibleResults = results.filter(result => matchesPageSearch(
    search, result.course, result.exam, result.date, result.grade, result.marks
  ));
  const avg = results.length
    ? Math.round(results.reduce((sum, result) => sum + result.marks / result.totalMarks * 100, 0) / results.length)
    : 0;

  return (
    <section className="certificates-panel student-achievement-panel student-results" aria-label="Exam and quiz results">
      <div className="student-results-body">
      {error && <p className="academy-error" role="alert">{error}</p>}
      <section className="student-results-list" aria-labelledby="published-results-title">
        <header>
          <h3 id="published-results-title">Exam Results</h3>
          {!loading && <span className="student-results-count">{visibleResults.length}</span>}
          {!loading && results.length > 0 && <div className="student-results-average">Average score <strong>{avg}%</strong></div>}
        </header>
        {loading ? <div className="spinner-wrap" role="status" aria-label="Loading results"><div className="spinner"/></div>
          : visibleResults.length === 0 ? (
            <div className="student-results-empty">
              <span className="certificates-icon"><TeachingIcon name="file" size={20}/></span>
              <div><h4>{search ? 'No matching results' : 'No published results yet'}</h4><p>{search ? 'Try another course, assessment or grade.' : 'Your marks will appear here once published.'}</p></div>
            </div>
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
      <StudentQuizzes resultsOnly />
      <AssessmentProgress courseMarksOnly />
      </div>
    </section>
  );
}
