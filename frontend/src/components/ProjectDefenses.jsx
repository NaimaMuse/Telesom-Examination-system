import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import api from '../services/api';
import {useAuth} from '../context/AuthContext';
import {usePageSearch,matchesPageSearch} from '../context/PageSearchContext';
import TeachingIcon from './TeachingIcon';
import './ProjectDefenses.css';

function useDefensePaths(){
  const {pathname}=useLocation();
  const base=pathname.startsWith('/teacher')?'/teacher':pathname.startsWith('/judge')?'/judge':'/admin';
  return {route:base+'/project-defenses',defenseHome:base==='/judge'?base+'/project-defenses':base+'/evaluations/new',teacher:base==='/teacher',judge:base==='/judge'};
}

const endpoint='/evaluations/defenses';
const defaultRatingOptions=[1,2,3,4,5];
const defenseTitle='Project Presentation & Defense';
const candidateTitle='Candidate & Process Details';
const placementTitle='Final Placement & Selection Matrix';
const defaultRubric=[
  ['B','Conception, Problem Statement and Roles',[
    ['b1','What problem does your system solve, and why did you choose this particular problem?','Precise problem statement, genuine motivation, value proposition, and alignment with users.'],
    ['b2','Who are the intended users of your system, and what value does it provide to them?','Defined user personas, core features, intuitive layout, and feature prioritization.'],
    ['b3','Describe the roles and responsibilities of each team member throughout the project lifecycle.','Clear explanation of how team members work together.'],
  ]],
  ['C','Project Structure & Code Organization',[
    ['c1','How did you structure the front end of your system, and how did you make it responsive for different screen sizes?','Logical file structure, separation of CSS, Flexbox or Grid, media queries, and a mobile-first approach.'],
  ]],
  ['D','Hosting & System Architecture',[
    ['d1','How is your application hosted, and how do the frontend, backend, and database communicate with each other?','Trace a request through the API route, server controller, and database.'],
  ]],
  ['E','Security Protocols & Input Control',[
    ['e1','How have you secured your application? Explain authentication, authorization, and which routes are protected or public.','Token storage, password hashing, route guards, and backend input validation.'],
  ]],
  ['F','Future Development & Scalability',[
    ['f1','How would you improve and scale this project in the future?','Practical methods and operational considerations.'],
  ]],
  ['G','Professional Defense & Communication',[
    ['g1','Technical articulation'],
    ['g2','Demeanor under pressure'],
    ['g3','Willingness to accept critical feedback'],
    ['g4','Time management and teamwork during the presentation'],
  ]],
];
const outcomes=[
  ['pass','Pass (Excellent Defense)'],
  ['pass_minor','Pass (With Minor Revisions)'],
  ['pass_coaching','Pass (With Coaching & Major Revisions)'],
  ['resubmit','Resubmission Required'],
  ['fail','Fail'],
];
const details=[
  ['groupName','Group name','users','Enter group name',120],
  ['projectTitle','Project title','file','Enter project title',200],
];
const empty={course:'',students:[],ratings:{},notes:{},groupName:'',projectTitle:'',cohort:'',cohortYear:'',evaluatorName:'',
  defenseDate:'',outcome:'',summary:'',signature:'',signatureDate:'',status:'draft'};
const message=error=>error.response?.data?.message||'Unable to complete the request.';

function DefenseSectionTitle({icon,children}){
  return <h3 className="defense-section-heading">
    <span className="defense-icon defense-screen"><TeachingIcon name={icon} size={17}/></span>
    {children}
  </h3>;
}

function DefenseWordingEditor({wording,ratingOptions,usedRatings,useStandardRubric,onApply,onCancel}){
  const [draft,setDraft]=useState(()=>({...wording}));
  const [optionText,setOptionText]=useState(()=>ratingOptions.join(', '));
  const [optionError,setOptionError]=useState('');
  function field(key,label,fallback,required=true){
    return <label>{label}
      <input value={draft[key]??fallback} required={required} maxLength={500}
        onChange={event=>setDraft(previous=>({...previous,[key]:event.target.value}))}/>
    </label>;
  }
  return <form className="defense-section defense-wording-editor defense-screen" onSubmit={event=>{
    event.preventDefault();
    const parts=optionText.split(',').map(value=>value.trim());
    const options=parts.map(Number);
    if(parts.some(value=>!/^\d+$/.test(value))||options.some(value=>!Number.isSafeInteger(value)||value<1)||
        new Set(options).size!==options.length){
      setOptionError('Enter distinct positive whole numbers separated by commas.');
      return;
    }
    const inUse=[...new Set(usedRatings)].filter(value=>!options.includes(value));
    if(inUse.length){
      setOptionError('Change the marks using '+inUse.join(', ')+' before removing those options.');
      return;
    }
    onApply(draft,options.sort((a,b)=>a-b));
  }}>
    <DefenseSectionTitle icon="file">Edit Form</DefenseSectionTitle>
    {field('title','Form title',defenseTitle)}
    <label>Rating options
      <input value={optionText} required aria-describedby="defense-rating-options-help"
        aria-invalid={!!optionError} onChange={event=>{setOptionText(event.target.value);setOptionError('');}}/>
    </label>
    <p id="defense-rating-options-help">Separate options with commas, for example 1, 2, 3, 4, 5, 6. The highest number is the maximum score.</p>
    {optionError&&<p className="ev-error" role="alert">{optionError}</p>}
    {field('A','Section A title',candidateTitle)}
    {useStandardRubric&&defaultRubric.map(([section,title,criteria])=><fieldset key={section}>
      <legend>Section {section} · {title}</legend>
      {field(section,'Section title',title)}
      {criteria.map(([key,label,guidance],index)=><div key={key}>
        {field(key,`${section==='G'?'Attribute':'Question'} ${index+1}`,label)}
        {guidance&&field(key+'Hint','Evaluator guidance',guidance,false)}
      </div>)}
    </fieldset>)}
    {field('I','Section I title',placementTitle)}
    <div className="ev-actions">
      <button className="btn-primary" type="submit">Apply Changes</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  </form>;
}

function Rating({criterion,value,options,onChange}){
  return options.map(score=><label className="defense-rating" key={score}>
    <input type="radio" name={criterion} value={score} checked={value===score} onChange={()=>onChange(score)}/>
    <span>{score}</span>
  </label>);
}

const defaultSectionMarks={B:15,C:20,D:20,E:15,F:10,G:10};
const defaultProjectTotal=90;
const readMarks=event=>event.target.value===''?'':event.target.valueAsNumber;
const validMarks=value=>Number.isSafeInteger(value)&&value>0;
const validQuestionMarks=value=>Number.isFinite(value)&&value>0;
const questionTotalMatches=section=>Math.abs(marksSum(section.questions)-section.marks)<0.000001;
const marksSum=items=>items.reduce((sum,item)=>sum+Number(item.marks),0);
const newQuestion=()=>({key:'q'+crypto.randomUUID(),title:'',marks:''});

function CustomRubricEditor({sections,sectionOffset,onChange}){
  const updateSection=(key,update)=>onChange(sections.map(section=>{
    if(section.key!==key)return section;
    const updated={...section,...update};
    if(update.marks!==undefined||update.questions!==undefined){
      updated.questions=updated.questions.map(question=>({...question,marks:Number(updated.marks)/updated.questions.length}));
    }
    return updated;
  }));
  return <div className="defense-custom-rubric">
    {sections.map((section,index)=><fieldset className="defense-criterion" key={section.key}>
      <legend>Section {sectionOffset+index+1}</legend>
      <div className="defense-rubric-fields">
        <label>Section title<input maxLength={500} value={section.title}
          onChange={event=>updateSection(section.key,{title:event.target.value})}/></label>
        <label>Section marks<input type="number" min="1" value={section.marks}
          onChange={event=>updateSection(section.key,{marks:readMarks(event)})}/></label>
      </div>
      {section.questions.map((question,questionIndex)=>{
        const updateQuestion=update=>updateSection(section.key,{questions:section.questions.map(item=>
          item.key===question.key?{...item,...update}:item)});
        return <div className="defense-rubric-fields" key={question.key}>
          <label>Sub-question {questionIndex+1}<input maxLength={500} value={question.title}
            onChange={event=>updateQuestion({title:event.target.value})}/></label>
          <button type="button" onClick={()=>updateSection(section.key,{questions:section.questions.filter(item=>item.key!==question.key)})}>
            Remove question
          </button>
        </div>;
      })}
      <div className="defense-group-tabs">
        <button type="button" disabled={section.questions.length>=50}
          onClick={()=>updateSection(section.key,{questions:[...section.questions,newQuestion()]})}>+ Add Sub-question</button>
        <button type="button" onClick={()=>onChange(sections.filter(item=>item.key!==section.key))}>Remove Section</button>
      </div>
    </fieldset>)}
    <button type="button" disabled={sections.length>=30} onClick={()=>onChange([...sections,
      {key:'s'+crypto.randomUUID(),title:'',marks:'',questions:[newQuestion()]}])}>+ Add Section</button>
  </div>;
}
const formatMarks=marks=>marks===null?'Incomplete':marks.toFixed(2);

function defenseScores(ratings,maxRating,sectionMarks,rubric){
  const marks=rubric.map(([section,,criteria])=>{
    const values=criteria.map(([key])=>ratings[key]);
    if(!values.length||values.some(value=>value===undefined))return null;
    return values.reduce((total,value,index)=>total+
      value/maxRating*(criteria[index][3]??sectionMarks[section]/criteria.length),0);
  });
  const total=!marks.length||marks.includes(null)?null:marks.reduce((sum,value)=>sum+value,0);
  return {marks,total};
}

function DefenseMarksEditor({ratings,ratingOptions,maxRating,sectionMarks,totalMarks,rubric,wording,busy,error,onSave,onCancel}){
  const [draft,setDraft]=useState(()=>({...ratings}));
  const {total}=defenseScores(draft,maxRating,sectionMarks,rubric);
  return <form className="defense-section defense-marks-editor defense-screen" onSubmit={event=>{
    event.preventDefault();
    if(!busy)onSave(draft);
  }}>
    <DefenseSectionTitle icon="chart">Edit Marks · {total===null?'Incomplete':`${formatMarks(total)} / ${totalMarks}`}</DefenseSectionTitle>
    <fieldset disabled={busy}>
      {rubric.map(([section,title,criteria])=><section className="defense-mark-section" key={section}>
        <h4>{wording(section,title)}</h4>
        {criteria.map(([key,label])=><fieldset className="defense-criterion" key={key}>
          <legend>{wording(key,label)}</legend>
          <div className="defense-scores"><Rating criterion={key} value={draft[key]} options={ratingOptions}
            onChange={value=>setDraft(previous=>({...previous,[key]:value}))}/></div>
        </fieldset>)}
      </section>)}
    </fieldset>
    {error&&<p className="ev-error" role="alert">{error}</p>}
    <div className="ev-actions">
      <button className="btn-primary" type="submit" disabled={busy}>{busy?'Saving…':'Save Marks'}</button>
      <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </form>;
}

function CohortPicker({course,cohort,cohortYear,autoSelect,onChange}){
  const [options,setOptions]=useState(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!course)return;
    const controller=new AbortController();
    api.get(endpoint+'/courses/'+course+'/cohorts',{signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setOptions(data.cohorts);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[course,retry]);
  useEffect(()=>{
    if(autoSelect&&!cohort&&options?.length===1)onChange(options[0]);
  },[autoSelect,cohort,options,onChange]);
  const value=cohort?JSON.stringify([cohort,cohortYear||'']):'';
  const label=[cohort,cohortYear].filter(Boolean).join(' · ');
  const missing=cohort&&!options?.some(option=>option.name===cohort&&option.academicYear===cohortYear);
  return <div>
    <label>
      <span className="defense-field-label"><span className="defense-screen"><TeachingIcon name="layers" size={15}/></span>Training cohort</span>
      <select className="defense-screen" value={value} disabled={!options?.length}
        onChange={event=>{
          const [name,academicYear]=JSON.parse(event.target.value);
          onChange({name,academicYear});
        }}>
        <option value="" disabled>{!course?'Choose a course first':error?'Unable to load cohorts':!options?'Loading cohorts…':options.length?'Select a cohort':'No cohorts found'}</option>
        {missing&&<option value={value}>{label}</option>}
        {options?.map(option=>{
          const key=JSON.stringify([option.name,option.academicYear]);
          return <option key={key} value={key}>{option.name} · {option.academicYear}</option>;
        })}
      </select>
      <span className="defense-print">{label||'—'}</span>
    </label>
    {error&&<p className="defense-screen" role="alert">{error} <button type="button" onClick={()=>{setError('');setRetry(value=>value+1);}}>Retry</button></p>}
  </div>;
}

function StudentPicker({course,cohort,cohortYear,assessment,assessmentType,defense,assigned,selected,onChange}){
  const [page,setPage]=useState(1);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!course)return;
    const controller=new AbortController();
    const params={page,...(cohortYear?{cohortName:cohort,cohortYear}:{}),assessment,assessmentType,defense};
    api.get('/evaluations/eligible/'+course,{params,signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[course,cohort,cohortYear,assessment,assessmentType,defense,page,retry]);

  function changePage(next){
    setResult(null);
    setError('');
    setPage(next);
  }
  return <fieldset className="defense-student-picker">
    <legend><TeachingIcon name="users" size={16}/> Enrolled students · {selected.length} selected</legend>
    {!course?<p>Choose a course to load students.</p>:error?<p role="alert">{error} <button type="button" onClick={()=>{setError('');setRetry(value=>value+1);}}>Retry</button></p>:!result?<p role="status">Loading students…</p>:<>
      {result.total===0&&<p>{cohortYear?'No enrolled students for this cohort.':'No enrolled students for this course.'}</p>}
      <div className="defense-students">{result.students.filter(student=>!assigned.has(student._id)).map(student=><label key={student._id}>
        <input type="checkbox" checked={selected.includes(student._id)} onChange={event=>onChange(event.target.checked
          ? [...selected,student._id] : selected.filter(id=>id!==student._id))}/>
        {student.user?.name}
      </label>)}</div>
      {result.total>50&&<div className="ev-actions">
        <button type="button" disabled={page<=1} onClick={()=>changePage(page-1)}>Previous</button>
        <span>Page {page} of {Math.ceil(result.total/50)}</span>
        <button type="button" disabled={page*50>=result.total} onClick={()=>changePage(page+1)}>Next</button>
      </div>}
    </>}
  </fieldset>;
}

export function ProjectDefenseList(){
  const {route,defenseHome}=useDefensePaths();
  const [search]=usePageSearch();
  const [page,setPage]=useState(1);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    api.get(endpoint,{params:{page,search},signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[page,search]);
  useEffect(()=>{setPage(1);},[search]);
  function changePage(next){
    setResult(null);
    setError('');
    setPage(next);
  }
  return <div className="evaluations">
    <div className="ev-actions"><h2>{route.startsWith('/judge')?'Assigned Project Defenses':'Project Defense Evaluations'}</h2><Link to={defenseHome}>Back to Project Defense</Link></div>
    {error?<p role="alert">{error}</p>:!result?<p role="status">Loading evaluations…</p>:<>
      {result.records.length===0&&<p>{search.trim()?'No project defenses match your search.':'No project defense evaluations yet.'}</p>}
      <div className="ev-grid ev-admin-grid">{result.records.map(record=><article className="ev-card ev-admin-card" key={record._id}>
        <header className="ev-admin-card-heading"><span>{record.course?.name||record.course?.title}</span>
          <span className="ev-status" data-state={record.status}>{record.submittedAt?'Sent to Admin':record.status}</span></header>
        <h3>{record.projectTitle||'Untitled project'}</h3>
        <p>{[record.groupName,record.cohort].filter(Boolean).join(' · ')}</p>
        <div className="ev-card-links"><Link className="btn" to={route+'/'+record._id+'?view=scoring'}>Open Evaluation</Link></div>
      </article>)}</div>
      {result.total>50&&<div className="ev-actions">
        <button disabled={page<=1} onClick={()=>changePage(page-1)}>Previous</button>
        <span>Page {page} of {Math.ceil(result.total/50)}</span>
        <button disabled={page*50>=result.total} onClick={()=>changePage(page+1)}>Next</button>
      </div>}
    </>}
  </div>;
}

export function EvaluationCenter({admin=false}){
  const [search]=usePageSearch();
  const {route}=useDefensePaths();
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    api.get(endpoint,{params:{page:1,search},signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[attempt,search]);
  const records=result?.records||[];
  const awaitingReview=records.filter(record=>record.submittedAt&&record.status!=='finalized').length;
  const finalized=records.filter(record=>record.status==='finalized').length;
  const inProgress=records.filter(record=>!record.submittedAt&&record.status!=='finalized').length;
  const steps=admin
    ? [['1','Review submission','Open a teacher-submitted evaluation and check the group details and rubric.'],
      ['2','Add your assessment','Complete your own ratings and notes as an additional evaluator.'],
      ['3','Finalize results','Finalize the shared assessment to record the group marks.']]
    : [['1','Create a group','Choose the course and assessment, then select the project group.'],
      ['2','Evaluate the project','Use the rubric to add ratings, notes and an outcome recommendation.'],
      ['3','Send to Admin','Submit your completed evaluation for the Admin’s review and finalization.']];
  return <div className="evaluations evaluation-center">
    <header className="defense-center-hero">
      <div className="defense-center-copy">
        <span className="defense-center-eyebrow">TELESOM ACADEMY · ACADEMIC EVALUATIONS</span>
        <h2>Project Defense Evaluation</h2>
        <p>{admin
          ? 'Review teacher assessments, contribute evaluator ratings and finalize project marks.'
          : 'Evaluate student projects, save your progress and submit completed assessments to Admin.'}</p>
        <div className="defense-center-actions">
          <Link className="btn btn-primary" to={admin?route:'/teacher/evaluations/new'}>
            <TeachingIcon name={admin?'clipboard':'edit'} size={17}/>{admin?'Review project defenses':'Start a group evaluation'}
          </Link>
          {admin&&<Link className="btn" to="/admin/evaluations/new"><TeachingIcon name="file" size={17}/>Create defense setup</Link>}
          {admin&&<Link className="btn" to="/admin/evaluations"><TeachingIcon name="clipboard" size={17}/>Course feedback forms</Link>}
        </div>
      </div>
      <span className="defense-center-hero-icon" aria-hidden="true"><TeachingIcon name="clipboard" size={42}/></span>
    </header>
    <section className="defense-center-workflow" aria-labelledby="defense-center-workflow-title">
      <div className="defense-center-section-heading">
        <div><span className="ev-eyebrow">SHARED WORKFLOW</span><h3 id="defense-center-workflow-title">How Admin and Teachers work together</h3></div>
        <span className="defense-center-role">{admin?'ADMIN WORKSPACE':'TEACHER WORKSPACE'}</span>
      </div>
      <div className="defense-center-steps">{steps.map(([number,title,description])=>
        <article className="defense-center-step" key={number}>
          <span>{number}</span><div><h4>{title}</h4><p>{description}</p></div>
        </article>)}</div>
    </section>
    <section className="defense-center-records" aria-labelledby="defense-center-records-title">
      <div className="defense-center-section-heading">
        <div><span className="ev-eyebrow">RECENT ACTIVITY</span><h3 id="defense-center-records-title">Project evaluations</h3></div>
        <Link className="btn" to={route}>View all evaluations</Link>
      </div>
      {error
        ? <p className="ev-error" role="alert">{error} <button type="button" onClick={()=>{setError('');setResult(null);setAttempt(value=>value+1);}}>Retry</button></p>
        : !result
          ? <p role="status">Loading project evaluations…</p>
          : <>
            <div className="defense-center-stats">
              <div><span>In progress</span><strong>{inProgress}</strong></div>
              <div><span>Awaiting Admin review</span><strong>{awaitingReview}</strong></div>
              <div><span>Finalized</span><strong>{finalized}</strong></div>
            </div>
            {records.length
              ? <div className="defense-center-recent">{records.slice(0,4).map(record=>{
                const status=record.submittedAt&&record.status!=='finalized'?'Awaiting Admin review':
                  record.status==='finalized'?'Finalized':'In progress';
                return <Link className="defense-center-record" key={record._id}
                  to={route+'/'+record._id+(admin?'?view=scoring':'')}>
                  <span className="defense-center-record-icon"><TeachingIcon name="file" size={18}/></span>
                  <span className="defense-center-record-copy">
                    <strong>{record.projectTitle||record.groupName||'Untitled project'}</strong>
                    <small>{[record.course?.name||record.course?.title,record.groupName].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className="defense-center-record-status" data-state={status==='Finalized'?'done':status==='Awaiting Admin review'?'review':'active'}>{status}</span>
                  <TeachingIcon name="arrow" size={17}/>
                </Link>;
              })}</div>
              : <p className="defense-center-empty">No project evaluations yet. Start a group evaluation to begin the shared review process.</p>}
          </>}
    </section>
  </div>;
}

export function ProjectDefenseEditor(){
  const {teacher}=useDefensePaths();
  const {id}=useParams();
  const [params]=useSearchParams();
  const initialCourse=id?'':params.get('course')||'';
  const initialScoring=params.get('view')==='scoring';
  return teacher?<TeacherDefenseForm key={id||'new'} id={id}/>:
    <DefenseForm key={id||'new:'+initialCourse} id={id} initialCourse={initialCourse} initialScoring={initialScoring}/>;
}

function SubmissionConfirmation({record,onClose}){
  const dialogRef=useRef(null);
  useEffect(()=>{
    const dialog=dialogRef.current;
    const previous=document.activeElement;
    dialog.showModal();
    return ()=>{dialog.close();if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={dialogRef} className="defense-submission-dialog" aria-labelledby="defense-sent-title"
    onCancel={event=>{event.preventDefault();onClose();}}
    onClick={event=>{
      if(event.target!==event.currentTarget)return;
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
    }}>
    <div className="defense-submission-success">
      <button type="button" className="defense-submission-dismiss" aria-label="Close confirmation" onClick={onClose}>×</button>
      <span className="defense-submission-success-icon" aria-hidden="true"><TeachingIcon name="check" size={34}/></span>
      <div>
        <strong id="defense-sent-title">Form successfully sent to Admin</strong>
        <p>Your project defense form is ready for the admin to review and assign students to groups.</p>
        <span className="defense-submission-success-date">Sent {new Date(record.submittedAt).toLocaleString('en-GB',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'})}</span>
      </div>
      <button type="button" className="defense-submission-done" onClick={onClose}>Done</button>
    </div>
  </dialog>;
}

function TeacherDefenseForm({id}){
  const [search]=usePageSearch();
  const [confirmation,setConfirmation]=useState(null);

  const [form,setForm]=useState(null);
  const [assessments,setAssessments]=useState([]);
  const [records,setRecords]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const freshForm=()=>({...empty,customRubric:[],appendCustomRubric:false,projectTotalMarks:0});
  useEffect(()=>{
    const controller=new AbortController();
    const options={signal:controller.signal};
    Promise.all([api.get(endpoint+'/assessments',options),api.get(endpoint,options),
      id?api.get(endpoint+'/'+id,options):null])
      .then(([assessmentResult,listResult,recordResult])=>{
        if(controller.signal.aborted)return;
        setAssessments(assessmentResult.data.assessments);
        setRecords(listResult.data.records);
        setForm(recordResult?.data.record||freshForm());
      })
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[id]);
  const sections=form?.customRubric||[];
  const total=marksSum(sections);
  const selectedAssessment=assessments.find(item=>item._id===form?.assessment);
  const assessmentMaximum=selectedAssessment?.totalMarks??form?.assessmentTotalMarks;
  const valid=total===assessmentMaximum&&sections.length>0&&sections.every(section=>section.title.trim()&&validMarks(section.marks)&&
    section.questions.length>0&&questionTotalMatches(section)&&
    section.questions.every(question=>question.title.trim()&&validQuestionMarks(question.marks)));
  async function openForm(recordId){
    setError('');
    setNotice('');
    if(!recordId){setForm(freshForm());return;}
    setBusy(true);
    try{
      const {data}=await api.get(endpoint+'/'+recordId);
      setForm(data.record);
    }catch(error){setError(message(error));}
    finally{setBusy(false);}
  }
  async function saveForm(send){
    if(busy||form.submittedAt)return;
    setBusy(true);
    setError('');
    setNotice('');
    try{
      const selected=assessments.find(item=>item._id===form.assessment);
      if(!selected)throw new Error('Choose an exam.');
      if(total!==selected.totalMarks)throw new Error(`Section marks must add up to ${selected.totalMarks}, the maximum marks for ${selected.title}.`);
      if(!valid)throw new Error('Complete the sections, sub-questions and marks before saving.');
      const payload={...form,course:selected.course._id,assessmentType:'exam',
        groupName:selected.title,students:[],ratings:{},notes:{},additionalEvaluations:[],
        customRubric:sections,appendCustomRubric:false,projectTotalMarks:selected.totalMarks,finalize:false};
      const saved=form._id?await api.put(endpoint+'/'+form._id,payload):await api.post(endpoint,payload);
      let record=saved.data.record;
      setForm(record);
      setRecords(previous=>[record,...previous.filter(item=>item._id!==record._id)]);
      if(send){
        const {data}=await api.post(endpoint+'/'+record._id+'/submit',{__v:record.__v});
        record=data.record;
        setForm(record);
        setRecords(previous=>previous.map(item=>item._id===record._id?record:item));
        setConfirmation(record);

      }
      setNotice(send?'Form sent to the admin.':'Form saved.');
    }catch(error){setError(error.response?.data?.message||error.message);}
    finally{setBusy(false);}
  }
  return <div className="evaluations ev-create defense-page">
    <header className="ev-create-hero">
      <div><h2>Project Defense</h2><p>Create sections, sub-questions and marks, then send the form to the admin.</p></div>
      <div className="ev-create-hero-art" aria-hidden="true">
        <span className="ev-create-hero-sheet"><TeachingIcon name="clipboard" size={47}/></span>
        <span className="ev-create-hero-cap"><TeachingIcon name="graduate" size={37}/></span>
      </div>
    </header>
    <section className="defense-section defense-teacher-builder">
      {error&&<p className="ev-error" role="alert">{error}</p>}
      {confirmation&&<SubmissionConfirmation record={confirmation} onClose={()=>setConfirmation(null)}/>}

      {notice&&!form?.submittedAt&&<p className="ev-notice" role="status">{notice}</p>}
      {!form?(!error&&<p role="status">Loading form…</p>):<>
        {records.length>0&&<label>Saved forms
          <select value={form._id||''} disabled={busy} onChange={event=>openForm(event.target.value)}>
            <option value="">New form</option>
            {records.filter(record=>record._id===form?._id||matchesPageSearch(search,record.projectTitle,record.groupName,record.cohort,record.course)).map(record=><option key={record._id} value={record._id}>
              {record.assessmentTitle||record.groupName}{record.submittedAt?' · Sent to Admin':''}
            </option>)}
          </select>
        </label>}
        <fieldset className="defense-fields" disabled={busy||!!form.submittedAt}>
          <label>Exam
            <select required value={form.assessment||''} onChange={event=>setForm(previous=>({...previous,assessment:event.target.value}))}>
              <option value="">Select an exam</option>
              {assessments.map(item=><option key={item._id} value={item._id}>{item.title}</option>)}
              {form.assessment&&!assessments.some(item=>item._id===form.assessment)&&
                <option value={form.assessment}>{form.assessmentTitle}</option>}
            </select>
          </label>
          {!assessments.length&&<p>No exams are available for your course yet.</p>}
          <CustomRubricEditor sections={sections} sectionOffset={0}
            onChange={customRubric=>setForm(previous=>({...previous,customRubric}))}/>
          <p className="defense-builder-total" role="status">Total section marks <strong>{total||0} / {assessmentMaximum??'—'}</strong></p>
          {selectedAssessment&&total!==assessmentMaximum&&<p role="status">
            Allocate {assessmentMaximum} marks across your sections to match {selectedAssessment.title}.
          </p>}
          {!form.submittedAt&&<div className="ev-actions">
            <button type="button" disabled={!valid||!form.assessment} onClick={()=>saveForm(false)}>Save Form</button>
            <button type="button" className="btn-primary" disabled={!valid||!form.assessment}
              onClick={()=>saveForm(true)}>Send to Admin</button>
          </div>}
        </fieldset>
      </>}
    </section>
  </div>;
}

function DefenseForm({id,initialCourse,initialScoring=false}){
  const [search]=usePageSearch();
  const {route,teacher,judge}=useDefensePaths();
  const {user}=useAuth();

  const navigate=useNavigate();
  const [groups,setGroups]=useState(()=>[{...empty,groupName:'Group 1'}]);
  const [activeGroup,setActiveGroup]=useState(0);
  const [courses,setCourses]=useState(null);
  const [assessments,setAssessments]=useState([]);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [editingWording,setEditingWording]=useState(false);
  const [editingMarks,setEditingMarks]=useState(false);
  const [showScoring,setShowScoring]=useState(initialScoring);
  const [activeEvaluator,setActiveEvaluator]=useState(0);
  const scoringRef=useRef(null);
  const groupDetailsRef=useRef(null);
  useEffect(()=>{
    const controller=new AbortController();
    const options={signal:controller.signal};
    if(judge){
      Promise.all([api.get(endpoint,options),id?api.get(endpoint+'/'+id,options):null])
        .then(([listResult,recordResult])=>{
          if(controller.signal.aborted)return;
          const records=listResult.data.records||[];
          const opened=recordResult?.data.record;
          if(opened){
            const openedWithCourse={
              ...opened,
              course:{_id:opened.course,...(recordResult.data.course||{})},
            };
            const index=records.findIndex(record=>record._id===opened._id);
            if(index<0)records.unshift(openedWithCourse);
            else records[index]=openedWithCourse;
          }
          const normalized=records.map(record=>({
            ...record,
            courseName:record.course?.title||record.course?.name||'',
            course:String(record.course?._id||record.course||''),
            evaluatorName:user?.name||record.evaluatorName||'',
          }));
          setGroups(normalized.length?normalized:[{...empty,groupName:'Assigned evaluation'}]);
          setActiveGroup(Math.max(0,normalized.findIndex(record=>record._id===id)));
          setCourses([...new Map(normalized.filter(record=>record.course).map(record=>[
            record.course,{_id:record.course,title:record.courseName,name:record.courseName},
          ])).values()]);
          setAssessments([]);
        })
        .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
      return()=>controller.abort();
    }
    Promise.all([api.get('/evaluations/courses',options),id?api.get(endpoint+'/'+id,options):null,
      api.get(endpoint+'/assessments',options)])
      .then(async ([courseResult,recordResult,assessmentResult])=>{
        if(controller.signal.aborted)return;
        const opened=recordResult?.data.record;
        const courseId=opened?.course||(teacher?courseResult.data.courses[0]?._id:
          courseResult.data.courses.find(course=>course._id===initialCourse)?._id);
        const records=courseId
          ? (await api.get(endpoint+'/courses/'+courseId+'/groups',options)).data.records
          : [];
        if(controller.signal.aborted)return;
        if(opened&&!records.some(record=>record._id===opened._id))records.unshift(opened);
        setGroups(records.length?records:[{...empty,course:courseId||'',groupName:'Group 1'}]);
        setActiveGroup(Math.max(0,records.findIndex(record=>record._id===id)));
        setCourses(courseResult.data.courses);
        setAssessments(assessmentResult.data.assessments);
      })
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[id,initialCourse,teacher,judge,user?.name]);


  const form=groups[activeGroup];

  useEffect(()=>{
    if(!initialScoring||!form?._id)return;
    const frame=requestAnimationFrame(()=>scoringRef.current?.scrollIntoView({block:'start'}));
    return ()=>cancelAnimationFrame(frame);
  },[form?._id,initialScoring]);

  const customRubric=form.customRubric;
  const useStandardRubric=!customRubric||form.appendCustomRubric;
  const standardMarks=form.rubricSectionMarks||defaultSectionMarks;
  const customSections=customRubric||[];
  const rubric=[
    ...(useStandardRubric?defaultRubric:[]),
    ...customSections.map(section=>[section.key,section.title,
      section.questions.map(question=>[question.key,question.title,'',question.marks])]),
  ];
  const sectionMarks={
    ...standardMarks,
    ...Object.fromEntries(customSections.map(section=>[section.key,section.marks])),
  };
  const totalMarks=form.projectTotalMarks??defaultProjectTotal;
  const sectionTotal=rubric.reduce((sum,[section])=>sum+Number(sectionMarks[section]),0);
  const validAllocation=validMarks(totalMarks)&&sectionTotal===totalMarks&&
    rubric.length>0&&rubric.every(([section])=>validMarks(sectionMarks[section]))&&
    customSections.every(section=>section.title.trim()&&section.questions.length>0&&
      questionTotalMatches(section)&&section.questions.every(question=>question.title.trim()&&validQuestionMarks(question.marks)));
  const additionalEvaluations=judge?[]:form.additionalEvaluations||[];

  const evaluation=additionalEvaluations[activeEvaluator-1];
  const ratings=judge?form.ratings:evaluation?.ratings||form.ratings;
  const notes=judge?form.notes:evaluation?.notes||form.notes;
  const assigned=new Set(groups.flatMap((group,index)=>index!==activeGroup&&group.course===form.course&&
    group.assessment===form.assessment&&group.assessmentType===form.assessmentType?group.students:[]));
  const ratingOptions=form.ratingOptions||defaultRatingOptions;
  const maxRating=ratingOptions.reduce((highest,option)=>Math.max(highest,option),0);
  const submitted=teacher&&!!form.submittedAt;
  const finalized=form.status==='finalized'||submitted;
  const editing=editingWording||editingMarks;
  const wording=(key,fallback)=>form.wording?.[key]?.trim()||fallback;
  function setForm(update){
    setGroups(previous=>previous.map((group,index)=>index===activeGroup
      ? (typeof update==='function'?update(group):update)
      : group));
  }
  function selectGroup(index){
    setActiveGroup(index);
    setActiveEvaluator(0);
    setShowScoring(false);
    setNotice('');
    setError('');
  }
  function freshGroup(existing,source){
    const groupNames=new Set(existing.map(group=>group.groupName.trim().toLowerCase()));
    let number=1;
    while(groupNames.has('group '+number))number++;
    return {...empty,course:source.course,cohort:source.cohort,cohortYear:source.cohortYear,
      assessment:source.assessment,assessmentType:source.assessmentType,assessmentTitle:source.assessmentTitle,
      projectTotalMarks:source.projectTotalMarks,rubricSectionMarks:source.rubricSectionMarks,
      customRubric:source.customRubric,appendCustomRubric:source.appendCustomRubric,
      groupName:'Group '+number};
  }
  function addGroup(){
    setGroups(previous=>[...previous,freshGroup(previous,form)]);
    selectGroup(groups.length);
  }
  const patch=(key,value)=>{setNotice('');setForm(previous=>({...previous,[key]:value}));};
  function updateEvaluation(key,value){
    if(!evaluation){patch(key,value);return;}
    patch('additionalEvaluations',additionalEvaluations.map((item,index)=>index===activeEvaluator-1?{...item,[key]:value}:item));
  }
  function openScoring(){
    setShowScoring(true);
    requestAnimationFrame(()=>scoringRef.current?.scrollIntoView({block:'start'}));
  }
  function editGroup(){
    setShowScoring(false);
    groupDetailsRef.current?.querySelector('input')?.focus();
  }
  async function deleteGroup(){
    if(busy||!form._id||!window.confirm(`Delete ${form.groupName||'this group'} and its evaluations?`))return;
    setBusy(true);
    setError('');
    try{
      await api.delete(endpoint+'/'+form._id,{data:{__v:form.__v}});
      if(id===form._id){
        navigate(route+'/new?'+new URLSearchParams({course:form.course}),{replace:true});
        return;
      }
      const remaining=groups.filter((_,index)=>index!==activeGroup);
      setGroups(remaining.length?remaining:[{...empty,course:form.course,groupName:'Group 1'}]);
      selectGroup(Math.min(activeGroup,Math.max(0,remaining.length-1)));
    }catch(error){
      setError(message(error));
    }finally{
      setBusy(false);
    }
  }
  const rate=(key,value)=>updateEvaluation('ratings',{...ratings,[key]:value});
  const {marks,total}=defenseScores(ratings,maxRating,sectionMarks,rubric);
  const evaluatorTotals=[form.ratings,...additionalEvaluations.map(item=>item.ratings)]
    .map(item=>defenseScores(item,maxRating,sectionMarks,rubric).total);
  const groupTotal=evaluatorTotals.includes(null)?null:evaluatorTotals.reduce((sum,value)=>sum+value,0)/evaluatorTotals.length;
  const course=courses?.find(course=>course._id===form.course);
  const courseAssessments=assessments.filter(item=>!form.course||item.course._id===form.course);
  const assessmentValue=form.assessment?form.assessmentType+':'+form.assessment:'';
  const assessmentKey=assessment=>assessment.type+':'+assessment._id;
  const currentAssessment=courseAssessments.find(item=>assessmentKey(item)===assessmentValue);
  const assessmentMax=finalized
    ? form.assessmentTotalMarks ?? currentAssessment?.totalMarks
    : currentAssessment?.totalMarks ?? form.assessmentTotalMarks;
  const assessmentMarks=!validAllocation||groupTotal===null?null:groupTotal/totalMarks*assessmentMax;
  const courseLabel=course?.name||course?.title||form.courseName||'';
  async function save(finalize,continueToScoring=false){

    if(busy||finalized)return;
    if(!form._id&&(!form.groupName.trim()||!form.students.length)){
      setError('Enter a group name and select at least one student.');
      return;
    }
    if(!validAllocation){
      setNotice('');
      setError('Complete the rubric and make sure question marks add up to each section and section marks add up to the project total.');
      return;
    }
    if(finalize){
      const missing=[
        !form.evaluatorName?.trim()&&'Evaluator name',
        !form.students.length&&'At least one enrolled student',
        !form.projectTitle?.trim()&&'Project title',
        !form.cohort?.trim()&&'Training cohort',
        !form.defenseDate&&'Defense date',
        ...additionalEvaluations.flatMap((item,index)=>[
          !item.name.trim()&&`Evaluator ${index+2} name`,
          defenseScores(item.ratings,maxRating,sectionMarks,rubric).total===null&&`Complete all ratings for ${item.name.trim()||'evaluator '+(index+2)}`,
        ]),
        ...rubric.flatMap(([section,title,criteria])=>criteria
          .filter(([key])=>form.ratings[key]===undefined)
          .map(([key,label])=>`${wording(section,title)} rating — ${wording(key,label)}`)),
      ].filter(Boolean);
      if(missing.length){
        setNotice('');
        setError(['Complete these items before finalizing:',...missing.map(item=>'• '+item)].join('\n'));
        return;
      }
    }
    if(finalize&&!window.confirm('Finalize this evaluation with the displayed marks?'))return;
    setBusy(true);
    setError('');
    setNotice('');
    try{
      const response=form._id
        ? await api.put(endpoint+'/'+form._id,{...form,finalize})
        : await api.post(endpoint,{...form,finalize});
      if(!form._id&&!finalize){
        const savedGroups=groups.map((group,index)=>index===activeGroup?response.data.record:group);
        setGroups([...savedGroups,freshGroup(savedGroups,response.data.record)]);
        selectGroup(savedGroups.length);
        requestAnimationFrame(()=>groupDetailsRef.current?.scrollIntoView({block:'start'}));
      }else{
        setForm(response.data.record);
      }
      setNotice(finalize?'Evaluation finalized.':'');
    }catch(error){
      setError(message(error));
    }finally{
      setBusy(false);
    }
  }
  async function sendToAdmin(){
    const record=form.status==='finalized'?form:await save(false);
    if(!record)return;
    setBusy(true);
    setError('');
    try{
      const {data}=await api.post(endpoint+'/'+record._id+'/submit',{__v:record.__v});
      setForm(data.record);
      setNotice('Form sent to the admin.');
    }catch(error){
      setError(message(error));
    }finally{
      setBusy(false);
    }
  }
  async function saveMarks(ratings){
    if(submitted)return;
    setError('');
    if(!finalized){
      updateEvaluation('ratings',ratings);
      setEditingMarks(false);
      setNotice('Marks updated. Save the draft to keep these changes.');
      return;
    }
    setBusy(true);
    try{
      const {data}=await api.patch(endpoint+'/'+form._id+'/marks',{ratings,evaluatorId:evaluation?._id,__v:form.__v});
      setForm(data.record);
      setEditingMarks(false);
      setNotice('Marks saved.');
    }catch(error){
      setError(message(error));
    }finally{
      setBusy(false);
    }
  }
  return <div className="evaluations defense-page">
    {!courses?(error?<p className="ev-error" role="alert">{error}</p>:<p role="status">Loading evaluation…</p>)
      :judge&&!groups.some(group=>group._id)?<section className="defense-section"><h2>No evaluations assigned</h2><p>Project defense forms assigned to you by the administrator will appear here.</p></section>
      :<div className="defense-workspace">
      <aside className="defense-group-panel defense-group-sidebar defense-screen" aria-labelledby="defense-groups-title">
        <header className="defense-group-heading">
          <TeachingIcon name="users" size={19}/>
          <h3 id="defense-groups-title">List of Groups</h3>
          <span>{groups.filter(group=>group._id).length} saved</span>
        </header>
        <div className="defense-group-tabs" role="group" aria-label="Choose a group">
          {groups.map((group,index)=>{
            if(!matchesPageSearch(search,group.groupName,group.projectTitle,group.cohort,group.course,group.students,group.status))return null;
            const members=group.students?.length??0;
            const date=group.defenseDate&&new Date(group.defenseDate+'T00:00:00Z');
            const status=group.submittedAt?'Sent to Admin':group.status==='finalized'?'Finalized':group._id?'Draft':'Unsaved';
            return <button type="button" key={group._id||index} disabled={busy||editing}
              aria-pressed={index===activeGroup} onClick={()=>selectGroup(index)}>
              <span className="defense-group-avatar"><TeachingIcon name="users" size={18}/></span>
              <span className="defense-group-info">
                <strong>{group.groupName||'Group '+(index+1)}</strong>
                {date&&<span><TeachingIcon name="calendar" size={13}/> {date.toLocaleDateString('en-GB',{timeZone:'UTC'})}</span>}
                <span>{members} {members===1?'member':'members'}</span>
              </span>
              <span className="defense-group-status" data-status={status}>{status}</span>
            </button>;
          })}
        </div>
        {!judge&&<button type="button" disabled={busy||editing} onClick={addGroup}>+ Add Group</button>}
        <div className="defense-group-controls">
          <strong>Active group · {form.groupName||'Group '+(activeGroup+1)}</strong>
          {!judge&&form._id&&!finalized&&<>
            <button type="button" disabled={busy||editing} onClick={editGroup}><TeachingIcon name="edit" size={14}/> Edit Group</button>
            <button type="submit" form="defense-group-form" disabled={busy||editing}><TeachingIcon name="check" size={14}/> Save Group</button>
          </>}
          {teacher&&form._id&&!submitted&&<button type="button" className="btn-primary" disabled={busy||editing}
            onClick={sendToAdmin}>Send to Admin</button>}
          {submitted&&<p role="status">Sent to Admin · {new Date(form.submittedAt).toLocaleDateString('en-GB')}</p>}
          {!judge&&form._id&&!submitted&&<button type="button" className="defense-delete-group" disabled={busy||editing} onClick={deleteGroup}>
            <TeachingIcon name="trash" size={14}/> Delete Group
          </button>}
          {!judge&&form._id&&!finalized&&<button type="button" disabled={busy||editing}
            onClick={()=>{setError('');setEditingMarks(true);}}>Set Up Rubric</button>}

          {form._id&&<button type="button" disabled={busy||editing} aria-expanded={showScoring||finalized}
            aria-controls="defense-scoring" onClick={()=>showScoring&&!finalized?setShowScoring(false):openScoring()}>
            {showScoring&&!finalized?'Hide Scoring':'Open Scoring'}
          </button>}
          {!judge&&form._id&&!finalized&&showScoring&&<button type="button" disabled={busy||editing||!form.course}
            onClick={()=>save(true)}>Finalize Evaluation</button>}
          {!judge&&form._id&&<>
            {!finalized&&<button type="button" disabled={busy||editing} onClick={()=>setEditingWording(true)}>Edit Form</button>}
            {!submitted&&<button type="button" disabled={busy||editing} onClick={()=>{setError('');setNotice('');setEditingMarks(true);}}>Edit Marks</button>}
            <button type="button" disabled={editing} onClick={()=>window.print()}><TeachingIcon name="file" size={15}/> Print / Save PDF</button>
          </>}
          {judge&&form._id&&!finalized&&<>
            <button type="button" disabled={busy||editing} onClick={()=>save(false)}>{busy?'Saving…':'Save evaluation'}</button>
            <button type="button" className="btn-primary" disabled={busy||editing} onClick={()=>save(true)}>Finalize evaluation</button>
            <button type="button" disabled={editing} onClick={()=>window.print()}><TeachingIcon name="file" size={15}/> Print / Save PDF</button>
          </>}
        </div>
      </aside>
      <div className="defense-workspace-form">
      {(showScoring||finalized||editingMarks)&&(!finalized||additionalEvaluations.length>0||judge)&&<div className="defense-group-panel defense-evaluator-picker defense-screen">
        {!judge&&additionalEvaluations.length>0&&<label>Evaluator
          <select value={activeEvaluator} disabled={busy||editing} onChange={event=>setActiveEvaluator(Number(event.target.value))}>
            <option value={0}>{form.evaluatorName||'Evaluator 1'}</option>
            {additionalEvaluations.map((item,index)=><option key={index} value={index+1}>{item.name||`Evaluator ${index+2}`}</option>)}
          </select>
        </label>}
        {!judge&&!finalized&&<div className="defense-group-tabs">
          <button type="button" disabled={busy||editing} onClick={()=>{
            patch('additionalEvaluations',[...additionalEvaluations,{name:'',ratings:{},notes:{}}]);
            setActiveEvaluator(additionalEvaluations.length+1);
          }}>+ Add Evaluator</button>
          {evaluation&&<button type="button" disabled={busy||editing} onClick={()=>{
            patch('additionalEvaluations',additionalEvaluations.filter((_,index)=>index!==activeEvaluator-1));
            setActiveEvaluator(0);
          }}>Remove Evaluator</button>}
        </div>}
      </div>}
      {editingWording?<DefenseWordingEditor wording={form.wording} ratingOptions={ratingOptions} useStandardRubric={useStandardRubric}
        usedRatings={[form.ratings,...additionalEvaluations.map(item=>item.ratings)].flatMap(item=>Object.values(item))}
        onCancel={()=>setEditingWording(false)} onApply={(wording,options)=>{
        setForm(previous=>({...previous,wording,ratingOptions:options}));
        setEditingWording(false);
        setNotice('Form updated. Save the draft to keep these changes.');
      }}/>:editingMarks?<DefenseMarksEditor ratings={ratings} ratingOptions={ratingOptions} maxRating={maxRating}
        sectionMarks={sectionMarks} totalMarks={totalMarks} rubric={rubric} wording={wording} busy={busy} error={error}
        onSave={saveMarks} onCancel={()=>{setError('');setEditingMarks(false);}}/>
      :<form id="defense-group-form" onSubmit={event=>{event.preventDefault();save(false);}}>
        <header className="defense-title">
          <img src="/telesom-academy-logo.png" alt="Telesom Academy"/>
          <div>
            <h2>{wording('title',defenseTitle)}</h2>
            <p>{courseLabel||'System Architecture, Technical Implementations & Defense Matrix'}</p>
          </div>
          <img className="defense-title-art defense-screen" src="/certificates-graduation.webp" alt=""/>
        </header>
        <fieldset className="defense-fields" disabled={busy||finalized}>
          <section className="defense-section defense-group-details" ref={groupDetailsRef}>
            <DefenseSectionTitle icon="users">{form._id?wording('A',candidateTitle):'Group Creation'}</DefenseSectionTitle>
            <div className="defense-details">
              {!judge&&<label className="defense-screen"><span className="defense-field-label"><TeachingIcon name="clipboard" size={15}/> Exam or quiz</span><select value={assessmentValue} required={!form._id} onChange={event=>{
                const selected=courseAssessments.find(item=>assessmentKey(item)===event.target.value);
                if(!selected)return;
                setNotice('');
                setForm(previous=>({...previous,assessment:selected._id,assessmentType:selected.type,assessmentTitle:selected.title,
                  ...(previous.course===selected.course._id?{}:{course:selected.course._id,cohort:'',cohortYear:'',students:[]})}));
              }}>
                <option value="" disabled>{courseAssessments.length?'Select an exam or quiz':'No teacher-created exams or quizzes'}</option>
                {assessmentValue&&!courseAssessments.some(item=>assessmentKey(item)===assessmentValue)&&
                  <option value={assessmentValue}>{form.assessmentTitle||'Saved assessment'}</option>}
                {['exam','quiz'].map(type=>{
                  const options=courseAssessments.filter(item=>item.type===type);
                  return options.length>0&&<optgroup key={type} label={type==='exam'?'Exams':'Quizzes'}>
                    {options.map(item=><option key={assessmentKey(item)} value={assessmentKey(item)}>
                      {item.title}
                    </option>)}
                  </optgroup>;
                })}
              </select></label>}
              {form.assessmentTitle&&<p className="defense-print">Assessment · {form.assessmentTitle}</p>}
              <p className="defense-print">Course · {courseLabel}</p>
              {details.map(([field,label,icon,placeholder,maxLength])=><label key={field}>
                <span className="defense-field-label"><span className="defense-screen"><TeachingIcon name={icon} size={15}/></span>{label}</span>
                <input className="defense-screen" placeholder={placeholder} maxLength={maxLength} value={form[field]} readOnly={judge}
                  onChange={event=>patch(field,event.target.value)}/>
                <span className="defense-print">{form[field]||'—'}</span>
              </label>)}
              {judge?<p>Training cohort · {form.cohort||'—'} {form.cohortYear&&`(${form.cohortYear})`}</p>:<CohortPicker key={activeGroup+':'+form.course} course={form.course} cohort={form.cohort}
                cohortYear={form.cohortYear} autoSelect={!finalized&&(!form._id||!form.students.length)} onChange={({name,academicYear})=>{
                  setNotice('');
                  setForm(previous=>({...previous,cohort:name,cohortYear:academicYear,students:[]}));
                }}/>}
              <label><span className="defense-field-label"><span className="defense-screen"><TeachingIcon name="calendar" size={15}/></span>Defense date</span>
                <input className="defense-screen" type="date" value={form.defenseDate} readOnly={judge} onChange={event=>patch('defenseDate',event.target.value)}/>
                <span className="defense-print">{form.defenseDate||'—'}</span>
              </label>
              <label><span className="defense-field-label"><span className="defense-screen"><TeachingIcon name="profile" size={15}/></span>Evaluator name</span>
                <input className="defense-screen" placeholder="Enter evaluator name" maxLength={200} value={(evaluation?evaluation.name:form.evaluatorName)||''} readOnly={judge}
                  onChange={event=>updateEvaluation(evaluation?'name':'evaluatorName',event.target.value)}/>
                <span className="defense-print">{(evaluation?evaluation.name:form.evaluatorName)||'—'}</span>
              </label>
            </div>
            {!judge&&<div className="defense-screen"><StudentPicker key={JSON.stringify([activeGroup,form.course,form.cohort,form.cohortYear])}
              course={form.course} cohort={form.cohort} cohortYear={form.cohortYear}
              assessment={form.assessment} assessmentType={form.assessmentType} defense={form._id}
              assigned={assigned} selected={form.students} onChange={value=>patch('students',value)}/></div>}
          </section>
          <div id="defense-scoring" ref={scoringRef} className={showScoring||finalized?'defense-scoring':'defense-scoring is-collapsed'}>
          {rubric.map(([section,title,criteria],index)=><section className="defense-section" key={section}>
            <DefenseSectionTitle icon={section==='G'?'users':'clipboard'}>Section {section.startsWith('s')?index+1:section} · {wording(section,title)} · {sectionMarks[section]||'—'} marks</DefenseSectionTitle>
            {section==='G'?<div className="defense-matrix-scroll"><table className="defense-matrix defense-professional">
              <thead><tr><th scope="col">Key attribute</th>{ratingOptions.map(score=><th scope="col" key={score}>{score}</th>)}</tr></thead>
              <tbody>{criteria.map(([key,label])=><tr key={key}><th scope="row">{wording(key,label)}</th>{ratingOptions.map(score=><td key={score}>
                <input className="defense-screen" type="radio" name={key} aria-label={wording(key,label)+' · '+score}
                  checked={ratings[key]===score} onChange={()=>rate(key,score)}/>
                <span className="defense-print">{ratings[key]===score?'✓':''}</span>
              </td>)}</tr>)}</tbody>
            </table></div>:criteria.map(([key,label,guidance,questionMarks])=><fieldset className="defense-criterion" key={key}>
              <legend>{wording(key,label)}{questionMarks!==undefined&&` · ${questionMarks||'—'} marks`}</legend>
              {(form.wording?.[key+'Hint']??guidance)?.trim()&&<p className="defense-guidance">Look for · {form.wording?.[key+'Hint']??guidance}</p>}
              <div className="defense-scores defense-screen"><span>Rating</span><Rating criterion={key} value={ratings[key]} options={ratingOptions} onChange={value=>rate(key,value)}/></div>
              <p className="defense-print">Rating · {ratings[key]??'—'} / {maxRating}</p>
              {(guidance||questionMarks!==undefined)&&<label>Evaluation notes<textarea className="defense-screen" maxLength={4000} value={notes[key]||''}
                onChange={event=>updateEvaluation('notes',{...notes,[key]:event.target.value})}/>
                <span className="defense-print">{notes[key]||'—'}</span>
              </label>}
            </fieldset>)}
          </section>)}
          <section className="defense-section">
            <DefenseSectionTitle icon="chart">Section I · {wording('I',placementTitle)}</DefenseSectionTitle>
            <table className="defense-matrix"><thead><tr><th scope="col">Assessment category</th><th scope="col">Score</th></tr></thead>
              <tbody>{rubric.map(([section,title],index)=><tr key={section}><th scope="row">{wording(section,title)}</th><td>{formatMarks(marks[index])} / {sectionMarks[section]}</td></tr>)}</tbody>
              <tfoot>
                <tr><th scope="row">Evaluator rubric marks</th><td>{formatMarks(total)} / {totalMarks}</td></tr>
                {additionalEvaluations.length>0&&<tr><th scope="row">Group average</th><td>{formatMarks(groupTotal)} / {totalMarks}</td></tr>}
                {assessmentMax>0&&<tr><th scope="row">{form.assessmentTitle||'Assessment'} marks</th>
                  <td>{formatMarks(assessmentMarks)} / {assessmentMax}</td></tr>}
              </tfoot>
            </table>
            <fieldset className="defense-outcomes">
              <legend>Defense outcome recommendation</legend>
              {outcomes.map(([value,label])=><label className="defense-screen" key={value}>
                <input type="radio" name="outcome" checked={form.outcome===value} onChange={()=>patch('outcome',value)}/>{label}
              </label>)}
              <p className="defense-print">{outcomes.find(([value])=>form.outcome===value)?.[1]||'—'}</p>
            </fieldset>
            <label>Evaluator comments &amp; final summary<textarea className="defense-screen" maxLength={6000} value={form.summary}
              onChange={event=>patch('summary',event.target.value)}/><span className="defense-print">{form.summary||'—'}</span></label>
            <div className="defense-details">
              <label>Evaluator signature<input className="defense-screen" maxLength={200} value={form.signature} onChange={event=>patch('signature',event.target.value)}/>
                <span className="defense-print">{form.signature||'—'}</span></label>
              <label>Signature date<input className="defense-screen" type="date" value={form.signatureDate} onChange={event=>patch('signatureDate',event.target.value)}/>
                <span className="defense-print">{form.signatureDate||'—'}</span></label>
            </div>
          </section>
          </div>
        </fieldset>
        {(error||notice||!form._id)&&<footer className="defense-footer defense-screen">
          {error&&<p className="ev-error defense-save-error" role="alert">{error}</p>}
          {notice&&<p className="ev-notice" role="status">{notice}</p>}
          {!form._id&&<div className="ev-actions">
            <button type="submit" className="btn-primary" disabled={busy}>{busy?'Saving…':'Create Group'}</button>
          </div>}
        </footer>}
      </form>}
      </div>
    </div>}
  </div>;
}
