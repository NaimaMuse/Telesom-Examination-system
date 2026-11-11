import { useMemo, useState } from 'react';
import TeachingIcon from './TeachingIcon';
import { matchesPageSearch } from '../context/PageSearchContext';
import './CourseStudents.css';

const PAGE_SIZE=8;
export default function CourseStudents({students=[],course,search='',cohorts=[],selectedScope,onCohortChange,directory=false}) {
  const cohortOptions=cohorts.filter(cohort=>String(cohort.courseId)===String(selectedScope?.courseId));
  const selectedCohort=cohortOptions.find(cohort=>cohort.academicYear===selectedScope?.academicYear&&cohort.cohort===selectedScope?.cohort)?.key||'';
  const [page,setPage]=useState(1);
  const visible=useMemo(()=>students.filter(student=>
    matchesPageSearch(search,student.name,student.studentId,student.email,student.status,directory?student.courseName:'')
  ).sort((a,b)=>(a.name||'').localeCompare(b.name||'')),[students,search,directory]);
  const totalPages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const offset=(currentPage-1)*PAGE_SIZE;
  const hasFilter=!!search;
  return <section className={directory?"course-students-panel course-students-directory":"course-students-panel"} aria-label="Enrolled students">
    <header className="course-students-header"><span className="course-students-heading-icon"><TeachingIcon name="users" size={25}/></span><div><span className="course-students-eyebrow">COURSE DIRECTORY</span><h2>Enrolled students <span>{students.length}</span></h2><p>{directory?'Students across your assigned courses':course?.title||course?.name||'Assigned course'}</p></div>{!directory&&<span className="course-students-cohort"><TeachingIcon name="graduate" size={17}/>{[course?.academicYear,course?.cohort].filter(Boolean).join(' / ')||'Assigned cohort'}</span>}</header>
    {!directory&&<div className="course-students-toolbar"><label className="course-students-status-filter"><span>Cohort</span><select aria-label="Filter students by cohort" value={selectedCohort} disabled={!cohortOptions.length} onChange={event=>{const cohort=cohortOptions.find(option=>option.key===event.target.value);if(cohort){setPage(1);onCohortChange?.(cohort);}}}>{!cohortOptions.length&&<option value="">No cohorts available</option>}{cohortOptions.map(cohort=><option value={cohort.key} key={cohort.key}>{cohort.academicYear} / {cohort.cohort||'Unassigned cohort'}</option>)}</select></label></div>}
    {!visible.length ? <div className="course-students-empty"><span><TeachingIcon name={hasFilter?'search':'users'} size={32}/></span><h3>{hasFilter?'No matching students':'No students enrolled yet'}</h3><p>{hasFilter?'Try a different search.':directory?'Students enrolled in your assigned courses will appear here.':'Students enrolled in this course and cohort will appear here.'}</p></div> : <div className="course-students-table-wrap" tabIndex={directory?0:undefined} role={directory?"region":undefined} aria-label={directory?"Scrollable student list":undefined}><table><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Student ID</th><th scope="col">Email address</th>{directory&&<th scope="col">Course</th>}<th scope="col">Status</th></tr></thead><tbody>{(directory?visible:visible.slice(offset,offset+PAGE_SIZE)).map((student,index)=><tr key={student._id||student.studentId}><td className="course-students-number">{offset+index+1}</td><td><div className="course-student-name"><span className="course-student-avatar">{(student.name||'S').split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><strong>{student.name||'Student'}</strong></div></td><td><span className="course-student-id">{student.studentId||'—'}</span></td><td className="course-student-email">{student.email||'Not provided'}</td>{directory&&<td>{student.courseName||'—'}</td>}<td><span className={'course-student-status '+(student.status==='active'?'is-active':'')}><i/>{student.status?.replaceAll('_',' ')||'Not specified'}</span></td></tr>)}</tbody></table></div>}
    {directory?<footer className="course-students-footer"><span>{visible.length} of {students.length} students</span></footer>:<footer className="course-students-footer"><span>Showing {visible.length?offset+1:0}–{Math.min(offset+PAGE_SIZE,visible.length)} of {visible.length} students</span><nav aria-label="Student list pagination"><button type="button" aria-label="Previous students page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>‹</button><span>{currentPage} / {totalPages}</span><button type="button" aria-label="Next students page" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}>›</button></nav></footer>}
  </section>;
}
