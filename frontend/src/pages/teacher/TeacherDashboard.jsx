import api from '../../services/api';
import TelesomLogo from '../../components/TelesomLogo';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTeacherDashboardData } from '../../services/teacherService';
import './teacher.css';

function parseExamDate(value) {
  if (!value) return null;
  const datePart = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
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
      const [dashboardResult, contractResult] = await Promise.allSettled([
        getTeacherDashboardData(controller.signal),
        api.get('/teacher-contracts', {signal: controller.signal}),
      ]);
      if (!activeRef.current || controller.signal.aborted) return;
      if (contractResult.status === 'fulfilled') {
        setContracts(previous=>JSON.stringify(previous)===JSON.stringify(contractResult.value.data.contracts||[])?previous:contractResult.value.data.contracts||[]); setContractsError('');
      } else { setContractsError('Contracts could not refresh. Retrying automatically.'); }
      if (dashboardResult.status === 'rejected') throw dashboardResult.reason;
      const data = dashboardResult.value;
      if (!activeRef.current || controller.signal.aborted) return;
      setError(null);
      setSummary(data?.summary ?? null);
      const next = Array.isArray(data?.upcomingExams) ? data.upcomingExams : [];
      setUpcoming(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
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

  useEffect(() => {
    const firstUpcoming = upcoming
      .map((exam) => ({ exam, date: parseExamDate(exam.examDate || exam.date) }))
      .filter((entry) => entry.date)
      .sort((left, right) => left.date - right.date)[0];
    if (!firstUpcoming) return;
    setSelectedDate(dateKey(firstUpcoming.date));
    setCalendarMonth(new Date(firstUpcoming.date.getFullYear(), firstUpcoming.date.getMonth(), 1));
  }, [upcoming]);

  const matchingContracts=contracts.filter(contract=>matchesPageSearch(search,contract.course?.title,contract.course?.name,contract.batch,contract.academicYear));
  const contractsByDate=matchingContracts.reduce((groups,contract)=>{const key=String(contract.startDate||'').slice(0,10);if(key)groups[key]=[...(groups[key]||[]),contract];return groups;},{});
  const selectedContracts=contractsByDate[selectedDate]||[];
  const matchingExams = upcoming.filter(exam => matchesPageSearch(search, exam.title, exam.type, exam.course?.title, exam.course?.courseCode, exam.examDate, exam.date));
  const examsByDate = matchingExams.reduce((groups, exam) => {
    const date = parseExamDate(exam.examDate || exam.date);
    if (!date) return groups;
    const key = dateKey(date);
    groups[key] = [...(groups[key] || []), exam];
    return groups;
  }, {});

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - ((monthStart.getDay() + 6) % 7));
  const calendarCellCount = Math.ceil((((monthStart.getDay() + 6) % 7) + monthDays) / 7) * 7;
  const selectedLocalDate = new Date(`${selectedDate}T12:00:00`);
  const weekStart = new Date(selectedLocalDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
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
  const selectedExams = search.trim() ? matchingExams : examsByDate[selectedDate] || [];
  const todayKey = dateKey(new Date());
  const nextAssessments = [...matchingExams].filter(exam=>{const date=parseExamDate(exam.examDate||exam.date);return date&&dateKey(date)>=todayKey;}).sort((a,b)=>parseExamDate(a.examDate||a.date)-parseExamDate(b.examDate||b.date)).slice(0,3);

  return (
    <div className="teacher-scope">


      <section className="teacher-dashboard-metrics" aria-label="Course totals">
        {[
          { label: 'Enrolled Students', value: summary?.totalStudents, icon: '♙', tone: 'students' },
          { label: 'Total Exams', value: summary?.totalExams, icon: '▤', tone: 'exams' },
          { label: 'Total Quizzes', value: summary?.totalQuizzes, icon: '▦', tone: 'quizzes' },
        ].map((metric) => (
          <article className="teacher-metric-card" key={metric.label}>
            <span className={`teacher-metric-icon ${metric.tone}`} aria-hidden="true">{metric.icon}</span>
            <div className="teacher-metric-copy">
              <strong>{loading ? '—' : typeof metric.value === 'number' ? metric.value : 'Unavailable'}</strong>
              <span>{metric.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="teacher-contracts-home" aria-labelledby="teacher-contracts-home-title">
        <header><div><span>TEACHING WORKSPACE</span><h2 id="teacher-contracts-home-title">Your teaching contracts</h2></div><Link to="/teacher/my-course?tab=outline">My course →</Link></header>
        {contractsError && <p role="status" className="teacher-contracts-message">{contractsError}</p>}
        {loading && !contracts.length ? <p className="teacher-contracts-message">Loading contracts…</p> : !contracts.length ? <p className="teacher-contracts-message">Your teaching contract will appear here when your administrator creates it.</p> : <div className={`teacher-home-contract-grid ${contracts.length === 1 ? 'single-contract' : ''}`}>
          {contracts.filter(contract => matchesPageSearch(search,contract.course?.title,contract.course?.name,contract.batch,contract.academicYear,contract.contractStatus)).slice(0,3).map(contract => {
            const params = new URLSearchParams({tab:'outline',courseId:String(contract.course?._id || contract.course),academicYear:contract.academicYear,batch:contract.batch,contractId:contract._id});
            return <article key={contract._id}>
              <div className="teacher-home-contract-top"><span>{contract.academicYear} / {contract.batch}</span><span className="teacher-home-contract-status">{contract.contractStatus}</span></div>
              <h3>{contract.course?.title || contract.course?.name || 'Assigned course'}</h3>
              <p>{contract.startDate} · {contract.endDate || 'No end date'}</p>
              <dl><div><dt>Total days</dt><dd>{contract.totalContractDays}</dd></div><div><dt>Completed</dt><dd>{contract.completedTeachingDays}</dd></div><div><dt>Remaining</dt><dd>{contract.remainingContractDays}</dd></div></dl>
              <Link to={'/teacher/my-course?'+params.toString()}>View contract &amp; outline →</Link>
            </article>;
          })}
          <aside className="teacher-next-assessments" aria-labelledby="teacher-next-assessments-title">
            <div className="teacher-next-heading"><h3 id="teacher-next-assessments-title">Upcoming assessments</h3><Link to="/teacher/exams">View all →</Link></div>
            {nextAssessments.length ? <ul>{nextAssessments.map(exam=><li key={exam._id||exam.title}><span className="teacher-next-date">{formatDate(parseExamDate(exam.examDate||exam.date),{day:'numeric',month:'short'})}</span><div><strong>{exam.title}</strong><p>{exam.course?.title||'Assigned course'}</p></div><span className="teacher-next-type">{exam.type||'Exam'}</span></li>)}</ul> : <p className="teacher-next-empty">No upcoming assessments scheduled.</p>}
          </aside>
          {search && !contracts.some(contract => matchesPageSearch(search,contract.course?.title,contract.course?.name,contract.batch,contract.academicYear,contract.contractStatus)) && <p className="teacher-contracts-message">No contracts match your search.</p>}
        </div>}
      </section>

      {error && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.85rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span style={{ fontSize: '0.85rem', color: '#92400e', flex: 1 }}>{error}</span>
          <button className="btn btn-sm btn-secondary" onClick={load}>Retry</button>
        </div>
      )}

      <section className="teacher-schedule-layout" aria-label="Academic schedule">
        <div className="teacher-calendar-card">
          <div className="teacher-calendar-heading">
            <div className="teacher-calendar-title">
              <span className="teacher-calendar-icon" aria-hidden="true">▦</span>
              <div><h2>Academic Schedule</h2><p>View your class and exam schedule</p></div>
            </div>
            <div className="teacher-calendar-controls">
              <button type="button" className="calendar-nav-btn" aria-label="Previous period" onClick={() => {
                const amount = calendarView === 'month' ? -1 : calendarView === 'week' ? -7 : -1;
                const unit = calendarView === 'month' ? 'month' : 'day';
                const nextDate = new Date(selectedLocalDate);
                if (unit === 'month') nextDate.setMonth(nextDate.getMonth() + amount);
                else nextDate.setDate(nextDate.getDate() + amount);
                setSelectedDate(dateKey(nextDate));
                setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
              }}>‹</button>
              <span className="teacher-calendar-month">{calendarView === 'day'
                ? formatDate(selectedLocalDate, { month: 'long', day: 'numeric', year: 'numeric' })
                : calendarView === 'week'
                  ? `${formatDate(weekStart, { month: 'short', day: 'numeric' })} – ${formatDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6), { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : formatDate(calendarMonth, { month: 'long', year: 'numeric' })}</span>
              <button type="button" className="calendar-nav-btn" aria-label="Next period" onClick={() => {
                const amount = calendarView === 'month' ? 1 : calendarView === 'week' ? 7 : 1;
                const nextDate = new Date(selectedLocalDate);
                if (calendarView === 'month') nextDate.setMonth(nextDate.getMonth() + amount);
                else nextDate.setDate(nextDate.getDate() + amount);
                setSelectedDate(dateKey(nextDate));
                setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
              }}>›</button>
              <div className="teacher-calendar-views" role="group" aria-label="Calendar view">
                {['month', 'week', 'day'].map((view) => <button key={view} type="button" className={calendarView === view ? 'active' : ''} aria-pressed={calendarView === view} onClick={() => setCalendarView(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}
              </div>
            </div>
          </div>
          <div className={`teacher-calendar-grid view-${calendarView}`} role="grid" aria-label={formatDate(calendarMonth, { month: 'long', year: 'numeric' })}>
            {calendarView !== 'day' && (calendarView === 'week' ? visibleDates : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((item, index) => {
              if (calendarView === 'week') return <div className="teacher-calendar-weekday" role="columnheader" key={dateKey(item)}>{formatDate(item, { weekday: 'short', day: 'numeric' })}</div>;
              return <div className="teacher-calendar-weekday" role="columnheader" key={item}>{item}</div>;
            })}
            {calendarDays.map(({ date, key, currentMonth }) => {
              const dayExams = examsByDate[key] || [];
              const dayContracts = contractsByDate[key] || [];
              const selected = selectedDate === key;
              return (
                <button type="button" role="gridcell" key={key}
                  className={`teacher-calendar-day ${currentMonth || calendarView !== 'month' ? '' : 'is-outside'} ${key === todayKey ? 'is-today' : ''} ${selected ? 'is-selected' : ''} ${dayExams.length ? 'has-exams' : ''} ${dayContracts.length ? 'has-contract-start' : ''}`}
                  aria-label={`${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}${dayExams.length ? `, ${dayExams.length} exam${dayExams.length === 1 ? '' : 's'}` : ''}${dayContracts.length ? ', '+dayContracts.length+' contract starts' : ''}`}
                  aria-pressed={selected} onClick={() => setSelectedDate(key)}>
                  <span>{calendarView === 'day' ? formatDate(date, { weekday: 'long', day: 'numeric' }) : date.getDate()}</span>
                  {dayContracts.length > 0 && <span className="contract-start-marker" title="Contract starts" aria-hidden="true">★</span>}
                  {dayExams.length > 0 && <span className="calendar-day-markers" aria-hidden="true">{dayExams.slice(0, 3).map((exam, index) => <i key={exam._id || index} />)}</span>}
                  {calendarView !== 'month' && dayExams.length > 0 && <span className="calendar-cell-event">{dayExams[0].title}</span>}
                </button>
              );
            })}
          </div>
          <div className="teacher-calendar-legend"><span><i /> Exam scheduled</span><span className="contract-start-legend">★ Contract starts</span><button type="button" onClick={() => { const today = new Date(); setSelectedDate(todayKey); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Today</button></div>
        </div>

        <aside className="teacher-schedule-side" aria-live="polite">
          <div className="teacher-date-card">
            <span className="teacher-calendar-icon" aria-hidden="true">▦</span>
            <div><span>{formatDate(selectedLocalDate, { weekday: 'long' })}</span><strong>{formatDate(selectedLocalDate, { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
          </div>
          <div className="teacher-agenda-card">
            <h3><span aria-hidden="true">▤</span> Contract schedule</h3>
            {loading ? <p className="calendar-agenda-empty">Loading contracts…</p> : selectedContracts.length === 0 ? (
              <div className="agenda-empty-state"><span className="agenda-empty-icon" aria-hidden="true">▤</span><p>No contracts start on this day. Select a date marked with a star.</p></div>
            ) : selectedContracts.map(contract => (
              <div className="calendar-agenda-item" key={contract._id}>
                <span className="calendar-agenda-type">★</span>
                <div><strong>{contract.course?.title||contract.course?.name||'Teaching contract'}</strong><small>{contract.academicYear} / {contract.batch}</small><small>{contract.totalContractDays} teaching days · {contract.contractStatus}</small></div>
              </div>
            ))}
            <Link to="/teacher/my-course?tab=outline" className="calendar-agenda-link">View teaching contracts <span aria-hidden="true">→</span></Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
