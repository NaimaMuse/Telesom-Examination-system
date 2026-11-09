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

  return <section className="academy-workspace teacher-attendance-page">
    <header className="academy-heading teacher-attendance-heading">
      <div className="teacher-attendance-title">
        <span className="teacher-attendance-icon"><TeachingIcon name="calendar" size={21}/></span>
        <div><h1>Teacher Attendance</h1><p>Record attendance and schedule makeup classes.</p></div>
      </div>
      <Link className="btn btn-secondary" to="/admin/makeup">View makeup classes</Link>
    </header>
    {error&&!absence&&<p className="academy-error" role="alert">{error}</p>}
    {notice&&<p className="teacher-attendance-notice" role="status"><TeachingIcon name="check" size={17}/>{notice}</p>}
    <div className="academy-panel teacher-attendance-panel">
      <div className="teacher-attendance-toolbar"><div><h2>Daily register</h2><p>{records.length} {records.length===1?"teaching contract":"teaching contracts"}</p></div><label>Attendance date <input className="form-control" type="date" max={nairobiToday()} value={date} disabled={busy} onChange={event=>{setDate(event.target.value);setNotice('');}}/></label></div>
      {date&&loading?<p role="status">Loading attendance…</p>:!date?<p>Choose an attendance date.</p>:!records.length?<p>No active teaching contracts for this date.</p>:
        <div className="academy-table"><table>
          <thead><tr><th>Teacher</th><th>Course / Batch</th><th>Attendance</th><th>Actions</th></tr></thead>
          <tbody>{[...records].sort((a,b)=>Number(b.scheduled)-Number(a.scheduled)||a.teacher.localeCompare(b.teacher)).map(record=><tr key={record.contract}>
            <td><strong>{record.teacher}</strong>{record.scheduled&&<small>Scheduled teaching day</small>}</td>
            <td>{record.course}<small>{record.academicYear} · {record.batch}</small></td>
            <td><span className={'teacher-attendance-status is-'+(record.attendance?.status||'unmarked')}>{record.attendance?.status==='present'?'Present':record.attendance?.status==='absent'?'Absent':'Not marked'}</span></td>
            <td><div className="academy-actions teacher-attendance-actions">
              <button type="button" className="btn btn-sm btn-secondary attendance-present" aria-label="Mark present" title="Mark present" disabled={busy||record.attendance?.status==='present'||record.attendance?.hasMakeup} onClick={()=>mark(record.contract,'present')}><TeachingIcon name="check" size={17}/></button>
              <button type="button" className="btn btn-sm btn-secondary attendance-absent" aria-label="Mark absent" title="Mark absent" disabled={busy||record.attendance?.status==='absent'} onClick={()=>mark(record.contract,'absent')}><TeachingIcon name="cross" size={17}/></button>
              {record.attendance?.status==='absent'&&(record.attendance.hasMakeup?<Link to="/admin/makeup">View makeup</Link>:
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={()=>{setError('');setAbsence({...record,date});}}>Schedule makeup class</button>)}
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </div>
    {absence&&<MakeupScheduleDialog absence={absence} lessons={[]} busy={busy} error={error}
      onClose={()=>{setAbsence(null);setError('');}} onSave={schedule}/>}
  </section>;
}
