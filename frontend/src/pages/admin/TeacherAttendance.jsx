import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import MakeupScheduleDialog from '../../components/MakeupScheduleDialog';
import api from '../../services/api';
import TeachingIcon from '../../components/TeachingIcon';
import './TeacherAttendance.css';

const nairobiToday = () => new Date(Date.now()+3*3600000).toISOString().slice(0,10);
const errorMessage = error => error.response?.data?.message || 'Could not complete the request. Try again.';

export default function TeacherAttendance() {
  const [date,setDate] = useState(nairobiToday);
  const [records,setRecords] = useState([]);
  const [revision,refresh] = useState(0);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [absence,setAbsence] = useState(null);

  useEffect(()=>{
    if(!date) return;
    const controller = new AbortController();
    setLoading(true);
    setRecords([]);
    setError('');
    api.get('/academy/teacher-attendance',{params:{date},signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setRecords(data.records);})
      .catch(error=>{if(!controller.signal.aborted)setError(errorMessage(error));})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[date,revision]);

  async function mark(contract,status) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const {data} = await api.put('/academy/teacher-attendance',{contract,date,status});
      setRecords(current=>current.map(record=>record.contract===contract
        ? {...record,attendance:{...record.attendance,...data.attendance}}
        : record));
      setNotice(status==='absent'?'Absence saved. You can now schedule a makeup class.':'Attendance saved as present.');
    } catch(error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function schedule(payload) {
    setBusy(true);
    setError('');
    try {
      await api.post('/academy/makeup-classes',{...payload,attendance:absence.attendance._id});
      setAbsence(null);
      setNotice('Makeup class scheduled.');
      refresh(value=>value+1);
    } catch(error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const present = records.filter(record => record.attendance?.status === 'present').length;
  const absent = records.filter(record => record.attendance?.status === 'absent').length;
  const summary = [
    ['Teaching contracts', records.length, 'clipboard', 'contracts'],
    ['Present', present, 'check', 'present'],
    ['Absent', absent, 'cross', 'absent'],
    ['Not marked', records.length - present - absent, 'clock', 'unmarked'],
  ];
  const sortedRecords = [...records].sort((a, b) =>
    Number(b.scheduled) - Number(a.scheduled) || a.teacher.localeCompare(b.teacher)
  );
  const statusLabels = {present:'Present', absent:'Absent', unmarked:'Not marked'};

  return (
    <section className="teacher-attendance-page" aria-labelledby="teacher-attendance-title">
      <header className="teacher-attendance-heading">
        <div className="teacher-attendance-title">
          <span className="teacher-attendance-icon"><TeachingIcon name="calendar" size={25}/></span>
          <div>
            <p className="teacher-attendance-kicker">Teaching operations</p>
            <h1 id="teacher-attendance-title">Teacher Attendance</h1>
            <p>Mark attendance by date and schedule makeup classes for absences.</p>
          </div>
        </div>
        <Link className="teacher-attendance-makeup-link" to="/admin/makeup">
          <TeachingIcon name="reschedule" size={17}/> Makeup classes <TeachingIcon name="arrow" size={15}/>
        </Link>
      </header>

      <dl className="teacher-attendance-summary" aria-label="Attendance totals">
        {summary.map(([label, total, icon, tone]) => (
          <div className={`teacher-attendance-metric is-${tone}`} key={tone}>
            <dt><span className="teacher-attendance-metric-icon"><TeachingIcon name={icon} size={20}/></span>{label}</dt>
            <dd>{!date || loading || (error && !records.length) ? '—' : total}</dd>
          </div>
        ))}
      </dl>

      <section className="teacher-attendance-panel" aria-labelledby="teacher-register-title">
        <div className="teacher-attendance-toolbar">
          <div>
            <h2 id="teacher-register-title">Daily register</h2>
            <p>Scheduled teaching days appear first.</p>
          </div>
          <label className="teacher-attendance-date">
            Attendance date
            <input className="form-control" type="date" max={nairobiToday()} value={date} disabled={busy}
              onChange={event => {
                const nextDate = event.target.value;
                setDate(nextDate);
                setRecords([]);
                setLoading(Boolean(nextDate));
                setError('');
                setNotice('');
              }}/>
          </label>
        </div>
        {error && !absence && <p className="teacher-attendance-feedback is-error" role="alert">{error}</p>}
        {notice && <p className="teacher-attendance-feedback" role="status"><TeachingIcon name="check" size={17}/>{notice}</p>}
        {!date || loading || !records.length ? (
          <div className="teacher-attendance-empty" role="status">
            <TeachingIcon name="clipboard" size={26}/>
            <p>{!date ? 'Choose an attendance date.' : loading ? 'Loading attendance…' : error ? 'Attendance could not be loaded.' : 'No active teaching contracts for this date.'}</p>
          </div>
        ) : (
          <div className="teacher-attendance-table" tabIndex={0} role="region" aria-label="Daily register table">
            <table aria-labelledby="teacher-register-title">
              <thead>
                <tr><th scope="col">Teacher</th><th scope="col">Course / Cohort</th><th scope="col">Attendance</th><th scope="col">Actions</th></tr>
              </thead>
              <tbody>
                {sortedRecords.map(record => {
                  const status = record.attendance?.status || 'unmarked';
                  const initials = record.teacher.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
                  return (
                    <tr key={record.contract}>
                      <th scope="row">
                        <div className="teacher-attendance-person">
                          <span className="teacher-attendance-avatar" aria-hidden="true">{initials}</span>
                          <div><strong>{record.teacher}</strong>{record.scheduled && <small>Scheduled teaching day</small>}</div>
                        </div>
                      </th>
                      <td><strong>{record.course}</strong><small>{[record.academicYear, record.cohort].filter(Boolean).join(' · ')}</small></td>
                      <td><span className={`teacher-attendance-status is-${status}`}>{statusLabels[status]}</span></td>
                      <td>
                        <div className="teacher-attendance-actions">
                          <div className="teacher-attendance-mark">
                            <button type="button" className="attendance-present" aria-label={`Mark ${record.teacher} present`}
                              disabled={busy || status === 'present' || record.attendance?.hasMakeup} onClick={() => mark(record.contract, 'present')}>
                              <TeachingIcon name="check" size={15}/> Present
                            </button>
                            <button type="button" className="attendance-absent" aria-label={`Mark ${record.teacher} absent`}
                              disabled={busy || status === 'absent'} onClick={() => mark(record.contract, 'absent')}>
                              <TeachingIcon name="cross" size={15}/> Absent
                            </button>
                          </div>
                          {status === 'absent' && (record.attendance.hasMakeup ? (
                            <Link className="teacher-attendance-makeup-action" to="/admin/makeup">View makeup <TeachingIcon name="arrow" size={14}/></Link>
                          ) : (
                            <button type="button" className="teacher-attendance-makeup-action" disabled={busy}
                              onClick={() => { setError(''); setAbsence({...record, date}); }}>
                              Schedule makeup <TeachingIcon name="arrow" size={14}/>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {absence && <MakeupScheduleDialog absence={absence} lessons={[]} busy={busy} error={error}
        onClose={() => { setAbsence(null); setError(''); }} onSave={schedule}/>}
    </section>
  );
}
