import { usePageSearch } from '../../context/PageSearchContext';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PLACEHOLDER_COURSES = ['CS101','CS201'];
const PLACEHOLDER_NOTES = [
  { _id:'n1', title:'Week 1 – Python Basics',   course:'CS101', filename:'week1_python.pdf',   size:'1.2 MB', uploadedAt:'2026-10-01' },
  { _id:'n2', title:'Week 2 – Control Flow',    course:'CS101', filename:'week2_control.pdf',  size:'980 KB', uploadedAt:'2026-10-08' },
  { _id:'n3', title:'Week 1 – Arrays & Lists',  course:'CS201', filename:'week1_arrays.pdf',   size:'1.5 MB', uploadedAt:'2026-10-03' },
];

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

export default function TeacherNotes() {
  const [notes, setNotes]         = useState(PLACEHOLDER_NOTES);
  const [loading, setLoading]     = useState(false);
  const [selCourse, setSelCourse] = useState('');
  const [title, setTitle]         = useState('');
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [search, setSearch] = usePageSearch();

  const fetchNotes = useCallback(async()=>{
    setLoading(true);
    try{const res=await api.get('/teacher/notes');if(res.data?.notes)setNotes(res.data.notes);}catch{}finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchNotes();},[fetchNotes]);

  const filtered = notes.filter(n=>{
    const matchCourse = !selCourse||n.course===selCourse;
    const matchSearch = !search||n.title?.toLowerCase().includes(search.toLowerCase());
    return matchCourse&&matchSearch;
  });

  const handleUpload = async(e)=>{
    e.preventDefault();
    if(!title||!selCourse) return alert('Please select a course and add a title.');
    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('course', selCourse);
    if(file) formData.append('file', file);
    try{
      await api.post('/teacher/notes', formData, { headers: { 'Content-Type':'multipart/form-data' } });
      await fetchNotes();
    }catch{
      setNotes(prev=>[...prev,{
        _id:`n${Date.now()}`, title, course:selCourse,
        filename:file?.name||'document.pdf',
        size:file?`${(file.size/1024).toFixed(0)} KB`:'—',
        uploadedAt:new Date().toISOString().split('T')[0],
      }]);
    }
    setTitle('');setFile(null);setUploading(false);
  };

  const handleDelete=async()=>{
    setDeleting(true);
    try{await api.delete(`/teacher/notes/${deleteTarget._id}`);}
    catch{setNotes(prev=>prev.filter(n=>n._id!==deleteTarget._id));}
    finally{setDeleting(false);setDeleteTarget(null);}
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Study Notes</h1><p>Upload and manage study materials for your courses</p></div>
      </div>

      {/* Upload panel */}
      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div className="card-header"><span className="card-title">Upload New Note / Document</span></div>
        <div className="card-body">
          <form onSubmit={handleUpload}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Select Course *</label>
                <select className="form-control" value={selCourse} onChange={e=>setSelCourse(e.target.value)} required>
                  <option value="">Choose course…</option>
                  {PLACEHOLDER_COURSES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Note Title *</label>
                <input className="form-control" type="text" placeholder="e.g. Week 3 – Variables" value={title} onChange={e=>setTitle(e.target.value)} required/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">File (PDF, DOCX, PPT)</label>
              <input className="form-control" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e=>setFile(e.target.files[0])}/>
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? '⏳ Uploading…' : '📤 Upload Note'}
            </button>
          </form>
        </div>
      </div>

      {/* Uploaded notes */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Uploaded Notes ({filtered.length})</span>
          <div className="filter-bar" style={{marginBottom:0}}>
            <div className="search-input-wrap">
              <span style={{color:'var(--text-muted)'}}>🔍</span>
              <input placeholder="Search notes…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
              <option value="">All Courses</option>
              {PLACEHOLDER_COURSES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="spinner-wrap"><div className="spinner"/></div>
          : filtered.length===0 ? <div className="empty-state"><div className="empty-state-icon">📄</div><h3>No notes uploaded</h3><p>Upload your first study note above.</p></div>
          : (
          <div className="card-body" style={{padding:'1rem 1.4rem'}}>
            {filtered.map(n=>(
              <div key={n._id} className="note-card">
                <div className="note-icon">📄</div>
                <div className="note-info">
                  <h4>{n.title}</h4>
                  <p>{n.filename} • {n.size} • {n.course} • Uploaded {n.uploadedAt}</p>
                </div>
                <div className="note-actions">
                  <button className="btn btn-sm btn-secondary">⬇️ Download</button>
                  <button className="btn btn-sm btn-danger btn-icon" onClick={()=>setDeleteTarget(n)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget&&<ConfirmModal message={`Delete note "${deleteTarget.title}"?`} onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting}/>}
    </>
  );
}
