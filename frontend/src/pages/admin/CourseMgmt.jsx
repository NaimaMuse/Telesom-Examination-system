import useAutoRefresh from '../../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const COURSE_FIELDS = [
  { key: 'courseCode', label: 'Course code', type: 'text' },
  { key: 'name', label: 'Course name', type: 'text', required: true },
  { key: 'credits', label: 'Credit hours', type: 'number', required: true },
  { key: 'academicYear', label: 'Year / Batch', type: 'batch', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'archived'] },
];

const PAGE_SIZE = 8;

function CourseModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ credits: 3, status: 'active', ...(initial || {}) });
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchError, setBatchError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api.get('/academy/batches', {signal: controller.signal})
      .then(({data}) => { if (!controller.signal.aborted) setBatches((data.batches || []).filter(batch => batch.status === 'active' || (batch.name === initial?.batch && batch.academicYear === initial?.academicYear))); })
      .catch(() => { if (!controller.signal.aborted) setBatchError('Could not load years and batches. Close and reopen this form to retry.'); })
      .finally(() => { if (!controller.signal.aborted) setBatchesLoading(false); });
    return () => controller.abort();
  }, [initial]);
  const selectedBatch = batches.find(batch => batch.name === form.batch && batch.academicYear === form.academicYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedBatch) { setError('Select an existing year / batch.'); return; }
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
                    <input id="course-courseCode" className="form-control" type="text" readOnly value={initial?.courseCode || ''} placeholder="Generated automatically when saved" />
                  ) : field.type === 'batch' ? (
                    <><select id={`course-${field.key}`} className="form-control" required disabled={batchesLoading || !!batchError || !batches.length} value={selectedBatch?._id || ''} onChange={event => {
                      const batch = batches.find(item => item._id === event.target.value);
                      setForm(current => ({...current, academicYear: batch?.academicYear || '', batch: batch?.name || ''}));
                    }}><option value="">{batchesLoading ? 'Loading years / batches…' : batchError ? 'Years / batches unavailable' : batches.length ? 'Select year / batch' : 'No active batches available'}</option>{batches.map(batch => <option key={batch._id} value={batch._id}>{batch.academicYear} / {batch.name}</option>)}</select>
                    {batchError && <p role="alert" className="course-form-error">{batchError}</p>}
                    {!batchesLoading && !batchError && !batches.length && <p>Create a batch in Years &amp; Batches first.</p>}</>
                  ) : field.type === 'select' ? (
                    <select id={`course-${field.key}`} className="form-control" value={form[field.key] || ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}>
                      {field.options.map((option) => <option value={option} key={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea id={`course-${field.key}`} className="form-control" rows="2" value={form[field.key] || ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  ) : (
                    <input id={`course-${field.key}`} className="form-control" type={field.type} min={field.type === 'number' ? 1 : undefined} required={field.required} value={form[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  )}
                </div>
              ))}
            </div>
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
  }, { enabled: !showModal && !deleting });

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
      academicYear: String(form.academicYear || '').trim(),
      batch: String(form.batch || '').trim(),
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
              <thead><tr><th>Course</th><th>Credits</th><th>Year</th><th>Description</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>{paginated.map((course) => (
                <tr key={course._id}>
                  <td><div className="course-record"><span aria-hidden="true">▤</span><div><strong>{course.name}</strong><small>{course.courseCode || 'Code not set'}</small></div></div></td>
                  <td><span className="course-credit-value">{course.credits ?? '—'} <small>cr</small></span></td>
                  <td><span className="course-term-value"><small>{course.academicYear || 'Year not set'}</small></span></td>
                  <td><span className="course-description-cell">{course.description || 'No description added'}</span></td>
                  <td><span className={`course-status-pill ${course.status === 'active' ? 'is-active' : course.status === 'archived' ? 'is-archived' : ''}`}><i aria-hidden="true"/>{course.status}</span></td>
                  <td><div className="course-row-actions"><button type="button" className="course-row-edit" onClick={() => { setEditTarget(course); setShowModal(true); }}>Edit</button><button type="button" className="course-row-delete" aria-label={`Delete ${course.name}`} onClick={() => setDeleteTarget(course)}>×</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <footer className="course-catalog-pagination"><span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} courses</span><div><button type="button" className="page-btn" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>‹</button>{Array.from({ length: totalPages }, (_, index) => <button type="button" key={index} className={`page-btn ${page === index + 1 ? 'active' : ''}`} aria-current={page === index + 1 ? 'page' : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" className="page-btn" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>›</button></div></footer>
      </section>

      {showModal && <CourseModal initial={editTarget} onSave={saveCourse} onClose={() => { setShowModal(false); setEditTarget(null); }} />}
      {deleteTarget && <ConfirmModal course={deleteTarget} onConfirm={deleteCourse} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
    </div>
  );
}