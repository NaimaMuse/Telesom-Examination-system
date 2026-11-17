import {useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import TeachingIcon from '../../components/TeachingIcon';
import {matchesPageSearch, usePageSearch} from '../../context/PageSearchContext';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import api from '../../services/api';
import Certificates from '../Certificates';
import StudentResults from './StudentExams';
import StudentQuizzes from './StudentQuizzes';
import StudentAssessmentSchedule from './StudentAssessmentSchedule';
import './StudentAcademicPages.css';

function UpcomingExams() {
  const [search] = usePageSearch();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useAutoRefresh(async ({signal, isCurrent}) => {
    try {
      const {data} = await api.get('/student/exams/upcoming', {signal});
      if (!isCurrent()) return;
      setExams((data.exams || []).filter(exam => exam.type !== 'quiz'));
      setError('');
    } catch (err) {
      if (isCurrent()) setError(err.response?.data?.message || 'Could not load upcoming exams.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  });

  const visible = exams.filter(exam => matchesPageSearch(search, exam.title, exam.course, exam.date));
  return <StudentAssessmentSchedule kind="exams" items={visible} loading={loading} error={error} searching={Boolean(search)}/>;
}

const assessmentTabs = [
  {id:'exams', label:'Exams', icon:'file', View:UpcomingExams},
  {id:'quizzes', label:'Quizzes', icon:'clipboard', View:StudentQuizzes},
];

const awardTabs = [
  {id:'results', label:'My Results', icon:'chart', View:StudentResults},
  {id:'certificates', label:'My Certificates', icon:'graduate', View:Certificates},
];

function StudentAcademicPage({title, tabs, isAssessment = false}) {
  const [params] = useSearchParams();
  const active = tabs.find(tab => tab.id === params.get('tab')) || tabs[0];
  const {View} = active;

  return <section className={isAssessment ? 'student-academic-page student-assessments' : 'student-academic-page'} aria-label={title}>
    <nav className="student-academic-tabs" aria-label={title}>
      {tabs.map(({id, label, icon}) => <Link key={id}
        to={{search:id === tabs[0].id ? '' : '?tab=' + id}}
        aria-current={active.id === id ? 'page' : undefined}>
        <TeachingIcon name={icon} size={17}/>{label}
      </Link>)}
    </nav>
    <View/>
  </section>;
}

export function StudentAssessments() {
  return <StudentAcademicPage title="Exams & Quizzes" tabs={assessmentTabs} isAssessment/>;
}

export function StudentAwards() {
  return <StudentAcademicPage title="Results & Certificates" tabs={awardTabs}/>;
}
