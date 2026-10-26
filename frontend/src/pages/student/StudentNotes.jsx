import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import { useState, useEffect } from 'react';
import api from '../../services/api';



export default function StudentNotes() {
  const [search] = usePageSearch();
  const [error, setError] = useState('');
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selCourse, setSelCourse] = useState('All');

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{const res=await api.get('/student/notes');if(res.data?.notes)setNotes(res.data.notes);}catch(err){setError(err.response?.data?.message || 'Unable to load student data. Please try again.');}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const filtered = notes.filter(n=>{
    return (selCourse==='All'||n.course===selCourse) && matchesPageSearch(search, n.title, n.course, n.teacher, n.content, n.uploadedAt);
  });

  return (
    <>
      {error && <div className="card card-body" role="alert">{error}</div>}
      <div className="filter-bar">
        <select className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
          {['All', ...new Set(notes.map(n=>n.course))].map(c=><option key={c} value={c}>{c==='All'?'All Courses':c}</option>)}
        </select>
      </div>

      {loading?<div className="spinner-wrap"><div className="spinner"/></div>
        :filtered.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon">📄</div><h3>{search ? 'No matching notes' : 'No notes available'}</h3><p>Your teachers haven't uploaded any notes yet.</p></div></div>
        :(
        <div className="card">
          <div className="card-body" style={{padding:'1rem 1.4rem'}}>
            {filtered.map(n=>(
              <div key={n._id} className="note-card">
                <div className="note-icon">📄</div>
                <div className="note-info">
                  <h4>{n.title}</h4><p style={{whiteSpace: 'pre-wrap'}}>{n.content}</p>
                  <p>{n.course} • By {n.teacher} • {n.uploadedAt}</p>
                </div>
                <div className="note-actions">
                  <button className="btn btn-sm btn-primary" onClick={()=>{ const url=URL.createObjectURL(new Blob([n.content], {type:'text/plain;charset=utf-8'})); const link=document.createElement('a'); link.href=url; link.download=`${n.title.replace(/[^a-z0-9 -]/gi, '_')}.txt`; link.click(); URL.revokeObjectURL(url); }}>
                    ⬇️ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
