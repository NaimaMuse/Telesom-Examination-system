import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import api from '../services/api';
import TeachingIcon from './TeachingIcon';
import './DefenseWorkflow.css';

const endpoint='/evaluations/defenses/workflow';
const message=error=>error.response?.data?.message||error.message||'Unable to complete this action.';
const mark=value=>value===null||value===undefined?'—':Number(value).toLocaleString('en',{maximumFractionDigits:2});
const sum=values=>values.reduce((total,value)=>total+Number(value||0),0);
const inputMark=value=>value===''||value===null?null:Number(value);
const newQuestion=()=>({title:''});
const newSection=()=>({title:'',marks:'',questions:[newQuestion()]});
const formStatus={draft:'Draft',review:'In review',approved:'Approved'};
const groupStatus=group=>group.status==='finalized'?'Finalized':
  group.workflowEvaluators.every(evaluator=>evaluator.submittedAt)?'Ready to finalize':'Awaiting evaluators';

function useData(path){
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setResult(null);
    setError('');
    if(path)api.get(endpoint+path,{signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult({path,data});})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return()=>controller.abort();
  },[path,revision]);
  return {data:result?.path===path?result.data:null,error,reload:()=>setRevision(value=>value+1)};
}

function Feedback({error,notice}){
  return <>{error&&<p className="dw-alert" role="alert">{error}</p>}
    {notice&&<p className="dw-notice" role="status">{notice}</p>}</>;
}

function Choices({label,icon,items,selected,onChange,describe}){
  const [query,setQuery]=useState('');
  const visible=items.filter(item=>describe(item).toLowerCase().includes(query.trim().toLowerCase()));
  return <fieldset className="dw-choices">
    <legend>{icon&&<TeachingIcon name={icon} size={15}/>} {label} <small>{selected.length} selected</small></legend>
    <label className="dw-choice-search">
      {icon&&<TeachingIcon name="search" size={14}/>}
      <input aria-label={'Search '+label.toLowerCase()} placeholder={'Search '+label.toLowerCase()} value={query}
        onChange={event=>setQuery(event.target.value)}/>
    </label>
    <div className="dw-choice-list">
      {visible.map(item=><label key={item._id}>
        <input type="checkbox" checked={selected.includes(item._id)}
          onChange={event=>onChange(event.target.checked?[...selected,item._id]:selected.filter(id=>id!==item._id))}/>
        {describe(item)}
      </label>)}
      {!visible.length&&<p>No matches.</p>}
    </div>
  </fieldset>;
}

const personLabel=person=>person.name+' · '+person.role;
const studentLabel=student=>(student.user?.name||'Student')+' · '+student.studentId;

export default function DefenseWorkflow(){
  const {kind,id}=useParams();
  const {user}=useAuth();
  const [search,setSearch]=useSearchParams();
  const role=user.role;
  const base='/'+role+'/project-defenses/workflow';
  const examId=search.get('exam')||'';
  const home=base+(examId?'?exam='+examId:'');
  const exams=useData(role==='judge'?null:'/exams');
  const exam=exams.data?.exams.find(exam=>exam._id===examId);
  const creatingGroup=kind==='groups'&&id==='new';
  const staffOverview=role!=='judge'&&!kind;
  return <main className={staffOverview?'dw dw-staff-overview':'dw'}>
    {!kind&&<header className={staffOverview?'dw-hero dw-overview-hero':'dw-hero'}>
      {staffOverview&&<span className="dw-overview-emblem"><TeachingIcon name="shield" size={40}/></span>}
      <div>
        <h1>{role==='judge'?'Assigned Project Defenses':'Project Defense'}</h1>
        <p>{role==='judge'?'Open a group to enter and submit your section marks.':
          'Prepare evaluation forms, organize groups and track scoring for each exam.'}</p>
      </div>
      {staffOverview&&<span className="dw-overview-art"><TeachingIcon name="graduate" size={84}/></span>}
      <Link className="dw-button dw-secondary" to={'/'+role+'/project-defenses/legacy'}>{staffOverview?'← Previous Evaluations':'Previous evaluations'}</Link>
    </header>}
    {kind&&kind!=='forms'&&<Link className="dw-back" to={home}>← Back to Project Defense</Link>}
    {!kind&&<Workspace role={role} exams={exams} exam={exam} examId={examId} setExam={value=>setSearch(value?{exam:value}:{})} base={base}/>}
    {kind==='forms'&&role!=='judge'&&<FormPage key={id+examId} id={id} exam={exam} examId={examId} examError={exams.error} loadingExams={!exams.data} base={base} user={user}/>}
    {creatingGroup&&role!=='judge'&&<CreateGroup key={examId} exam={exam} examId={examId} base={base}
      loadingExam={!exams.data&&!exams.error} examError={exams.error}/>}
    {kind==='groups'&&id!=='new'&&<GroupPage key={id} id={id} role={role}/>}
  </main>;
}

function GroupList({groups,base,examId,empty,assignmentCards=false}){
  const query=examId?'?exam='+examId:'';
  if(!groups.length)return <p className="dw-empty">{empty}</p>;
  return <ul className={assignmentCards?'dw-list dw-assignment-cards':'dw-list'}>{groups.map(group=><li key={group._id}>
    <Link to={base+'/groups/'+group._id+query}>
      {assignmentCards&&<span className="dw-assignment-initial" aria-hidden="true">{group.groupName?.trim().slice(0,1).toUpperCase()||'G'}</span>}
      <div><strong>{group.groupName}</strong><span>{group.assessmentTitle}</span></div>
      <span className="dw-pill" data-state={groupStatus(group)}>
        {assignmentCards&&<TeachingIcon name={groupStatus(group)==='Awaiting evaluators'?'clock':'check'} size={14}/>}
        {groupStatus(group)}
      </span>
      <span className={assignmentCards?'dw-assignment-open':undefined} aria-hidden="true">{assignmentCards?'⋯':'→'}</span>
    </Link>
  </li>)}</ul>;
}

function Workspace({role,exams,exam,examId,setExam,base}){
  const assigned=useData('/groups');
  const groups=useData(exam?'/groups?exam='+examId:null);
  const forms=useData(exam?'/forms?exam='+examId:null);
  const query='?exam='+examId;
  const staff=role!=='judge';
  return <>
    {staff&&<section className="dw-card dw-overview-panel">
      <div className="dw-overview-heading">
        <h2><TeachingIcon name="graduate" size={24}/> Exam</h2>
      </div>
      <label>Choose an exam
        <select value={examId} onChange={event=>setExam(event.target.value)} disabled={!exams.data}>
          <option value="">{exams.data?'Select an exam':'Loading exams…'}</option>
          {exams.data?.exams.map(item=><option key={item._id} value={item._id}>
            {item.title}
          </option>)}
        </select>
      </label>
      {exam&&<p><strong>{exam.totalMarks} marks</strong>{[exam.batch,exam.academicYear].filter(Boolean).join(' · ')}</p>}
      <Feedback error={exams.error}/>
    </section>}
    {exam&&<div className="dw-grid">
      <section className="dw-card">
        <div className="dw-heading"><h2>Evaluation forms</h2><Link className="dw-button" to={base+'/forms/new'+query}>New form</Link></div>
        <Feedback error={forms.error}/>
        {forms.data?forms.data.forms.length?<ul className="dw-list">{forms.data.forms.map(form=><li key={form._id}>
          <Link to={base+'/forms/'+form._id+query}><div><strong>{form.title}</strong><span>{form.sections.length} sections · {form.maximum} marks</span></div>
            <span className="dw-pill" data-state={formStatus[form.status]}>{formStatus[form.status]}</span><span aria-hidden="true">→</span>
          </Link>
        </li>)}</ul>:<p className="dw-empty">No forms for this exam yet.</p>:!forms.error&&<p role="status">Loading forms…</p>}
      </section>
      <section className="dw-card">
        <div className="dw-heading"><h2>List of Groups</h2><Link className="dw-button" to={base+'/groups/new'+query}>New group</Link></div>
        <Feedback error={groups.error}/>
        {groups.data?<GroupList groups={groups.data.groups} base={base} examId={examId} empty="No saved groups for this exam."/>:
          !groups.error&&<p role="status">Loading groups…</p>}
      </section>
    </div>}
    <section className={staff?'dw-card dw-overview-panel':'dw-card'}>
      {staff?<div className="dw-overview-heading"><h2><TeachingIcon name="users" size={24}/> My Evaluator Assignments</h2></div>:
        <h2>My evaluator assignments</h2>}
      <Feedback error={assigned.error}/>
      {assigned.data?<GroupList groups={assigned.data.groups} base={base} empty="You have no assigned groups." assignmentCards={staff}/>:
        !assigned.error&&<p role="status">Loading assignments…</p>}
    </section>
  </>;
}

function MarkInput({value,onChange,max,label}){
  return <input aria-label={label} type="number" min="0" max={max} step="0.01"
    value={value??''} onChange={event=>onChange(event.target.value)}/>;
}

function FormPage({id,exam,examId,examError,loadingExams,base,user}){
  const saved=useData(id==='new'?null:'/forms/'+id);
  const form=saved.data?.form;
  if(saved.error)return <Feedback error={saved.error}/>;
  if(id!=='new'&&!form)return <p role="status">Loading form…</p>;
  if(id==='new'&&examError)return <Feedback error={examError}/>;
  if(id==='new'&&examId&&loadingExams)return <p role="status">Loading exam…</p>;
  if(id==='new'&&!exam)return <p>Select an exam before creating a form.</p>;
  return <FormEditor key={form?._id||'new'} original={form} exam={exam} examId={form?.exam||examId} base={base} user={user}/>;
}

function FormEditor({original,exam,examId,base,user}){
  const navigate=useNavigate();
  const [form,setForm]=useState(original||{title:'',sections:[newSection()],status:'draft'});
  const [savedForm,setSavedForm]=useState(original);
  const [dirty,setDirty]=useState(!original);
  const [recipient,setRecipient]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [preview,setPreview]=useState(false);
  const [collapsed,setCollapsed]=useState([]);
  const options=useData('/exams/'+examId+'/options');
  const target=user.role==='admin'?'teacher':'admin';
  const maximum=exam?.totalMarks??form.maximum;
  const total=Math.round(sum(form.sections.map(section=>section.marks))*100)/100;
  const remaining=Math.round((maximum-total)*100)/100;
  function update(fields){setForm(value=>({...value,...fields}));setDirty(true);setNotice('');}
  function changeSection(index,fields){
    update({sections:form.sections.map((section,i)=>i===index?{...section,...fields}:section)});
  }
  function removeSection(index){
    update({sections:form.sections.filter((_,i)=>i!==index)});
    setCollapsed(previous=>previous.filter(i=>i!==index).map(i=>i>index?i-1:i));
  }
  function reset(){
    if(!window.confirm('Reset the form and discard unsaved changes?'))return;
    setForm(savedForm||{title:'',sections:[newSection()],status:'draft'});
    setDirty(!savedForm);setCollapsed([]);setPreview(false);setError('');setNotice('');
  }
  async function action(type){
    setBusy(true);setError('');setNotice('');
    try{
      let current=form;
      if(type==='save'||(type==='send'&&dirty)){
        const url=endpoint+'/forms'+(form._id?'/'+form._id:'');
        const sections=form.sections.map(section=>({...section,marks:inputMark(section.marks),
          questions:section.questions.map(({title})=>({title}))}));
        const {data}=await api[form._id?'put':'post'](url,{exam:examId,title:form.title,sections,__v:form.__v});
        current=data.form;
        setSavedForm(current);setForm(current);setDirty(false);
      }
      if(type!=='save'){
        const {data}=await api.post(endpoint+'/forms/'+current._id+'/'+type,{__v:current.__v,recipient});
        current=data.form;
      }
      setSavedForm(current);setForm(current);
      setDirty(false);
      if(!original)navigate(base+'/forms/'+current._id+'?exam='+examId,{replace:true});
      setNotice(type==='save'?'Form saved.':type==='send'?'Form sent for review.':'Form approved and available for groups.');
    }catch(error){setError(message(error));}
    finally{setBusy(false);}
  }
  const readyToSend=remaining===0&&form.title.trim()&&form.sections.every(section=>
    section.title.trim()&&Number(section.marks)>0&&section.questions.every(question=>question.title.trim()));
  const sendLabel=target==='admin'?'Send to Admin':'Send to Teacher';
  return <form className="dw-builder" onSubmit={event=>{event.preventDefault();if(dirty&&!preview)action('save');}}>
    <div className="dw-builder-panel">
      <div className="dw-builder-bar">
        <h1><TeachingIcon name="file" size={22}/>{preview?'Form Preview':'Evaluation Form'}</h1>
        <button type="button" className="dw-button dw-builder-preview" aria-pressed={preview}
          onClick={()=>setPreview(value=>!value)}>
          <TeachingIcon name={preview?'edit':'eye'} size={16}/>{preview?'Back to Edit':'Preview Form'}
        </button>
      </div>
      <fieldset className="dw-fields dw-builder-fields" disabled={busy}>
        <div className="dw-builder-meta">
          {preview?<h2>{form.title||'Untitled evaluation form'}</h2>:
            <label><span><TeachingIcon name="file" size={15}/> Form Title <b>*</b></span>
              <input required maxLength={200} placeholder="e.g. Final Project Defense" value={form.title}
                onChange={event=>update({title:event.target.value})}/>
            </label>}
          <div className="dw-builder-allocation">
            <strong><TeachingIcon name="star" size={16}/> Allocated Marks</strong>
            <output data-over={remaining<0} aria-label="Allocated marks">{mark(total)} / {mark(maximum)}</output>
          </div>
        </div>
        {form.sections.map((section,index)=>{
          const open=preview||!collapsed.includes(index);
          return <section className="dw-builder-section" key={section._id||index}>
            <div className="dw-builder-section-head">
              <h3><span className="dw-builder-number">{index+1}</span>{preview?section.title||'Section '+(index+1):'Section '+(index+1)}</h3>
              <span className="dw-builder-section-marks">{mark(section.marks??0)} marks</span>
              {!preview&&<div className="dw-builder-section-actions">
                <button type="button" disabled={form.sections.length===1} className="dw-builder-remove-section"
                  onClick={()=>removeSection(index)}><TeachingIcon name="trash" size={15}/> Remove Section</button>
                <button type="button" className="dw-builder-toggle" aria-expanded={open}
                  aria-label={(open?'Collapse':'Expand')+' section '+(index+1)}
                  onClick={()=>setCollapsed(previous=>open?[...previous,index]:previous.filter(i=>i!==index))}>
                  <span aria-hidden="true">{open?'⌃':'⌄'}</span>
                </button>
              </div>}
            </div>
            {preview?<ol className="dw-builder-preview-questions">
              {section.questions.map((question,i)=><li key={question._id||i}>{question.title||'Untitled question'}</li>)}
            </ol>:open&&<div className="dw-builder-section-body">
              <div className="dw-editor-row">
                <label><span>Section Title <b>*</b></span><input maxLength={200} value={section.title}
                  placeholder="e.g. Project demonstration" onChange={event=>changeSection(index,{title:event.target.value})}/></label>
                <label><span><TeachingIcon name="star" size={15}/> Maximum Marks</span>
                  <MarkInput label={'Section '+(index+1)+' maximum marks'} value={section.marks}
                    onChange={marks=>changeSection(index,{marks})}/>
                </label>
              </div>
              {section.questions.map((question,i)=><div className="dw-editor-row dw-question" key={question._id||i}>
                <label><span>Question {i+1} <b>*</b></span><input maxLength={500} placeholder="Enter a question" value={question.title}
                  onChange={event=>changeSection(index,{questions:section.questions.map((item,j)=>j===i?{...item,title:event.target.value}:item)})}/>
                </label>
                <button type="button" className="dw-builder-remove" disabled={section.questions.length===1}
                  aria-label={'Remove question '+(i+1)+' from section '+(index+1)}
                  onClick={()=>changeSection(index,{questions:section.questions.filter((_,j)=>j!==i)})}>
                  <TeachingIcon name="trash" size={15}/> Remove
                </button>
              </div>)}
              <button className="dw-button dw-secondary" type="button"
                onClick={()=>changeSection(index,{questions:[...section.questions,newQuestion()]})}>＋ Add Question</button>
            </div>}
          </section>;
        })}
        {!preview&&<button className="dw-button dw-secondary" type="button"
          onClick={()=>update({sections:[...form.sections,newSection()]})}>＋ Add Section</button>}
      </fieldset>
      <Feedback error={error||options.error} notice={notice}/>
      {!preview&&<footer className="dw-builder-actions">
        <button className="dw-button dw-secondary" type="button" disabled={busy||!dirty} onClick={reset}>↻ Reset Form</button>
        <div>
          <label className="dw-builder-reviewer"><span>Reviewer</span>
            <select value={recipient} onChange={event=>setRecipient(event.target.value)} disabled={busy}>
              <option value="">Select {target==='admin'?'an Admin':'a Teacher'}</option>
              {options.data?.people.filter(person=>person.role===target).map(person=><option key={person._id} value={person._id}>{person.name}</option>)}
            </select>
          </label>
          <button className="dw-button" type="submit" disabled={busy||!dirty}>
            <TeachingIcon name="check" size={16}/>{busy?'Working…':'Save Draft'}
          </button>
          <button className="dw-button dw-builder-send" type="button" disabled={busy||!recipient||!readyToSend}
            onClick={()=>action('send')}><TeachingIcon name="arrow" size={17}/>{sendLabel}</button>
          {!dirty&&form.status==='review'&&form.handoff?.recipient===user._id&&
            <button className="dw-button" type="button" disabled={busy} onClick={()=>action('approve')}>Approve Form</button>}
        </div>
      </footer>}
    </div>
  </form>;
}

function CreateGroup({exam,examId,base,loadingExam,examError}){
  const navigate=useNavigate();
  const options=useData(examId?'/exams/'+examId+'/options':null);
  const forms=useData(examId?'/forms?exam='+examId:null);
  const [names,setNames]=useState({groupName:'',projectTitle:''});
  const [form,setForm]=useState('');
  const [students,setStudents]=useState([]);
  const [evaluators,setEvaluators]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [created,setCreated]=useState(null);
  const [resetCount,setResetCount]=useState(0);
  const approved=forms.data?.forms.filter(item=>item.status==='approved'&&item.maximum===exam?.totalMarks)||[];
  async function save(event){
    event.preventDefault();
    const openGroup=event.nativeEvent.submitter?.value==='open';
    setBusy(true);setError('');
    try{
      const {data}=await api.post(endpoint+'/groups',{exam:examId,form,...names,students,evaluators});
      if(openGroup)navigate(base+'/groups/'+data.id+'?exam='+examId);
      else setCreated(data.id);
    }catch(error){setError(message(error));}
    finally{setBusy(false);}
  }
  function reset(){
    setNames({groupName:'',projectTitle:''});setForm('');setStudents([]);setEvaluators([]);
    setError('');setResetCount(count=>count+1);
  }
  if(created)return <section className="dw-card"><h2>Group saved</h2>
    <Link className="dw-button" to={base+'/groups/'+created+'?exam='+examId}>Open group</Link>
  </section>;
  const ready=!!(names.groupName.trim()&&form&&students.length&&evaluators.length);
  return <form className="dw-create-group" onSubmit={save} onReset={event=>{event.preventDefault();reset();}}>
    <header className="dw-create-group-header"><TeachingIcon name="users" size={20}/><h1>Create Group</h1></header>
    <div className="dw-create-group-body">
    <Feedback error={error||examError||forms.error||options.error}/>
    {!exam&&!examError&&<p role="status">{loadingExam?'Loading exam…':'Select an exam before creating a group.'}</p>}
    {exam&&<fieldset className="dw-fields" disabled={busy}>
      <div className="dw-grid">
        <label><span><TeachingIcon name="users" size={15}/> Group name <b>*</b></span><input required maxLength={120} placeholder="Enter group name"
          value={names.groupName} onChange={event=>setNames({...names,groupName:event.target.value})}/></label>
        <label><span><TeachingIcon name="file" size={15}/> Project title</span><input maxLength={200} placeholder="Enter project title"
          value={names.projectTitle} onChange={event=>setNames({...names,projectTitle:event.target.value})}/></label>
      </div>
      <label><span><TeachingIcon name="clipboard" size={15}/> Approved evaluation form</span>
        <select className="dw-create-group-form-select" required value={form} disabled={!forms.data} onChange={event=>setForm(event.target.value)}>
        <option value="">{!forms.data?'Loading forms…':approved.length?'Choose a form':'No approved forms available'}</option>
        {approved.map(item=><option key={item._id} value={item._id}>{item.title} · {item.maximum} marks</option>)}
      </select></label>
      {forms.data&&!approved.length&&<p>Approve an evaluation form for this exam before creating a group.</p>}
      {options.data?<div className="dw-grid" key={resetCount}>
        <Choices label="Students" icon="graduate" items={options.data.students} selected={students} onChange={setStudents} describe={studentLabel}/>
        <Choices label="Evaluators" icon="check" items={options.data.people} selected={evaluators} onChange={setEvaluators} describe={personLabel}/>
      </div>:!options.error&&<p role="status">Loading students and evaluators…</p>}
      <div className="dw-create-group-actions">
        <button className="dw-button dw-secondary" type="reset">↻ Reset Form</button>
        <div>
          <button className="dw-button" type="submit" disabled={!ready||busy}><TeachingIcon name="check" size={14}/> Save Group</button>
          <button className="dw-button dw-create-group-primary" type="submit" value="open" disabled={!ready||busy}>
            <TeachingIcon name="arrow" size={14}/> {busy?'Saving…':'Create Group'}
          </button>
        </div>
      </div>
    </fieldset>}
    </div>
  </form>;
}

function GroupPage({id,role}){
  const result=useData('/groups/'+id);
  if(result.error)return <Feedback error={result.error}/>;
  if(!result.data)return <p role="status">Loading group…</p>;
  return <GroupDetails data={result.data} role={role} refresh={result.reload}/>;
}

const starValues=[1,2,3,4,5];

function QuestionRating({question,name,value,onChange}){
  return <fieldset className="dw-rating-question">
    <legend>{question}</legend>
    <div className="dw-stars">
      {starValues.map(stars=><label key={stars} data-filled={stars<=value}>
        <input type="radio" name={name} value={stars} aria-label={stars+(stars===1?' star':' stars')}
          checked={value===stars} onChange={()=>onChange(stars)}/>
        <span aria-hidden="true">{stars<=value?'★':'☆'}</span>
      </label>)}
      <span className="dw-rating-value">{value===null?'Unrated':value+' / 5'}</span>
    </div>
  </fieldset>;
}

function GroupDetails({data,role,refresh}){
  const {group,mine,average,canManage,canChangeEvaluators}=data;
  const [ratings,setRatings]=useState(()=>group.workflowSections.map((section,index)=>
    section.questions.map((_,question)=>mine?.questionRatings?.[index]?.[question]??null)));
  const [comments,setComments]=useState(group.workflowSections.map((_,index)=>mine?.comments[index]??''));
  const [scoreRevision,setScoreRevision]=useState(mine?.revision);
  const [editingAssignments,setEditingAssignments]=useState(false);
  const [selected,setSelected]=useState(group.workflowEvaluators.map(item=>item.user?._id).filter(Boolean));
  const options=useData(editingAssignments?'/exams/'+group.assessment+'/options':null);
  const [review,setReview]=useState(null);
  const [replace,setReplace]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const url=endpoint+'/groups/'+group._id;
  const maximum=group.assessmentTotalMarks;
  const status=group.status==='finalized'?'Finalized':average===null?'Awaiting evaluators':'Ready to finalize';
  const members=new Map(group.students.map(student=>[student._id,student.user?.name||student.studentId]));
  const sectionScores=group.workflowSections.map((section,index)=>mine?.submittedAt?mine.scores[index]:
    ratings[index].includes(null)?null:sum(ratings[index])/(5*section.questions.length)*section.marks);
  const complete=sectionScores.every(score=>score!==null);
  async function run(work,reload=false){
    setBusy(true);setError('');setNotice('');
    try{await work();if(reload)refresh();}
    catch(error){setError(message(error));}
    finally{setBusy(false);}
  }
  function saveScore(submit){
    run(async()=>{
      const {data}=await api.put(url+'/score',{revision:scoreRevision,
        ratings,comments,submit});
      setScoreRevision(data.revision);
      setNotice(submit?'Evaluation submitted.':'Draft saved.');
    },submit);
  }
  return <div className="dw-group-detail">
    <section className="dw-card dw-group-summary">
      <div className="dw-heading"><div><h1>{group.groupName}</h1><p>{group.assessmentTitle}{group.projectTitle?' · '+group.projectTitle:''}</p></div>
        <span className="dw-pill" data-state={status}>{status}</span>
      </div>
      <p className="dw-total">Group mark <strong>{mark(group.workflowFinalMark??average)} / {mark(maximum)}</strong></p>
      {group.workflowFormTitle&&<p>Evaluation form · <strong>{group.workflowFormTitle}</strong></p>}
      <h3>Group members</h3>
      <ul className="dw-members">{[...members].map(([id,name])=><li key={id}>{name}</li>)}</ul>
      {canManage&&<>
        <div className="dw-heading"><h3>Evaluator submissions</h3>
          {canChangeEvaluators&&<button type="button" className="dw-button dw-secondary" onClick={()=>setEditingAssignments(!editingAssignments)}>
            {editingAssignments?'Cancel assignment changes':'Edit evaluators'}
          </button>}
        </div>
        <ul className="dw-list dw-submissions">{group.workflowEvaluators.map((item,index)=><li key={item.user?._id||index}>
          <details>
            <summary><strong>{item.user?.name||'Evaluator'}</strong>
              <span>{item.submittedAt?mark(item.total)+' / '+mark(maximum):'Awaiting submission'}</span>
            </summary>
            {item.submittedAt&&group.workflowSections.map((section,index)=><div className="dw-submitted-rating" key={section._id}>
              <p><strong>{section.title}</strong> · {mark(item.scores[index])} / {mark(section.marks)}{item.comments[index]?' · '+item.comments[index]:''}</p>
              {item.questionRatings?.[index]&&<ul>{section.questions.map((question,i)=><li key={question._id}>
                {question.title} <strong>{item.questionRatings[index][i]} / 5 ★</strong>
              </li>)}</ul>}
            </div>)}
          </details>
        </li>)}</ul>
        {editingAssignments&&<>
          <Choices label="Evaluators" items={options.data?.people||[]} selected={selected} onChange={setSelected} describe={personLabel}/>
          <button type="button" className="dw-button" disabled={busy||!selected.length}
            onClick={()=>run(()=>api.put(url+'/evaluators',{__v:group.__v,evaluators:selected}),true)}>Save assignments</button>
        </>}
      </>}
      <Feedback error={error||options.error} notice={notice}/>
      {role==='admin'&&average!==null&&group.status!=='finalized'&&!review&&
        <button className="dw-button" type="button" disabled={busy} onClick={()=>run(async()=>{
          const {data}=await api.get(url+'/finalization');setReview(data);
        })}>Review Finalization</button>}
      {review&&<section className="dw-section">
        <h3>Confirm exam results</h3>
        <p>{members.size} group members will receive <strong>{mark(review.proposed)} / {mark(maximum)}</strong>.</p>
        {!!review.current?.length&&<>
          <table className="dw-table"><thead><tr><th>Student</th><th>Existing mark</th><th>New mark</th></tr></thead>
            <tbody>{review.current.map(item=><tr key={item._id}><td>{members.get(item.student)}</td><td>{mark(item.marksObtained)}</td><td>{mark(review.proposed)}</td></tr>)}</tbody>
          </table>
          <label className="dw-check"><input type="checkbox" checked={replace} onChange={event=>setReplace(event.target.checked)}/> Replace these existing exam results</label>
        </>}
        <div className="dw-actions">
          <button className="dw-button" type="button" disabled={busy||!!review.current?.length&&!replace}
            onClick={()=>run(()=>api.post(url+'/finalize',{token:review.token,replaceExisting:replace}),true)}>Finalize and Save Results</button>
          <button className="dw-button dw-secondary" type="button" onClick={()=>{setReview(null);setReplace(false);}}>Cancel</button>
        </div>
      </section>}
    </section>
    {mine&&<form className="dw-card dw-editor dw-rating-form" onSubmit={event=>{event.preventDefault();if(complete)saveScore(true);}}>
      <div className="dw-heading"><h2>My evaluation</h2><span className="dw-pill">{mine.submittedAt?'Submitted':'Draft'}</span></div>
      {!mine.submittedAt&&<p>Rate every question from 1 to 5 stars. Each section’s average rating is converted to marks.</p>}
      <fieldset className="dw-fields" disabled={busy||!!mine.submittedAt||group.status==='finalized'}>
        {group.workflowSections.map((section,index)=><section className="dw-rating-section" key={section._id}>
          <header><h3>{section.title}</h3><strong>{mark(sectionScores[index])} / {mark(section.marks)} marks</strong></header>
          <div className="dw-rating-section-body">
            {mine.submittedAt&&!mine.questionRatings?<ul className="dw-criteria">{section.questions.map(question=><li key={question._id}>{question.title}</li>)}</ul>:
              section.questions.map((question,i)=><QuestionRating key={question._id} question={question.title}
                name={'rating-'+index+'-'+i} value={ratings[index][i]} onChange={value=>setRatings(previous=>
                  previous.map((row,sectionIndex)=>sectionIndex===index?row.map((rating,questionIndex)=>questionIndex===i?value:rating):row))}/>)}
            <label>Comments<textarea rows={2} maxLength={4000} value={comments[index]}
              onChange={event=>setComments(previous=>previous.map((comment,i)=>i===index?event.target.value:comment))}/></label>
          </div>
        </section>)}
      </fieldset>
      <p className="dw-total">My total <strong>{mark(complete?sum(sectionScores):null)} / {mark(maximum)}</strong></p>
      <Feedback error={error} notice={notice}/>
      {!mine.submittedAt&&group.status!=='finalized'&&<div className="dw-actions">
        <button className="dw-button dw-secondary" type="button" disabled={busy} onClick={()=>saveScore(false)}>Save Draft</button>
        <button className="dw-button" type="submit" disabled={busy||!complete}>Submit Evaluation</button>
      </div>}
    </form>}
  </div>;
}
