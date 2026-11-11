import WeeklySchedule, { WEEK_DAYS } from '../../components/WeeklySchedule';
import TeachingIcon from '../../components/TeachingIcon';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';

const COURSE_FIELDS = [
  { key: 'courseCode', label: 'Course code', type: 'text' },
  { key: 'name', label: 'Course name', type: 'text', required: true },
  { key: 'credits', label: 'Credit hours', type: 'number', required: true },
  { key: 'durationMonths', label: 'Course duration (months)', type: 'number', min: 0.25, step: 0.25 },
  { key: 'academicYear', label: 'Year / Cohort', type: 'cohort', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'archived'] },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const PAGE_SIZE = 8;
const WEEKS_PER_TEACHING_MONTH = 4;

function timeInMinutes(time = '') {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function CourseDetails({ course, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, []);

  const fields = [
    ['Credit hours', course.credits],
    ['Duration', course.durationWeeks
      ? `${course.durationWeeks / WEEKS_PER_TEACHING_MONTH} ${course.durationWeeks === WEEKS_PER_TEACHING_MONTH ? 'month' : 'months'}`
      : null],
    ['Academic year', course.academicYear],
    ['Cohort', course.cohort || course.batch],
  ];
  if (course.department) fields.push(['Department', course.department]);
  if (course.semester) fields.push(['Semester', course.semester]);
  const schedule = [...(course.teachingSchedule || [])].sort((a, b) => a.day - b.day);

  return (
    <dialog ref={dialogRef} className="course-details-dialog" aria-labelledby="course-details-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="course-details-header">
        <span className="course-details-symbol"><TeachingIcon name="book" size={22} /></span>
        <div className="course-details-identity">
          <div className="course-details-meta">
            <span>{course.courseCode || 'Course details'}</span>
            <span className="course-details-status" data-status={course.status}>{course.status}</span>
          </div>
          <h2 id="course-details-title">{course.name}</h2>
        </div>
        <button type="button" className="course-details-close" aria-label="Close course details" onClick={onClose}>×</button>
      </header>
      <div className="course-details-body">
        <dl className="course-details-fields">
          {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}
        </dl>
        <section className="course-details-section">
          <h3>Description</h3>
          <p className="course-details-description">{course.description || 'No description added.'}</p>
        </section>
        <section className="course-details-section">
          <h3><TeachingIcon name="calendar" size={17} /> Weekly teaching schedule</h3>
          {schedule.length ? <ul className="course-details-schedule">
            {schedule.map((slot) => (
              <li key={slot.day}>
                <strong>{WEEK_DAYS[slot.day]}</strong>
                <span><TeachingIcon name="clock" size={14} /> {slot.startTime}–{slot.endTime}</span>
              </li>
            ))}
          </ul> : <p>No teaching days configured.</p>}
        </section>
      </div>
    </dialog>
  );
}

function CourseModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    credits: 3,
    status: 'active',
    teachingSchedule: [],
    ...initial,
    durationMonths: initial?.durationWeeks ? initial.durationWeeks / WEEKS_PER_TEACHING_MONTH : '',
  });
  const durationWeeks = Number(form.durationMonths) * WEEKS_PER_TEACHING_MONTH;
  const sessionMinutes = form.teachingSchedule.map(slot => timeInMinutes(slot.endTime) - timeInMinutes(slot.startTime));
  const canCalculate = Number.isSafeInteger(durationWeeks) && durationWeeks > 0
    && sessionMinutes.length > 0 && sessionMinutes.every(minutes => minutes > 0);
  const certificateHours = canCalculate
    ? Math.round(sessionMinutes.reduce((sum, minutes) => sum + minutes, 0) * durationWeeks / 60 * 100) / 100
    : null;
  const [cohorts, setCohorts] = useState([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [cohortError, setCohortError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api.get('/academy/cohorts', {signal: controller.signal})
      .then(({data}) => { if (!controller.signal.aborted) setCohorts((data.cohorts || []).filter(cohort => cohort.status === 'active' || (cohort.name === initial?.cohort && cohort.academicYear === initial?.academicYear))); })
      .catch(() => { if (!controller.signal.aborted) setCohortError('Could not load years and cohorts. Close and reopen this form to retry.'); })
      .finally(() => { if (!controller.signal.aborted) setCohortsLoading(false); });
    return () => controller.abort();
  }, [initial]);
  const selectedCohort = cohorts.find(cohort => cohort.name === form.cohort && cohort.academicYear === form.academicYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedCohort) { setError('Select an existing year / cohort.'); return; }
    if (form.teachingSchedule.some(row => row.endTime <= row.startTime)) { setError('End time must be after start time.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || 'Course could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-box course-form-modal teacher-form-modal" role="dialog" aria-modal="true" aria-labelledby="course-form-title" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header course-form-header teacher-form-header">
          <div><span className="teacher-form-eyebrow">COURSE CATALOG</span><h2 className="modal-title" id="course-form-title">{initial?._id ? 'Edit course' : 'Add course'}</h2></div>
          <button type="button" className="modal-close" aria-label="Close course form" onClick={onClose}>×</button>
        </header>
        <form onSubmit={submit}>
          <div className="modal-body course-form-body">
            <div className="course-form-grid teacher-form-grid">
              {COURSE_FIELDS.map((field) => (
                <div className={`form-group ${field.type === 'textarea' ? 'course-form-wide' : ''}`} key={field.key}>
                  <label className="form-label" htmlFor={`course-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>
                  {field.key === 'courseCode' ? (
                    <input id="course-courseCode" className="form-control" type="text" readOnly value={initial?.courseCode || ''} placeholder="Automatic" />
                  ) : field.type === 'cohort' ? (
                    <><select id={`course-${field.key}`} className="form-control" required disabled={cohortsLoading || !!cohortError || !cohorts.length} value={selectedCohort?._id || ''} onChange={event => {
                      const cohort = cohorts.find(item => item._id === event.target.value);
                      setForm(current => ({...current, academicYear: cohort?.academicYear || '', cohort: cohort?.name || ''}));
                    }}><option value="">{cohortsLoading ? 'Loading years / cohorts…' : cohortError ? 'Years / cohorts unavailable' : cohorts.length ? 'Select year / cohort' : 'No active cohorts available'}</option>{cohorts.map(cohort => <option key={cohort._id} value={cohort._id}>{cohort.academicYear} / {cohort.name}</option>)}</select>
                    {cohortError && <p role="alert" className="course-form-error">{cohortError}</p>}
                    </>
                  ) : field.type === 'select' ? (
                    <select id={`course-${field.key}`} className="form-control" value={form[field.key] || ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}>
                      {field.options.map((option) => <option value={option} key={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea id={`course-${field.key}`} className="form-control" rows="2" value={form[field.key] || ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  ) : (
                    <input id={`course-${field.key}`} className="form-control" type={field.type} min={field.type === 'number' ? field.min ?? 1 : undefined} step={field.step} required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <WeeklySchedule value={form.teachingSchedule || []} onChange={teachingSchedule => setForm(current => ({...current,teachingSchedule}))} />
            {certificateHours !== null && <p className="course-certificate-hours" role="status">
              <strong>Certificate credit hours</strong> {certificateHours} hours
            </p>}
            {error && <div className="course-form-error" role="alert">{error}</div>}
          </div>
          <footer className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save course'}</button></footer>
        </form>
      </section>
    </div>
  );
}

function ConfirmModal({ course, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <section className="modal-box" role="dialog" aria-modal="true" aria-labelledby="delete-course-title" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 390 }}>
        <div className="modal-body confirm-content"><div className="confirm-icon">!</div><h3 id="delete-course-title">Remove course?</h3><p>This will remove <strong>{course.name || course.title}</strong> from the course catalog.</p></div>
        <footer className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button><button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading ? 'Removing…' : 'Remove course'}</button></footer>
      </section>
    </div>
  );
}

export default function CourseMgmt() {
  const [search] = usePageSearch();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewCourse, setViewCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = useCallback(async (background = false, context = {}) => {
    if (!background) setLoading(true);
    setError('');
    try {
      const response = await api.get('/courses', { signal: context.signal, params: { limit: 100 } });
      if (context.isCurrent && !context.isCurrent()) return;
      const rows = response.data?.data || response.data?.courses || response.data;
      setCourses(Array.isArray(rows) ? rows.map((course) => ({
        ...course,
        name: course.name || course.title || '',
        status: course.status || (course.isActive ? 'active' : 'inactive'),
      })) : []);
    } catch (requestError) {
      if (context.isCurrent && !context.isCurrent()) return;
      if (!background) setCourses([]);
      setError(requestError.response?.data?.message || 'Courses could not be loaded. Check the connection and try again.');
    } finally {
      if (!background && (!context.isCurrent || context.isCurrent())) setLoading(false);
    }
  }, []);



  useAutoRefresh(async context => {
    await Promise.all([fetchCourses(!context.initial, context)]);
  }, { enabled: !showModal && !viewCourse && !deleting });

  const activeCount = courses.filter((course) => course.status === 'active').length;
  const inactiveCount = courses.filter((course) => course.status === 'inactive').length;
  const filtered = useMemo(() => courses.filter((course) => (
    (statusFilter === 'all' || course.status === statusFilter) && matchesPageSearch(search, course.title, course.name, course.courseCode, course.description, course.academicYear)
  )), [courses, statusFilter, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const saveCourse = async (form) => {
    const payload = {
      name: String(form.name || '').trim(),
      title: String(form.name || '').trim(),
      credits: Number(form.credits) || 3,
      durationWeeks: form.durationMonths ? Number(form.durationMonths) * WEEKS_PER_TEACHING_MONTH : null,
      teachingSchedule: form.teachingSchedule || [],
      academicYear: String(form.academicYear || '').trim(),
      cohort: String(form.cohort || '').trim(),
      description: String(form.description || '').trim(),
      status: form.status || 'active',
    };
    if (editTarget?._id) await api.put(`/courses/${editTarget._id}`, payload);
    else await api.post('/courses', payload);
    await fetchCourses();
    setShowModal(false);
    setEditTarget(null);
  };

  const deleteCourse = async () => {
    setDeleting(true);
    try {
      await api.delete(`/courses/${deleteTarget._id}`);
      await fetchCourses();
      setDeleteTarget(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Course could not be removed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="course-management-page">
      <section className="course-summary-grid" aria-label="Course statistics">
        <article><span className="course-summary-icon all" aria-hidden="true">▤</span><div><strong>{courses.length}</strong><span>Total courses</span></div></article>
        <article><span className="course-summary-icon active" aria-hidden="true">✓</span><div><strong>{activeCount}</strong><span>Active courses</span></div></article>
        <article><span className="course-summary-icon inactive" aria-hidden="true">Ⅱ</span><div><strong>{inactiveCount}</strong><span>Inactive courses</span></div></article>
      </section>

      <section className="course-catalog-panel">
        <header className="course-catalog-header">
          <div><span className="course-page-kicker">COURSE CATALOG</span><h2>Courses <span>{filtered.length}</span></h2></div>
          <div className="course-catalog-filters">
            <button type="button" className="course-add-button" onClick={() => { setEditTarget(null); setShowModal(true); }}><span aria-hidden="true">+</span> Add course</button>
            <select aria-label="Filter by course status" className="form-control" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
          </div>
        </header>

        {error && <div className="course-page-error" role="alert"><span>{error}</span><button type="button" onClick={fetchCourses}>Retry</button></div>}
        {loading ? (
          <div className="course-page-state"><div className="spinner"/><span>Loading courses…</span></div>
        ) : paginated.length === 0 ? (
          <div className="course-page-state course-empty-state"><span aria-hidden="true">▤</span><strong>{courses.length ? 'No matching courses' : 'No courses yet'}</strong><p>{courses.length ? 'Change the search or status filter.' : 'Add a course to start building the academic catalog.'}</p>{!courses.length && <button type="button" className="course-add-button" onClick={() => { setEditTarget(null); setShowModal(true); }}>+ Add first course</button>}</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table course-catalog-table">
              <thead><tr><th>Course</th><th>Credits</th><th>Days</th><th>Year</th><th>Description</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>{paginated.map((course) => (
                <tr key={course._id}>
                  <td><div className="course-record"><span aria-hidden="true">▤</span><div><strong>{course.name}</strong><small>{course.courseCode || 'Code not set'}</small></div></div></td>
                  <td><span className="course-credit-value">{course.credits ?? '—'} <small>cr</small></span></td>
                  <td><span className="course-term-value" title={(course.teachingSchedule || []).map(slot => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day]).join(', ') || 'No teaching days configured'}>{`${new Set((course.teachingSchedule || []).map(slot => slot.day)).size} ${new Set((course.teachingSchedule || []).map(slot => slot.day)).size === 1 ? 'day' : 'days'}`}</span></td>
                  <td><span className="course-term-value"><small>{course.academicYear || 'Year not set'}</small></span></td>
                  <td><span className="course-description-cell">{course.description || 'No description added'}</span></td>
                  <td><span className={`course-status-pill ${course.status === 'active' ? 'is-active' : course.status === 'archived' ? 'is-archived' : ''}`}><i aria-hidden="true"/>{course.status}</span></td>
                  <td><div className="course-row-actions">
                    <button type="button" className="course-row-view" title="View course details"
                      aria-label={`View details for ${course.name}`} aria-haspopup="dialog" onClick={() => setViewCourse(course)}>
                      <TeachingIcon name="eye" size={16} />
                    </button>
                    <button type="button" className="course-row-edit" onClick={() => { setEditTarget(course); setShowModal(true); }}>Edit</button>
                    <button type="button" className="course-row-delete" aria-label={`Delete ${course.name}`} onClick={() => setDeleteTarget(course)}>×</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <footer className="course-catalog-pagination"><span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} courses</span><div><button type="button" className="page-btn" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>‹</button>{Array.from({ length: totalPages }, (_, index) => <button type="button" key={index} className={`page-btn ${page === index + 1 ? 'active' : ''}`} aria-current={page === index + 1 ? 'page' : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" className="page-btn" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>›</button></div></footer>
      </section>

      {showModal && <CourseModal initial={editTarget} onSave={saveCourse} onClose={() => { setShowModal(false); setEditTarget(null); }} />}
      {viewCourse && <CourseDetails course={viewCourse} onClose={() => setViewCourse(null)} />}
      {deleteTarget && <ConfirmModal course={deleteTarget} onConfirm={deleteCourse} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
    </div>
  );
}
