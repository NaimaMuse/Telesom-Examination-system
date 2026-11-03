import { useMemo, useState } from 'react';
import TeachingIcon from './TeachingIcon';
import { matchesPageSearch } from '../context/PageSearchContext';
import './CourseStudents.css';

const PAGE_SIZE=8;
export default function CourseStudents({students=[],course,search=''}) {
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('');
  const [page,setPage]=useState(1);
  const statuses=[...new Set(students.map(student=>student.status).filter(Boolean))].sort();
  const visible=useMemo(()=>students.filter(student=>
    matchesPageSearch(search,student.name,student.studentId,student.email,student.status) &&
    matchesPageSearch(query,student.name,student.studentId,student.email) &&
    (!status || student.status===status)
  ).sort((a,b)=>(a.name||'').localeCompare(b.name||'')),[students,search,query,status]);
  const totalPages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const offset=(currentPage-1)*PAGE_SIZE;
  const hasFilter=!!(query||status||search);
  return <section className="course-students-panel" aria-label="Enrolled students">
    <header className="course-students-header"><span className="course-students-heading-icon"><TeachingIcon name="users" size={25}/></span><div><span className="course-students-eyebrow">COURSE DIRECTORY</span><h2>Enrolled students <span>{students.length}</span></h2><p>{course?.title||course?.name||'Assigned course'}</p></div><span className="course-students-cohort"><TeachingIcon name="graduate" size={17}/>{[course?.academicYear,course?.batch].filter(Boolean).join(' / ')||'Assigned cohort'}</span></header>
    <div className="course-students-toolbar"><label className="course-students-search"><TeachingIcon name="search" size={17}/><input type="search" aria-label="Search enrolled students" placeholder="Search name, student ID or email…" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}}/></label><label className="course-students-status-filter"><span>Status</span><select aria-label="Filter students by status" value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="">All statuses</option>{statuses.map(value=><option value={value} key={value}>{value.replaceAll('_',' ')}</option>)}</select></label><span className="course-students-results">{visible.length} {visible.length===1?'student':'students'}</span></div>
    {!visible.length ? <div className="course-students-empty"><span><TeachingIcon name={hasFilter?'search':'users'} size={32}/></span><h3>{hasFilter?'No matching students':'No students enrolled yet'}</h3><p>{hasFilter?'Try another name, ID or email, or clear the filters.':'Students enrolled in this course and batch will appear here.'}</p>{(query||status)&&<button type="button" onClick={()=>{setQuery('');setStatus('');setPage(1);}}>Clear filters</button>}</div> : <div className="course-students-table-wrap"><table><thead><tr><th scope="col">#</th><th scope="col">Student</th><th scope="col">Student ID</th><th scope="col">Email address</th><th scope="col">Status</th></tr></thead><tbody>{visible.slice(offset,offset+PAGE_SIZE).map((student,index)=><tr key={student._id||student.studentId}><td className="course-students-number">{offset+index+1}</td><td><div className="course-student-name"><span className="course-student-avatar">{(student.name||'S').split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><strong>{student.name||'Student'}</strong></div></td><td><span className="course-student-id">{student.studentId||'—'}</span></td><td className="course-student-email">{student.email||'Not provided'}</td><td><span className={'course-student-status '+(student.status==='active'?'is-active':'')}><i/>{student.status?.replaceAll('_',' ')||'Not specified'}</span></td></tr>)}</tbody></table></div>}
    <footer className="course-students-footer"><span>Showing {visible.length?offset+1:0}–{Math.min(offset+PAGE_SIZE,visible.length)} of {visible.length} students</span><nav aria-label="Student list pagination"><button type="button" aria-label="Previous students page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>‹</button><span>{currentPage} / {totalPages}</span><button type="button" aria-label="Next students page" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}>›</button></nav></footer>
  </section>;
}
