import { useMemo, useState } from 'react';
import TeachingIcon from './TeachingIcon';
import { matchesPageSearch } from '../context/PageSearchContext';
import './CourseStudents.css';

const PAGE_SIZE=8;
export default function CourseStudents({students=[],course,search='',cohorts=[],selectedScope,onBatchChange}) {
  const batchOptions=cohorts.filter(cohort=>String(cohort.courseId)===String(selectedScope?.courseId));
  const selectedBatch=batchOptions.find(cohort=>cohort.academicYear===selectedScope?.academicYear&&cohort.batch===selectedScope?.batch)?.key||'';
  const [page,setPage]=useState(1);
  const visible=useMemo(()=>students.filter(student=>
    matchesPageSearch(search,student.name,student.studentId,student.email,student.status)
  ).sort((a,b)=>(a.name||'').localeCompare(b.name||'')),[students,search]);
  const totalPages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,totalPages);
  const offset=(currentPage-1)*PAGE_SIZE;
  const hasFilter=!!search;
  return <section className="course-students-panel" aria-label="Enrolled students">
    <header className="course-students-header"><span className="course-students-heading-icon"><TeachingIcon name="users" size={25}/></span><div><span className="course-students-eyebrow">COURSE DIRECTORY</span><h2>Enrolled students <span>{students.length}</span></h2><p>{course?.title||course?.name||'Assigned course'}</p></div><span className="course-students-cohort"><TeachingIcon name="graduate" size={17}/>{[course?.academicYear,course?.batch].filter(Boolean).join(' / ')||'Assigned cohort'}</span></header>
    <div className="course-students-toolbar"><label className="course-students-status-filter"><span>Batch</span><select aria-label="Filter students by batch" value={selectedBatch} disabled={!batchOptions.length} onChange={event=>{const cohort=batchOptions.find(option=>option.key===event.target.value);if(cohort){setPage(1);onBatchChange?.(cohort);}}}>{!batchOptions.length&&<option value="">No batches available</option>}{batchOptions.map(cohort=><option value={cohort.key} key={cohort.key}>{cohort.academicYear} / {cohort.batch||'Unassigned batch'}</option>)}</select></label></div>
    {!visible.length ? <div className="course-students-empty"><span><TeachingIcon name={hasFilter?'search':'users'} size={32}/></span><h3>{hasFilter?'No matching students':'No students enrolled yet'}</h3><p>{hasFilter?'Clear the search in the page header or choose another batch.':'Students enrolled in this course and batch will appear here.'}</p></div> : <div className="course-students-table-wrap"><table><thead><tr><th scope="col">#</th><th scope="col">Student</th><th scope="col">Student ID</th><th scope="col">Email address</th><th scope="col">Status</th></tr></thead><tbody>{visible.slice(offset,offset+PAGE_SIZE).map((student,index)=><tr key={student._id||student.studentId}><td className="course-students-number">{offset+index+1}</td><td><div className="course-student-name"><span className="course-student-avatar">{(student.name||'S').split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><strong>{student.name||'Student'}</strong></div></td><td><span className="course-student-id">{student.studentId||'—'}</span></td><td className="course-student-email">{student.email||'Not provided'}</td><td><span className={'course-student-status '+(student.status==='active'?'is-active':'')}><i/>{student.status?.replaceAll('_',' ')||'Not specified'}</span></td></tr>)}</tbody></table></div>}
    <footer className="course-students-footer"><span>Showing {visible.length?offset+1:0}–{Math.min(offset+PAGE_SIZE,visible.length)} of {visible.length} students</span><nav aria-label="Student list pagination"><button type="button" aria-label="Previous students page" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>‹</button><span>{currentPage} / {totalPages}</span><button type="button" aria-label="Next students page" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}>›</button></nav></footer>
  </section>;
}
