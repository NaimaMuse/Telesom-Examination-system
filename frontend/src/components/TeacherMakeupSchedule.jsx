import {useState,useEffect,useRef} from 'react';
import TeachingIcon from './TeachingIcon';
import {teachingDateKey} from '../pages/teacher/teachingSchedule.mjs';
import './TeachingPages.css';

const classDay=row=>row.date||teachingDateKey(row.start);
const format=(value,options)=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('en-GB',{timeZone:'Africa/Nairobi',...options});};
const date=value=>format(value,{day:'2-digit',month:'short',year:'numeric'});
const summaryCards = [
  ['All', 'calendar', 'green', 'Total Makeup Classes'],
  ['Scheduled', 'clock', 'amber', 'Scheduled'],
  ['Today', 'calendar', 'green', 'Today'],
  ['Completed', 'check', 'amber', 'Completed'],
];

const emptyFilters={course:'',cohort:'',teacher:'',from:'',to:''};
function ClassDetails({row,onClose}) {
  const ref=useRef(null);
  useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
  return <dialog ref={ref} className="ms-dialog" aria-label="Makeup class details" onCancel={onClose}><header><h2>Class details</h2><button type="button" aria-label="Close class details" onClick={onClose}>×</button></header><h3>{row.lesson?.title||'Replacement lesson'}</h3><p>{row.lesson?.description}</p><dl>{[['Course',row.course?.title||row.course?.name],['Cohort',row.cohort],['Original date',row.originalDate],['Makeup date',date(classDay(row))],['Status',row.displayStatus],['Reason',row.reason]].filter(([label,value])=>label!=='Reason'||value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl><button type="button" className="btn btn-secondary" onClick={onClose}>Close details</button></dialog>;
}
export default function TeacherMakeupSchedule({rows,loading,error,busy,onComplete,search='',admin=false,student=false,filterOptions={},onCreate,onReschedule,onCancel}) {
  const [status,setStatus]=useState('All'),[query,setQuery]=useState(''),[filters,setFilters]=useState(emptyFilters),[selected,setSelected]=useState(null),[notice,setNotice]=useState(''),[now,setNow]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
  const today=teachingDateKey(now);
  const nextClass=rows.filter(row=>row.displayStatus==='Scheduled'&&classDay(row)>=today).sort((a,b)=>classDay(a).localeCompare(classDay(b)))[0];
  const isToday=row=>row.displayStatus==='Scheduled'&&classDay(row)===today;
  const needsReschedule=row=>row.displayStatus==='Scheduled'&&classDay(row)<today;
  const teachers=[...new Map([...(filterOptions.teachers||[]).map(teacher=>[String(teacher._id),teacher.name]),...rows.filter(row=>row.teacher).map(row=>[String(row.teacher._id),row.teacher.user?.name||'Teacher'])]).entries()];
  const count=value=>value==='All'?rows.length:value==='Today'?rows.filter(isToday).length:value==='Overdue'?rows.filter(needsReschedule).length:rows.filter(row=>row.displayStatus===value).length;
  const assignedIds=(filterOptions.assignments||[]).filter(assignment=>!filters.teacher||String(assignment.teacher?._id||assignment.teacher)===filters.teacher).map(assignment=>String(assignment.course?._id||assignment.course));
  const courses=[...new Map([...(filterOptions.courses||[]).filter(course=>!filters.teacher||assignedIds.includes(String(course._id))).map(course=>[String(course._id),course.title||course.name]),...rows.filter(row=>!filters.teacher||String(row.teacher?._id)===filters.teacher).map(row=>[String(row.course?._id||row.course?.title||row.course?.name||''),row.course?.title||row.course?.name||'Assigned course'])]).entries()].filter(([key])=>key);
  const cohorts=[...new Set([...(filterOptions.contracts||[]).filter(contract=>(!filters.teacher||String(contract.teacher?._id||contract.teacher)===filters.teacher)&&(!filters.course||String(contract.course?._id||contract.course)===filters.course)).map(contract=>contract.cohort),...rows.filter(row=>(!filters.teacher||String(row.teacher?._id)===filters.teacher)&&(!filters.course||String(row.course?._id)===filters.course)).map(row=>row.cohort)].filter(Boolean))].sort();
  const visible=rows.filter(row=>{
    const text=[row.lesson?.title,row.lesson?.description,row.course?.title,row.course?.name,row.course?.courseCode,row.cohort,row.displayStatus,row.teacher?.user?.name].join(' ').toLowerCase();
    return (status==='All'||(status==='Today'?isToday(row):status==='Overdue'?needsReschedule(row):row.displayStatus===status))&&(!filters.course||String(row.course?._id||row.course?.title||row.course?.name)===filters.course)&&(!filters.cohort||row.cohort===filters.cohort)&&(!filters.teacher||String(row.teacher?._id)===filters.teacher)&&(!filters.from||classDay(row)>=filters.from)&&(!filters.to||classDay(row)<=filters.to)&&text.includes(query.trim().toLowerCase())&&text.includes(search.trim().toLowerCase());
  }).sort((a,b)=>classDay(a).localeCompare(classDay(b)));
  const complete=async row=>{setNotice('');if(await onComplete(row))setNotice('Class completed. Teaching progress and contract balance updated.');};
  const nextDate = nextClass ? classDay(nextClass) : '';
  return <section className={`ms-page ${admin?'ms-admin-page':'ms-teacher-page'}`} aria-label="Makeup classes">
    {admin && <header className="ms-heading ms-heading-compact"><button type="button" className="btn btn-primary ms-schedule-button" disabled={busy||loading} onClick={onCreate}>＋ Schedule class</button></header>}
    {error&&<p className="academy-error" role="alert">{error}</p>}{notice&&<p className="ms-notice" role="status">{notice}</p>}
    <section className="ms-summary" aria-label="Makeup class totals">
      {summaryCards.map(([key,icon,tone,label])=><button type="button" className={tone} key={key} aria-pressed={status===key} onClick={()=>setStatus(key)}>
        <span className={'tp-icon '+tone}><TeachingIcon name={icon} size={19}/></span>
        <span><small>{label}</small><strong>{loading?'—':count(key)}</strong></span>
      </button>)}
    </section>
    {nextClass && <aside className="ms-next-class" aria-label="Next makeup class">
      <span className="ms-next-date" aria-hidden="true">
        <span>{format(nextDate,{month:'short'})}</span><strong>{nextDate.slice(-2)}</strong>
      </span>
      <div>
        <small>{nextDate===today?'TODAY’S CLASS':'NEXT MAKEUP CLASS'}</small>
        <h2>{nextClass.lesson?.title || 'Replacement lesson'}</h2>
        <p>{[nextClass.course?.title || nextClass.course?.name, nextClass.cohort, date(nextDate)].filter(Boolean).join(' · ')}</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={()=>setSelected(nextClass)}><TeachingIcon name="eye" size={15}/> View class</button>
    </aside>}
    <section className="ms-filter-panel" aria-label="Filter makeup classes"><header><h2><TeachingIcon name="filter" size={18}/>Find scheduled classes</h2></header><div className="ms-filter-fields">{admin&&<label>Teacher<select value={filters.teacher} onChange={event=>{
      const teacher=event.target.value;
      const ids=[...new Set([...(filterOptions.assignments||[]).filter(assignment=>String(assignment.teacher?._id||assignment.teacher)===teacher).map(assignment=>String(assignment.course?._id||assignment.course)),...rows.filter(row=>String(row.teacher?._id)===teacher).map(row=>String(row.course?._id||''))].filter(Boolean))];
      setFilters({...filters,teacher,course:teacher&&ids.length===1?ids[0]:'',cohort:''});
    }}><option value="">All teachers</option>{teachers.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>}<label>Course<select value={filters.course} onChange={event=>setFilters({...filters,course:event.target.value,cohort:''})}><option value="">All courses</option>{courses.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><label>Cohort<select value={filters.cohort} onChange={event=>setFilters({...filters,cohort:event.target.value})}><option value="">All cohorts</option>{cohorts.map(cohort=><option key={cohort}>{cohort}</option>)}</select></label><label>Search<input type="search" value={query} placeholder="Lesson, topic or course…" onChange={event=>setQuery(event.target.value)}/></label><label>Date from<input type="date" value={filters.from} max={filters.to||undefined} onChange={event=>setFilters({...filters,from:event.target.value})}/></label><label>Date to<input type="date" value={filters.to} min={filters.from||undefined} onChange={event=>setFilters({...filters,to:event.target.value})}/></label></div></section>
    <div className="ms-tabs" role="group" aria-label="Filter by class status">{['All','Scheduled','Today','Overdue','Completed','Cancelled'].map(value=><button type="button" key={value} aria-pressed={status===value} onClick={()=>setStatus(value)}>{value==='All'?'All Classes':value}<span>{count(value)}</span></button>)}</div>
    <section className="ms-table-panel" aria-label="Makeup class schedule">{loading?<p className="ms-empty" role="status">Loading your classes…</p>:!visible.length?<div className="ms-empty"><TeachingIcon name="calendar" size={32}/><h3>{rows.length?'No matching classes':'No makeup classes yet'}</h3><p>{rows.length?'Try another search, status or date range.':'Your assigned makeup lessons will appear here once scheduled.'}</p></div>:<div className="ms-table-scroll"><table><thead><tr>{['#','Lesson / Topic',...(admin?['Teacher']:[]),'Course','Cohort','Original Date','Makeup Date','Status','Action'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((row,index)=>{const label=isToday(row)?'Today':needsReschedule(row)?'Overdue':row.displayStatus;const allowed=isToday(row);return <tr key={row._id}><td>{String(index+1).padStart(2,'0')}</td><td><div className="ms-topic"><span className={'tp-icon '+['blue','purple','amber','green'][index%4]}><TeachingIcon name="file"/></span><div><strong>{row.lesson?.title||'Replacement lesson'}</strong>{row.lesson?.description&&<small>{row.lesson.description}</small>}</div></div></td>{admin&&<td>{row.teacher?.user?.name||'—'}</td>}<td><strong className="ms-course-name">{row.course?.title||row.course?.name||'Assigned course'}</strong>{row.course?.courseCode&&<small className="ms-course-code">{row.course.courseCode}</small>}</td><td>{row.cohort||'—'}</td><td>{row.originalDate?date(row.originalDate+'T12:00:00+03:00'):'—'}</td><td>{row.status==='cancelled'?'—':date(classDay(row))}</td><td><span className={'ms-status '+label.toLowerCase()}><i/>{label}</span></td><td><div className="ms-row-actions"><button type="button" className="btn btn-secondary" onClick={()=>setSelected(row)}><TeachingIcon name="eye" size={15}/>View</button>{admin&&row.displayStatus!=='Completed'&&<><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>onReschedule(row)}>{row.displayStatus==='Cancelled'?'Reschedule':'Edit / Reschedule'}</button>{row.displayStatus!=='Cancelled'&&<button type="button" className="btn ms-cancel-button" disabled={busy} onClick={()=>onCancel(row)}>Cancel class</button>}</>}{!admin&&!student&&<button type="button" className={'btn '+(allowed?'btn-primary':'btn-secondary')} disabled={busy||!allowed} title={row.displayStatus==='Scheduled'&&!allowed?(needsReschedule(row)?'Contact Admin to reschedule this overdue class.':'Complete this lesson on its scheduled day in Nairobi.'):undefined} onClick={()=>complete(row)}>{row.displayStatus==='Completed'?'✓ Completed':row.displayStatus==='Cancelled'?'Cancelled':'✓ Mark completed'}</button>}</div></td></tr>;})}</tbody></table></div>}</section>
    {!student && <p className="ms-help">{admin?'Admin schedules, reschedules and cancels classes. Only the assigned teacher can mark a class completed.':'Complete lessons after teaching on the scheduled date in Nairobi. For overdue classes, contact Admin to reschedule.'}</p>}
    {selected&&<ClassDetails row={selected} onClose={()=>setSelected(null)}/>}
  </section>;
}
