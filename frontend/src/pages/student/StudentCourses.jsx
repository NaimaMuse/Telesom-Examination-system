import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLACEHOLDER_COURSES = [
  { _id:'c1', code:'CS101', name:'Introduction to Programming', teacher:'Dr. Abdullahi Said', schedule:'Mon/Wed 9:00–10:30', semester:'Semester 1', credits:3, description:'Fundamentals of programming using Python.' },
  { _id:'c2', code:'BUS101',name:'Principles of Business',      teacher:'Ms. Farhia Adan',    schedule:'Tue/Thu 11:00–12:30',semester:'Semester 1', credits:3, description:'Introduction to business management and economics.' },
];

export default function StudentCourses() {
  const [courses, setCourses] = useState(PLACEHOLDER_COURSES);
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
=======
  const [search,  setSearch]  = useState('');
>>>>>>> origin/main

  useEffect(()=>{
    const fetch=async()=>{
      setLoading(true);
      try{const res=await api.get('/student/courses');if(res.data?.courses)setCourses(res.data.courses);}catch{}finally{setLoading(false);}
    };
    fetch();
  },[]);

<<<<<<< HEAD
  return (
    <>
      {loading?<div className="spinner-wrap"><div className="spinner"/></div>
        :courses.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon">📚</div><h3>No courses enrolled</h3><p>Contact the admin to enroll in courses.</p></div></div>
        :(
        <div className="grid-2">
          {courses.map(c=>(
            <div key={c._id} className="card student-course-card">
              <div className="card-body">
                <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                  <div className="student-course-icon" style={{width:50,height:50,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>📚</div>
=======
  const filtered = courses.filter(c=>!search||[c.name,c.code].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <div className="page-header">
        <div className="page-header-left"><h1>My Courses</h1><p>Your enrolled courses this semester</p></div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <span style={{color:'var(--text-muted)'}}>🔍</span>
          <input placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {loading?<div className="spinner-wrap"><div className="spinner"/></div>
        :filtered.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon">📚</div><h3>No courses enrolled</h3><p>Contact the admin to enroll in courses.</p></div></div>
        :(
        <div className="grid-2">
          {filtered.map(c=>(
            <div key={c._id} className="card" style={{marginBottom:0}}>
              <div className="card-body">
                <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                  <div style={{width:50,height:50,background:'var(--primary-light)',color:'var(--primary)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>📚</div>
>>>>>>> origin/main
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:'1rem',color:'var(--text-primary)',marginBottom:2}}>{c.name}</div>
                    <div style={{fontSize:'0.8rem',color:'var(--text-secondary)',marginBottom:8}}>{c.description}</div>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      <span className="badge badge-info">{c.code}</span>
                      <span className="badge badge-success">{c.semester}</span>
                      {c.credits&&<span className="badge badge-muted">{c.credits} Credits</span>}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:'1rem',display:'flex',flexDirection:'column',gap:'6px'}}>
                  <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>👨‍🏫 <strong>Teacher:</strong> {c.teacher}</div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>🕐 <strong>Schedule:</strong> {c.schedule}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
