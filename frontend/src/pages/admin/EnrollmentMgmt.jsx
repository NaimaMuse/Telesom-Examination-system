import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PLACEHOLDER_COURSES  = ['CS101','CS201','BUS101','ENG101'];
const PLACEHOLDER_STUDENTS = ['STU-001 - Ahmed Ali','STU-002 - Faadumo Abdi','STU-003 - Mohamed Osman'];

const PLACEHOLDER_ENROLLMENTS = [
  { _id:'e1', student:'Ahmed Ali Hassan',   studentId:'STU-001', course:'Introduction to Programming', courseCode:'CS101', semester:'Semester 1', status:'enrolled' },
  { _id:'e2', student:'Faadumo Abdi',       studentId:'STU-002', course:'Principles of Business',     courseCode:'BUS101', semester:'Semester 1', status:'enrolled' },
  { _id:'e3', student:'Mohamed Osman',      studentId:'STU-003', course:'Data Structures',            courseCode:'CS201', semester:'Semester 2', status:'enrolled' },
];

const PAGE_SIZE = 8;

function EnrollModal({ onSave, onClose }) {
  const [form, setForm] = useState({ studentId:'', courseCode:'', semester:'' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async(e) => { e.preventDefault(); setSaving(true); try { await onSave(form); } finally { setSaving(false); } };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Enroll Student</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Student ID *</label>
              <input className="form-control" type="text" required value={form.studentId} onChange={e=>setForm(p=>({...p,studentId:e.target.value}))} placeholder="e.g. STU-001"/>
            </div>
            <div className="form-group">
              <label className="form-label">Course Code *</label>
              <input className="form-control" type="text" required value={form.courseCode} onChange={e=>setForm(p=>({...p,courseCode:e.target.value}))} placeholder="e.g. CS101"/>
            </div>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <input className="form-control" type="text" value={form.semester} onChange={e=>setForm(p=>({...p,semester:e.target.value}))} placeholder="e.g. Semester 1"/>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Enrolling…':'Enroll'}</button>
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
        <div className="modal-body confirm-content"><div className="confirm-icon">⚠️</div><h3>Confirm</h3><p>{message}</p></div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onCancel}>Cancel</button><button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading?'Removing…':'Remove'}</button></div>
      </div>
    </div>
  );
}

export default function EnrollmentMgmt() {
  const [enrollments, setEnrollments] = useState(PLACEHOLDER_ENROLLMENTS);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [showModal, setShowModal]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const fetchEnrollments = useCallback(async()=>{
    setLoading(true);
    try{const res=await api.get('/admin/enrollments');if(res.data?.enrollments)setEnrollments(res.data.enrollments);}catch{}finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchEnrollments();},[fetchEnrollments]);

  const filtered   = enrollments.filter(e=>!search||[e.student,e.studentId,e.course,e.courseCode].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const handleSave = async(form)=>{
    try{await api.post('/admin/enrollments',form);await fetchEnrollments();}
    catch{setEnrollments(prev=>[...prev,{...form,_id:`e${Date.now()}`,student:form.studentId,course:form.courseCode,status:'enrolled'}]);}
    setShowModal(false);
  };

  const handleRemove = async()=>{
    setDeleting(true);
    try{await api.delete(`/admin/enrollments/${deleteTarget._id}`);await fetchEnrollments();}
    catch{setEnrollments(prev=>prev.filter(e=>e._id!==deleteTarget._id));}
    finally{setDeleting(false);setDeleteTarget(null);}
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Student Enrollment</h1><p>Manage course enrollments</p></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Enroll Student</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Enrollments ({filtered.length})</span>
          <div className="search-input-wrap">
            <span style={{color:'var(--text-muted)'}}>🔍</span>
            <input placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :paginated.length===0?<div className="empty-state"><div className="empty-state-icon">📋</div><h3>No enrollments found</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Student</th><th>Student ID</th><th>Course</th><th>Code</th><th>Semester</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginated.map((e,i)=>(
                  <tr key={e._id}>
                    <td>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td style={{fontWeight:600}}>{e.student}</td>
                    <td><code>{e.studentId}</code></td>
                    <td>{e.course}</td>
                    <td><span className="badge badge-info">{e.courseCode}</span></td>
                    <td>{e.semester||'—'}</td>
                    <td><span className={`badge badge-${e.status==='enrolled'?'success':'muted'}`}>{e.status}</span></td>
                    <td><button className="btn btn-sm btn-danger" onClick={()=>setDeleteTarget(e)}>Remove</button></td>
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

      {showModal&&<EnrollModal onSave={handleSave} onClose={()=>setShowModal(false)}/>}
      {deleteTarget&&<ConfirmModal message={`Remove enrollment for "${deleteTarget.student}" in "${deleteTarget.course}"?`} onConfirm={handleRemove} onCancel={()=>setDeleteTarget(null)} loading={deleting}/>}
    </>
  );
}
