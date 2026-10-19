import { useState, useEffect, useCallback } from 'react';
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
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calendarView, setCalendarView] = useState('month');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeacherDashboardData();
      setSummary(data?.summary ?? null);
      setUpcoming(Array.isArray(data?.upcomingExams) ? data.upcomingExams : []);
    } catch (err) {
      setError('Teacher dashboard data is currently unavailable.');
      setSummary(null);
      setUpcoming([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
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

  const examsByDate = upcoming.reduce((groups, exam) => {
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
  const selectedExams = examsByDate[selectedDate] || [];
  const todayKey = dateKey(new Date());

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="teacher-scope">
      <section className="teacher-dashboard-welcome">
        <div className="teacher-hero-mark" aria-hidden="true">
          <span>🎓</span>
        </div>
        <div className="page-header-left">
          <h1>{greeting()}, {user?.name?.split(' ')[0] || 'Teacher'}! <span aria-hidden="true">☀️</span></h1>
          <p>Here’s what’s happening with your courses, exams, and classes today.</p>
        </div>
        <div className="teacher-dashboard-actions">
          <Link to="/teacher/my-course" className="btn btn-primary"><span aria-hidden="true">▤</span> My Course</Link>
          <Link to="/teacher/exams" className="btn btn-secondary"><span aria-hidden="true">▣</span> Manage Assessments</Link>
        </div>
      </section>

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
              const selected = selectedDate === key;
              return (
                <button type="button" role="gridcell" key={key}
                  className={`teacher-calendar-day ${currentMonth || calendarView !== 'month' ? '' : 'is-outside'} ${key === todayKey ? 'is-today' : ''} ${selected ? 'is-selected' : ''} ${dayExams.length ? 'has-exams' : ''}`}
                  aria-label={`${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}${dayExams.length ? `, ${dayExams.length} exam${dayExams.length === 1 ? '' : 's'}` : ''}`}
                  aria-pressed={selected} onClick={() => setSelectedDate(key)}>
                  <span>{calendarView === 'day' ? formatDate(date, { weekday: 'long', day: 'numeric' }) : date.getDate()}</span>
                  {dayExams.length > 0 && <span className="calendar-day-markers" aria-hidden="true">{dayExams.slice(0, 3).map((exam, index) => <i key={exam._id || index} />)}</span>}
                  {calendarView !== 'month' && dayExams.length > 0 && <span className="calendar-cell-event">{dayExams[0].title}</span>}
                </button>
              );
            })}
          </div>
          <div className="teacher-calendar-legend"><span><i /> Exam scheduled</span><button type="button" onClick={() => { const today = new Date(); setSelectedDate(todayKey); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Today</button></div>
        </div>

        <aside className="teacher-schedule-side" aria-live="polite">
          <div className="teacher-date-card">
            <span className="teacher-calendar-icon" aria-hidden="true">▦</span>
            <div><span>{formatDate(selectedLocalDate, { weekday: 'long' })}</span><strong>{formatDate(selectedLocalDate, { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div>
          </div>
          <div className="teacher-agenda-card">
            <h3><span aria-hidden="true">◷</span> Exam schedule</h3>
            {loading ? <p className="calendar-agenda-empty">Loading exam dates...</p> : selectedExams.length === 0 ? (
              <div className="agenda-empty-state"><span className="agenda-empty-icon" aria-hidden="true">▦</span><p>{upcoming.length ? 'No exams scheduled for this day.' : 'No upcoming exams have been scheduled.'}</p></div>
            ) : selectedExams.map((exam, index) => (
              <div className="calendar-agenda-item" key={exam._id || index}>
                <span className="calendar-agenda-type">E</span>
                <div><strong>{exam.title || 'Exam'}</strong><small>{exam.type || 'Exam'}{exam.courseCode ? ` · ${exam.courseCode}` : ''}</small></div>
              </div>
            ))}
            <Link to="/teacher/exams" className="calendar-agenda-link">Manage assessments <span aria-hidden="true">→</span></Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
