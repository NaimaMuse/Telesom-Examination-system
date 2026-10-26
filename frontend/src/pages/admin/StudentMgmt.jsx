import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
/**
 * Shared CRUD page factory for management pages.
 * Provides: search, pagination, add/edit modal, delete confirm.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ─────────────────── STUDENT MANAGEMENT ────────────────────────
const STUDENT_FIELDS = [
  { key: 'name', label: 'Full Name', type: 'text', required: true, example: 'Amina Hassan', guidance: 'Required. Enter the full name (2–100 characters).' },
  { key: 'studentId', label: 'Student ID (automatic)', type: 'text', readOnly: true },
  { key: 'email', label: 'Email', type: 'email', required: true, example: 'amina@example.com', guidance: 'Required. Use a valid, unique email address.' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'], required: true, example: 'female', guidance: 'Required. Use male or female.' },
  { key: 'phone', label: 'Phone', type: 'tel', example: '+252 61 1234567', guidance: 'Optional. Enter as text to keep the country code and leading zeros.' },
  { key: 'course', label: 'Course', type: 'course', required: true, guidance: 'Required. Use an existing course name from the Available Courses sheet.' },
  { key: 'address', label: 'Address', type: 'text', example: 'Hargeisa', guidance: 'Optional. Enter the student address.' },
  { key: 'academicYear', label: 'Batch / Year', type: 'text', guidance: 'Optional. Defaults to the course academic year, or the current year.' },
  { key: 'status', label: 'Status', type: 'select', options: ['active','inactive','graduated','suspended'], example: 'active', guidance: 'Optional. Use active, inactive, graduated or suspended. Defaults to active.' },
];

function CrudModal({ title, fields, initial, courses, coursesLoading, onSave, onClose }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await onSave(form); }
    catch (saveError) { setError(saveError.message || 'Student could not be saved.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              {fields.map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}{f.required && ' *'}</label>
                  {f.type === 'course' ? (
                    <select className="form-control" required={f.required} value={form.course || ''} disabled={coursesLoading || courses.length === 0} onChange={e => handleChange(f.key, e.target.value)}>
                      <option value="">{coursesLoading ? 'Loading courses…' : courses.length ? 'Select a course' : 'No courses available'}</option>
                      {courses.map(course => <option key={course._id} value={course._id}>{course.title || course.name || 'Course'}</option>)}
                    </select>
                  ) : f.type === 'select' ? (
                    <select className="form-control" required={f.required} value={form[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-control"
                      type={f.type}
                      readOnly={f.readOnly}
                      placeholder={f.readOnly ? 'Assigned automatically when saved' : undefined}
                      required={f.required}
                      value={form[f.key] || ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          {error && <div className="student-form-error" role="alert">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || coursesLoading || (fields.some(field => field.type === 'course') && courses.length === 0)}>
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
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-body confirm-content">
          <div className="confirm-icon">⚠️</div>
          <h3>Confirm Delete</h3>
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 8;

const STUDENT_IMPORT_FIELDS = STUDENT_FIELDS.filter(field => !field.readOnly);
const STUDENT_REQUIRED_FIELDS = STUDENT_IMPORT_FIELDS.filter(field => field.required);
const STUDENT_TEMPLATE_COLUMNS = STUDENT_IMPORT_FIELDS.map(field => `${field.label}${field.required ? ' *' : ''}`);

const normalizeHeader = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const STUDENT_COLUMN_MAP = {
  fullname: 'name',
  name: 'name',
  studentname: 'name',
  email: 'email',
  studentid: 'studentId',
  id: 'studentId',
  status: 'status',
  gender: 'gender',
  sex: 'gender',
  phone: 'phone',
  phonenumber: 'phone',
  address: 'address',
  batchyear: 'academicYear',
  batch: 'academicYear',
  academicyear: 'academicYear',
  year: 'academicYear',
  course: 'course',
  courseid: 'course',
  coursecode: 'course',
};

function mapStudentRows(rows) {
  return rows.map((row) => Object.entries(row).reduce((student, [header, value]) => {
    const key = STUDENT_COLUMN_MAP[normalizeHeader(header)];
    if (key && value !== undefined && value !== null) student[key] = String(value).trim();
    return student;
  }, {}));
}

function downloadStudentTemplate(courses) {
  return import('xlsx').then((XLSX) => {
    const sampleCourse = courses[0];
    const currentYear = new Intl.DateTimeFormat('en-US', {timeZone:'Africa/Nairobi', year:'numeric'}).format(new Date());
    const examples = { course: sampleCourse?.title || sampleCourse?.name || 'REPLACE_WITH_COURSE_NAME', academicYear: sampleCourse?.academicYear || currentYear };
    const worksheet = XLSX.utils.aoa_to_sheet([
      STUDENT_TEMPLATE_COLUMNS,
      STUDENT_IMPORT_FIELDS.map(field => examples[field.key] || field.example || ''),
    ]);
    worksheet['!cols'] = STUDENT_TEMPLATE_COLUMNS.map(column => ({ wch: Math.max(column.length + 4, 22) }));
    worksheet['!autofilter'] = { ref: 'A1:H2' };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    const instructions = XLSX.utils.aoa_to_sheet([
      ['Student import template', 'Instructions'],
      ['Students sheet', 'Replace the example row with real student data. Keep headings in row 1. One student per row.'],
      ['Required fields', STUDENT_REQUIRED_FIELDS.map(field => field.label).join(', ') + '. Headings marked * are required.'],
      ['Student ID', 'Generated by the system as TL-YYYY-01. Do not enter a Student ID.'],
      ...STUDENT_IMPORT_FIELDS.map(field => [field.label, field.guidance]),
    ]);
    instructions['!cols'] = [{wch:24}, {wch:110}];
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
    if (courses.length) {
      const courseSheet = XLSX.utils.aoa_to_sheet([
        ['Course Name', 'Academic Year'],
        ...courses.map(course => [course.title || course.name || '', course.academicYear || '']),
      ]);
      courseSheet['!cols'] = [{wch:55}, {wch:20}];
      XLSX.utils.book_append_sheet(workbook, courseSheet, 'Available Courses');
    }
    XLSX.writeFile(workbook, 'student-upload-template.xlsx');
  });
}

function ImportStudentsModal({ courses = [], onClose, onImport, importing, report }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    setParseError('');
    setRows([]);
    setFileName(file?.name || '');
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
      if (!rawRows.length) {
        setParseError('The selected sheet has no student rows.');
        return;
      }
      const mappedRows = mapStudentRows(rawRows).map((student, index) => ({ ...student, _rowNumber: index + 2 }))
        .filter((student) => Object.keys(student).some((key) => key !== '_rowNumber' && student[key]));
      setRows(mappedRows);
      if (!mappedRows.length) setParseError('No usable student rows were found. Check that the first row contains column headings.');
    } catch {
      setParseError('This file could not be read. Use an .xlsx, .xls, or .csv file.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box student-import-modal" role="dialog" aria-modal="true" aria-labelledby="student-import-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><span className="student-import-kicker">BULK ENROLLMENT</span><h2 className="modal-title" id="student-import-title">Upload student list</h2></div>
          <button type="button" className="modal-close" aria-label="Close upload dialog" onClick={onClose}>×</button>
        </div>
        <div className="modal-body student-import-body">
          <p className="student-import-intro">Choose an Excel workbook or CSV file. Each valid row creates a student account using the Student ID sign-in flow.</p>
          <button type="button" className="student-template-button" onClick={() => downloadStudentTemplate(courses).catch(() => setParseError('The template could not be downloaded. Please try again.'))}><span aria-hidden="true">↓</span> Download Excel template</button>
          <label className="student-file-drop">
            <span className="student-file-icon" aria-hidden="true">↑</span>
            <strong>{fileName || 'Choose a student spreadsheet'}</strong>
            <small>.xlsx, .xls, or .csv</small>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </label>
          <div className="student-import-requirements"><strong>Required columns</strong><span>{STUDENT_REQUIRED_FIELDS.map(field => field.label).join(' · ')}</span></div>
          <div className="student-import-requirements"><strong>Optional columns</strong><span>{STUDENT_IMPORT_FIELDS.filter(field => !field.required).map(field => field.label).join(' · ')}</span></div>
          <p className="student-import-intro">Student IDs are assigned automatically. Use an existing course from the Available Courses sheet. Replace the example row before uploading.</p>
          {rows.length > 0 && !report && <div className="student-import-preview" role="status">{rows.length} student {rows.length === 1 ? 'row' : 'rows'} ready to import.</div>}
          {parseError && <div className="student-import-error" role="alert">{parseError}</div>}
          {report && (
            <div className="student-import-report" role="status">
              <strong>{report.successCount} of {report.total} student rows imported.</strong>
              {report.errors.length > 0 && <ul>{report.errors.slice(0, 8).map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}</ul>}
              {report.errors.length > 8 && <small>And {report.errors.length - 8} more row errors.</small>}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{report ? 'Close' : 'Cancel'}</button>
          {!report && <button type="button" className="btn btn-primary" disabled={!rows.length || importing} onClick={() => onImport(rows)}>{importing ? 'Importing…' : `Import ${rows.length || ''} students`}</button>}
        </div>
      </div>
    </div>
  );
}

export default function StudentMgmt() {
  const [students, setStudents]     = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch] = usePageSearch();
  const [filterStatus, setFilter]   = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [page, setPage]             = useState(1);
  useEffect(() => { setPage(1); }, [search]);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(false);

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const response = await api.get('/courses', { params: { limit: 100 } });
      const records = response.data?.data || response.data?.courses || response.data;
      if (Array.isArray(records)) setCourses(records.filter(course => course.status !== 'inactive' && course.status !== 'archived' && course.isActive !== false));
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const fetchEnrollments = useCallback(async () => {
    try {
      const response = await api.get('/enrollments', { params: { limit: 100 } });
      const records = response.data?.data || [];
      setEnrollments(Array.isArray(records) ? records : []);
    } catch {
      setEnrollments([]);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', { params: { limit: 100 } });
      const records = res.data?.data || res.data?.students;
      if (Array.isArray(records)) {
        setStudents(records.map((record) => ({
          ...record,
          name: record.user?.name || record.name || '',
          email: record.user?.email || record.email || '',
          academicYear: record.academicYear || '',
        })));
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchEnrollments();
  }, [fetchStudents, fetchCourses, fetchEnrollments]);

  const getStudentEnrollment = (student) => enrollments.find((enrollment) => {
    const enrolledStudentId = enrollment.student?._id || enrollment.student;
    return String(enrolledStudentId) === String(student._id) && enrollment.status !== 'dropped';
  });

  const getStudentAcademicYear = (student) => student.academicYear || getStudentEnrollment(student)?.academicYear || '';
  const academicYears = [...new Set([
    ...students.map(getStudentAcademicYear),
    ...enrollments.map((enrollment) => enrollment.academicYear),
  ].filter(Boolean))].sort((left, right) => String(right).localeCompare(String(left), undefined, { numeric: true }));

  const getStudentCourseName = (student) => {
    const enrollment = getStudentEnrollment(student);
    const course = enrollment?.course;
    return typeof course === 'object' && course
      ? course.title || course.name || 'Course'
      : courses.find((item) => String(item._id) === String(course))?.title || student.courseName || student.program || '—';
  };

  const filtered = students.filter(s => {
    const matchSearch = matchesPageSearch(search, s.name, s.studentId, s.email, s.phone, s.address, s.academicYear, getStudentCourseName(s));
    const matchStatus = !filterStatus || s.status === filterStatus;
    const enrollment = getStudentEnrollment(s);
    const enrolledCourseId = enrollment?.course?._id || enrollment?.course || '';
    const enrolledYear = getStudentAcademicYear(s);
    const matchCourse = !filterCourse || String(enrolledCourseId) === String(filterCourse);
    const matchAcademicYear = !filterAcademicYear || String(enrolledYear) === String(filterAcademicYear);
    return matchSearch && matchStatus && matchCourse && matchAcademicYear;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form) => {
    const selectedCourse = courses.find(course => String(course._id) === String(form.course));
    const academicYear = form.academicYear || selectedCourse?.academicYear || String(new Date().getFullYear());
    const { course: courseId, ...studentFields } = form;
    delete studentFields.studentId;
    studentFields.academicYear = academicYear;
    let studentId = editTarget?._id;

    if (editTarget?._id && !String(editTarget._id).startsWith('s')) {
      await api.put(`/students/${editTarget._id}`, studentFields);
    } else {
      const response = await api.post('/users/students', studentFields);
      studentId = response.data?.data?.student?._id || response.data?.student?._id;
      if (!studentId) throw new Error('Student was created, but the server did not return a student ID.');
    }

    const existingEnrollment = enrollments.find((enrollment) => String(enrollment.student?._id || enrollment.student) === String(studentId) && enrollment.status !== 'dropped');
    const enrollmentPayload = {
      student: studentId,
      course: courseId,
      academicYear,
      semester: selectedCourse?.semester || '',
      status: 'enrolled',
    };
    if (existingEnrollment?._id) await api.put(`/enrollments/${existingEnrollment._id}`, enrollmentPayload);
    else await api.post('/enrollments', enrollmentPayload);

    await Promise.all([fetchStudents(), fetchEnrollments()]);
    setShowModal(false);
    setEditTarget(null);
  };

  const handleImport = async (rows) => {
    setImporting(true);
    const errors = [];
    let successCount = 0;
    try {
      for (const student of rows) {
        const { _rowNumber: row, ...payload } = student;
        const missing = STUDENT_REQUIRED_FIELDS.filter(field => !String(payload[field.key] || '').trim()).map(field => field.label);
        if (missing.length) {
          errors.push({ row, message: `Missing ${missing.join(', ')}.` });
          continue;
        }
        payload.gender = String(payload.gender).trim().toLowerCase();
        if (!['male', 'female'].includes(payload.gender)) {
          errors.push({ row, message: 'Gender must be male or female.' });
          continue;
        }
        try {
          const selectedCourse = courses.find(course => [course._id, course.courseCode, course.title, course.name].some(value => String(value || '').trim().toLowerCase() === String(payload.course).trim().toLowerCase()));
          if (!selectedCourse) {
            errors.push({ row, message: `Course "${payload.course}" was not found. Use a course name from the course list.` });
            continue;
          }
          const { course: ignoredCourse, ...studentPayload } = payload;
          delete studentPayload.studentId;
          studentPayload.academicYear = studentPayload.academicYear || selectedCourse.academicYear || new Intl.DateTimeFormat('en-US', {timeZone:'Africa/Nairobi', year:'numeric'}).format(new Date());
          studentPayload.status = String(studentPayload.status || 'active').trim().toLowerCase();
          if (!STUDENT_FIELDS.find(field => field.key === 'status').options.includes(studentPayload.status)) { errors.push({ row, message: 'Status must be active, inactive, graduated or suspended.' }); continue; }
          const response = await api.post('/users/students', studentPayload);
          const createdStudentId = response.data?.data?.student?._id || response.data?.student?._id;
          if (!createdStudentId) throw new Error('Student was created, but the server did not return its ID.');
          await api.post('/enrollments', {
            student: createdStudentId,
            course: selectedCourse._id,
            academicYear: studentPayload.academicYear,
            semester: selectedCourse.semester || '',
            status: 'enrolled',
          });
          successCount += 1;
        } catch (error) {
          errors.push({ row, message: error.response?.data?.message || error.message || 'Student could not be created.' });
        }
      }
      setImportReport({ total: rows.length, successCount, errors });
      if (successCount) {
        setPage(1);
        await Promise.all([fetchStudents(), fetchEnrollments()]);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteTarget._id}`);
      await fetchStudents();
    } catch {
      setStudents(prev => prev.filter(s => s._id !== deleteTarget._id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="page-header student-management-header">
        <div className="student-management-actions">
        <button type="button" className="btn btn-sm btn-secondary student-view-toggle" aria-pressed={showAllDetails} onClick={() => setShowAllDetails(current => !current)}>
          {showAllDetails ? 'Show less' : 'View all details'}
        </button>
        <button type="button" className="btn btn-secondary student-upload-trigger" onClick={() => { setImportReport(null); setShowImportModal(true); }}>
          <span aria-hidden="true">↑</span> Upload Excel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
          + Add Student
        </button>
        </div>
      </div>

      <div className="card student-management-panel">
        <div className="card-header">
          <div className="student-list-heading">
            <span className="student-section-kicker">STUDENT RECORDS</span>
            <span className="card-title">Students <span className="student-total-count">{filtered.length}</span></span>
          </div>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <select aria-label="Filter students by course" className="form-control student-filter-select" value={filterCourse} onChange={event => { setFilterCourse(event.target.value); setPage(1); }}>
              <option value="">All courses</option>
              {courses.map(course => <option key={course._id} value={course._id}>{course.title || course.name || 'Course'}</option>)}
            </select>
            <select aria-label="Filter students by status" className="form-control student-filter-select" value={filterStatus} onChange={event => { setFilter(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="suspended">Suspended</option>
            </select>
            <select aria-label="Filter students by academic year" className="form-control student-filter-select" value={filterAcademicYear} onChange={event => { setFilterAcademicYear(event.target.value); setPage(1); }}>
              <option value="">All academic years</option>
              {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <h3>No students found</h3>
            <p>Try adjusting your search or add a new student.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table student-management-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Course</th>
                  <th>Batch / Year</th>
                  <th>Status</th>
                  {showAllDetails && <><th>Student ID</th><th>Email</th><th>Gender</th><th>Address</th><th>Semester</th></>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => (
                  <tr key={s._id}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td><div className="student-record-person"><span aria-hidden="true">{(s.name || 'S').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><strong>{s.name || 'Student'}</strong></div></td>
                    <td>{s.phone || '—'}</td>
                    <td><span className="student-course-tag">{getStudentCourseName(s)}</span></td>
                    <td>{getStudentAcademicYear(s) || '—'}</td>
                    <td>
                      <span className={`student-record-status ${s.status === 'active' ? 'is-active' : ''}`}><i aria-hidden="true" />
                        {s.status || 'active'}
                      </span>
                    </td>
                    {showAllDetails && <><td><code>{s.studentId || '—'}</code></td><td>{s.email || '—'}</td><td>{s.gender || '—'}</td><td>{s.address || '—'}</td><td>{getStudentEnrollment(s)?.semester || '—'}</td></>}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="student-row-edit" onClick={() => { const enrollment = getStudentEnrollment(s); setEditTarget({ ...s, course: enrollment?.course?._id || enrollment?.course || '' }); setShowModal(true); }}>Edit</button>
                        <button type="button" className="student-row-delete" aria-label={`Delete ${s.name || 'student'}`} onClick={() => setDeleteTarget(s)}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="pagination">
          <span className="page-info">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <CrudModal
          title={editTarget ? 'Edit Student' : 'Add New Student'}
          fields={STUDENT_FIELDS}
          initial={editTarget || {}}
          courses={courses}
          coursesLoading={coursesLoading}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      {showImportModal && (
        <ImportStudentsModal
          courses={courses}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importing}
          report={importReport}
        />
      )}
    </>
  );
}
