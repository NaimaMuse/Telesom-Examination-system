import { assessmentDateKey, normalizeCalendarAssessments, assessmentTime, shiftCalendarDate } from './assessmentCalendar.mjs';
import TeachingIcon from '../../components/TeachingIcon';
import { WEEK_DAYS } from '../../components/WeeklySchedule';
import { classesOnDate } from './teachingSchedule.mjs';
import api from '../../services/api';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTeacherDashboardData, getTeacherCalendarAssessments } from '../../services/teacherService';
import './teacher.css';
import './TeacherDashboardDesign.css';

function parseExamDate(value) {
  if (!value) return null;
  const datePart = assessmentDateKey(value);
  const date = datePart
    ? new Date(Number(datePart.slice(0, 4)), Number(datePart.slice(5, 7)) - 1, Number(datePart.slice(8, 10)))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date, options) {
  return date.toLocaleDateString('en', options);
}

export default function TeacherDashboard() {
  const [search] = usePageSearch();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [contractsError, setContractsError] = useState('');
  const [upcoming, setUpcoming] = useState([]);
  const [assessmentsError, setAssessmentsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calendarView, setCalendarView] = useState('month');

  const requestRef = useRef(null);
  const activeRef = useRef(false);
  const load = useCallback(async (initial = false) => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    if (initial === true) setLoading(true);
    try {
      const [dashboardResult, contractResult, examsResult] = await Promise.allSettled([
        getTeacherDashboardData(controller.signal),
        api.get('/teacher-contracts', {signal: controller.signal}),
        getTeacherCalendarAssessments(controller.signal),
      ]);
      if (!activeRef.current || controller.signal.aborted) return;
      if (contractResult.status === 'fulfilled') {
        setContracts(previous=>JSON.stringify(previous)===JSON.stringify(contractResult.value.data.contracts||[])?previous:contractResult.value.data.contracts||[]); setContractsError('');
      } else { setContractsError('Contracts could not refresh. Retrying automatically.'); }
      if (examsResult.status === 'fulfilled') {
        const next=normalizeCalendarAssessments(examsResult.value.exams,examsResult.value.quizzes);
        setUpcoming(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
        setAssessmentsError('');
      } else { setAssessmentsError('Assessments could not refresh. Please retry.'); }
      if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
      setSummary(dashboardResult.value?.summary ?? null);
      setError(null);
    } catch (err) {
      if (!activeRef.current || controller.signal.aborted) return;
      setError('Dashboard could not refresh. Retrying automatically.');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (activeRef.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    load(true);
    const refresh = () => { if (!document.hidden) load(); };
    const interval = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      activeRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);


  const matchingContracts=contracts.filter(contract=>matchesPageSearch(search,contract.course?.title,contract.course?.name,contract.batch,contract.academicYear));
  const contractsByDate=matchingContracts.reduce((groups,contract)=>{const key=String(contract.startDate||'').slice(0,10);if(key)groups[key]=[...(groups[key]||[]),contract];return groups;},{});

  const matchingExams = upcoming.filter(exam => matchesPageSearch(search, exam.title, exam.type, exam.course?.title, exam.course?.courseCode, exam.examDate, exam.date));
  const examsByDate = matchingExams.reduce((groups, exam) => {
    const key = assessmentDateKey(exam.examDate || exam.date);
    if (!key) return groups;
    groups[key] = [...(groups[key] || []), exam];
    return groups;
  }, {});

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - ((monthStart.getDay() + 1) % 7));
  const calendarCellCount = Math.ceil((((monthStart.getDay() + 1) % 7) + monthDays) / 7) * 7;
  const selectedLocalDate = new Date(`${selectedDate}T12:00:00`);
  const weekStart = new Date(selectedLocalDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 1) % 7));
  const visibleDates = calendarView === 'day'
    ? [selectedLocalDate]
    : calendarView === 'week'
      ? Array.from({ length: 7 }, (_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index))
      : Array.from({ length: calendarCellCount }, (_, index) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index));
  const calendarDays = visibleDates.map((date) => ({
    date,
    key: dateKey(date),
    currentMonth: date.getMonth() === calendarMonth.getMonth(),
  }));

  const selectedAssessments = examsByDate[selectedDate] || [];
  const todayKey = dateKey(new Date());
  const nextAssessments = [...matchingExams].filter(exam=>{const date=parseExamDate(exam.examDate||exam.date);return date&&assessmentDateKey(exam.examDate||exam.date)>=todayKey;}).sort((a,b)=>parseExamDate(a.examDate||a.date)-parseExamDate(b.examDate||b.date)).slice(0,3);

  return (
    <div className="teacher-scope teacher-reference-dashboard teacher-gold-dashboard">
      <section className="teacher-dashboard-metrics" aria-label="Course totals">
        {[
          { label: 'Enrolled Students', value: summary?.totalStudents, icon: 'users', tone: 'students', to: '/teacher/my-course?tab=students' },
          { label: 'Total Exams', value: summary?.totalExams, icon: 'file', tone: 'exams', to: '/teacher/exams' },
          { label: 'Total Quizzes', value: summary?.totalQuizzes, icon: 'clipboard', tone: 'quizzes', to: '/teacher/exams' },
        ].map((metric) => (
          <article className="teacher-metric-card" key={metric.label}>
            <span className={`teacher-metric-icon ${metric.tone}`} aria-hidden="true"><TeachingIcon name={metric.icon} size={28}/></span>
            <div className="teacher-metric-copy">
              <strong>{loading ? '—' : typeof metric.value === 'number' ? metric.value : 'Unavailable'}</strong>
              <span>{metric.label}</span>
            </div>
          </article>
        ))}
      </section>



      {error && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span style={{ fontSize: '0.85rem', color: '#92400e', flex: 1 }}>{error}</span>
          <button className="btn btn-sm btn-secondary" onClick={load}>Retry</button>
        </div>
      )}

      <section className="teacher-two-column-layout" aria-label="Teaching overview and calendar"><div className="teacher-dashboard-stack">
<section className="teacher-scheduled-panel"><header><h2><TeachingIcon name="clipboard"/> Scheduled Assessments</h2><span><TeachingIcon name="calendar" size={13}/>{formatDate(selectedLocalDate,{month:'short',day:'numeric'})}</span></header><p className="teacher-scheduled-date">{formatDate(selectedLocalDate,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
          {assessmentsError && <p className="teacher-panel-message" role="alert">{assessmentsError} <button type="button" onClick={()=>load()}>Retry</button></p>}
          {loading ? <p className="teacher-panel-message">Loading scheduled assessments…</p> : selectedAssessments.length ? <ul>{selectedAssessments.map(item=><li key={item.calendarKey}><span className="teacher-scheduled-time"><TeachingIcon name={item.type==='quiz'?'clipboard':'file'} size={19}/></span><div><Link to="/teacher/exams"><strong>{item.title}</strong></Link><small>{item.course?.title||item.course?.name||item.courseName||'Assigned course'}{item.batch?' · '+item.batch:''}</small><small className="teacher-assessment-timing"><TeachingIcon name="clock" size={12}/>{assessmentTime(item)}{item.durationMinutes?' · '+item.durationMinutes+' minutes':''}</small></div><span className={'teacher-scheduled-badge '+item.type}>{item.type||'Exam'}<small>{item.status}</small></span></li>)}</ul> : !assessmentsError && <p className="teacher-panel-message">No exams, quizzes or assessments scheduled for this date. Select a marked date in the calendar.</p>}
        </section>
<section className="teacher-assessments-panel"><header><h2><TeachingIcon name="calendar"/> Upcoming Assessments</h2><Link to="/teacher/exams">View all <TeachingIcon name="arrow" size={16}/></Link></header>
          {loading ? <p className="teacher-panel-message" role="status">Loading upcoming assessments…</p> : assessmentsError && !upcoming.length ? <p className="teacher-panel-message" role="alert">{assessmentsError}</p> : nextAssessments.length ? <ul>{nextAssessments.map(exam=><li key={exam.calendarKey||exam._id||exam.title}><span className="teacher-assessment-icon"><TeachingIcon name="file" size={25}/></span><div><Link to="/teacher/exams">{exam.title}</Link><p>{formatDate(parseExamDate(exam.examDate||exam.date),{weekday:'short',month:'short',day:'numeric',year:'numeric'})} · {assessmentTime(exam)}</p><small>{exam.course?.title||exam.courseName||'Assigned course'}</small></div><span className="teacher-assessment-type">{exam.status||'Upcoming'}</span></li>)}</ul> : <div className="teacher-assessments-empty"><TeachingIcon name="calendar" size={34}/><strong>No upcoming assessments scheduled.</strong><p>Your scheduled exams and quizzes will appear here.</p></div>}
        </section>

<aside className="teacher-contract-side">
          <section className="teacher-contract-panel"><header><h2><TeachingIcon name="briefcase"/> Teaching Contract</h2><Link to="/teacher/my-course?tab=outline">View details <TeachingIcon name="arrow" size={16}/></Link></header>
          {contractsError && <p className="teacher-panel-message" role="status">{contractsError}</p>}
          {loading && !contracts.length ? <p className="teacher-panel-message">Loading contracts…</p> : matchingContracts.length === 0 ? <p className="teacher-panel-message">{search ? 'No contracts match your search.' : 'Your teaching contract will appear when your administrator assigns it.'}</p> : matchingContracts.slice(0,3).map(contract => {
            const params=new URLSearchParams({tab:'outline',courseId:String(contract.course?._id||contract.course),academicYear:contract.academicYear,batch:contract.batch,contractId:contract._id});
            return <article className="teacher-reference-contract" key={contract._id}>
              <div className="teacher-contract-main"><span className="teacher-contract-emblem"><TeachingIcon name="book" size={32}/></span><div><Link to={'/teacher/my-course?'+params.toString()}>{contract.course?.title||contract.course?.name||'Assigned course'}</Link><p><TeachingIcon name="calendar" size={14}/>{contract.startDate} – {contract.endDate||'No end date'}</p><small>{contract.academicYear} / {contract.batch}</small></div><span className={'teacher-contract-state '+contract.contractStatus?.toLowerCase()}>{contract.contractStatus==='Active' && <TeachingIcon name="check" size={14}/>} {contract.contractStatus}</span></div>
              <div className="teacher-contract-weekline"><TeachingIcon name="clock" size={16}/><strong>Weekly Schedule:</strong><span>{(contract.course?.teachingSchedule||[]).map(slot=>WEEK_DAYS[slot.day]+(new Set((contract.course?.teachingSchedule||[]).map(row=>row.startTime+'–'+row.endTime)).size>1?' '+slot.startTime+'–'+slot.endTime:'')).join(' – ')||'Not scheduled'}</span><span className="teacher-contract-weektime">{new Set((contract.course?.teachingSchedule||[]).map(slot=>slot.startTime+'–'+slot.endTime)).size===1 ? (contract.course.teachingSchedule[0].startTime+'–'+contract.course.teachingSchedule[0].endTime) : ''}</span></div>
              <div className="teacher-contract-totals"><span><strong>{contract.totalContractDays}</strong> contract days</span><span><strong>{contract.completedTeachingDays}</strong> taught days</span><span><strong>{contract.remainingContractDays}</strong> remaining</span></div>
            </article>;
          })}
        </section>
        </aside>
</div>
<div className="teacher-calendar-card">
          <div className="teacher-calendar-heading">
            <div className="teacher-calendar-title">
              <span className="teacher-calendar-icon"><TeachingIcon name="calendar" size={32}/></span>
              <div><h2>Academic Calendar</h2><p>Your academic schedule for this month</p></div>
            </div>
            <div className="teacher-calendar-controls">
              <button type="button" className="calendar-nav-btn" aria-label="Previous period" onClick={() => {
                const nextDate = shiftCalendarDate(selectedLocalDate,-1,calendarView);
                setSelectedDate(dateKey(nextDate));
                setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
              }}>‹</button>
              <span className="teacher-calendar-month">{calendarView === 'day'
                ? formatDate(selectedLocalDate, { month: 'long', day: 'numeric', year: 'numeric' })
                : calendarView === 'week'
                  ? `${formatDate(weekStart, { month: 'short', day: 'numeric' })} – ${formatDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6), { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : formatDate(calendarMonth, { month: 'long', year: 'numeric' })}</span>
              <button type="button" className="calendar-nav-btn" aria-label="Next period" onClick={() => {
                const nextDate = shiftCalendarDate(selectedLocalDate,1,calendarView);
                setSelectedDate(dateKey(nextDate));
                setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
              }}>›</button>
              <div className="teacher-calendar-views" role="group" aria-label="Calendar view">
                {['month', 'week', 'day'].map((view) => <button key={view} type="button" className={calendarView === view ? 'active' : ''} aria-pressed={calendarView === view} onClick={() => setCalendarView(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}
              </div>
            </div>
          </div>
          <div className={`teacher-calendar-grid view-${calendarView}`} role="grid" aria-label={formatDate(calendarMonth, { month: 'long', year: 'numeric' })}>
            {calendarView !== 'day' && (calendarView === 'week' ? visibleDates : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']).map((item, index) => {
              if (calendarView === 'week') return <div className="teacher-calendar-weekday" role="columnheader" key={dateKey(item)}>{formatDate(item, { weekday: 'short', day: 'numeric' })}</div>;
              return <div className="teacher-calendar-weekday" role="columnheader" key={item}>{item}</div>;
            })}
            {calendarDays.map(({ date, key, currentMonth }) => {
              const dayExams = examsByDate[key] || [];
              const dayContracts = contractsByDate[key] || [];
              const dayClasses = classesOnDate(matchingContracts, key);
              const selected = selectedDate === key;
              return (
                <button type="button" role="gridcell" key={key}
                  className={`teacher-calendar-day ${currentMonth || calendarView !== 'month' ? '' : 'is-outside'} ${key === todayKey ? 'is-today' : ''} ${selected ? 'is-selected' : ''} ${dayClasses.length ? 'has-classes' : ''} ${dayExams.length ? 'has-exams' : ''} ${dayContracts.length ? 'has-contract-start' : ''}`}
                  aria-label={`${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}${dayExams.length ? `, ${dayExams.length} exam${dayExams.length === 1 ? '' : 's'}` : ''}${dayContracts.length ? ', '+dayContracts.length+' contract starts' : ''}${dayClasses.length ? ', '+dayClasses.length+' teaching classes' : ''}`}
                  title={[...dayClasses.map(item=>item.course?.title||item.course?.name||'Teaching day'),...dayExams.map(item=>(item.type||'Exam')+': '+item.title)].join('\n')}
                  aria-pressed={selected} onClick={() => setSelectedDate(key)}>
                  <span className="calendar-date-number">{calendarView === 'day' ? formatDate(date, { weekday: 'long', day: 'numeric' }) : date.getDate()}</span>
                  {dayContracts.length > 0 && <span className="contract-start-marker" title="Contract starts" aria-hidden="true">★</span>}
                  <span className="calendar-event-dots" aria-hidden="true">{dayClasses.length > 0 && <i className="is-teaching"/>}{dayExams.slice(0, 3).map((exam, index) => <i className={exam.type==='quiz'?'is-quiz':'is-exam'} key={exam.calendarKey || index}/>)}</span>
                  {calendarView !== 'month' && dayExams.length > 0 && <span className="calendar-assessment-label">{dayExams[0].type||'Exam'}{dayExams.length>1?' +'+(dayExams.length-1):''}</span>}
                </button>
              );
            })}
          </div>
          <div className="teacher-calendar-legend"><span className="calendar-exam-legend"><i/> Exam / assessment</span><span className="calendar-quiz-legend"><i/> Quiz</span><span className="teaching-day-legend"><i/> Teaching day</span><span className="contract-start-legend">★ Contract starts</span><button type="button" onClick={() => { const today = new Date(); setSelectedDate(todayKey); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Today</button></div>
        </div>
      </section>
    </div>
  );
}
