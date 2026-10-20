import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const STATUS_BADGE = {
  upcoming: 'warning',
  scheduled: 'warning',
  completed: 'success',
  ongoing: 'info',
  cancelled: 'danger',
};

function formatAssessmentDate(value) {
  if (!value) return 'Date not set';
  const dateValue = String(value);
  const date = new Date(dateValue.length === 10 ? `${dateValue}T12:00:00` : dateValue);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AssessmentModal({ title, initial, assignedCourses, typeVal, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (initial) {
      return {
        ...initial,
        course: typeof initial.course === 'object' ? initial.course?._id : initial.course || '',
        date: initial.examDate ? String(initial.examDate).slice(0, 10) : (initial.date || ''),
        duration: initial.durationMinutes || initial.duration || 60,
        totalMarks: initial.totalMarks ?? (typeVal === 'quiz' ? 20 : 100),
        status: initial.status || 'upcoming',
      };
    }
    return {
      title: '',
      course: assignedCourses[0]?._id || '',
      date: new Date().toISOString().slice(0, 10),
      duration: typeVal === 'quiz' ? 30 : 60,
      totalMarks: typeVal === 'quiz' ? 20 : 100,
      status: 'upcoming',
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.course) {
      setError('Please select an assigned course');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.6rem 0.8rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {error}
              </div>
            )}
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Assessment Title *</label>
                <input
                  className="form-control"
                  type="text"
                  required
                  placeholder={typeVal === 'quiz' ? 'e.g. Chapter 1 Quiz: Routing Protocols' : 'e.g. CCNA Midterm Examination'}
                  value={form.title || ''}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Assigned Course *</label>
                <select
                  className="form-control"
                  required
                  value={form.course || ''}
                  onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
                >
                  <option value="">Select assigned course…</option>
                  {assignedCourses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseCode || c.code} — {c.title || c.name}
                    </option>
                  ))}
                </select>
                {assignedCourses.length === 0 && (
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', marginTop: 4 }}>
                    Loading assigned courses or none configured.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  className="form-control"
                  type="date"
                  required
                  value={form.date || ''}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (minutes) *</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  required
                  value={form.duration ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Marks *</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  required
                  value={form.totalMarks ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={form.status || 'upcoming'}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">In Progress (Ongoing)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-body confirm-content">
          <div className="confirm-icon">⚠️</div>
          <h3>Confirm Delete</h3>
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherExams() {
  const [tab, setTab] = useState('exams'); // 'exams' | 'quizzes' | 'assessments'
  const [items, setItems] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch teacher's assigned courses
  const fetchAssignedCourses = useCallback(async () => {
    try {
      const res = await api.get('/teacher/courses');
      const courses = res.data?.courses || (res.data?.course ? [res.data.course] : []);
      if (Array.isArray(courses) && courses.length > 0) {
        setAssignedCourses(courses);
        return;
      }
      // Fallback if no CourseTeacher mapping exists
      const fallbackRes = await api.get('/courses');
      const fallbackList = fallbackRes.data?.data || fallbackRes.data?.courses || fallbackRes.data || [];
      if (Array.isArray(fallbackList)) {
        setAssignedCourses(fallbackList);
      }
    } catch (err) {
      console.warn('[TeacherExams] Could not fetch assigned courses:', err.message);
    }
  }, []);

  // Fetch assessments / exams from backend API
  const fetchAssessments = useCallback(async (spinner = false) => {
    if (spinner) setLoading(true);
    try {
      const res = await api.get('/exams');
      const list = res.data?.data || res.data?.exams || res.data || [];
      if (Array.isArray(list)) {
        setItems(list);
      }
    } catch (err) {
      console.warn('[TeacherExams] Could not fetch exams:', err.message);
    } finally {
      if (spinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedCourses();
    fetchAssessments(true);

    // Auto-refresh every 5 seconds to keep teacher and admin views synced
    const interval = setInterval(() => {
      fetchAssessments(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAssignedCourses, fetchAssessments]);

  // Categorize items
  const exams = items.filter((item) =>
    ['exam', 'midterm', 'final', 'practical', 'supplementary'].includes(item.type)
  );
  const quizzes = items.filter((item) => item.type === 'quiz');
  const assessments = items.filter((item) =>
    ['assessment', 'assignment'].includes(item.type)
  );

  const data = tab === 'exams' ? exams : tab === 'quizzes' ? quizzes : assessments;
  const typeVal = tab === 'exams' ? 'exam' : tab === 'quizzes' ? 'quiz' : 'assessment';

  const scheduledCount = items.filter((a) =>
    ['upcoming', 'scheduled', 'ongoing'].includes(a.status)
  ).length;
  const completedCount = items.filter((a) => a.status === 'completed').length;

  const handleSave = async (form) => {
    const payload = {
      title: form.title,
      course: form.course,
      type: form.type || typeVal,
      examDate: form.date ? new Date(form.date) : new Date(),
      date: form.date,
      durationMinutes: form.duration ? Number(form.duration) : 60,
      duration: form.duration ? Number(form.duration) : 60,
      totalMarks: form.totalMarks ? Number(form.totalMarks) : (typeVal === 'quiz' ? 20 : 100),
      passingMarks: form.passingMarks ? Number(form.passingMarks) : (typeVal === 'quiz' ? 10 : 50),
      status: form.status || 'upcoming',
    };

    if (editTarget && editTarget._id) {
      await api.put(`/exams/${editTarget._id}`, payload);
    } else {
      await api.post('/exams', payload);
    }

    await fetchAssessments(false);
    setShowModal(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteTarget._id) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${deleteTarget._id}`);
      await fetchAssessments(false);
    } catch (err) {
      console.error('[TeacherExams] Delete error:', err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getCourseCode = (assessment) => {
    if (assessment.course && typeof assessment.course === 'object') {
      return assessment.course.courseCode || assessment.course.code || '—';
    }
    const matched = assignedCourses.find((c) => c._id === assessment.course);
    return matched?.courseCode || matched?.code || assessment.course || '—';
  };

  const getCourseTitle = (assessment) => {
    if (assessment.course && typeof assessment.course === 'object') {
      return assessment.course.title || assessment.course.name || '';
    }
    const matched = assignedCourses.find((c) => c._id === assessment.course);
    return matched?.title || matched?.name || '';
  };

  return (
    <div className="teacher-scope teacher-assessments-page">
      <section className="assessments-hero">
        <div className="assessments-hero-copy">
          <span className="assessment-kicker">TEACHING WORKSPACE</span>
          <h1>Exams &amp; Quizzes</h1>
          <p>Plan assessments, quizzes, and exams for your assigned courses.</p>
        </div>
        <button
          type="button"
          className="assessment-create-button"
          onClick={() => {
            setEditTarget(null);
            setShowModal(true);
          }}
        >
          <span aria-hidden="true">+</span> Create {tab === 'exams' ? 'exam' : tab === 'quizzes' ? 'quiz' : 'assessment'}
        </button>
      </section>

      <section className="assessment-summary" aria-label="Assessment totals">
        <article className="assessment-summary-item">
          <span className="assessment-summary-icon total" aria-hidden="true">▤</span>
          <div>
            <strong>{items.length}</strong>
            <span>Total assessments</span>
          </div>
        </article>
        <article className="assessment-summary-item">
          <span className="assessment-summary-icon scheduled" aria-hidden="true">◷</span>
          <div>
            <strong>{scheduledCount}</strong>
            <span>Scheduled</span>
          </div>
        </article>
        <article className="assessment-summary-item">
          <span className="assessment-summary-icon completed" aria-hidden="true">✓</span>
          <div>
            <strong>{completedCount}</strong>
            <span>Completed</span>
          </div>
        </article>
      </section>

      <section className="assessment-list-section" aria-label="Manage assessments">
        <div className="assessment-list-heading">
          <div>
            <span className="assessment-kicker">ASSESSMENT LIBRARY</span>
            <h2>Your assessments</h2>
          </div>
          <div className="assessment-switcher" role="tablist" aria-label="Assessment type">
            <button
              type="button"
              id="exams-tab"
              role="tab"
              aria-selected={tab === 'exams'}
              aria-controls="assessments-panel"
              className={tab === 'exams' ? 'active' : ''}
              onClick={() => setTab('exams')}
            >
              <span>Exams</span>
              <span className="assessment-switch-count">{exams.length}</span>
            </button>
            <button
              type="button"
              id="quizzes-tab"
              role="tab"
              aria-selected={tab === 'quizzes'}
              aria-controls="assessments-panel"
              className={tab === 'quizzes' ? 'active' : ''}
              onClick={() => setTab('quizzes')}
            >
              <span>Quizzes</span>
              <span className="assessment-switch-count">{quizzes.length}</span>
            </button>
            <button
              type="button"
              id="assessments-tab"
              role="tab"
              aria-selected={tab === 'assessments'}
              aria-controls="assessments-panel"
              className={tab === 'assessments' ? 'active' : ''}
              onClick={() => setTab('assessments')}
            >
              <span>Assessments</span>
              <span className="assessment-switch-count">{assessments.length}</span>
            </button>
          </div>
        </div>

        <div id="assessments-panel" role="tabpanel" aria-labelledby={`${tab}-tab`} className="assessment-list-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Loading assessments from database…</p>
            </div>
          ) : data.length === 0 ? (
            <div className="assessment-empty-state">
              <span className="assessment-empty-mark" aria-hidden="true">
                {tab === 'exams' ? 'E' : tab === 'quizzes' ? 'Q' : 'A'}
              </span>
              <h3>No {tab} yet</h3>
              <p>Your {tab} will appear here once they are created.</p>
              <button
                type="button"
                className="assessment-empty-action"
                onClick={() => {
                  setEditTarget(null);
                  setShowModal(true);
                }}
              >
                Create your first {tab === 'exams' ? 'exam' : tab === 'quizzes' ? 'quiz' : 'assessment'}{' '}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table assessments-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Marks</th>
                    <th>Status</th>
                    <th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((assessment) => {
                    const cCode = getCourseCode(assessment);
                    const cTitle = getCourseTitle(assessment);
                    const durationVal = assessment.durationMinutes || assessment.duration;
                    const dateVal = assessment.examDate || assessment.date;

                    return (
                      <tr key={assessment._id}>
                        <td>
                          <div className="assessment-title-cell">
                            <span className={`assessment-type-mark ${tab}`} aria-hidden="true">
                              {tab === 'exams' ? 'E' : tab === 'quizzes' ? 'Q' : 'A'}
                            </span>
                            <span>
                              <strong>{assessment.title}</strong>
                              <small>
                                {assessment.examCode ? `${assessment.examCode} • ` : ''}
                                {tab === 'exams' ? 'Exam' : tab === 'quizzes' ? 'Quiz' : 'Assessment'}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="assessment-course-code">{cCode}</span>
                          {cTitle && (
                            <small
                              style={{
                                display: 'block',
                                color: 'var(--text-muted)',
                                fontSize: '0.7rem',
                                marginTop: 2,
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={cTitle}
                            >
                              {cTitle}
                            </small>
                          )}
                        </td>
                        <td>{formatAssessmentDate(dateVal)}</td>
                        <td>{durationVal ? `${durationVal} min` : '—'}</td>
                        <td>{assessment.totalMarks ?? '—'}</td>
                        <td>
                          <span className={`badge badge-${STATUS_BADGE[assessment.status] || 'muted'} assessment-status`}>
                            {assessment.status || 'upcoming'}
                          </span>
                        </td>
                        <td>
                          <div className="assessment-row-actions">
                            <button
                              type="button"
                              className="assessment-icon-button"
                              aria-label={`Edit ${assessment.title}`}
                              title="Edit assessment"
                              onClick={() => {
                                setEditTarget(assessment);
                                setShowModal(true);
                              }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="assessment-icon-button danger"
                              aria-label={`Delete ${assessment.title}`}
                              title="Delete assessment"
                              onClick={() => setDeleteTarget(assessment)}
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <AssessmentModal
          title={editTarget ? `Edit ${typeVal}` : `Create ${typeVal}`}
          initial={editTarget}
          assignedCourses={assignedCourses}
          typeVal={typeVal}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
