import {contractDurationLabel} from '../pages/teacher/teachingSchedule.mjs';
import TeachingIcon from './TeachingIcon';
import './TeachingPages.css';
import './CourseOverviewDesign.css';

function OverviewProgressCard({title,icon,percent,rows,available=true,className='',details}) {
  return <article className={'co-progress-card '+className}><h3><TeachingIcon name={icon} size={18}/>{title}{details&&<details className="co-contract-details"><summary>View details <TeachingIcon name="arrow" size={16}/></summary><div>{details}</div></details>}</h3><div className="co-progress-content">{percent!=null&&<div className="co-ring" style={{'--progress':percent+'%'}} role="img" aria-label={available?percent+'% '+title:'Contract not configured'}><strong>{available?percent+'%':'—'}</strong></div>}<dl>{rows.map(([tone,label,value])=><div key={label}><dt><i className={tone}/>{label}</dt><dd>{available?value:'—'}</dd></div>)}</dl></div></article>;
}

export default function CourseOverview({course,contract,lessonProgress,upcoming,onTab}) {
  const lessonTotal=Number(lessonProgress?.total)||0, lessonsDone=Number(lessonProgress?.completed)||0;
  const percent=Math.min(100,Math.max(0,Number(lessonProgress?.percentage)||0));
  const title=course.title||course.name||'My Course';
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'Date to be confirmed':d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});};
  return <div className="co-overview co-reference-design">
    <section className="co-metrics" aria-label="Teaching progress">
      <OverviewProgressCard title="Teaching Contract" icon="file" className="co-contract-card" available={!!contract} details={contract?<><strong>Teaching contract</strong><span>{date(contract.startDate)} – {date(contract.endDate)}</span><span>{contractDurationLabel(contract)}</span></>:null} rows={[
        ['green','Teaching days completed',contract?.completedTeachingDays??'—'],
        ['amber','Upcoming teaching days',contract?.remainingScheduledTeachingDays??'—'],
        ['blue','Total teaching days',contract?.targetTeachingDays??'—'],
      ]}/>
      <OverviewProgressCard title="Course Progress" icon="calendar" percent={percent} rows={[
        ['green','Completed lessons',lessonsDone],['amber','Total lessons',lessonTotal],['blue','Remaining lessons',Math.max(0,lessonTotal-lessonsDone)],
      ]}/>
    </section>
    <div className="co-main-grid">
      <section className="co-panel"><header><h2><TeachingIcon name="book"/>About This Course</h2><div className="co-about-actions"><span className="co-credits-badge"><TeachingIcon name="star" size={16}/><span>Credits <strong>{course.credits??'—'}</strong></span></span><button type="button" onClick={()=>onTab('outline')}>View outline <TeachingIcon name="arrow" size={16}/></button></div></header><div className="co-about"><h3>{title}</h3><p>{course.description||'No course description has been added yet.'}</p><dl>{[['Course code',course.courseCode],['Department',course.department],['Cohort / Academic year',[course.cohort,course.academicYear].filter(Boolean).join(' · ')||'Not specified']].map(([label,value],index)=><div key={label}><TeachingIcon name={['bolt','graduate','calendar','star'][index]} size={24}/><dt>{label}</dt><dd>{value??'Not specified'}</dd></div>)}</dl></div></section>
      <section className="co-panel"><header><h2><TeachingIcon name="calendar"/>Upcoming Assessments</h2><button type="button" onClick={()=>onTab('assessments')}>View all <TeachingIcon name="arrow" size={16}/></button></header>{upcoming.length?<ul className="co-recent-list">{upcoming.slice(0,3).map((exam,index)=><li key={exam._id||index}><span className="tp-icon blue"><TeachingIcon name="file"/></span><div><strong>{exam.title||'Assessment'}</strong><small><TeachingIcon name="calendar" size={14}/>{date(exam.examDate||exam.quizDate||exam.date)}</small></div><TeachingIcon name="arrow" size={16}/></li>)}</ul>:<div className="co-empty"><span className="tp-icon blue"><TeachingIcon name="calendar" size={27}/></span><h3>No upcoming assessments</h3><p>Scheduled exams, quizzes and assignments will appear here.</p></div>}</section>
    </div>
  </div>;
}
