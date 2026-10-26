import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import './StudentAttendance.css';


const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseAttendanceDate(value) {
  if (typeof value !== 'string') return new Date(value);
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLatestRecordMonth(records) {
  const dates = records.map(record => parseAttendanceDate(record.date)).filter(date => !Number.isNaN(date.getTime()));
  if (!dates.length) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const latest = new Date(Math.max(...dates.map(date => date.getTime())));
  return new Date(latest.getFullYear(), latest.getMonth(), 1);
}

function getCalendarDays(month) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { date, key: getDateKey(date), inMonth: date.getMonth() === month.getMonth() };
  });
}
export default function StudentAttendance() {
  const [search] = usePageSearch();
  const [selectedDate, setSelectedDate] = useState(getDateKey(new Date()));
  const [error, setError] = useState('');
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selCourse, setSelCourse] = useState('All');
  const [displayedMonth, setDisplayedMonth] = useState(() => getLatestRecordMonth([]));

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{
        const res=await api.get('/student/attendance');
        if(res.data?.attendance) {
          setRecords(res.data.attendance);
          if (res.data.attendance.length) { setDisplayedMonth(getLatestRecordMonth(res.data.attendance)); const latest = res.data.attendance.map(r => parseAttendanceDate(r.date)).filter(d => !Number.isNaN(d.getTime())).sort((a,b) => b-a)[0]; if (latest) setSelectedDate(getDateKey(latest)); }
        }
      }catch(err){setError(err.response?.data?.message || 'Unable to load student data. Please try again.');}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const courses = ['All', ...new Set(records.map(r=>r.course))];
  const filtered = records.filter(r => (selCourse==='All' || r.course===selCourse) && matchesPageSearch(search, r.course, r.date, r.status, r.remarks));

  const monthRecords = filtered.filter(r => { const d = parseAttendanceDate(r.date); return d.getFullYear() === displayedMonth.getFullYear() && d.getMonth() === displayedMonth.getMonth(); });
  const total   = monthRecords.length;
  const present = monthRecords.filter(r=>r.status==='present').length;
  const absent  = monthRecords.filter(r=>r.status==='absent').length;
  const late    = monthRecords.filter(r=>r.status==='late').length;
  const excused = monthRecords.filter(r=>r.status==='excused').length;
  const attPct  = total?Math.round((present/total)*100):0;
  const recordsByDate = filtered.reduce((grouped, record) => {
    const date = parseAttendanceDate(record.date);
    if (!Number.isNaN(date.getTime())) {
      const key = getDateKey(date);
      (grouped[key] ||= []).push(record);
    }
    return grouped;
  }, {});
  const calendarDays = getCalendarDays(displayedMonth);

  const changeMonth = (offset) => {
    setDisplayedMonth(month => new Date(month.getFullYear(), month.getMonth() + offset, 1));
  };

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      {/* Attendance overview */}
      <div className="card attendance-calendar-card attendance-redesign">
        <div className="card-header attendance-calendar-header">
          <div><span className="attendance-summary-eyebrow">YOUR LEARNING JOURNEY</span><h2>Attendance calendar</h2><p>A little consistency. A lot of progress.</p></div>
          <select aria-label="Filter attendance by course" className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
            {courses.map(c=><option key={c} value={c}>{c==='All'?'All Courses':c}</option>)}
          </select>
        </div>

        <div className="attendance-overview">
          <section className="attendance-calendar">
            <div className="attendance-calendar-toolbar">
              <button type="button" className="attendance-month-button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                ‹
              </button>
              <h3 aria-live="polite">{displayedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <button type="button" className="attendance-month-button" onClick={() => changeMonth(1)} aria-label="Next month">
                ›
              </button>
            </div>

            <div className="attendance-calendar-caption"><span>Select a day to see your classes</span><button type="button" onClick={() => { setDisplayedMonth(getLatestRecordMonth([])); setSelectedDate(getDateKey(new Date())); }}>Today ↗</button></div><div className="attendance-calendar-scroll">
              <div className="attendance-calendar-grid" role="group" aria-label="Attendance by date">
                {WEEKDAYS.map(day => (
                  <div key={day} className="attendance-weekday">{day}</div>
                ))}
                {calendarDays.map(({ date, key, inMonth }) => {
                  const dayRecords = recordsByDate[key] || [];
                  const dayStatus = dayRecords.some(record => record.status === 'absent')
                    ? 'absent'
                    : dayRecords.some(record => record.status === 'excused' || record.status === 'late')
                      ? 'excused'
                      : dayRecords.some(record => record.status === 'present')
                        ? 'present'
                        : '';

                  return (
                    <button
                      type="button" onClick={() => setSelectedDate(key)} aria-pressed={selectedDate === key}
                      key={key}
                      className={`attendance-day ${key === getDateKey(new Date()) ? 'attendance-today' : ''} ${selectedDate === key ? 'attendance-selected' : ''} ${inMonth ? '' : 'attendance-day-outside'} ${dayStatus ? `attendance-day-${dayStatus}` : ''}`}
                      aria-current={key === getDateKey(new Date()) ? 'date' : undefined}
                      aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${dayRecords.length ? `: ${dayRecords.map(record => `${record.course} ${record.status}`).join(', ')}` : ''}`}
                    >
                      <span className="attendance-day-number">{date.getDate()}</span>
                      <span className="attendance-day-records">
                        {dayRecords.map((record, index) => (
                          <span
                            key={record._id || `${key}-${record.course}-${index}`}
                            className={`attendance-day-record attendance-record-${record.status === 'present' ? 'present' : record.status === 'absent' ? 'absent' : record.status === 'excused' || record.status === 'late' ? 'excused' : 'other'}`}
                            title={`${record.course}: ${record.status}`}
                          >
                            <span className="attendance-status-dot" />
                            <span className="attendance-course-label">{record.course}</span><span className="attendance-record-symbol">{record.status === 'present' ? '✓' : record.status === 'absent' ? '−' : record.status === 'late' ? '◷' : '↗'}</span>
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="attendance-calendar-footer">
              <div className="attendance-calendar-legend" aria-label="Attendance status legend">
                <span><i className="attendance-status-dot attendance-dot-present" />Present</span>
                <span><i className="attendance-status-dot attendance-dot-absent" />Absent</span>
                <span><i className="attendance-status-dot attendance-dot-excused" />Excused / late</span>
              </div>
              {loading && <span className="attendance-calendar-loading">Updating attendance…</span>}
            </div>
          </section>

          <aside className="attendance-summary-panel" aria-label="Attendance summary">
            <div className="attendance-summary-heading">
              <span className="attendance-summary-eyebrow">THIS MONTH</span>
              <h3>Your consistency</h3><p className="attendance-summary-period">{displayedMonth.toLocaleDateString(undefined, {month:'long', year:'numeric'})} · {total} classes</p>
            </div>

            <div className="attendance-rate-card">
              <div className="attendance-donut" style={{'--attendance-angle': `${attPct * 3.6}deg`}}>
                <div><div className="attendance-rate-value">{loading ? '…' : total ? attPct : '—'}{total > 0 && <span>%</span>}</div><div className="attendance-rate-label">Attendance rate</div></div>
              </div>
              <p>{total ? `${present} of ${total} classes marked present` : 'Your month starts here'}</p>
            </div>
            <div className="attendance-summary-list">
              <div className="attendance-summary-item summary-present">
                <span className="attendance-summary-indicator" />
                <span>Present</span>
                <strong>{present}</strong>
              </div>
              <div className="attendance-summary-item summary-absent">
                <span className="attendance-summary-indicator" />
                <span>Absent</span>
                <strong>{absent}</strong>
              </div>
              <div className="attendance-summary-item summary-excused">
                <span className="attendance-summary-indicator" />
                <span>Excused</span>
                <strong>{excused}</strong>
              </div>
              <div className="attendance-summary-item summary-late">
                <span className="attendance-summary-indicator" />
                <span>Late</span>
                <strong>{late}</strong>
              </div>
            </div>

            {total === 0 && !loading && (
              <p className="attendance-summary-empty">No attendance recorded this month.</p>
            )}
            <div className="attendance-day-detail" aria-live="polite">
              <span className="attendance-summary-eyebrow">DAY DETAILS</span>
              <h4>{parseAttendanceDate(selectedDate).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</h4>
              {loading ? <p>Loading your classes…</p> : error ? <p>Day details are unavailable.</p> : (recordsByDate[selectedDate] || []).length ? recordsByDate[selectedDate].map((r,i) => <div className="attendance-detail-row" key={r._id || i}><strong>{r.course}</strong><span className={`attendance-detail-status attendance-record-${r.status}`}>{r.status}</span></div>) : <p>No attendance recorded for this day.</p>}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
