import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_NOTES = [
  { _id:'n1', title:'Week 1 – Python Basics',   course:'CS101',  teacher:'Dr. Abdullahi Said', filename:'week1_python.pdf',  size:'1.2 MB', uploadedAt:'2026-10-01' },
  { _id:'n2', title:'Week 2 – Control Flow',    course:'CS101',  teacher:'Dr. Abdullahi Said', filename:'week2_control.pdf', size:'980 KB', uploadedAt:'2026-10-08' },
  { _id:'n3', title:'Week 1 – Intro to Business',course:'BUS101',teacher:'Ms. Farhia Adan',    filename:'bus_week1.pdf',     size:'1.1 MB', uploadedAt:'2026-10-03' },
];

const PLACEHOLDER_COURSES = ['All','CS101','BUS101'];

export default function StudentNotes() {
  const [notes, setNotes]     = useState(PLACEHOLDER_NOTES);
  const [loading, setLoading] = useState(false);
  const [selCourse, setSelCourse] = useState('All');

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{const res=await api.get('/student/notes');if(res.data?.notes)setNotes(res.data.notes);}catch{}finally{setLoading(false);}
    };
    fetch();
  },[]);

  const filtered = notes.filter(n=>{
    return selCourse==='All'||n.course===selCourse;
  });

  return (
    <>
      <div className="filter-bar">
        <select className="form-control" style={{width:'auto'}} value={selCourse} onChange={e=>setSelCourse(e.target.value)}>
          {PLACEHOLDER_COURSES.map(c=><option key={c} value={c}>{c==='All'?'All Courses':c}</option>)}
        </select>
      </div>

      {loading?<div className="spinner-wrap"><div className="spinner"/></div>
        :filtered.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon">📄</div><h3>No notes available</h3><p>Your teachers haven't uploaded any notes yet.</p></div></div>
        :(
        <div className="card">
          <div className="card-body" style={{padding:'1rem 1.4rem'}}>
            {filtered.map(n=>(
              <div key={n._id} className="note-card">
                <div className="note-icon">📄</div>
                <div className="note-info">
                  <h4>{n.title}</h4>
                  <p>{n.course} • By {n.teacher} • {n.filename} ({n.size}) • {n.uploadedAt}</p>
                </div>
                <div className="note-actions">
                  <button className="btn btn-sm btn-primary" onClick={()=>alert('📌 Connect backend to enable real download.')}>
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
