import { useEffect, useState } from 'react';
import api from '../../services/api';
import TeachingIcon from '../../components/TeachingIcon';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import WeeklySchedule, { WEEK_DAYS } from '../../components/WeeklySchedule';
import { contractDurationDays, contractDurationLabel, contractEndDate } from '../teacher/teachingSchedule.mjs';
import './Internships.css';

const emptyForm = { courseId: '', studentId: '', startDate: '', duration: '', durationUnit: 'days', attendanceSchedule: [] };
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

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
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
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

  function change(event) {
    const { name, value } = event.target;
    if (name === 'courseId') {
      setStudents([]);
      setRosterLoading(Boolean(value));
      setRosterError('');
    }
    setForm(current => ({...current, [name]:value, ...(name === 'courseId' ? {studentId:''} : {})}));
    setFormError('');
    setNotice('');
  }

  async function save(event) {
    event.preventDefault();
    if (form.attendanceSchedule.some(row => row.endTime <= row.startTime)) {
      setFormError('Attendance end time must be after the start time.');
      return;
    }
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      const { courseId, studentId, startDate, attendanceSchedule } = form;
      await api.post('/internships', {courseId, studentId, startDate, totalDays, attendanceSchedule});
      setForm({...emptyForm, courseId:form.courseId});
      setNotice('Internship saved.');
      setPage(1);
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
          <div><h2 id="add-internship">Add internship</h2><p>Choose a student, dates, and attendance days.</p></div>
        </header>
        <form className="academy-form internship-form" onSubmit={save}>
          <div className="internship-form-fields">
            <label className="academy-field internship-selection">Course
              <select name="courseId" value={form.courseId} onChange={change} required disabled={saving || !courses?.length}>
                <option value="">{courseError ? 'Courses unavailable' : courses === null ? 'Loading courses…' : courses.length ? 'Select a course' : 'No courses available'}</option>
                {courses?.map(course => <option key={course._id} value={course._id}>{course.name}{course.code ? ' · ' + course.code : ''}</option>)}
              </select>
            </label>
            <label className="academy-field internship-selection">Student
              <select name="studentId" value={form.studentId} onChange={change} required disabled={saving || !students.length}>
                <option value="">{!form.courseId ? 'Select a course first' : rosterLoading ? 'Loading students…' : rosterError ? 'Students unavailable' : students.length ? 'Select a student' : 'No students enrolled'}</option>
                {students.map(student => <option key={student._id} value={student._id}>{student.name} · {student.code}</option>)}
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
          </div>
          <fieldset className="internship-schedule" disabled={saving}>
            <WeeklySchedule value={form.attendanceSchedule} title="Weekly internship schedule" daysLabel="Attendance days" emptyMessage="No attendance days selected."
              description="Choose the days and times the student will attend. Duration includes the start date."
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
          <footer className="internship-form-footer"><button className="btn btn-primary btn-sm" type="submit" disabled={saving || !form.studentId || !endDate || !form.attendanceSchedule.length}>{saving ? 'Saving…' : 'Add internship'}</button></footer>
        </form>
      </section>
      <section className="academy-panel internship-panel" aria-labelledby="internship-records">
        <header className="internship-panel-header">
          <span className="internship-panel-icon"><TeachingIcon name="clipboard" size={19}/></span>
          <div><h2 id="internship-records">Internship records</h2><p>Saved placements and weekly schedules.</p></div>
        </header>
        {loading ? <p className="internship-record-message" role="status">Loading internships…</p>
          : listError ? <div className="internship-record-message" role="alert">{listError} <button type="button" className="btn btn-sm btn-secondary" onClick={() => refresh(value => value + 1)}>Retry</button></div>
          : records.length ? <div className="table-responsive">
            <table className="data-table internship-table">
              <thead><tr><th scope="col">Student / Course</th><th scope="col">Dates / Duration</th><th scope="col">Attendance · EAT</th></tr></thead>
              <tbody>{records.map(record => <tr key={record._id}>
                <td><strong>{record.studentName}</strong>{record.courseName && <small>{record.courseName}</small>}</td>
                <td>
                  <div>From <time dateTime={record.startDate}>{dateFormat.format(new Date(record.startDate))}</time></div>
                  <div>To <time dateTime={record.endDate}>{dateFormat.format(new Date(record.endDate))}</time></div>
                  {record.totalDays && <span className="internship-duration-badge">{contractDurationLabel({...record, dayBasis:'calendar', totalContractDays:record.totalDays})}</span>}
                </td>
                <td>{record.attendanceSchedule?.length ? [...record.attendanceSchedule].sort((a,b) => a.day-b.day).map(slot =>
                  <div className="internship-record-slot" key={slot.day}><strong>{WEEK_DAYS[slot.day]}</strong> <span>{slot.startTime}–{slot.endTime}</span></div>
                ) : '—'}</td>
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
