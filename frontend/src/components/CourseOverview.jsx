import TeachingIcon from './TeachingIcon';
import './TeachingPages.css';

export default function CourseOverview({course,contract,lessonProgress,upcoming,onTab}) {
  const total=Number(contract?.totalContractDays)||0, completed=Number(contract?.completedTeachingDays)||0;
  const lessonTotal=Number(lessonProgress?.total)||0, lessonsDone=Number(lessonProgress?.completed)||0;
  const percent=Math.min(100,Math.max(0,Number(lessonProgress?.percentage)||0));
  const title=course.title||course.name||'My Course';
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'Date to be confirmed':d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});};
  return <div className="co-overview">
    <section className="co-metrics" aria-label="Teaching progress">
      {[
        ['file','purple','Teaching Contract',contract?total:'—','Total contract days'],
        ['check','green','Completed Days',contract?completed:'—','Teaching days completed'],
        ['clock','amber','Remaining Days',contract?contract.remainingContractDays:'—','Contract days remaining'],
      ].map(([icon,tone,label,value,hint],index)=><article className="co-metric" key={label}><span className={'tp-icon '+tone}><TeachingIcon name={icon} size={25}/></span><div><h3>{label}</h3><strong>{value}</strong><p>{contract?hint:'Contract not configured'}</p></div>{index===0&&contract&&<div className="co-contract-progress"><progress max={total||1} value={completed} aria-label="Completed teaching days"/><small>{completed} completed ({total?Math.round(completed/total*100):0}%)</small></div>}</article>)}
      <article className="co-progress-card"><h3><TeachingIcon name="calendar" size={18}/> Course Progress</h3><div className="co-progress-content"><div className="co-ring" style={{'--progress':`${percent}%`}} role="img" aria-label={`${percent}% of lessons completed`}><strong>{percent}%</strong></div><dl><div><dt><i className="green"/>Completed lessons</dt><dd>{lessonsDone}</dd></div><div><dt><i className="amber"/>Total lessons</dt><dd>{lessonTotal}</dd></div><div><dt><i className="blue"/>Remaining lessons</dt><dd>{Math.max(0,lessonTotal-lessonsDone)}</dd></div></dl></div></article>
    </section>
    <div className="co-main-grid">
      <section className="co-panel"><header><h2><TeachingIcon name="book"/>About This Course</h2><button type="button" onClick={()=>onTab('outline')}>View outline</button></header><div className="co-about"><h3>{title}</h3><p>{course.description||'No course description has been added yet.'}</p><dl>{[['Course code',course.courseCode],['Department',course.department],['Batch / Academic year',[course.batch,course.academicYear].filter(Boolean).join(' · ')||'Not specified'],['Credits',course.credits]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Not specified'}</dd></div>)}</dl></div></section>
      <section className="co-panel"><header><h2><TeachingIcon name="calendar"/>Upcoming Assessments</h2><button type="button" onClick={()=>onTab('assessments')}>View all</button></header>{upcoming.length?<ul className="co-recent-list">{upcoming.slice(0,3).map((exam,index)=><li key={exam._id||index}><span className="tp-icon blue"><TeachingIcon name="file"/></span><div><strong>{exam.title||'Assessment'}</strong><small>{date(exam.examDate||exam.quizDate||exam.date)}</small></div><TeachingIcon name="arrow" size={16}/></li>)}</ul>:<div className="co-empty"><span className="tp-icon blue"><TeachingIcon name="calendar" size={27}/></span><h3>No upcoming assessments</h3><p>Scheduled exams, quizzes and assignments will appear here.</p></div>}</section>
    </div>
  </div>;
}
