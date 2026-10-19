import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const COURSE_FIELDS = [
  { key: 'name',        label: 'Course Name',   type: 'text',   required: true },
  { key: 'credits',     label: 'Credit Hours',  type: 'number', required: true },
  { key: 'description', label: 'Description',   type: 'text' },
  { key: 'status',      label: 'Status',        type: 'select', options: ['active', 'inactive', 'archived'] },
];

const PLACEHOLDER_COURSES = [
  { _id:'c1', name:'Introduction to Programming',       credits:3, description:'Fundamentals of programming and algorithms.', status:'active' },
  { _id:'c2', name:'Data Structures & Algorithms',       credits:3, description:'Arrays, lists, trees, and graphs.',          status:'active' },
  { _id:'c3', name:'Principles of Business Management',  credits:3, description:'Business operations and ethics.',             status:'active' },
  { _id:'c4', name:'Engineering Mathematics',           credits:4, description:'Calculus, linear algebra and matrices.',      status:'active' },
];

function CrudModal({ title, fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial||{});
  const [saving, setSaving] = useState(false);
  const handleSubmit = async(e)=>{e.preventDefault();setSaving(true);try{await onSave(form);}finally{setSaving(false);}};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{title}</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              {fields.map(f=>(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}{f.required&&' *'}</label>
                  {f.type==='select'
                    ?<select className="form-control" value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}><option value="">Select…</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>
                    :<input className="form-control" type={f.type} required={f.required} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
                  }
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save'}</button>
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
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onCancel}>Cancel</button><button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading?'Deleting…':'Delete'}</button></div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 8;

export default function CourseMgmt() {
  const [courses, setCourses]     = useState(PLACEHOLDER_COURSES);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/courses');
      const data = res.data?.data || res.data?.courses || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setCourses(
          data.map((c) => ({
            _id: c._id,
            name: c.name || c.title,
            credits: c.credits,
            description: c.description || '',
            status: c.status || (c.isActive ? 'active' : 'inactive'),
          }))
        );
      }
    } catch {
      // Fallback to placeholder courses
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filtered = courses;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form) => {
    const payload = {
      name: form.name,
      title: form.name,
      credits: Number(form.credits) || 3,
      description: form.description || '',
      status: form.status || 'active',
    };

    try {
      if (editTarget && !String(editTarget._id).startsWith('c')) {
        await api.put(`/courses/${editTarget._id}`, payload);
      } else {
        await api.post('/courses', payload);
      }
      await fetchCourses();
    } catch {
      if (editTarget) {
        setCourses((prev) =>
          prev.map((c) => (c._id === editTarget._id ? { ...c, ...form } : c))
        );
      } else {
        setCourses((prev) => [
          ...prev,
          { ...form, _id: `c${Date.now()}` },
        ]);
      }
    }
    setShowModal(false);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget && !String(deleteTarget._id).startsWith('c')) {
        await api.delete(`/courses/${deleteTarget._id}`);
      }
      await fetchCourses();
    } catch {
      setCourses((prev) => prev.filter((c) => c._id !== deleteTarget._id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Courses ({filtered.length})</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditTarget(null);
              setShowModal(true);
            }}
          >
            + Add Course
          </button>
        </div>

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No courses found</h3>
            <p>Add a new course to get started.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Course Name</th>
                  <th>Credit Hours</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, i) => (
                  <tr key={c._id}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.credits ?? '—'}</td>
                    <td>{c.description || '—'}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          c.status === 'active'
                            ? 'success'
                            : c.status === 'archived'
                            ? 'muted'
                            : 'warning'
                        }`}
                      >
                        {c.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setEditTarget(c);
                            setShowModal(true);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteTarget(c)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span className="page-info">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
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
          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
        </div>
      </div>

      {showModal && (
        <CrudModal
          title={editTarget ? 'Edit Course' : 'Add New Course'}
          fields={COURSE_FIELDS}
          initial={editTarget || { status: 'active', credits: 3 }}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete course "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  );
}
