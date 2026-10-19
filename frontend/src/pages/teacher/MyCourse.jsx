import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const NOTE_FILE_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function formatCourseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date to be confirmed'
    : date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyCourse() {
  const [tab, setTab] = useState('overview');
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteError, setNoteError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', file: null });

  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/teacher/my-course');
        const payload = response.data || {};
        const nextCourse = payload.course || null;
        setCourse(nextCourse);
        setStudents(Array.isArray(payload.students) ? payload.students : []);
        setUpcoming(Array.isArray(payload.upcomingExams) ? payload.upcomingExams : []);
        setNotes(Array.isArray(payload.notes) ? payload.notes : []);
      } catch (err) {
        setError('My Course data is currently unavailable.');
        setCourse(null);
        setStudents([]);
        setUpcoming([]);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, []);

  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return notes;
    const q = noteSearch.toLowerCase();
    return notes.filter((note) =>
      [note.title, note.description, note.filename].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }, [notes, noteSearch]);

  const handleFileValidation = (file) => {
    if (!file) {
      return 'Please select a file.';
    }

    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!NOTE_FILE_TYPES.includes(extension)) {
      return 'Only PDF, DOC, DOCX, PPT, and PPTX files are supported.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be 15 MB or smaller.';
    }

    return '';
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    const validationError = handleFileValidation(form.file);
    if (!form.title.trim() || validationError) {
      setNoteError(validationError || 'Please enter a document title.');
      return;
    }

    setUploading(true);
    setNoteError('');

    const nextNote = {
      _id: editingNoteId || `note-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      filename: form.file?.name || 'document.pdf',
      fileType: form.file?.name?.split('.').pop().toLowerCase() || 'pdf',
      uploadedAt: new Date().toISOString(),
      size: form.file ? `${(form.file.size / 1024 / 1024).toFixed(1)} MB` : '—',
    };

    if (editingNoteId) {
      setNotes((current) => current.map((note) => (note._id === editingNoteId ? { ...note, ...nextNote } : note)));
      setEditingNoteId(null);
    } else {
      setNotes((current) => [nextNote, ...current]);
    }

    setForm({ title: '', description: '', file: null });
    setUploading(false);
  };

  const handleDelete = (noteId) => {
    if (!window.confirm('Delete this study note?')) return;
    setNotes((current) => current.filter((note) => note._id !== noteId));
    if (editingNoteId === noteId) setEditingNoteId(null);
  };

  const renderOverview = () => (
    <div className="card course-panel">
      <div className="card-header course-panel-header">
        <div>
          <span className="course-section-kicker">At a glance</span>
          <h2>Course overview</h2>
        </div>
        {course?.courseCode && <span className="course-panel-code">{course.courseCode}</span>}
      </div>
      <div className="card-body course-panel-body">
        {course ? (
          <>
            <div className="stats-grid course-overview-stats">
              <div className="stat-card">
                <div className="stat-icon green" aria-hidden="true">▤</div>
                <div className="stat-info"><div className="stat-value">{course.courseCode || '—'}</div><div className="stat-label">Course code</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue" aria-hidden="true">♙</div>
                <div className="stat-info"><div className="stat-value">{students.length}</div><div className="stat-label">Enrolled students</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon gold" aria-hidden="true">◷</div>
                <div className="stat-info"><div className="stat-value">{upcoming.length}</div><div className="stat-label">Upcoming exams</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple" aria-hidden="true">▧</div>
                <div className="stat-info"><div className="stat-value">{notes.length}</div><div className="stat-label">Study notes</div></div>
              </div>
            </div>

            <div className="course-overview-lower">
              <section className="course-detail-block">
                <span className="course-section-kicker">About this course</span>
                <h3>{course.title || course.name || 'Course title unavailable'}</h3>
                <p>{course.description || 'No course description has been added yet.'}</p>
                <dl className="course-facts">
                  <div><dt>Department</dt><dd>{course.department || 'Not specified'}</dd></div>
                  <div><dt>Semester</dt><dd>{course.semester || 'Not specified'}</dd></div>
                  <div><dt>Credits</dt><dd>{course.credits ?? '—'}</dd></div>
                </dl>
              </section>
              <section className="course-assessment-block">
                <div className="course-block-heading"><h3>Upcoming assessments</h3><span>{upcoming.length}</span></div>
                {upcoming.length ? (
                  <ul className="course-assessment-list">
                    {upcoming.slice(0, 4).map((exam, index) => (
                      <li key={exam._id || index}>
                        <span className="course-assessment-mark" aria-hidden="true">{exam.type === 'quiz' ? 'Q' : 'E'}</span>
                        <span className="course-assessment-copy"><strong>{exam.title || 'Assessment'}</strong><small>{formatCourseDate(exam.examDate || exam.quizDate || exam.date)}</small></span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="course-assessment-empty">No upcoming assessments scheduled.</p>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="empty-state course-empty-state">
            <div className="empty-state-icon" aria-hidden="true">▤</div>
            <h3>Course information unavailable</h3>
            <p>The assigned course record could not be loaded from the backend.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Study Notes</span>
      </div>
      <div className="card-body">
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input
                className="form-control"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Week 3 – Lecture notes"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Select Document *</label>
              <input
                className="form-control"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add a short summary for students..."
            />
          </div>

          {noteError && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 8, padding: '0.7rem 0.9rem', fontSize: '0.85rem' }}>
              {noteError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading…' : editingNoteId ? 'Save Changes' : 'Upload Document'}
            </button>
            {editingNoteId && (
              <button type="button" className="btn btn-secondary" onClick={() => { setEditingNoteId(null); setForm({ title: '', description: '', file: null }); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div style={{ marginBottom: '0.75rem' }}>
          <div className="search-input-wrap" style={{ maxWidth: 360 }}>
            <span style={{ color: 'var(--text-muted)' }}>🔍</span>
            <input
              placeholder="Search uploaded notes..."
              value={noteSearch}
              onChange={(event) => setNoteSearch(event.target.value)}
            />
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">📄</div>
            <h3>No notes uploaded yet</h3>
            <p>Upload the first document for this course.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {filteredNotes.map((note) => (
              <div key={note._id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📄</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{note.title}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.82rem', marginBottom: 4 }}>
                      {note.filename || 'Document'} • {note.size || 'Unknown size'}
                    </div>
                    {note.description && (
                      <div style={{ color: '#4B5563', fontSize: '0.82rem', lineHeight: 1.5 }}>{note.description}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setEditingNoteId(note._id);
                      setForm({
                        title: note.title,
                        description: note.description || '',
                        file: null,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(note._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Students</span>
      </div>
      <div className="card-body">
        {students.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">🎓</div>
            <h3>No students enrolled</h3>
            <p>There are no students assigned to this course yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id || student.studentId}>
                    <td style={{ fontWeight: 600 }}>{student.name || 'Student'}</td>
                    <td>{student.studentId || '—'}</td>
                    <td>{student.email || '—'}</td>
                    <td><span className="badge badge-success">{student.status || 'active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="teacher-scope teacher-course-page">
      <section className="course-page-hero">
        <span className="course-hero-icon" aria-hidden="true">▤</span>
        <div className="course-hero-copy">
          <span className="course-section-kicker">Teaching workspace</span>
          <h1>{course?.title || course?.name || 'My Course'}</h1>
          <p>{course?.description || 'Your course materials, assessment schedule, and enrolled learners.'}</p>
        </div>
        <div className="course-hero-code">
          <span>Course code</span>
          <strong>{course?.courseCode || '—'}</strong>
          <small>{course?.department || course?.semester || 'Assigned course'}</small>
        </div>
      </section>

      {error && (
        <div className="course-page-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="course-tabs" role="tablist" aria-label="Course sections">
        {['overview', 'notes', 'students'].map((nextTab) => (
          <button
            key={nextTab}
            type="button"
            id={`${nextTab}-tab`}
            role="tab"
            aria-selected={tab === nextTab}
            aria-controls={`${nextTab}-panel`}
            className={`course-tab ${tab === nextTab ? 'active' : ''}`}
            onClick={() => setTab(nextTab)}
          >
            <span>{nextTab === 'overview' ? 'Overview' : nextTab === 'notes' ? 'Study notes' : 'Students'}</span>
            <span className="course-tab-count">{nextTab === 'notes' ? notes.length : nextTab === 'students' ? students.length : ''}</span>
          </button>
        ))}
      </div>

      <div className="course-tab-content" id={`${tab}-panel`} role="tabpanel" aria-labelledby={`${tab}-tab`}>
        {loading ? (
          <div className="card course-loading"><div className="spinner-wrap"><div className="spinner" /></div></div>
        ) : tab === 'overview' ? (
          renderOverview()
        ) : tab === 'notes' ? (
          renderNotes()
        ) : (
          renderStudents()
        )}
      </div>
    </div>
  );
}
