import {usePageSearch,matchesPageSearch} from '../../context/PageSearchContext';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import TeachingIcon from '../../components/TeachingIcon';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import api from '../../services/api';
import {studentClassesOnDate, teachingDateKey} from '../teacher/teachingSchedule.mjs';
import StudentClassCalendar from './StudentClassCalendar';
import './StudentDashboard.css';

const timeZone = 'Africa/Nairobi';
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone,
});
const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
});
const formatDate = key => dateFormatter.format(new Date(key + 'T12:00:00Z'));

function getNextClass(schedules, makeup, now) {
  const today = teachingDateKey(now);
  const time = clockFormatter.format(now);
  const start = Date.parse(today + 'T12:00:00Z');
  let nextRegular;
  for (let offset = 0; offset < 14 && !nextRegular; offset++) {
    const date = teachingDateKey(start + offset * 86_400_000);
    const entry = studentClassesOnDate(schedules, date).find(({slot}) => offset > 0 || slot.endTime >= time);
    if (entry) nextRegular = {
      date, title: entry.course.name, start: entry.slot.startTime, end: entry.slot.endTime,
    };
  }
  const firstMakeup = makeup[0];
  if (!firstMakeup) return nextRegular;
  const nextMakeup = {
    date: firstMakeup.date || teachingDateKey(firstMakeup.start),
    title: firstMakeup.lesson?.title || firstMakeup.course?.title || 'Makeup class',
    start: clockFormatter.format(new Date(firstMakeup.start)),
    end: clockFormatter.format(new Date(firstMakeup.end)),
    makeup: true,
  };
  return !nextRegular || nextMakeup.date + nextMakeup.start < nextRegular.date + nextRegular.start ? nextMakeup : nextRegular;
}

function DashboardPanel({title, icon, to, linkLabel, children}) {
  return <section className="student-home-panel">
    <header><TeachingIcon name={icon} size={18}/><h2>{title}</h2>
      {to && <Link to={to}>{linkLabel} <span aria-hidden="true">→</span></Link>}
    </header>
    {children}
  </section>;
}

function ContinueLearning({course, outlines}) {
  const lessons = outlines.filter(outline => String(outline.course?._id) === String(course?._id))
    .flatMap(outline => outline.lessons || []);
  const progress = lessons.length
    ? Math.round(lessons.reduce((sum, lesson) => sum + (Number(lesson.progress) || 0), 0) / lessons.length)
    : null;

  return <DashboardPanel title="Continue Learning" icon="book" to="/student/courses" linkLabel="View course">
    {course ? <div className="student-home-course">
      <span className="student-home-icon"><TeachingIcon name="graduate" size={21}/></span>
      <div>
        <strong>{course.name}</strong>
        <small>{[course.code, progress === null && 'No lesson progress yet'].filter(Boolean).join(' · ')}</small>
        {progress !== null && <div className="student-home-progress">
          <progress value={progress} max={100} aria-label="Course lesson progress"/><strong>{progress}%</strong>
        </div>}
      </div>
    </div> : <p className="student-home-empty">No courses enrolled yet.</p>}
  </DashboardPanel>;
}

const dashboardRequests = {
  courseData: '/student/courses',
  assessments: '/student/exams/upcoming',
  results: '/student/results',
  attendance: '/student/attendance/summary',
  makeup: '/academy/makeup-classes',
  outlines: '/academy/outlines',
  announcements: '/announcements',
};

export default function StudentDashboard() {
  const [search]=usePageSearch();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useAutoRefresh(async ({signal, isCurrent}) => {
    const requests = Object.entries(dashboardRequests);
    const responses = await Promise.allSettled(requests.map(([, url]) => api.get(url, {signal})));
    if (!isCurrent()) return;
    setError(responses.some(response => response.status === 'rejected'));
    setData(previous => ({
      ...previous,
      ...Object.fromEntries(requests.flatMap(([key], index) =>
        responses[index].status === 'fulfilled' ? [[key, responses[index].value.data]] : []
      )),
    }));
  });

  if (!data) return <div className="spinner-wrap" role="status" aria-label="Loading student dashboard"><div className="spinner"/></div>;

  const courses=(data.courseData?.courses||[]).filter(row=>matchesPageSearch(search,row));
  const classSchedules=(data.courseData?.classSchedules||[]).filter(row=>matchesPageSearch(search,row));
  const upcoming = (data.assessments?.exams || []).filter(row=>matchesPageSearch(search,row));
  const results = data.results?.results || [];
  const attendance = data.attendance;
  const now = new Date();
  const makeup = (data.makeup?.classes || []).filter(item =>
    matchesPageSearch(search,item) && item.displayStatus === 'Scheduled' && Date.parse(item.end) >= now.getTime()
  );
  const nextClass = getNextClass(classSchedules, makeup, now);
  const avgPct = results.length ? Math.round(results.reduce((sum, result) => sum + result.marks / result.totalMarks * 100, 0) / results.length) + '%' : '—';
  const attPct = attendance?.total ? Math.round(attendance.present / attendance.total * 100) + '%' : '—';

  const makeupStatus = !data.makeup ? 'Makeup schedule unavailable.'
    : makeup.length === 0 ? 'No makeup classes scheduled.'
      : `${makeup.length} makeup ${makeup.length === 1 ? 'class' : 'classes'} scheduled.`;
  const stats = [
    ['book', data.courseData ? courses.length : '—', 'Enrolled Courses'],
    ['clipboard', data.assessments ? upcoming.length : '—', 'Upcoming Exams'],
    ['chart', avgPct, 'Average Marks'],
    ['calendar', attPct, 'Attendance'],
  ];

  return <div className="student-home">
    {search.trim() && <p role="status">Showing dashboard matches for “{search.trim()}”. Clear search to see all records.</p>}
    {error && <p className="student-home-alert" role="status">Some dashboard data could not refresh.</p>}
    <dl className="student-home-stats">
      {stats.map(([icon, value, label]) => <div key={label}>
        <span className="student-home-icon"><TeachingIcon name={icon} size={21}/></span>
        <div><dt>{label}</dt><dd>{value}</dd></div>
      </div>)}
    </dl>
    <StudentClassCalendar schedules={classSchedules} makeupClasses={makeup}
      sidebar={<ContinueLearning course={courses[0]} outlines={data.outlines?.outlines || []}/>}/>
    <div className="student-home-bottom">
      <DashboardPanel title="Upcoming Classes" icon="calendar" to="/student/courses" linkLabel="View schedule">
        {nextClass ? <div className="student-home-next">
          <strong>{nextClass.title}{nextClass.makeup ? ' · Makeup' : ''}</strong>
          <small>{formatDate(nextClass.date)} · {nextClass.start}–{nextClass.end} EAT</small>
        </div> : <p className="student-home-empty">No upcoming classes in the next 14 days.</p>}
      </DashboardPanel>
      <DashboardPanel title="Pending Exams & Quizzes" icon="clipboard" to="/student/assessments" linkLabel="View all">
        {upcoming.length ? <ul className="student-home-assessments">{upcoming.slice(0, 2).map(item => <li key={item._id}>
          <div><strong>{item.title}</strong><small>{item.course}</small></div>
          <span>{item.type === 'quiz' ? 'Quiz' : 'Exam'}</span>
          {item.date && <time dateTime={item.date}>{formatDate(item.date)}</time>}
        </li>)}</ul> : <p className="student-home-empty">No upcoming exams or quizzes.</p>}
      </DashboardPanel>
      <DashboardPanel title="Announcements" icon="megaphone">
        <ul className="student-home-announcements">
          <li>{makeupStatus}</li>
          {(data.announcements?.announcements || []).filter(row=>matchesPageSearch(search,row.title,row.message)).slice(0, 2).map(item => <li key={item._id} title={item.title}>{item.title}</li>)}
        </ul>
      </DashboardPanel>
    </div>
  </div>;
}
