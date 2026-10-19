import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const TEACHER_FIELDS = [
  { key: 'name', label: 'Full Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
];

const PLACEHOLDER_TEACHERS = [
  { _id:'t1', name:'Dr. Abdullahi Said',   email:'abdullahi@telesom.edu', phone:'+252 61 000 1001', department:'Computer Science', subjects:'Algorithms, Data Structures', status:'active' },
  { _id:'t2', name:'Ms. Farhia Adan',      email:'farhia@telesom.edu',    phone:'+252 61 000 1002', department:'Business',         subjects:'Economics, Finance',          status:'active' },
  { _id:'t3', name:'Mr. Hassan Mohamud',   email:'hassan@telesom.edu',    phone:'+252 61 000 1003', department:'Engineering',      subjects:'Mathematics, Physics',         status:'active' },
];

function CrudModal({ title, fields, initial, courses, coursesLoading, onSave, onClose }) {
  const [form, setForm] = useState({ course: '', ...(initial || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await onSave(form); }
    catch (saveError) { setError(saveError.message || 'Teacher could not be saved.'); }
    finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{title}</span><button type="button" className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              {fields.map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}{f.required && ' *'}</label>
                  {f.type === 'course'
                    ? <select className="form-control" required value={form.course||''} disabled={coursesLoading || courses.length === 0} onChange={e=>setForm(p=>({...p,course:e.target.value}))}><option value="">{coursesLoading ? 'Loading courses…' : courses.length ? 'Select a course' : 'No courses available'}</option>{courses.map(course=><option key={course._id} value={course._id}>{course.courseCode ? `${course.courseCode} · ` : ''}{course.title || course.name}</option>)}</select>
                    : f.type === 'select'
                    ? <select className="form-control" value={form[f.key]||''} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}><option value="">Select…</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>
                    : <input className="form-control" type={f.type} required={f.required} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                  }
                </div>
              ))}
            </div>
          </div>
          {error && <div className="teacher-create-error" role="alert">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || coursesLoading || courses.length === 0}>{saving?'Saving…':'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
        <div className="modal-body confirm-content"><div className="confirm-icon">⚠️</div><h3>Confirm Delete</h3><p>{message}</p></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading?'Deleting…':'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

function TeacherCredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');

  const copyValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setCopyError('');
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopyError('Copy is unavailable here. Select the value and copy it manually.');
    }
  };

  const credentialRows = [
    ['Email address', credentials.email],
    ['Teacher ID', credentials.teacherId],
    ['Temporary password', credentials.temporaryPassword],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-box teacher-credentials-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-credentials-title" onClick={event => event.stopPropagation()}>
        <header className="modal-header teacher-credentials-header">
          <div>
            <span className="teacher-credentials-kicker">ACCOUNT READY</span>
            <h2 className="modal-title" id="teacher-credentials-title">Teacher sign-in details</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close credentials" onClick={onClose}>×</button>
        </header>
        <div className="modal-body teacher-credentials-body">
          <div className="teacher-credentials-success"><span aria-hidden="true">✓</span><p><strong>{credentials.name}</strong> can now sign in with these details.</p></div>
          <section className="teacher-credential-section" aria-label="Sign-in credentials">
            <h3>Sign-in credentials</h3>
            <div className="teacher-credential-list">
              {credentialRows.map(([label, value]) => (
                <div className={`teacher-credential-row ${label === 'Temporary password' ? 'password' : ''}`} key={label}>
                  <div><span>{label}</span><strong>{value}</strong></div>
                  <button type="button" className="teacher-credential-copy" onClick={() => copyValue(label, value)} aria-label={`Copy ${label}`}>
                    {copied === label ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
            <p className="teacher-credential-hint">The teacher should change the temporary password after their first sign-in.</p>
          </section>
          <section className={`teacher-course-assignment ${credentials.warning ? 'has-warning' : ''}`} aria-label="Course assignment">
            <span className="teacher-course-assignment-icon" aria-hidden="true">{credentials.warning ? '!' : '▤'}</span>
            <div><span>Assigned course</span><strong>{credentials.course || 'Not assigned'}</strong></div>
            <span className="teacher-course-assignment-status">{credentials.warning ? 'Needs attention' : 'Assigned'}</span>
          </section>
          {credentials.warning && <p className="teacher-assignment-warning" role="alert">{credentials.warning}</p>}
          {copyError && <p className="teacher-credential-copy-error" role="alert">{copyError}</p>}
        </div>
        <footer className="modal-footer teacher-credentials-footer">
          <span>Share these details privately with the teacher.</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}

const PAGE_SIZE = 8;

export default function TeacherMgmt() {
  const [teachers, setTeachers] = useState(PLACEHOLDER_TEACHERS);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teachers', { params: { limit: 100 } });
      const records = res.data?.data || res.data?.teachers;
      if (Array.isArray(records)) setTeachers(records.map((record) => ({
        ...record,
        name: record.user?.name || record.name || '',
        email: record.user?.email || record.email || '',
        subjects: record.specialization || record.subjects || '',
      })));
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const response = await api.get('/courses', { params: { limit: 100, status: 'active' } });
      const rows = response.data?.data || response.data?.courses || [];
      setCourses(Array.isArray(rows) ? rows.filter((course) => course.isActive !== false && course.status !== 'inactive') : []);
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const filtered   = teachers;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const handleSave = async (form) => {
    if (editTarget && !String(editTarget._id).startsWith('t')) {
      await api.put(`/teachers/${editTarget._id}`, {
        phone: form.phone,
        department: editTarget.department,
        specialization: editTarget.subjects,
      });
      await fetchTeachers();
      setShowModal(false);
      setEditTarget(null);
      return;
    }

    const temporaryPassword = Array.from(crypto.getRandomValues(new Uint8Array(18)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'[value % 68]).join('');
    const teacherId = `TCH-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
    const course = courses.find((item) => item._id === form.course);
    const response = await api.post('/users/teachers', {
      name: form.name,
      email: form.email,
      phone: form.phone,
      teacherId,
      password: temporaryPassword,
    });
    const teacher = response.data?.data?.teacher;
    if (!teacher?._id) throw new Error('Teacher was created but the server did not return its profile ID.');

    let assignmentWarning = '';
    try {
      await api.post('/course-teachers', {
        teacher: teacher._id,
        course: course._id,
        academicYear: course.academicYear || String(new Date().getFullYear()),
        semester: course.semester || undefined,
        role: 'lead',
        isPrimary: true,
        status: 'active',
      });
    } catch (assignmentError) {
      assignmentWarning = assignmentError.response?.data?.message || 'The teacher was created, but the selected course could not be assigned.';
    }

    setCreatedCredentials({ name: form.name, email: form.email, teacherId, temporaryPassword, course: course.title || course.name, warning: assignmentWarning });
    await fetchTeachers();
    setShowModal(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/admin/teachers/${deleteTarget._id}`); await fetchTeachers(); }
    catch { setTeachers(prev=>prev.filter(t=>t._id!==deleteTarget._id)); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Teachers ({filtered.length})</span>
          <div className="teacher-list-tools">
            <button type="button" className="btn btn-primary" onClick={()=>{setEditTarget(null);setShowModal(true);}}>+ Add Teacher</button>
          </div>
        </div>

        {loading ? <div className="spinner-wrap"><div className="spinner"/></div>
          : paginated.length===0 ? <div className="empty-state"><div className="empty-state-icon">👨‍🏫</div><h3>No teachers yet</h3><p>Add a teacher to get started.</p></div>
          : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Department</th><th>Subjects</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginated.map((t,i)=>(
                  <tr key={t._id}>
                    <td>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td style={{fontWeight:600}}>{t.name}</td>
                    <td>{t.email}</td>
                    <td>{t.department||'—'}</td>
                    <td style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{t.subjects||'—'}</td>
                    <td><span className={`badge badge-${t.status==='active'?'success':'muted'}`}>{t.status||'active'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="btn btn-sm btn-secondary" onClick={()=>{setEditTarget(t);setShowModal(true);}}>✏️ Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={()=>setDeleteTarget(t)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span className="page-info">Showing {Math.min((page-1)*PAGE_SIZE+1,filtered.length)}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
          <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
          {Array.from({length:totalPages},(_,i)=><button key={i} className={`page-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>)}
          <button className="page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
        </div>
      </div>

      {showModal && <CrudModal title={editTarget?'Edit Teacher':'Add New Teacher'} fields={editTarget ? TEACHER_FIELDS : [...TEACHER_FIELDS, { key: 'course', label: 'Course', type: 'course', required: true }]} initial={editTarget||{}} courses={courses} coursesLoading={coursesLoading} onSave={handleSave} onClose={()=>{setShowModal(false);setEditTarget(null);}} />}
      {deleteTarget && <ConfirmModal message={`Delete "${deleteTarget.name}"?`} onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting} />}
      {createdCredentials && <TeacherCredentialsModal credentials={createdCredentials} onClose={() => setCreatedCredentials(null)} />}
    </>
  );
}
