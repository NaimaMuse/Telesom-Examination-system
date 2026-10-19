import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PLACEHOLDER_RECORDS = [
  { _id:'a1', student:'Ahmed Ali',    studentId:'STU-001', course:'CS101', date:'2026-11-10', status:'present' },
  { _id:'a2', student:'Faadumo Abdi', studentId:'STU-002', course:'BUS101', date:'2026-11-10', status:'present' },
  { _id:'a3', student:'Mohamed Osman',studentId:'STU-003', course:'CS201', date:'2026-11-10', status:'absent' },
  { _id:'a4', student:'Hodan Yusuf',  studentId:'STU-004', course:'ENG101', date:'2026-11-10', status:'late' },
];

function MarkModal({ onSave, onClose }) {
  const [form, setForm] = useState({ studentId:'', course:'', date:new Date().toISOString().split('T')[0], status:'present' });
  const [saving, setSaving] = useState(false);
  const handleSubmit=async(e)=>{e.preventDefault();setSaving(true);try{await onSave(form);}finally{setSaving(false);}};
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Mark Attendance</span><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">Student ID *</label><input className="form-control" required value={form.studentId} onChange={e=>setForm(p=>({...p,studentId:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Course *</label><input className="form-control" required value={form.course} onChange={e=>setForm(p=>({...p,course:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Date *</label><input className="form-control" type="date" required value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-control" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
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

const PAGE_SIZE = 10;
const STATUS_BADGE = { present:'success', absent:'danger', late:'warning', excused:'info' };

export default function AttendanceMgmt() {
  const [records, setRecords]     = useState(PLACEHOLDER_RECORDS);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);

  const fetchRecords = useCallback(async()=>{
    setLoading(true);
    try{const res=await api.get('/admin/attendance');if(res.data?.attendance)setRecords(res.data.attendance);}catch{}finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchRecords();},[fetchRecords]);

  const filtered = records.filter(r=>{
    const matchSearch = !search||[r.student,r.studentId,r.course].some(v=>v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus||r.status===filterStatus;
    return matchSearch&&matchStatus;
  });
  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const summary = records.reduce((a,r)=>{ a[r.status]=(a[r.status]||0)+1; return a; }, {});

  const handleSave = async(form)=>{
    try{await api.post('/admin/attendance',form);await fetchRecords();}
    catch{setRecords(prev=>[...prev,{...form,_id:`a${Date.now()}`,student:form.studentId}]);}
    setShowModal(false);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>Attendance Management</h1><p>Track and manage student attendance</p></div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Mark Attendance</button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{marginBottom:'1.5rem'}}>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><div className="stat-value">{summary.present||0}</div><div className="stat-label">Present</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div className="stat-info"><div className="stat-value">{summary.absent||0}</div><div className="stat-label">Absent</div></div></div>
        <div className="stat-card"><div className="stat-icon gold">⏰</div><div className="stat-info"><div className="stat-value">{summary.late||0}</div><div className="stat-label">Late</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">📋</div><div className="stat-info"><div className="stat-value">{summary.excused||0}</div><div className="stat-label">Excused</div></div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Attendance Records ({filtered.length})</span>
          <div className="filter-bar" style={{marginBottom:0}}>
            <div className="search-input-wrap">
              <span style={{color:'var(--text-muted)'}}>🔍</span>
              <input placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
            </div>
            <select className="form-control" style={{width:'auto'}} value={filterStatus} onChange={e=>{setFilter(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        </div>

        {loading?<div className="spinner-wrap"><div className="spinner"/></div>
          :paginated.length===0?<div className="empty-state"><div className="empty-state-icon">📅</div><h3>No records found</h3></div>
          :(
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>#</th><th>Student</th><th>Student ID</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {paginated.map((r,i)=>(
                  <tr key={r._id}>
                    <td>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td style={{fontWeight:600}}>{r.student}</td>
                    <td><code>{r.studentId}</code></td>
                    <td><span className="badge badge-info">{r.course}</span></td>
                    <td>{r.date}</td>
                    <td><span className={`badge badge-${STATUS_BADGE[r.status]||'muted'}`}>{r.status}</span></td>
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

      {showModal&&<MarkModal onSave={handleSave} onClose={()=>setShowModal(false)}/>}
    </>
  );
}
