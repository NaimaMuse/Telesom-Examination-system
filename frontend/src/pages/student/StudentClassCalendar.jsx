import {useState} from 'react';
import TeachingIcon from '../../components/TeachingIcon';
import {studentClassesOnDate, contractDurationLabel, makeupClassesByDate, teachingDateKey} from '../teacher/teachingSchedule.mjs';
import './StudentClassDates.css';

const weekdays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const dateKey = date => date.toISOString().slice(0, 10);
const formatDate = (date, options) => date.toLocaleDateString('en-GB', {...options, timeZone:'Africa/Nairobi'});
const addDays = (date, count) => new Date(date.getTime() + count * 86400000);
const formatCourseDate = key => formatDate(new Date(key + 'T12:00:00Z'), {day:'numeric', month:'short', year:'numeric'});

function StudentCourseDuration({schedules}) {
  const contracts = schedules.filter(schedule => schedule.startDate);
  return <section className="student-course-duration" aria-labelledby="student-duration-title">
    <header className="student-calendar-header">
      <div className="student-calendar-title"><TeachingIcon name="book" size={23}/><div>
        <h2 id="student-duration-title">Course Duration</h2>
        <p>Your course dates and days left</p>
      </div></div>
    </header>
    {contracts.length ? <ul>{contracts.map(contract => {
      const unit = contract.dayBasis === 'calendar' ? 'calendar' : 'teaching';
      const remaining = contract.remainingContractDays;
      return <li key={contract._id}>
        <h3>{contract.course.name}</h3>
        <p>{[contract.batch, contract.academicYear].filter(Boolean).join(' · ')}</p>
        <p>{formatCourseDate(contract.startDate)}{contract.endDate ? ' – ' + formatCourseDate(contract.endDate) : ''}</p>
        <dl>
          <div><dt>Course length</dt><dd>{contractDurationLabel(contract)}</dd></div>
          <div><dt>Days left</dt><dd>{remaining} {unit} {remaining === 1 ? 'day' : 'days'}</dd></div>
        </dl>
      </li>;
    })}</ul> : <p className="student-duration-empty">Course dates will appear here once a teaching contract is assigned.</p>}
  </section>;
}

export default function StudentClassCalendar({schedules, makeupClasses}) {
  const today = teachingDateKey();
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState('month');
  const current = new Date(selected + 'T12:00:00Z');
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1, 12));
  const weekStart = date => addDays(date, -((date.getUTCDay() + 1) % 7));
  const start = view === 'month' ? weekStart(first) : view === 'week' ? weekStart(current) : current;
  const monthLength = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const length = view === 'month' ? Math.ceil((monthLength + (first.getUTCDay() + 1) % 7) / 7) * 7 : view === 'week' ? 7 : 1;
  const dates = Array.from({length}, (_, index) => addDays(start, index));
  const makeupByDate = makeupClassesByDate(makeupClasses);
  function move(direction) {
    const target = view === 'month' ? new Date(Date.UTC(year, month + direction, 1, 12))
      : addDays(current, direction * (view === 'week' ? 7 : 1));
    setSelected(dateKey(target));
  }

  return <div className="student-calendar-layout">
  <section className="student-class-calendar" aria-labelledby="student-calendar-title">
    <header className="student-calendar-header">
      <div className="student-calendar-title"><TeachingIcon name="calendar" size={23}/><div>
        <h2 id="student-calendar-title">Academic Calendar</h2>
        <p>Your scheduled classes · EAT</p>
      </div></div>
      <div className="student-calendar-controls">
        <button type="button" aria-label={'Previous '+view} onClick={()=>move(-1)}>‹</button>
        <strong aria-live="polite">{formatDate(current,{month:'long',year:'numeric'})}</strong>
        <button type="button" aria-label={'Next '+view} onClick={()=>move(1)}>›</button>
        <div className="student-calendar-views" role="group" aria-label="Calendar view">
          {['month','week','day'].map(option=><button type="button" key={option} aria-pressed={option===view} onClick={()=>setView(option)}>{option}</button>)}
        </div>
      </div>
    </header>
    <div className={'student-calendar-grid view-'+view}>
      {view!=='day'&&weekdays.map(day=><span className="student-calendar-weekday" key={day}>{day}</span>)}
      {dates.map(date=>{
        const key=dateKey(date);
        const hasClass = studentClassesOnDate(schedules, key).length > 0;
        const hasMakeup=makeupByDate.has(key);
        return <button type="button" key={key}
          className={view==='month'&&date.getUTCMonth()!==month?'outside-month':''}
          data-class={hasClass || hasMakeup}
          aria-current={key===today?'date':undefined}
          aria-pressed={key===selected}
          aria-label={formatDate(date,{weekday:'long',day:'numeric',month:'long'})+(hasClass?', scheduled class':'')+(hasMakeup?', makeup class':'')}
          onClick={()=>setSelected(key)}>
          {view==='day'?formatDate(date,{weekday:'long',day:'numeric',month:'short'}):date.getUTCDate()}
          {(hasClass || hasMakeup) && <i aria-hidden="true"/>}
          {hasMakeup && <small>Makeup</small>}
        </button>;
      })}
    </div>
    <div className="student-calendar-legend"><span><i/> Class day</span><button type="button" onClick={()=>setSelected(today)}>Today</button></div>
  </section>
  <StudentCourseDuration schedules={schedules}/>
  </div>;
}
