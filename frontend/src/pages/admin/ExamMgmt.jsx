import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const EXAM_FIELDS = [
  { key:'title',    label:'Title',       type:'text',   required:true },
  { key:'course',   label:'Course',      type:'text',   required:true },
  { key:'type',     label:'Type',        type:'select', options:['exam','quiz','assignment','midterm','final'], required:true },
  { key:'date',     label:'Date',        type:'date' },
  { key:'duration', label:'Duration (min)', type:'number' },
  { key:'totalMarks',label:'Total Marks', type:'number' },
  { key:'status',   label:'Status',      type:'select', options:['upcoming','ongoing','completed','cancelled'] },
];

const PLACEHOLDER_EXAMS = [
  { _id:'ex1', title:'Midterm Exam – CS101', course:'CS101', type:'midterm',  date:'2026-11-15', duration:120, totalMarks:100, status:'upcoming' },
  { _id:'ex2', title:'Quiz 1 – BUS101',      course:'BUS101', type:'quiz',   date:'2026-11-10', duration:30,  totalMarks:20,  status:'upcoming' },
  { _id:'ex3', title:'Final Exam – ENG101',  course:'ENG101', type:'final',  date:'2026-12-20', duration:180, totalMarks:100, status:'upcoming' },
  { _id:'ex4', title:'Quiz 2 – CS201',       course:'CS201', type:'quiz',    date:'2026-10-30', duration:30,  totalMarks:20,  status:'completed' },
];

const PAGE_SIZE = 8;
const TYPE_COLORS = { exam:'info', quiz:'purple', midterm:'warning', final:'danger', assignment:'muted' };

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

export default function ExamMgmt() {
  const [items, setItems]         = useState(PLACEHOLDER_EXAMS);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState('all'); // all | exam | quiz
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const fetchItems = useCallback(async()=>{
    setLoading(true);
    try{const res=await api.get('/admin/exams');if(res.data?.exams)setItems(res.data.exams);}catch{}finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchItems();},[fetchItems]);

  const filtered = items.filter(e=>{
    const matchSearch = !search||[e.title,e.course].some(v=>v?.toLowerCase().includes(search.toLowerCase()));
    const matchTab    = tab==='all'||e.type===tab;
    return matchSearch&&matchTab;
  });

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const handleSave = async(form)=>{
    try{
      if(editTarget&&!editTarget._id.startsWith('ex'))await api.put(`/admin/exams/${editTarget._id}`,form);
      else await api.post('/admin/exams',form);
      await fetchItems();
    }catch{
      if(editTarget)setItems(prev=>prev.map(e=>e._id===editTarget._id?{...e,...form}:e));
      else setItems(prev=>[...prev,{...form,_id:`ex${Date.now()}`}]);
    }
    setShowModal(false);setEditTarget(null);
  };

  const handleDelete=async()=>{
    setDeleting(true);
    try{await api.delete(`/admin/exams/${deleteTarget._id}`);await fetchItems();}
    catch{setItems(prev=>prev.filter(e=>e._id!==deleteTarget._id));}
    finally{setDeleting(false);setDeleteTarget(null);}
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Exams &amp; Quizzes</h1><p>Schedule and manage all assessments</p></div>
        <button className="btn btn-primary" onClick={()=>{setEditTarget(null);setShowModal(true);}}>+ Schedule</button>
      </div>

      <div className="tabs">
        {['all','exam','quiz','midterm','final'].map(t=>(
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>{setTab(t);setPage(1);}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Assessments ({filtered.length})</span>
          <div className="search-input-wrap">
            <span style={{color:'var(--text-muted)'}}>🔍</span>
            <input placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :paginated.length===0?<div className="empty-state"><div className="empty-state-icon">📝</div><h3>No assessments found</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Title</th><th>Course</th><th>Type</th><th>Date</th><th>Duration</th><th>Total Marks</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginated.map((e,i)=>(
                  <tr key={e._id}>
                    <td>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td style={{fontWeight:600}}>{e.title}</td>
                    <td><span className="badge badge-info">{e.course}</span></td>
                    <td><span className={`badge badge-${TYPE_COLORS[e.type]||'muted'}`}>{e.type}</span></td>
                    <td>{e.date||'—'}</td>
                    <td>{e.duration?`${e.duration} min`:'—'}</td>
                    <td>{e.totalMarks||'—'}</td>
                    <td><span className={`badge badge-${e.status==='upcoming'?'warning':e.status==='completed'?'success':'muted'}`}>{e.status||'upcoming'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="btn btn-sm btn-secondary" onClick={()=>{setEditTarget(e);setShowModal(true);}}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={()=>setDeleteTarget(e)}>🗑️</button>
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

      {showModal&&<CrudModal title={editTarget?'Edit Assessment':'Schedule Assessment'} fields={EXAM_FIELDS} initial={editTarget||{}} onSave={handleSave} onClose={()=>{setShowModal(false);setEditTarget(null);}}/>}
      {deleteTarget&&<ConfirmModal message={`Delete "${deleteTarget.title}"?`} onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting}/>}
    </>
  );
}
