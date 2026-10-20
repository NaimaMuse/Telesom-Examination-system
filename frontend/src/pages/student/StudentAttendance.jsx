import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_RECORDS = [
  { _id:'a1', date:'2026-11-10', course:'CS101',  status:'present' },
  { _id:'a2', date:'2026-11-10', course:'BUS101', status:'present' },
  { _id:'a3', date:'2026-11-08', course:'CS101',  status:'absent' },
  { _id:'a4', date:'2026-11-06', course:'CS101',  status:'present' },
  { _id:'a5', date:'2026-11-06', course:'BUS101', status:'late' },
  { _id:'a6', date:'2026-11-04', course:'CS101',  status:'present' },
];

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
  const [records, setRecords]     = useState(PLACEHOLDER_RECORDS);
  const [loading, setLoading]     = useState(false);
  const [selCourse, setSelCourse] = useState('All');
  const [displayedMonth, setDisplayedMonth] = useState(() => getLatestRecordMonth(PLACEHOLDER_RECORDS));

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{
        const res=await api.get('/student/attendance');
        if(res.data?.attendance) {
          setRecords(res.data.attendance);
          if (res.data.attendance.length) setDisplayedMonth(getLatestRecordMonth(res.data.attendance));
        }
      }catch{}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const courses = ['All', ...new Set(records.map(r=>r.course))];
  const filtered = selCourse==='All'?records:records.filter(r=>r.course===selCourse);

  const total   = filtered.length;
  const present = filtered.filter(r=>r.status==='present').length;
  const absent  = filtered.filter(r=>r.status==='absent').length;
  const late    = filtered.filter(r=>r.status==='late').length;
  const excused = filtered.filter(r=>r.status==='excused').length;
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
      {/* Attendance overview */}
      <div className="card attendance-calendar-card">
        <div className="card-header attendance-calendar-header">
          <span className="card-title">Attendance Calendar</span>
          <select className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
            {courses.map(c=><option key={c} value={c}>{c==='All'?'All Courses':c}</option>)}
          </select>
        </div>

        <div className="attendance-overview">
          <section className="attendance-calendar">
            <div className="attendance-calendar-toolbar">
              <button type="button" className="attendance-month-button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                ‹
              </button>
              <h3>{displayedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <button type="button" className="attendance-month-button" onClick={() => changeMonth(1)} aria-label="Next month">
                ›
              </button>
            </div>

            <div className="attendance-calendar-scroll">
              <div className="attendance-calendar-grid" role="grid" aria-label="Attendance by date">
                {WEEKDAYS.map(day => (
                  <div key={day} className="attendance-weekday" role="columnheader">{day}</div>
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
                    <div
                      key={key}
                      className={`attendance-day ${inMonth ? '' : 'attendance-day-outside'} ${dayStatus ? `attendance-day-${dayStatus}` : ''}`}
                      role="gridcell"
                      aria-label={`${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${dayRecords.length ? `: ${dayRecords.map(record => `${record.course} ${record.status}`).join(', ')}` : ''}`}
                    >
                      <span className="attendance-day-number">{date.getDate()}</span>
                      <div className="attendance-day-records">
                        {dayRecords.map((record, index) => (
                          <span
                            key={record._id || `${key}-${record.course}-${index}`}
                            className={`attendance-day-record attendance-record-${record.status === 'present' ? 'present' : record.status === 'absent' ? 'absent' : record.status === 'excused' || record.status === 'late' ? 'excused' : 'other'}`}
                            title={`${record.course}: ${record.status}`}
                          >
                            <span className="attendance-status-dot" />
                            {record.course}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="attendance-calendar-footer">
              <div className="attendance-calendar-legend" aria-label="Attendance status legend">
                <span><i className="attendance-status-dot attendance-dot-present" />Present</span>
                <span><i className="attendance-status-dot attendance-dot-absent" />Absent</span>
                <span><i className="attendance-status-dot attendance-dot-excused" />Permission / excused / late</span>
              </div>
              {loading && <span className="attendance-calendar-loading">Updating attendance…</span>}
            </div>
          </section>

          <aside className="attendance-summary-panel" aria-label="Attendance summary">
            <div className="attendance-summary-heading">
              <span className="attendance-summary-eyebrow">Your overview</span>
              <h3>Attendance summary</h3>
            </div>

            <div className="attendance-rate-card">
              <div className="attendance-rate-value">{attPct}<span>%</span></div>
              <div className="attendance-rate-label">Attendance rate</div>
              <div className="attendance-rate-track" aria-label={`Attendance rate ${attPct}%`}>
                <span style={{ width: `${attPct}%` }} />
              </div>
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
              <p className="attendance-summary-empty">No attendance records for this course.</p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
