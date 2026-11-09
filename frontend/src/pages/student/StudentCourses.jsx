import {useState} from 'react';
import {Link} from 'react-router-dom';
import TeachingIcon from '../../components/TeachingIcon';
import {usePageSearch, matchesPageSearch} from '../../context/PageSearchContext';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import api from '../../services/api';
import {makeupClassesByDate, studentClassesOnDate, teachingDateKey} from '../teacher/teachingSchedule.mjs';
import './StudentCourses.css';

function classesThisWeek(schedules, makeupClasses, now = new Date()) {
  const today = teachingDateKey(now);
  const time = now.toLocaleTimeString('en-GB', {timeZone:'Africa/Nairobi', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  const start = Date.parse(today + 'T12:00:00Z');
  const makeupByDate = makeupClassesByDate(makeupClasses.filter(item => item.displayStatus === 'Scheduled'));
  return Array.from({length:7}, (_, offset) => {
    const date = teachingDateKey(start + offset * 86400000);
    const regular = studentClassesOnDate(schedules, date)
      .filter(({slot}) => date !== today || slot.startTime >= time)
      .map(({course,slot}) => ({courseId:course._id, date, time:slot.startTime + '–' + slot.endTime + ' EAT'}));
    const makeup = (makeupByDate.get(date) || []).map(item => ({courseId:item.course?._id, date, time:'Makeup class'}));
    return [...regular, ...makeup];
  }).flat();
}

function CourseCard({course, nextClass}) {
  return <article className="student-courses-tile">
    <div className="student-course-cover">
      <TeachingIcon name="book" size={30}/>
      {course.code && <span>{course.code}</span>}
    </div>
    <div className="student-course-info">
      <div className="student-course-title">
        <h3>{course.name}</h3>
        {course.code && <span className="student-course-list-code">{course.code}</span>}
        {course.credits != null && <span>{course.credits} {Number(course.credits) === 1 ? 'credit' : 'credits'}</span>}
      </div>
      {course.description && <p>{course.description}</p>}
      <dl className="student-courses-details">
        <div><dt><TeachingIcon name="profile" size={17}/> Instructor</dt><dd>{course.teacher || 'Not assigned'}</dd></div>
        <div><dt><TeachingIcon name="calendar" size={17}/> Class format</dt><dd>In person</dd></div>
      </dl>
    </div>
    <div className="student-course-next">
      <span>Next class · next 7 days</span>
      {nextClass ? <>
        <time dateTime={nextClass.date}>{new Date(nextClass.date + 'T12:00:00Z').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short',timeZone:'Africa/Nairobi'})}</time>
        <span>{nextClass.time}</span>
      </> : <strong>No upcoming class</strong>}
      <Link to="/student"><TeachingIcon name="calendar" size={16}/> View calendar</Link>
    </div>
  </article>;
}

export default function StudentCourses() {
  const [search] = usePageSearch();
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [makeupClasses, setMakeupClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');

  useAutoRefresh(async ({signal, isCurrent}) => {
    const [courseResult, makeupResult] = await Promise.allSettled([
      api.get('/student/courses', {signal}),
      api.get('/academy/makeup-classes', {signal}),
    ]);
    if (!isCurrent()) return;
    if (courseResult.status === 'fulfilled') {
      setCourses(courseResult.value.data.courses || []);
      setSchedules(courseResult.value.data.classSchedules || []);
    }
    if (makeupResult.status === 'fulfilled') setMakeupClasses(makeupResult.value.data.classes || []);
    setError(courseResult.status === 'rejected' || makeupResult.status === 'rejected'
      ? 'Some course information could not refresh. Retrying automatically.' : '');
    setLoading(false);
  });

  const visibleCourses = courses.filter(course =>
    matchesPageSearch(search, course.name, course.code, course.teacher, course.semester, course.description)
  );
  const upcoming = classesThisWeek(schedules, makeupClasses);
  const stats = [
    ['book', courses.length, 'Enrolled courses'],
    ['layers', courses.reduce((total, course) => total + (Number(course.credits) || 0), 0), 'Total credits'],
    ['calendar', upcoming.length, 'Classes in the next 7 days'],
    ['teacher', courses.filter(course => course.teacher && course.teacher !== 'Not assigned').length, 'Courses with instructors'],
  ];

  return <section className="student-courses-page" aria-labelledby="student-courses-title">
    <header className="student-courses-banner">
      <h1 id="student-courses-title">My Courses</h1>
      <p>Find your enrolled courses, instructors, and classroom schedules.</p>
    </header>
    {error && <div className="card card-body" role="alert">{error}</div>}
    {loading ? <div className="spinner-wrap" role="status" aria-label="Loading courses"><div className="spinner"/></div> : <>
      <dl className="student-course-stats" aria-label="Course summary">
        {stats.map(([icon,value,label]) => <div key={label}>
          <TeachingIcon name={icon} size={18}/>
          <div><dt>{label}</dt><dd>{value}</dd></div>
        </div>)}
      </dl>
      <div className="student-course-toolbar">
        <h2>Enrolled Courses ({visibleCourses.length})</h2>
        <div role="group" aria-label="Course layout">
          {['grid','list'].map(option => <button type="button" key={option}
            aria-pressed={view === option} onClick={() => setView(option)}>
            <TeachingIcon name={option} size={15}/> {option}
          </button>)}
        </div>
      </div>
      {visibleCourses.length ? <div className={'student-courses-grid view-' + view}>
        {visibleCourses.map(course => <CourseCard key={course._id} course={course}
          nextClass={upcoming.find(item => item.courseId === course._id)}/>)}
      </div> : <div className="student-courses-empty">
        <TeachingIcon name="book" size={30}/>
        <h3>{search ? 'No matching courses' : 'No courses enrolled'}</h3>
        <p>{search ? 'Try another course name, teacher or semester.' : 'Contact the admin to enroll in courses.'}</p>
      </div>}
    </>}
  </section>;
}
