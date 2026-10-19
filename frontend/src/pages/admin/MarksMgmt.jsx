import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PLACEHOLDER_MARKS = [
  { _id:'m1', student:'Ahmed Ali',    studentId:'STU-001', course:'CS101', examTitle:'Midterm', marks:78, totalMarks:100, grade:'B', status:'published' },
  { _id:'m2', student:'Faadumo Abdi', studentId:'STU-002', course:'BUS101', examTitle:'Quiz 1', marks:18, totalMarks:20,  grade:'A', status:'published' },
  { _id:'m3', student:'Mohamed Osman',studentId:'STU-003', course:'CS201', examTitle:'Quiz 2', marks:15, totalMarks:20,  grade:'B', status:'published' },
  { _id:'m4', student:'Hodan Yusuf',  studentId:'STU-004', course:'ENG101', examTitle:'Midterm', marks:55, totalMarks:100, grade:'C', status:'published' },
];

const MARK_FIELDS = [
  { key:'studentId',  label:'Student ID',   type:'text',   required:true },
  { key:'course',     label:'Course Code',  type:'text',   required:true },
  { key:'examTitle',  label:'Exam/Quiz',    type:'text',   required:true },
  { key:'marks',      label:'Marks Obtained',type:'number',required:true },
  { key:'totalMarks', label:'Total Marks',  type:'number', required:true },
  { key:'grade',      label:'Grade',        type:'text' },
  { key:'status',     label:'Status', type:'select', options:['draft','published'] },
];

function gradeColor(g){ return g==='A'?'grade-A':g==='B'?'grade-B':g==='C'?'grade-C':g==='D'?'grade-D':'grade-F'; }

function CrudModal({ title, fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial||{});
  const [saving, setSaving] = useState(false);
  const handleSubmit=async(e)=>{e.preventDefault();setSaving(true);try{await onSave(form);}finally{setSaving(false);}};
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

const PAGE_SIZE = 8;

export default function MarksMgmt() {
  const [marks, setMarks]         = useState(PLACEHOLDER_MARKS);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchMarks = useCallback(async()=>{
    setLoading(true);
    try{const res=await api.get('/admin/marks');if(res.data?.marks)setMarks(res.data.marks);}catch{}finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchMarks();},[fetchMarks]);

  const filtered   = marks.filter(m=>!search||[m.student,m.studentId,m.course,m.examTitle].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const handleSave = async(form)=>{
    // Auto-compute grade if not set
    const pct = form.marks && form.totalMarks ? (form.marks/form.totalMarks)*100 : 0;
    if(!form.grade){
      form.grade = pct>=90?'A':pct>=80?'B':pct>=70?'C':pct>=60?'D':'F';
    }
    try{
      if(editTarget&&!editTarget._id.startsWith('m'))await api.put(`/admin/marks/${editTarget._id}`,form);
      else await api.post('/admin/marks',form);
      await fetchMarks();
    }catch{
      if(editTarget)setMarks(prev=>prev.map(m=>m._id===editTarget._id?{...m,...form}:m));
      else setMarks(prev=>[...prev,{...form,_id:`m${Date.now()}`}]);
    }
    setShowModal(false);setEditTarget(null);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Marks &amp; Results</h1><p>Record and publish student marks</p></div>
        <button className="btn btn-primary" onClick={()=>{setEditTarget(null);setShowModal(true);}}>+ Add Marks</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Results ({filtered.length})</span>
          <div className="search-input-wrap">
            <span style={{color:'var(--text-muted)'}}>🔍</span>
            <input placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
          </div>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :paginated.length===0?<div className="empty-state"><div className="empty-state-icon">📊</div><h3>No results found</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Student</th><th>ID</th><th>Course</th><th>Exam</th><th>Marks</th><th>%</th><th>Grade</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {paginated.map((m,i)=>{
                  const pct = m.totalMarks ? Math.round((m.marks/m.totalMarks)*100) : 0;
                  return (
                    <tr key={m._id}>
                      <td>{(page-1)*PAGE_SIZE+i+1}</td>
                      <td style={{fontWeight:600}}>{m.student}</td>
                      <td><code>{m.studentId}</code></td>
                      <td><span className="badge badge-info">{m.course}</span></td>
                      <td>{m.examTitle}</td>
                      <td>{m.marks}/{m.totalMarks}</td>
                      <td>{pct}%</td>
                      <td><span className={gradeColor(m.grade)}>{m.grade||'—'}</span></td>
                      <td><span className={`badge badge-${m.status==='published'?'success':'warning'}`}>{m.status||'draft'}</span></td>
                      <td><button className="btn btn-sm btn-secondary" onClick={()=>{setEditTarget(m);setShowModal(true);}}>✏️</button></td>
                    </tr>
                  );
                })}
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

      {showModal&&<CrudModal title={editTarget?'Edit Marks':'Add Marks'} fields={MARK_FIELDS} initial={editTarget||{}} onSave={handleSave} onClose={()=>{setShowModal(false);setEditTarget(null);}}/>}
    </>
  );
}
