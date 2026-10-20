import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PLACEHOLDER_EXAMS = [
  {
    _id: 'ex1',
    title: 'CCNA Midterm Examination',
    examCode: 'EX-CCNA-MID',
    course: { title: 'Cisco Certified Network Associate', courseCode: 'CCNA-201' },
    createdBy: { name: 'Dr. Sahra Cabdi Warsame', role: 'teacher' },
    type: 'midterm',
    examDate: '2026-11-15T09:00:00.000Z',
    startTime: '09:00 AM',
    durationMinutes: 90,
    totalMarks: 100,
    passingMarks: 50,
    weightage: 40,
    room: 'Lab 204',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    status: 'scheduled',
  },
  {
    _id: 'ex2',
    title: 'Web Dev Frontend & API Exam',
    examCode: 'EX-SWE-FINAL',
    course: { title: 'Full-Stack Web Development & MERN Stack', courseCode: 'SWE-301' },
    createdBy: { name: 'Dr. Sahra Cabdi Warsame', role: 'teacher' },
    type: 'final',
    examDate: '2026-12-20T10:00:00.000Z',
    startTime: '10:00 AM',
    durationMinutes: 120,
    totalMarks: 100,
    passingMarks: 50,
    weightage: 50,
    room: 'Auditorium 1',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    status: 'scheduled',
  },
  {
    _id: 'ex3',
    title: 'Network Protocols Practical Test',
    examCode: 'EX-CCNA-PRAC-01',
    course: { title: 'Cisco Certified Network Associate', courseCode: 'CCNA-201' },
    createdBy: { name: 'Dr. Sahra Cabdi Warsame', role: 'teacher' },
    type: 'practical',
    examDate: '2026-10-11T11:00:00.000Z',
    startTime: '11:00 AM',
    durationMinutes: 60,
    totalMarks: 50,
    passingMarks: 25,
    weightage: 20,
    room: 'Lab 204',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    status: 'completed',
  },
];

const TYPE_CONFIG = {
  final:       { label: 'Final Exam',      bg: '#fee2e2', color: '#991b1b' },
  midterm:     { label: 'Midterm',         bg: '#ffedd5', color: '#9a3412' },
  quiz:        { label: 'Quiz',            bg: '#f3e8ff', color: '#6b21a8' },
  practical:   { label: 'Practical / Lab', bg: '#e0f2fe', color: '#075985' },
  assignment:  { label: 'Assignment',      bg: '#f3f4f6', color: '#374151' },
  exam:        { label: 'Exam',            bg: '#dcfce7', color: '#166534' },
};

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled',   bg: '#fef3c7', color: '#92400e' },
  upcoming:  { label: 'Upcoming',    bg: '#fef3c7', color: '#92400e' },
  ongoing:   { label: 'In Progress', bg: '#dbeafe', color: '#1e40af' },
  completed: { label: 'Completed',   bg: '#d1fae5', color: '#065f46' },
  cancelled: { label: 'Cancelled',   bg: '#f3f4f6', color: '#6b7280' },
};

const PAGE_SIZE = 8;

/**
 * Read-Only Details Modal for Admin Inspection
 */
function ExamDetailsModal({ exam, onClose }) {
  if (!exam) return null;

  const typeInfo = TYPE_CONFIG[exam.type] || { label: exam.type, bg: '#f3f4f6', color: '#374151' };
  const statusInfo = STATUS_CONFIG[exam.status] || { label: exam.status, bg: '#fef3c7', color: '#92400e' };

  const courseTitle = typeof exam.course === 'object' && exam.course !== null
    ? (exam.course.name || exam.course.title || exam.course.courseCode)
    : (exam.course || '—');

  const teacherName = typeof exam.createdBy === 'object' && exam.createdBy !== null
    ? (exam.createdBy.name || exam.createdBy.email)
    : (exam.teacher || 'Course Instructor');

  const formattedDate = exam.examDate
    ? new Date(exam.examDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <span className="modal-title" style={{ fontSize: '1.15rem' }}>Assessment Details</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Read-only view • Authored by Course Teacher
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Title & Badge */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{exam.title}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Code: {exam.examCode || 'N/A'}
                </span>
              </div>
              <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color, fontWeight: 700 }}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                COURSE
              </label>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {courseTitle}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                CREATOR (TEACHER)
              </label>
              <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                👨‍🏫 {teacherName}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                ASSESSMENT TYPE
              </label>
              <span className="badge" style={{ background: typeInfo.bg, color: typeInfo.color, fontWeight: 700 }}>
                {typeInfo.label}
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                VENUE / ROOM
              </label>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                📍 {exam.room || 'Not Assigned'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                DATE &amp; TIME
              </label>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                📅 {formattedDate}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🕐 {exam.startTime || '09:00 AM'} ({exam.durationMinutes || 60} mins)
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                MARKS &amp; WEIGHTAGE
              </label>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {exam.totalMarks ?? 100} pts <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Pass: {exam.passingMarks ?? 50})</span>
              </div>
              {exam.weightage && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Weightage: {exam.weightage}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamMgmt() {
  const [items, setItems] = useState(PLACEHOLDER_EXAMS);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedExam, setSelectedExam] = useState(null);

  const fetchItems = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get('/exams');
      const data = res.data?.data || res.data?.exams || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setItems(data);
      }
    } catch (err) {
      console.warn('[ExamMgmt] Using placeholder data:', err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch with spinner
    fetchItems(true);

    // Auto-refresh in background every 5 seconds without needing button click
    const timer = setInterval(() => {
      fetchItems(false);
    }, 5000);

    return () => clearInterval(timer);
  }, [fetchItems]);

  const filtered = items.filter((e) => {
    const matchTab = tab === 'all' || e.type === tab;
    const matchStatus =
      statusFilter === 'all' ||
      e.status === statusFilter ||
      (statusFilter === 'scheduled' && e.status === 'upcoming');
    return matchTab && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getCourseName = (c) => {
    if (!c) return '—';
    if (typeof c === 'object') {
      return c.title || c.name || c.courseCode || '—';
    }
    return c;
  };

  const getTeacherName = (e) => {
    if (e.createdBy && typeof e.createdBy === 'object') {
      return e.createdBy.name || e.createdBy.email || 'Teacher';
    }
    return e.teacher || 'Course Instructor';
  };

  // Summary Metrics
  const totalExams = items.length;
  const upcomingCount = items.filter((i) => i.status === 'scheduled' || i.status === 'upcoming').length;
  const ongoingCount = items.filter((i) => i.status === 'ongoing').length;
  const completedCount = items.filter((i) => i.status === 'completed').length;

  return (
    <div className="exam-mgmt-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Top Header Bar (Clean, Auto-Refreshing Live Registry) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '0.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Examination Registry
            </h2>
            <span
              className="badge"
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '0.72rem',
                border: '1px solid #bae6fd',
              }}
            >
              🔒 READ-ONLY AUDIT
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                color: '#16a34a',
                fontWeight: 600,
                background: '#f0fdf4',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
              }}
              title="Automatically polling for updates every 5 seconds"
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              Live Syncing
            </span>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Real-time monitoring of assessments authored and scheduled by faculty instructors
          </span>
        </div>
      </div>

      {/* ── KPI Metrics Overview Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669', fontSize: '1.25rem' }}>
            📝
          </div>
          <div>
            <div className="stat-value" style={{ fontWeight: 800, fontSize: '1.45rem', color: '#111827' }}>
              {totalExams}
            </div>
            <div className="stat-label" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: 600 }}>
              Total Assessments
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706', fontSize: '1.25rem' }}>
            ⏳
          </div>
          <div>
            <div className="stat-value" style={{ fontWeight: 800, fontSize: '1.45rem', color: '#111827' }}>
              {upcomingCount}
            </div>
            <div className="stat-label" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: 600 }}>
              Scheduled / Upcoming
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb', fontSize: '1.25rem' }}>
            ⚡
          </div>
          <div>
            <div className="stat-value" style={{ fontWeight: 800, fontSize: '1.45rem', color: '#111827' }}>
              {ongoingCount}
            </div>
            <div className="stat-label" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: 600 }}>
              Active / In Progress
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a', fontSize: '1.25rem' }}>
            ✅
          </div>
          <div>
            <div className="stat-value" style={{ fontWeight: 800, fontSize: '1.45rem', color: '#111827' }}>
              {completedCount}
            </div>
            <div className="stat-label" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: 600 }}>
              Completed Exams
            </div>
          </div>
        </div>
      </div>

      {/* ── Type Category Filter Tabs ── */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {[
          { id: 'all', label: 'All Assessments' },
          { id: 'midterm', label: 'Midterms' },
          { id: 'final', label: 'Final Exams' },
          { id: 'quiz', label: 'Quizzes' },
          { id: 'practical', label: 'Practical / Labs' },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main Data Card (Clean Table, NO SEARCH BOX) ── */}
      <div className="card" style={{ marginTop: 0 }}>
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="card-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Assessment Records
            </span>
            <span
              className="badge"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}
            >
              {filtered.length} found
            </span>
          </div>

          {/* Status Quick Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
            <select
              className="form-control"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                minWidth: '150px',
              }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled / Upcoming</option>
              <option value="ongoing">In Progress (Ongoing)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="spinner-wrap" style={{ padding: '3rem 0' }}>
            <div className="spinner" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem 1rem' }}>
            <div className="empty-state-icon">📝</div>
            <h3>No assessments found</h3>
            <p>No exams or quizzes match the selected filter. Assessments will appear here once teachers schedule them.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 45 }}>#</th>
                  <th>Assessment Title</th>
                  <th>Course</th>
                  <th>Created By (Teacher)</th>
                  <th>Type</th>
                  <th>Date &amp; Time</th>
                  <th>Duration</th>
                  <th>Total Marks</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((e, i) => {
                  const typeInfo = TYPE_CONFIG[e.type] || { label: e.type, bg: '#f3f4f6', color: '#4b5563' };
                  const statusInfo = STATUS_CONFIG[e.status] || { label: e.status, bg: '#fef3c7', color: '#92400e' };
                  const teacherName = getTeacherName(e);

                  return (
                    <tr key={e._id}>
                      <td style={{ color: 'var(--text-muted)' }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {e.title}
                        </div>
                        {e.examCode && (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              fontFamily: 'monospace',
                              letterSpacing: '0.3px',
                              marginTop: 2,
                            }}
                          >
                            {e.examCode}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            maxWidth: '180px',
                            display: 'inline-block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={getCourseName(e.course)}
                        >
                          {getCourseName(e.course)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.9rem' }}>👨‍🏫</span>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                            {teacherName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: typeInfo.bg,
                            color: typeInfo.color,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatDate(e.examDate || e.date)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.startTime || '09:00 AM'}</div>
                      </td>
                      <td>{e.durationMinutes || e.duration ? `${e.durationMinutes || e.duration} mins` : '—'}</td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{e.totalMarks ?? 100} pts</span>
                        {e.passingMarks && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pass: {e.passingMarks}</div>
                        )}
                      </td>
                      <td>{e.room || '—'}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          title="View Full Details"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => setSelectedExam(e)}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span className="page-info">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-btn ${page === i + 1 ? 'active' : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
        </div>
      </div>

      {/* ── Read-Only Inspection Modal ── */}
      <ExamDetailsModal
        exam={selectedExam}
        onClose={() => setSelectedExam(null)}
      />
    </div>
  );
}
