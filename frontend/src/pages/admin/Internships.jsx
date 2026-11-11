import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import TeachingIcon from '../../components/TeachingIcon';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import WeeklySchedule, { WEEK_DAYS } from '../../components/WeeklySchedule';
import { contractDurationDays, contractDurationLabel, contractEndDate } from '../teacher/teachingSchedule.mjs';
import './Internships.css';

const emptyForm = { courseId: '', studentId: '', startDate: '', duration: '', durationUnit: 'days', attendanceSchedule: [], monthlyStipend: '' };
const stipendFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

function AttendanceSlots({ schedule }) {
  if (!schedule?.length) return '—';
  const groups = new Map();
  for (const {day, startTime, endTime} of [...schedule].sort((a,b) => a.day-b.day)) {
    const time = startTime + '–' + endTime;
    if (!groups.has(time)) groups.set(time, []);
    groups.get(time).push(WEEK_DAYS[day]);
  }
  return <div className="internship-record-slots">
    {[...groups].map(([time, days]) => <div className="internship-record-slot" key={time}>
      <span className="internship-slot-days">
        {days.map(day => <abbr key={day} title={day}>{day.slice(0,3)}</abbr>)}
      </span>
      <span className="internship-slot-time">{time}</span>
    </div>)}
  </div>;
}

export default function Internships() {
  const [form, setForm] = useState(emptyForm);
  const [courses, setCourses] = useState(null);
  const [courseError, setCourseError] = useState('');
  const [students, setStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [optionsRevision, retryOptions] = useState(0);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [revision, refresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const formHeadingRef = useRef(null);
  const samePlacement = editing && form.courseId === (editing.course || '') && form.studentId === (editing.student || '');
  const courseOptions = courses || [];
  const studentOptions = editing?.student && form.courseId === (editing.course || '') &&
    !students.some(student => student._id === editing.student)
    ? [...students, { _id: editing.student, name: editing.studentName }]
    : students;
  const totalDays = contractDurationDays(form.startDate, form.duration, form.durationUnit);
  const endDate = contractEndDate(form.startDate, totalDays);

  useAutoRefresh(async ({signal, isCurrent}) => {
    try {
      const {data} = await api.get('/internships/courses', {signal});
      if (!isCurrent()) return;
      if (!Array.isArray(data?.courses)) throw new Error('Invalid course list');
      setCourses(data.courses);
      setCourseError('');
    } catch {
      if (isCurrent()) setCourseError('Could not load courses.');
    }
  }, {enabled:courses === null, deps:[optionsRevision]});

  useAutoRefresh(async ({signal, isCurrent}) => {
    try {
      const {data} = await api.get('/internships/courses/' + form.courseId + '/students', {signal});
      if (!isCurrent()) return;
      if (!Array.isArray(data?.students)) throw new Error('Invalid student list');
      setStudents(data.students);
      setRosterError('');
    } catch {
      if (isCurrent()) setRosterError('Could not load students for this course.');
    } finally {
      if (isCurrent()) setRosterLoading(false);
    }
  }, {enabled:Boolean(form.courseId && (rosterLoading || rosterError)), deps:[form.courseId, optionsRevision]});

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setListError('');
    api.get('/internships', { params: { page }, signal })
      .then(({data}) => {
        if (signal.aborted) return;
        setRecords(data.data);
        setPages(Math.max(1, data.pagination.pages));
      })
      .catch(() => { if (!signal.aborted) setListError('Could not load internship records.'); })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);

  function loadRoster(courseId) {
    setStudents([]);
    setRosterLoading(Boolean(courseId));
    setRosterError('');
  }

  function change(event) {
    const { name, value } = event.target;
    if (name === 'courseId') loadRoster(value);
    setForm(current => ({...current, [name]:value, ...(name === 'courseId' ? {studentId:''} : {})}));
    setFormError('');
    setNotice('');
  }

  function edit(record) {
    const courseId = record.course || '';
    if (courseId !== form.courseId) loadRoster(courseId);
    setEditing(record);
    setForm({
      ...emptyForm,
      courseId,
      studentId: record.student || '',
      startDate: record.startDate,
      duration: record.totalDays ?? ((Date.parse(record.endDate) - Date.parse(record.startDate)) / 86400000 + 1),
      attendanceSchedule: record.attendanceSchedule || [],
      monthlyStipend: record.monthlyStipendCents == null ? '' : String(record.monthlyStipendCents / 100),
    });
    setFormError('');
    setActionError('');
    setNotice('');
    formHeadingRef.current?.focus();
  }

  function cancelEdit() {
    setEditing(null);
    setForm({...emptyForm, courseId: form.courseId});
    setFormError('');
  }

  async function remove(record) {
    if (!window.confirm(`Delete the internship record for ${record.studentName}?`)) return;
    setDeleting(true);
    setActionError('');
    try {
      await api.delete('/internships/' + record._id);
      if (editing?._id === record._id) cancelEdit();
      if (records.length === 1 && page > 1) setPage(page - 1);
      refresh(value => value + 1);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not delete the internship.');
    } finally {
      setDeleting(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (form.attendanceSchedule.some(row => row.endTime <= row.startTime)) {
      setFormError('Attendance end time must be after the start time.');
      return;
    }
    const monthlyStipendCents = form.monthlyStipend === '' ? undefined : Math.round(Number(form.monthlyStipend) * 100);
    if (monthlyStipendCents !== undefined && (!Number.isSafeInteger(monthlyStipendCents) || monthlyStipendCents < 0)) {
      setFormError('Enter a valid monthly stipend.');
      return;
    }
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      const { courseId, studentId, startDate, attendanceSchedule } = form;
      const payload = {courseId, studentId, startDate, totalDays, attendanceSchedule, monthlyStipendCents};
      if (editing) await api.put('/internships/' + editing._id, payload);
      else await api.post('/internships', payload);
      setEditing(null);
      setForm({...emptyForm, courseId:form.courseId});
      setNotice(editing ? 'Internship updated.' : 'Internship saved.');
      if (!editing) setPage(1);
      refresh(value => value + 1);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not save the internship.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="academy-workspace internships-workspace" aria-label="Internships">
    <div className="internship-columns">
      <section className="academy-panel internship-panel" aria-labelledby="add-internship">
        <header className="internship-panel-header">
          <span className="internship-panel-icon"><TeachingIcon name="briefcase" size={19}/></span>
          <div><h2 id="add-internship" ref={formHeadingRef} tabIndex={-1}>{editing ? 'Edit internship' : 'Add internship'}</h2><p>Choose a student, dates, and attendance days.</p></div>
        </header>
        <form className="academy-form internship-form" onSubmit={save}>
          <div className="internship-form-fields">
            <label className="academy-field internship-selection">Course
              <select name="courseId" value={form.courseId} onChange={change} required={!samePlacement} disabled={saving || !courses?.length}>
                <option value="">{samePlacement && !form.courseId && editing.courseName ? editing.courseName : courseError ? 'Courses unavailable' : courses === null ? 'Loading courses…' : courses.length ? 'Select a course' : 'No courses available'}</option>
                {editing?.course && !courseOptions.some(course => course._id === editing.course) &&
                  <option value={editing.course}>{editing.courseName || 'Saved course'}</option>}
                {courseOptions.map(course => <option key={course._id} value={course._id}>{course.name}{course.code ? ' · ' + course.code : ''}</option>)}
              </select>
            </label>
            <label className="academy-field internship-selection">Student
              <select name="studentId" value={form.studentId} onChange={change} required={!samePlacement} disabled={saving || !studentOptions.length}>
                <option value="">{samePlacement && !form.studentId ? editing.studentName : !form.courseId ? 'Select a course first' : rosterLoading ? 'Loading students…' : rosterError ? 'Students unavailable' : students.length ? 'Select a student' : 'No students enrolled'}</option>
                {studentOptions.map(student => <option key={student._id} value={student._id}>{student.name}{student.code ? ' · ' + student.code : ''}</option>)}
              </select>
            </label>
            <label className="academy-field">Start date
              <input type="date" name="startDate" value={form.startDate} onChange={change} required disabled={saving}/>
            </label>
            <label className="academy-field">Internship duration
              <input type="number" name="duration" value={form.duration} onChange={change} min={1} max={form.durationUnit === 'months' ? 1200 : 36500} step={1} required disabled={saving}/>
            </label>
            <label className="academy-field">Duration unit
              <select name="durationUnit" value={form.durationUnit} onChange={change} disabled={saving}>
                <option value="days">Calendar days</option>
                <option value="months">Months</option>
              </select>
            </label>
            <label className="academy-field internship-end-date">End date (calculated)
              <input type="date" name="endDate" value={endDate} readOnly/>
            </label>
            <label className="academy-field internship-selection">Monthly stipend (USD)
              <input type="number" name="monthlyStipend" value={form.monthlyStipend} onChange={change}
                min="0" step="0.01" inputMode="decimal" disabled={saving}/>
            </label>
          </div>
          <fieldset className="internship-schedule" disabled={saving}>
            <WeeklySchedule key={editing?._id || 'new'} compact value={form.attendanceSchedule} title="Weekly internship schedule" daysLabel="Attendance days"
              onChange={attendanceSchedule => {
                setForm(current => ({...current,attendanceSchedule}));
                setFormError('');
                setNotice('');
              }}/>
          </fieldset>
          {formError && <p className="academy-error" role="alert">{formError}</p>}
          {(courseError || rosterError) && <p className="academy-error" role="alert">
            {[courseError, rosterError].filter(Boolean).join(' ')}{' '}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => retryOptions(value => value + 1)}>Retry loading</button>
          </p>}
          {notice && <p className="internship-notice" role="status">{notice}</p>}
          <footer className="internship-form-footer">
            {editing && <button className="btn btn-secondary btn-sm" type="button" disabled={saving || deleting} onClick={cancelEdit}>Cancel edit</button>}
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving || deleting || (!samePlacement && !form.studentId) || !endDate || !form.attendanceSchedule.length}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add internship'}
            </button>
          </footer>
        </form>
      </section>
      <section className="academy-panel internship-panel" aria-labelledby="internship-records">
        <header className="internship-panel-header">
          <span className="internship-panel-icon"><TeachingIcon name="clipboard" size={19}/></span>
          <div><h2 id="internship-records">Internship records</h2><p>Saved placements and weekly schedules.</p></div>
        </header>
        {actionError && <p className="internship-record-message" role="alert">{actionError}</p>}
        {loading ? <p className="internship-record-message" role="status">Loading internships…</p>
          : listError ? <div className="internship-record-message" role="alert">{listError} <button type="button" className="btn btn-sm btn-secondary" onClick={() => refresh(value => value + 1)}>Retry</button></div>
          : records.length ? <div className="table-responsive">
            <table className="data-table internship-table">
              <thead><tr><th scope="col">Student / Course</th><th scope="col">Dates / Duration</th><th scope="col">Attendance · EAT</th><th scope="col">Actions</th></tr></thead>
              <tbody>{records.map(record => <tr key={record._id}>
                <td>
                  <strong>{record.studentName}</strong>
                  {record.courseName && <small>{record.courseName}</small>}
                  {record.monthlyStipendCents != null && <small>{stipendFormat.format(record.monthlyStipendCents / 100)} / month</small>}
                </td>
                <td>
                  <div>From <time dateTime={record.startDate}>{dateFormat.format(new Date(record.startDate))}</time></div>
                  <div>To <time dateTime={record.endDate}>{dateFormat.format(new Date(record.endDate))}</time></div>
                  {record.totalDays && <span className="internship-duration-badge">{contractDurationLabel({...record, dayBasis:'calendar', totalContractDays:record.totalDays})}</span>}
                </td>
                <td><AttendanceSlots schedule={record.attendanceSchedule}/></td>
                <td>
                  <div className="internship-record-actions">
                    <button type="button" className="btn btn-secondary" aria-label={`Edit internship for ${record.studentName}`} title="Edit"
                      disabled={saving || deleting || editing?._id === record._id} onClick={() => edit(record)}><TeachingIcon name="edit" size={15}/></button>
                    <button type="button" className="btn btn-secondary internship-delete" aria-label={`Delete internship for ${record.studentName}`} title="Delete"
                      disabled={saving || deleting} onClick={() => remove(record)}><TeachingIcon name="trash" size={15}/></button>
                  </div>
                </td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="internship-record-message internship-record-empty"><TeachingIcon name="clipboard" size={24}/><p>No internships recorded yet.</p></div>}
        {pages > 1 && <nav className="pagination" aria-label="Internship record pages">
          <button type="button" className="page-btn" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="page-btn" disabled={loading || page === pages} onClick={() => setPage(value => value + 1)}>Next</button>
        </nav>}
      </section>
    </div>
  </section>;
}
