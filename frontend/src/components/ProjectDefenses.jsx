import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import api from '../services/api';
import TeachingIcon from './TeachingIcon';
import './ProjectDefenses.css';

const route='/admin/project-defenses';
const defenseHome='/admin/evaluations/new';
const endpoint='/evaluations/defenses';
const scores=[1,2,3,4,5];
const defenseTitle='Full-Stack Project Presentation & Defense';
const candidateTitle='Candidate & Process Details';
const placementTitle='Final Placement & Selection Matrix';
const rubric=[
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
  ['cohort','Training cohort','layers','Enter training cohort',120],
  ['defenseDate','Defense date','calendar'],
];
const empty={course:'',students:[],ratings:{},notes:{},groupName:'',projectTitle:'',cohort:'',
  defenseDate:'',outcome:'',summary:'',signature:'',signatureDate:'',status:'draft'};
const message=error=>error.response?.data?.message||'Unable to complete the request.';

function DefenseSectionTitle({icon,children}){
  return <h3 className="defense-section-heading">
    <span className="defense-icon defense-screen"><TeachingIcon name={icon} size={17}/></span>
    {children}
  </h3>;
}

function DefenseWordingEditor({wording,onApply,onCancel}){
  const [draft,setDraft]=useState(()=>({...wording}));
  function field(key,label,fallback,required=true){
    return <label>{label}
      <input value={draft[key]??fallback} required={required} maxLength={500}
        onChange={event=>setDraft(previous=>({...previous,[key]:event.target.value}))}/>
    </label>;
  }
  return <form className="defense-section defense-wording-editor defense-screen" onSubmit={event=>{
    event.preventDefault();
    onApply(draft);
  }}>
    <DefenseSectionTitle icon="file">Edit Form</DefenseSectionTitle>
    {field('title','Form title',defenseTitle)}
    {field('A','Section A title',candidateTitle)}
    {rubric.map(([section,title,criteria])=><fieldset key={section}>
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

function Rating({criterion,value,onChange}){
  return scores.map(score=><label className="defense-rating" key={score}>
    <input type="radio" name={criterion} value={score} checked={value===score} onChange={()=>onChange(score)}/>
    <span>{score}</span>
  </label>);
}

function StudentPicker({course,selected,onChange}){
  const [page,setPage]=useState(1);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!course)return;
    const controller=new AbortController();
    api.get('/evaluations/eligible/'+course,{params:{page},signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[course,page,retry]);
  function changePage(next){
    setResult(null);
    setError('');
    setPage(next);
  }
  return <fieldset className="defense-student-picker">
    <legend><TeachingIcon name="users" size={16}/> Enrolled students · {selected.length} selected</legend>
    {!course?<p>Choose a course to load students.</p>:error?<p role="alert">{error} <button type="button" onClick={()=>{setError('');setRetry(value=>value+1);}}>Retry</button></p>:!result?<p role="status">Loading students…</p>:<>
      {result.total===0&&<p>No enrolled students for this course.</p>}
      <div className="defense-students">{result.students.map(student=><label key={student._id}>
        <input type="checkbox" checked={selected.includes(student._id)} onChange={event=>onChange(event.target.checked
          ? [...selected,student._id] : selected.filter(id=>id!==student._id))}/>
        {student.studentId} · {student.user?.name}
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
  const [page,setPage]=useState(1);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    api.get(endpoint,{params:{page},signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[page]);
  function changePage(next){
    setResult(null);
    setError('');
    setPage(next);
  }
  return <div className="evaluations">
    <div className="ev-actions"><h2>Project Defense Evaluations</h2><Link to={defenseHome}>Back to Project Defense</Link></div>
    {error?<p role="alert">{error}</p>:!result?<p role="status">Loading evaluations…</p>:<>
      {result.records.length===0&&<p>No project defense evaluations yet.</p>}
      <div className="ev-grid ev-admin-grid">{result.records.map(record=><article className="ev-card ev-admin-card" key={record._id}>
        <header className="ev-admin-card-heading"><span>{record.course?.name||record.course?.title}</span>
          <span className="ev-status" data-state={record.status}>{record.status}</span></header>
        <h3>{record.projectTitle||'Untitled project'}</h3>
        <p>{[record.groupName,record.cohort].filter(Boolean).join(' · ')}</p>
        <div className="ev-card-links"><Link className="btn" to={route+'/'+record._id}>Open Evaluation</Link></div>
      </article>)}</div>
      {result.total>50&&<div className="ev-actions">
        <button disabled={page<=1} onClick={()=>changePage(page-1)}>Previous</button>
        <span>Page {page} of {Math.ceil(result.total/50)}</span>
        <button disabled={page*50>=result.total} onClick={()=>changePage(page+1)}>Next</button>
      </div>}
    </>}
  </div>;
}

export function ProjectDefenseEditor(){
  const {id}=useParams();
  const [params]=useSearchParams();
  const initialCourse=id?'':params.get('course')||'';
  return <DefenseForm key={id||'new:'+initialCourse} id={id} initialCourse={initialCourse}/>;
}

function DefenseForm({id,initialCourse}){
  const {user}=useAuth();
  const [groups,setGroups]=useState(()=>[{...empty,groupName:'Group 1'}]);
  const [activeGroup,setActiveGroup]=useState(0);
  const [courses,setCourses]=useState(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [editingWording,setEditingWording]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    const options={signal:controller.signal};
    Promise.all([api.get('/evaluations/courses',options),id?api.get(endpoint+'/'+id,options):null])
      .then(([courseResult,recordResult])=>{
        if(controller.signal.aborted)return;
        if(recordResult)setGroups([recordResult.data.record]);
        else if(courseResult.data.courses.some(course=>course._id===initialCourse)){
          setGroups([{...empty,course:initialCourse,groupName:'Group 1'}]);
        }
        setCourses(courseResult.data.courses);
      })
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[id,initialCourse]);

  const form=groups[activeGroup];
  const finalized=form.status==='finalized';
  const wording=(key,fallback)=>form.wording?.[key]?.trim()||fallback;
  function setForm(update){
    setGroups(previous=>previous.map((group,index)=>index===activeGroup
      ? (typeof update==='function'?update(group):update)
      : group));
  }
  function selectGroup(index){
    setActiveGroup(index);
    setNotice('');
    setError('');
  }
  function addGroup(){
    setGroups(previous=>[...previous,{...empty,course:form.course,groupName:'Group '+(previous.length+1)}]);
    selectGroup(groups.length);
  }
  function resetGroup(){
    if(!window.confirm('Clear the active group’s students, project details, ratings, and notes?'))return;
    setForm({...form,...empty,course:form.course,groupName:form.groupName});
    setError('');
    setNotice(form._id?'Group cleared. Save the draft to keep these changes.':'Group cleared.');
  }
  const patch=(key,value)=>{setNotice('');setForm(previous=>({...previous,[key]:value}));};
  const rate=(key,value)=>patch('ratings',{...form.ratings,[key]:value});
  const averages=rubric.map(([, ,criteria])=>{
    const rated=criteria.map(([key])=>form.ratings[key]).filter(Boolean);
    return rated.length?rated.reduce((total,value)=>total+value,0)/rated.length:0;
  });
  const percentage=averages.reduce((sum,average)=>sum+average,0)/(rubric.length*5)*100;
  const course=courses?.find(course=>course._id===form.course);
  const courseLabel=course?.name||course?.title||'';
  const backTo=form.course?defenseHome+'?'+new URLSearchParams({course:form.course}):defenseHome;
  async function save(finalize){
    if(busy||finalized)return;
    if(finalize&&!window.confirm('Finalize this evaluation? Its scores and recommendation will be locked.'))return;
    setBusy(true);
    setError('');
    setNotice('');
    try{
      const response=form._id
        ? await api.put(endpoint+'/'+form._id,{...form,finalize})
        : await api.post(endpoint,{...form,finalize});
      setForm(response.data.record);
      setNotice(finalize?'Evaluation finalized.':'Draft saved.');
    }catch(error){
      setError(message(error));
    }finally{
      setBusy(false);
    }
  }
  return <div className="evaluations defense-page">
    <nav className="ev-create-breadcrumb defense-screen" aria-label="Breadcrumb">
      <Link to="/admin">Dashboard</Link><span aria-hidden="true">/</span>
      <Link to={backTo}>Project Defense</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{id?'Defense Evaluation':'New Defense'}</span>
    </nav>
    <nav className="defense-toolbar defense-screen" aria-label="Project defense actions">
      <Link className="btn" to={backTo}><span aria-hidden="true">←</span> Back to Project Defense</Link>
      <div className="defense-toolbar-actions">
        {courses&&<><span className="ev-status">{finalized?'Finalized':'Draft'}</span>
          {!finalized&&<button type="button" disabled={busy||editingWording} onClick={()=>setEditingWording(true)}>Edit Form</button>}
          <button type="button" disabled={editingWording} onClick={()=>window.print()}><TeachingIcon name="file" size={15}/> Print / Save PDF</button></>}
        <Link className="btn btn-primary" to={route}><TeachingIcon name="folder" size={15}/> Saved Defenses</Link>
      </div>
    </nav>
    {!courses?(error?<p className="ev-error" role="alert">{error}</p>:<p role="status">Loading evaluation…</p>):<>
      <section className="defense-group-panel defense-screen" aria-label="Defense groups">
        <div className="defense-group-tabs" role="group" aria-label="Choose a group">
          {groups.map((group,index)=><button type="button" key={index} disabled={busy||editingWording}
            aria-pressed={index===activeGroup} onClick={()=>selectGroup(index)}>
            {group.groupName||'Group '+(index+1)}
          </button>)}
          <button type="button" disabled={busy||editingWording} onClick={addGroup}>+ Add Group</button>
        </div>
        <div className="defense-group-controls">
          <strong>Active group · {form.groupName||'Group '+(activeGroup+1)}</strong>
          <button className="defense-group-reset" type="button" disabled={busy||finalized||editingWording} onClick={resetGroup}>Reset Active Group</button>
        </div>
      </section>
      {editingWording?<DefenseWordingEditor wording={form.wording} onCancel={()=>setEditingWording(false)} onApply={value=>{
        patch('wording',value);
        setEditingWording(false);
        setNotice('Form updated. Save the draft to keep these changes.');
      }}/>:<form onSubmit={event=>{event.preventDefault();save(false);}}>
        <header className="defense-title">
          <img src="/telesom-academy-logo.png" alt="Telesom Academy"/>
          <div>
            <h2>{wording('title',defenseTitle)}</h2>
            <p>{courseLabel||'System Architecture, Technical Implementations & Defense Matrix'}</p>
          </div>
          <span className="defense-title-art defense-screen" aria-hidden="true">
            <span className="defense-title-screen">&lt;/&gt;</span>
            <TeachingIcon name="graduate" size={38}/>
          </span>
        </header>
        <fieldset className="defense-fields" disabled={busy||finalized}>
          <section className="defense-section">
            <DefenseSectionTitle icon="users">Section A · {wording('A',candidateTitle)}</DefenseSectionTitle>
            <div className="defense-details">
              <label className="defense-screen"><span className="defense-field-label"><TeachingIcon name="graduate" size={15}/> Course</span><select value={form.course} required onChange={event=>{
                setNotice('');
                setForm(previous=>({...previous,course:event.target.value,students:[]}));
              }}>
                <option value="">Select a course</option>
                {courses.map(course=><option key={course._id} value={course._id}>{course.name||course.title}</option>)}
              </select></label>
              <p className="defense-print">Course · {courseLabel}</p>
              {details.map(([field,label,icon,placeholder,maxLength])=><label key={field}>
                <span className="defense-field-label"><span className="defense-screen"><TeachingIcon name={icon} size={15}/></span>{label}</span>
                <input className="defense-screen" type={maxLength?'text':'date'} placeholder={placeholder} maxLength={maxLength} value={form[field]}
                  onChange={event=>patch(field,event.target.value)}/>
                <span className="defense-print">{form[field]||'—'}</span>
              </label>)}
              <div className="defense-evaluator"><span className="defense-icon defense-screen"><TeachingIcon name="profile" size={17}/></span>
                <div><strong>Evaluator</strong><div>{form.evaluatorName||user?.name}</div></div>
              </div>
            </div>
            <div className="defense-screen"><StudentPicker key={activeGroup+':'+form.course} course={form.course}
              selected={form.students} onChange={value=>patch('students',value)}/></div>
          </section>
          {rubric.map(([section,title,criteria])=><section className="defense-section" key={section}>
            <DefenseSectionTitle icon={section==='G'?'users':'clipboard'}>Section {section} · {wording(section,title)}</DefenseSectionTitle>
            {section==='G'?<table className="defense-matrix defense-professional">
              <thead><tr><th scope="col">Key attribute</th>{scores.map(score=><th scope="col" key={score}>{score}</th>)}</tr></thead>
              <tbody>{criteria.map(([key,label])=><tr key={key}><th scope="row">{wording(key,label)}</th>{scores.map(score=><td key={score}>
                <input className="defense-screen" type="radio" name={key} aria-label={wording(key,label)+' · '+score}
                  checked={form.ratings[key]===score} onChange={()=>rate(key,score)}/>
                <span className="defense-print">{form.ratings[key]===score?'✓':''}</span>
              </td>)}</tr>)}</tbody>
            </table>:criteria.map(([key,label,guidance])=><fieldset className="defense-criterion" key={key}>
              <legend>{wording(key,label)}</legend>
              {(form.wording?.[key+'Hint']??guidance)?.trim()&&<p className="defense-guidance">Look for · {form.wording?.[key+'Hint']??guidance}</p>}
              <div className="defense-scores defense-screen"><span>Rating</span><Rating criterion={key} value={form.ratings[key]} onChange={value=>rate(key,value)}/></div>
              <p className="defense-print">Rating · {form.ratings[key]??'—'} / 5</p>
              {guidance&&<label>Evaluation notes<textarea className="defense-screen" maxLength={4000} value={form.notes[key]||''}
                onChange={event=>patch('notes',{...form.notes,[key]:event.target.value})}/>
                <span className="defense-print">{form.notes[key]||'—'}</span>
              </label>}
            </fieldset>)}
          </section>)}
          <section className="defense-section">
            <DefenseSectionTitle icon="chart">Section I · {wording('I',placementTitle)}</DefenseSectionTitle>
            <table className="defense-matrix"><thead><tr><th scope="col">Assessment category</th><th scope="col">Score</th></tr></thead>
              <tbody>{rubric.map(([section,title],index)=><tr key={section}><th scope="row">{wording(section,title)}</th><td>{averages[index].toFixed(1)} / 5</td></tr>)}</tbody>
              <tfoot><tr><th scope="row">Aggregate total score</th><td>{percentage.toFixed(1)}%</td></tr></tfoot>
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
        </fieldset>
        <footer className="defense-screen">
          {error&&<p className="ev-error" role="alert">{error}</p>}
          {notice&&<p className="ev-notice" role="status">{notice}</p>}
          {!finalized&&<div className="ev-actions">
            <button type="submit" className="btn-primary" disabled={busy}>{busy?'Saving…':'Save Draft'}</button>
            <button type="button" disabled={busy||!form.course} onClick={()=>save(true)}>Finalize Evaluation</button>
          </div>}
        </footer>
      </form>}
    </>}
  </div>;
}
