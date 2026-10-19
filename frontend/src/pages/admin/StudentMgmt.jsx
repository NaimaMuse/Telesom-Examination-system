/**
 * Shared CRUD page factory for management pages.
 * Provides: search, pagination, add/edit modal, delete confirm.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ─────────────────── STUDENT MANAGEMENT ────────────────────────
const STUDENT_FIELDS = [
  { key: 'name',      label: 'Full Name',   type: 'text',     required: true },
  { key: 'studentId', label: 'Student ID',  type: 'text',     required: true },
  { key: 'email',     label: 'Email',       type: 'email',    required: true },
  { key: 'gender',    label: 'Gender',      type: 'select', options: ['male', 'female'], required: true },
  { key: 'phone',     label: 'Phone',       type: 'tel'  },
  { key: 'program',   label: 'Program',     type: 'text' },
  { key: 'year',      label: 'Year / Level',type: 'text' },
  { key: 'status',    label: 'Status',      type: 'select', options: ['active','inactive','graduated','suspended'] },
];

const PLACEHOLDER_STUDENTS = [
  { _id:'s1', name:'Ahmed Ali Hassan',     studentId:'STU-001', email:'ahmed@telesom.edu',    phone:'+252 61 000 0001', program:'Computer Science', year:'Year 2', status:'active' },
  { _id:'s2', name:'Faadumo Abdi Warsame',studentId:'STU-002', email:'faadumo@telesom.edu',  phone:'+252 61 000 0002', program:'Business Admin',  year:'Year 1', status:'active' },
  { _id:'s3', name:'Mohamed Osman Jama',  studentId:'STU-003', email:'mohamed@telesom.edu',  phone:'+252 61 000 0003', program:'Engineering',     year:'Year 3', status:'active' },
  { _id:'s4', name:'Hodan Yusuf Ibrahim', studentId:'STU-004', email:'hodan@telesom.edu',    phone:'+252 61 000 0004', program:'Nursing',         year:'Year 2', status:'inactive' },
];

function CrudModal({ title, fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);

  const handleChange = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
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
                  {f.type === 'select' ? (
                    <select className="form-control" value={form[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-control"
                      type={f.type}
                      required={f.required}
                      value={form[f.key] || ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
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

const STUDENT_TEMPLATE_COLUMNS = [
  'Full Name', 'Email', 'Student ID', 'Gender', 'Phone', 'Date of Birth',
  'Address', 'Guardian Name', 'Guardian Phone', 'Academic Year',
];

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
  gender: 'gender',
  sex: 'gender',
  phone: 'phone',
  phonenumber: 'phone',
  dateofbirth: 'dateOfBirth',
  dob: 'dateOfBirth',
  address: 'address',
  guardianname: 'guardianName',
  guardianphone: 'guardianPhone',
  academicyear: 'academicYear',
  year: 'academicYear',
};

function mapStudentRows(rows) {
  return rows.map((row) => Object.entries(row).reduce((student, [header, value]) => {
    const key = STUDENT_COLUMN_MAP[normalizeHeader(header)];
    if (key && value !== undefined && value !== null) student[key] = String(value).trim();
    return student;
  }, {}));
}

function downloadStudentTemplate() {
  return import('xlsx').then((XLSX) => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    STUDENT_TEMPLATE_COLUMNS,
    ['Amina Hassan', 'amina@example.com', 'STU-2026-001', 'female', '+252 61 1234567', '2005-04-12', 'Hargeisa', 'Hassan Ali', '+252 61 7654321', '2026'],
  ]);
  worksheet['!cols'] = STUDENT_TEMPLATE_COLUMNS.map((column) => ({ wch: Math.max(column.length + 4, 18) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  XLSX.writeFile(workbook, 'student-upload-template.xlsx');
  });
}

function ImportStudentsModal({ onClose, onImport, importing, report }) {
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
          <button type="button" className="student-template-button" onClick={downloadStudentTemplate}><span aria-hidden="true">↓</span> Download Excel template</button>
          <label className="student-file-drop">
            <span className="student-file-icon" aria-hidden="true">↑</span>
            <strong>{fileName || 'Choose a student spreadsheet'}</strong>
            <small>.xlsx, .xls, or .csv</small>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </label>
          <div className="student-import-requirements"><strong>Required columns</strong><span>Full Name · Email · Student ID · Gender (male or female)</span></div>
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
  const [students, setStudents]     = useState(PLACEHOLDER_STUDENTS);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('');
  const [page, setPage]             = useState(1);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);

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
          year: record.academicYear || record.year || '',
        })));
      }
    } catch {
      // keep placeholder
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = students.filter(s => {
    const matchSearch = !search || [s.name, s.studentId, s.email].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form) => {
    try {
      if (editTarget?._id && !editTarget._id.startsWith('s')) {
        await api.put(`/students/${editTarget._id}`, form);
      } else {
        await api.post('/users/students', form);
      }
      await fetchStudents();
    } catch {
      // optimistic local update for placeholder mode
      if (editTarget) {
        setStudents(prev => prev.map(s => s._id === editTarget._id ? { ...s, ...form } : s));
      } else {
        setStudents(prev => [...prev, { ...form, _id: `s${Date.now()}` }]);
      }
    }
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
        const missing = ['name', 'email', 'studentId', 'gender'].filter((field) => !String(payload[field] || '').trim());
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
          await api.post('/users/students', payload);
          successCount += 1;
        } catch (error) {
          errors.push({ row, message: error.response?.data?.message || 'Student could not be created.' });
        }
      }
      setImportReport({ total: rows.length, successCount, errors });
      if (successCount) {
        setPage(1);
        await fetchStudents();
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/students/${deleteTarget._id}`);
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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Student Management</h1>
          <p>Add, edit, and manage student records</p>
        </div>
        <div className="student-management-actions">
        <button type="button" className="btn btn-secondary student-upload-trigger" onClick={() => { setImportReport(null); setShowImportModal(true); }}>
          <span aria-hidden="true">↑</span> Upload Excel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => { setEditTarget(null); setShowModal(true); }}>
          + Add Student
        </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Students ({filtered.length})</span>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <div className="search-input-wrap">
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input placeholder="Search students…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={filterStatus} onChange={e => { setFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="suspended">Suspended</option>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Program</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, i) => (
                  <tr key={s._id}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><code>{s.studentId}</code></td>
                    <td>{s.email}</td>
                    <td>{s.program || '—'}</td>
                    <td>{s.year || '—'}</td>
                    <td>
                      <span className={`badge badge-${s.status === 'active' ? 'success' : s.status === 'graduated' ? 'info' : 'muted'}`}>
                        {s.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setEditTarget(s); setShowModal(true); }}>✏️ Edit</button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(s)}>🗑️</button>
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
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importing={importing}
          report={importReport}
        />
      )}
    </>
  );
}
