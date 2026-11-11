import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import api from '../services/api';
import TeachingIcon from './TeachingIcon';
import './ProjectDefenses.css';

const route='/admin/project-defenses';
const defenseHome='/admin/evaluations/new';
const endpoint='/evaluations/defenses';
const defaultRatingOptions=[1,2,3,4,5];
const defenseTitle='Project Presentation & Defense';
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

function DefenseWordingEditor({wording,ratingOptions,ratings,onApply,onCancel}){
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
    const inUse=[...new Set(Object.values(ratings))].filter(value=>!options.includes(value));
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

function Rating({criterion,value,options,onChange}){
  return options.map(score=><label className="defense-rating" key={score}>
    <input type="radio" name={criterion} value={score} checked={value===score} onChange={()=>onChange(score)}/>
    <span>{score}</span>
  </label>);
}

function defenseScores(ratings,maxRating){
  const averages=rubric.map(([, ,criteria])=>{
    const rated=criteria.map(([key])=>ratings[key]).filter(Boolean);
    return rated.length?rated.reduce((sum,value)=>sum+value,0)/rated.length:0;
  });
  return {averages,percentage:averages.reduce((sum,average)=>sum+average,0)/(rubric.length*maxRating)*100};
}

function DefenseMarksEditor({ratings,ratingOptions,maxRating,wording,busy,error,onSave,onCancel}){
  const [draft,setDraft]=useState(()=>({...ratings}));
  const {percentage}=defenseScores(draft,maxRating);
  return <form className="defense-section defense-marks-editor defense-screen" onSubmit={event=>{
    event.preventDefault();
    if(!busy)onSave(draft);
  }}>
    <DefenseSectionTitle icon="chart">Edit Marks · {percentage.toFixed(1)}%</DefenseSectionTitle>
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

function StudentPicker({course,cohort,cohortYear,selected,onChange}){
  const [page,setPage]=useState(1);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!course)return;
    const controller=new AbortController();
    const params={page,...(cohortYear?{cohortName:cohort,cohortYear}:{})};
    api.get('/evaluations/eligible/'+course,{params,signal:controller.signal})
      .then(({data})=>{if(!controller.signal.aborted)setResult(data);})
      .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
    return ()=>controller.abort();
  },[course,cohort,cohortYear,page,retry]);
  function changePage(next){
    setResult(null);
    setError('');
    setPage(next);
  }
  return <fieldset className="defense-student-picker">
    <legend><TeachingIcon name="users" size={16}/> Enrolled students · {selected.length} selected</legend>
    {!course?<p>Choose a course to load students.</p>:error?<p role="alert">{error} <button type="button" onClick={()=>{setError('');setRetry(value=>value+1);}}>Retry</button></p>:!result?<p role="status">Loading students…</p>:<>
      {result.total===0&&<p>{cohortYear?'No enrolled students for this cohort.':'No enrolled students for this course.'}</p>}
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
  const [groups,setGroups]=useState(()=>[{...empty,groupName:'Group 1'}]);
  const [activeGroup,setActiveGroup]=useState(0);
  const [courses,setCourses]=useState(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [editingWording,setEditingWording]=useState(false);
  const [editingMarks,setEditingMarks]=useState(false);
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
  const ratingOptions=form.ratingOptions||defaultRatingOptions;
  const maxRating=ratingOptions.reduce((highest,option)=>Math.max(highest,option),0);
  const finalized=form.status==='finalized';
  const editing=editingWording||editingMarks;
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
    setGroups(previous=>[...previous,{...empty,course:form.course,cohort:form.cohort,cohortYear:form.cohortYear,
      groupName:'Group '+(previous.length+1)}]);
    selectGroup(groups.length);
  }
  function resetGroup(){
    if(!window.confirm('Clear the active group’s students, project details, ratings, and notes?'))return;
    setForm({...form,...empty,course:form.course,cohort:form.cohort,cohortYear:form.cohortYear,groupName:form.groupName});
    setError('');
    setNotice(form._id?'Group cleared. Save the draft to keep these changes.':'Group cleared.');
  }
  const patch=(key,value)=>{setNotice('');setForm(previous=>({...previous,[key]:value}));};
  const rate=(key,value)=>patch('ratings',{...form.ratings,[key]:value});
  const {averages,percentage}=defenseScores(form.ratings,maxRating);
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
  async function saveMarks(ratings){
    setError('');
    if(!finalized){
      patch('ratings',ratings);
      setEditingMarks(false);
      setNotice('Marks updated. Save the draft to keep these changes.');
      return;
    }
    setBusy(true);
    try{
      const {data}=await api.patch(endpoint+'/'+form._id+'/marks',{ratings,__v:form.__v});
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
    <nav className="ev-create-breadcrumb defense-screen" aria-label="Breadcrumb">
      <Link to="/admin">Dashboard</Link><span aria-hidden="true">/</span>
      <Link to={backTo}>Project Defense</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{id?'Defense Evaluation':'New Defense'}</span>
    </nav>
    <nav className="defense-toolbar defense-screen" aria-label="Project defense actions">
      <Link className="btn" to={backTo}><span aria-hidden="true">←</span> Back to Project Defense</Link>
      <div className="defense-toolbar-actions">
        {courses&&<><span className="ev-status">{finalized?'Finalized':'Draft'}</span>
          {!finalized&&<button type="button" disabled={busy||editing} onClick={()=>setEditingWording(true)}>Edit Form</button>}
          <button type="button" disabled={busy||editing} onClick={()=>{setError('');setNotice('');setEditingMarks(true);}}>Edit Marks</button>
          <button type="button" disabled={editing} onClick={()=>window.print()}><TeachingIcon name="file" size={15}/> Print / Save PDF</button></>}
        <Link className="btn btn-primary" to={route}><TeachingIcon name="folder" size={15}/> Saved Defenses</Link>
      </div>
    </nav>
    {!courses?(error?<p className="ev-error" role="alert">{error}</p>:<p role="status">Loading evaluation…</p>):<>
      <section className="defense-group-panel defense-screen" aria-label="Defense groups">
        <div className="defense-group-tabs" role="group" aria-label="Choose a group">
          {groups.map((group,index)=><button type="button" key={index} disabled={busy||editing}
            aria-pressed={index===activeGroup} onClick={()=>selectGroup(index)}>
            {group.groupName||'Group '+(index+1)}
          </button>)}
          <button type="button" disabled={busy||editing} onClick={addGroup}>+ Add Group</button>
        </div>
        <div className="defense-group-controls">
          <strong>Active group · {form.groupName||'Group '+(activeGroup+1)}</strong>
          <button className="defense-group-reset" type="button" disabled={busy||finalized||editing} onClick={resetGroup}>Reset Active Group</button>
        </div>
      </section>
      {editingWording?<DefenseWordingEditor wording={form.wording} ratingOptions={ratingOptions} ratings={form.ratings}
        onCancel={()=>setEditingWording(false)} onApply={(wording,options)=>{
        setForm(previous=>({...previous,wording,ratingOptions:options}));
        setEditingWording(false);
        setNotice('Form updated. Save the draft to keep these changes.');
      }}/>:editingMarks?<DefenseMarksEditor ratings={form.ratings} ratingOptions={ratingOptions} maxRating={maxRating} wording={wording} busy={busy} error={error}
        onSave={saveMarks} onCancel={()=>{setError('');setEditingMarks(false);}}/>
      :<form onSubmit={event=>{event.preventDefault();save(false);}}>
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
                setForm(previous=>({...previous,course:event.target.value,cohort:'',cohortYear:'',students:[]}));
              }}>
                <option value="">Select a course</option>
                {courses.map(course=><option key={course._id} value={course._id}>{course.name||course.title}</option>)}
              </select></label>
              <p className="defense-print">Course · {courseLabel}</p>
              {details.map(([field,label,icon,placeholder,maxLength])=><label key={field}>
                <span className="defense-field-label"><span className="defense-screen"><TeachingIcon name={icon} size={15}/></span>{label}</span>
                <input className="defense-screen" placeholder={placeholder} maxLength={maxLength} value={form[field]}
                  onChange={event=>patch(field,event.target.value)}/>
                <span className="defense-print">{form[field]||'—'}</span>
              </label>)}
              <CohortPicker key={activeGroup+':'+form.course} course={form.course} cohort={form.cohort}
                cohortYear={form.cohortYear} autoSelect={!finalized&&(!form._id||!form.students.length)} onChange={({name,academicYear})=>{
                  setNotice('');
                  setForm(previous=>({...previous,cohort:name,cohortYear:academicYear,students:[]}));
                }}/>
              <label><span className="defense-field-label"><span className="defense-screen"><TeachingIcon name="calendar" size={15}/></span>Defense date</span>
                <input className="defense-screen" type="date" value={form.defenseDate} onChange={event=>patch('defenseDate',event.target.value)}/>
                <span className="defense-print">{form.defenseDate||'—'}</span>
              </label>
              <label><span className="defense-field-label"><span className="defense-screen"><TeachingIcon name="profile" size={15}/></span>Evaluator name</span>
                <input className="defense-screen" placeholder="Enter evaluator name" maxLength={200} value={form.evaluatorName||''}
                  onChange={event=>patch('evaluatorName',event.target.value)}/>
                <span className="defense-print">{form.evaluatorName||'—'}</span>
              </label>
            </div>
            <div className="defense-screen"><StudentPicker key={JSON.stringify([activeGroup,form.course,form.cohort,form.cohortYear])}
              course={form.course} cohort={form.cohort} cohortYear={form.cohortYear}
              selected={form.students} onChange={value=>patch('students',value)}/></div>
          </section>
          {rubric.map(([section,title,criteria])=><section className="defense-section" key={section}>
            <DefenseSectionTitle icon={section==='G'?'users':'clipboard'}>Section {section} · {wording(section,title)}</DefenseSectionTitle>
            {section==='G'?<div className="defense-matrix-scroll"><table className="defense-matrix defense-professional">
              <thead><tr><th scope="col">Key attribute</th>{ratingOptions.map(score=><th scope="col" key={score}>{score}</th>)}</tr></thead>
              <tbody>{criteria.map(([key,label])=><tr key={key}><th scope="row">{wording(key,label)}</th>{ratingOptions.map(score=><td key={score}>
                <input className="defense-screen" type="radio" name={key} aria-label={wording(key,label)+' · '+score}
                  checked={form.ratings[key]===score} onChange={()=>rate(key,score)}/>
                <span className="defense-print">{form.ratings[key]===score?'✓':''}</span>
              </td>)}</tr>)}</tbody>
            </table></div>:criteria.map(([key,label,guidance])=><fieldset className="defense-criterion" key={key}>
              <legend>{wording(key,label)}</legend>
              {(form.wording?.[key+'Hint']??guidance)?.trim()&&<p className="defense-guidance">Look for · {form.wording?.[key+'Hint']??guidance}</p>}
              <div className="defense-scores defense-screen"><span>Rating</span><Rating criterion={key} value={form.ratings[key]} options={ratingOptions} onChange={value=>rate(key,value)}/></div>
              <p className="defense-print">Rating · {form.ratings[key]??'—'} / {maxRating}</p>
              {guidance&&<label>Evaluation notes<textarea className="defense-screen" maxLength={4000} value={form.notes[key]||''}
                onChange={event=>patch('notes',{...form.notes,[key]:event.target.value})}/>
                <span className="defense-print">{form.notes[key]||'—'}</span>
              </label>}
            </fieldset>)}
          </section>)}
          <section className="defense-section">
            <DefenseSectionTitle icon="chart">Section I · {wording('I',placementTitle)}</DefenseSectionTitle>
            <table className="defense-matrix"><thead><tr><th scope="col">Assessment category</th><th scope="col">Score</th></tr></thead>
              <tbody>{rubric.map(([section,title],index)=><tr key={section}><th scope="row">{wording(section,title)}</th><td>{averages[index].toFixed(1)} / {maxRating}</td></tr>)}</tbody>
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
