import {buildReportPdf} from '../utils/reportPdf';
import {courseEvaluationTemplate} from './EvaluationTemplate';
import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import api from '../services/api';
import TeachingIcon from './TeachingIcon';
import './Evaluations.css';
const types={grid:'Multiple-choice Grid',short:'Short Answer',paragraph:'Paragraph Answer',choice:'Multiple Choice',checkbox:'Checkboxes',dropdown:'Dropdown',scale:'Linear Scale',rating:'Rating (Stars)',yesno:'Yes/No',date:'Date',section:'Section Heading and Description'};
const date=value=>value?new Date(value).toLocaleString('en-GB',{timeZone:'Africa/Nairobi'}):'No deadline';
const localDate=value=>value?new Date(new Date(value).getTime()+3*3600000).toISOString().slice(0,16):'';
const key=()=>crypto.randomUUID();
const answerText=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.entries(v).map(([row,answer])=>row+': '+answer).join('; '):Array.isArray(v)?v.join('; '):v;
const message=e=>e.response?.data?.message||e.message||'Unable to complete request';
const courseName=course=>course?.name||course?.title;
function courseFormContent(course){
 const name=courseName(course);
 return {
   title:name?`${name} Course Evaluation`.slice(0,200):'Telesom Academy Course Evaluation',
   description:`Please share feedback on ${name||'your course'}, including its structure, content, and instructor.`,
   questions:courseEvaluationTemplate(),
 };
}
function CourseOptions({courses}){
 return <>
   <option value="">Select a course</option>
   {courses.map(course=><option key={course._id} value={course._id}>{courseName(course)}</option>)}
 </>;
}
export function NewEvaluation(){
 const navigate=useNavigate();
 const [params]=useSearchParams();
 const [courses,setCourses]=useState(null);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const [defenseCourse,setDefenseCourse]=useState(()=>params.get('course')||'');
 const selectedDefenseCourse=courses?.find(course=>course._id===defenseCourse);

 useEffect(()=>{
   const controller=new AbortController();
   api.get('/evaluations/courses',{signal:controller.signal})
     .then(({data})=>{if(!controller.signal.aborted)setCourses(data.courses);})
     .catch(error=>{if(!controller.signal.aborted)setError(message(error));});
   return ()=>controller.abort();
 },[attempt]);

 return <div className="evaluations ev-create">
   <nav className="ev-create-breadcrumb" aria-label="Breadcrumb"><Link to="/admin">Dashboard</Link><span aria-hidden="true">/</span><span aria-current="page">Project Defense</span></nav>
   <header className="ev-create-hero">
     <div><h2>Project Defense</h2><p>Generate a defense form for a course and manage saved evaluations.</p></div>
     <div className="ev-create-hero-art" aria-hidden="true">
       <span className="ev-create-hero-sheet"><TeachingIcon name="clipboard" size={47}/></span>
       <span className="ev-create-hero-cap"><TeachingIcon name="graduate" size={37}/></span>
     </div>
   </header>
   <section className="ev-card ev-defense-generator">
     <span className="ev-create-icon ev-create-icon-defense"><TeachingIcon name="layers" size={21}/></span>
     <div className="ev-defense-generator-content">
       <h3>Full-Stack Project Defense</h3>
       <form className="ev-defense-generator-form" onSubmit={event=>{
         event.preventDefault();
         if(selectedDefenseCourse){
           navigate('/admin/project-defenses/new?'+new URLSearchParams({course:defenseCourse}));
         }
       }}>
         <label>Choose a course
           <select required value={selectedDefenseCourse?defenseCourse:''} disabled={!courses?.length} onChange={event=>setDefenseCourse(event.target.value)}>
             <CourseOptions courses={courses||[]}/>
           </select>
         </label>
         <div className="ev-defense-generator-actions">
           <button className="btn btn-primary" type="submit" disabled={!selectedDefenseCourse}>Generate Defense</button>
           <Link className="btn" to="/admin/project-defenses"><TeachingIcon name="folder" size={16}/>Saved Defenses</Link>
         </div>
       </form>
     </div>
   </section>
   {error&&<div className="ev-error" role="alert">{error} {!courses&&<button type="button" onClick={()=>{setError('');setAttempt(value=>value+1);}}>Retry</button>}</div>}
   {!courses&&!error&&<p role="status">Loading courses…</p>}
 </div>;
}
function AdminEvaluationCard({form,base}){
 const url=base+'/'+form._id;
 return <article className="ev-card ev-admin-card">
   <header className="ev-admin-card-heading">
     <span>{form.allCourses?'All Courses':courseName(form.course)}</span>
     <span className="ev-status" data-state={form.effectiveStatus}>{form.effectiveStatus}</span>
   </header>
   <h3>{form.title}</h3>
   {form.description&&<p>{form.description}</p>}
   <dl className="ev-admin-card-counts">
     <div><dt>Eligible</dt><dd>{form.eligibleCount}</dd></div>
     <div><dt>Assigned</dt><dd>{form.assignedCount}</dd></div>
     <div><dt>Submitted</dt><dd>{form.responseCount}</dd></div>
   </dl>
   <p>{form.deadline?`Deadline · ${date(form.deadline)} (Africa/Nairobi)`:'No deadline'}</p>
   <div className="ev-card-links">
     <Link className="btn btn-primary" to={url+'?view=report'}>View Results</Link>
     <Link className="btn" to={url}>Edit Form</Link>
   </div>
 </article>;
}
function Pager({page,total,onChange}){return <div className="ev-actions"><button disabled={page<=1} onClick={()=>onChange(page-1)}>Previous</button><span>Page {page} · {total} records</span><button disabled={page*50>=total} onClick={()=>onChange(page+1)}>Next</button></div>;}
function Answer({q,value,onChange,disabled}){const props={disabled,required:q.required,value:value??'',onChange:e=>onChange(e.target.value)};if(q.type==='section')return <header><h2>{q.title}</h2><p>{q.description}</p></header>;return <div className="ev-question"><label><strong>{q.title}{q.required?' *':''}</strong><small>{q.description}</small></label>{q.type==='grid'?<div className="ev-matrix-scroll"><table className="ev-matrix"><thead><tr><th scope="col">Evaluation criteria</th>{q.options.map(o=><th scope="col" key={o}>{o}</th>)}</tr></thead><tbody>{(q.rows||[]).map((row,i)=><tr key={row}><th scope="row">{row}</th>{q.options.map(o=><td key={o}><input type="radio" aria-label={row+': '+o} name={q.key+'-'+i} required={q.required} disabled={disabled} checked={value?.[row]===o} onChange={()=>onChange({...value,[row]:o})}/></td>)}</tr>)}</tbody></table></div>:q.type==='paragraph'?<textarea {...props}/>:q.type==='checkbox'?q.options.map(o=><label className="ev-check" key={o}><input type="checkbox" disabled={disabled} checked={(value||[]).includes(o)} onChange={e=>onChange(e.target.checked?[...(value||[]),o]:(value||[]).filter(v=>v!==o))}/>{o}</label>):['choice','yesno'].includes(q.type)?(q.type==='yesno'?['Yes','No']:q.options).map(o=><label className="ev-check" key={o}><input type="radio" required={q.required} name={q.key} disabled={disabled} checked={value===o} onChange={()=>onChange(o)}/>{o}</label>):['dropdown','scale','rating'].includes(q.type)?<select {...props} onChange={e=>onChange(['scale','rating'].includes(q.type)?Number(e.target.value):e.target.value)}><option value="">Select an answer</option>{(q.type==='dropdown'?q.options:Array.from({length:q.max||5},(_,i)=>i+1)).map(o=><option key={o} value={o}>{q.type==='rating'?'★'.repeat(o):o}</option>)}</select>:<input {...props} type={q.type==='date'?'date':'text'}/>}</div>;}
function GridList({title,hint,items,onChange,addLabel}) {
 return <fieldset className="ev-grid-list">
   <legend>{title}</legend>
   <p>{hint}</p>
   {items.map((item,index)=><div className="ev-grid-entry" key={index}>
     <input aria-label={title+' '+(index+1)} value={item} onChange={e=>onChange(items.map((entry,i)=>i===index?e.target.value:entry))}/>
     <button type="button" aria-label={'Remove '+title.toLowerCase()+' '+(index+1)} disabled={items.length<=1} onClick={()=>onChange(items.filter((_,i)=>i!==index))}>×</button>
   </div>)}
   <button type="button" onClick={()=>onChange([...items,''])}>+ {addLabel}</button>
 </fieldset>;
}
function StudentEvaluationCard({form,base}) {
 const submitted=!!form.response?.submittedAt;
 const open=form.effectiveStatus==='published';
 const status=submitted?(form.response.editedAt?'Response edited':'Submitted'):open?'Awaiting response':'Closed';
 const action=submitted?'View my response':form.response?'Continue evaluation':'Start evaluation';
 return <article className="ev-student-card">
   <div className="ev-student-card-body">
     <div className="ev-student-card-meta">
       <span className="ev-eyebrow">{form.allCourses?'All Courses':form.course?.name||form.course?.title||'Course feedback'}</span>
       <span className="ev-status" data-state={submitted?'done':open?'pending':'closed'}>{status}</span>
     </div>
     <h3>{form.title}</h3>
     {form.description&&<p>{form.description}</p>}
   </div>
   <footer className="ev-student-card-footer">
     <span>{form.deadline?<><strong>Deadline</strong> <time dateTime={form.deadline}>{date(form.deadline)} (EAT)</time></>:'No deadline'}</span>
     {(submitted||open)&&<Link className="btn btn-primary" to={base+'/'+form._id}>{action}</Link>}
   </footer>
 </article>;
}
export default function Evaluations({admin=false}){
 const {id}=useParams(),navigate=useNavigate();const [forms,setForms]=useState([]),[form,setForm]=useState(null),[response,setResponse]=useState(null),[answers,setAnswers]=useState({}),[courses,setCourses]=useState([]),[students,setStudents]=useState([]),[eligible,setEligible]=useState(0),[studentPage,setStudentPage]=useState(1),[page,setPage]=useState(1),[total,setTotal]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false),[report,setReport]=useState(null),[reportPage,setReportPage]=useState(1),[search,setSearch]=useState(''),[drag,setDrag]=useState(null),[editing,setEditing]=useState(false),[editField,setEditField]=useState(null);
 const moreActions=useRef(null);
 useEffect(()=>{
   function closeOnOutsidePress(event){
     const menu=moreActions.current;
     if(menu?.open&&!menu.contains(event.target))menu.open=false;
   }
   function closeOnEscape(event){
     const menu=moreActions.current;
     if(event.key==='Escape'&&menu?.open){
       menu.open=false;
       menu.querySelector('summary')?.focus();
     }
   }
   document.addEventListener('pointerdown',closeOnOutsidePress);
   document.addEventListener('keydown',closeOnEscape);
   return ()=>{
     document.removeEventListener('pointerdown',closeOnOutsidePress);
     document.removeEventListener('keydown',closeOnEscape);
   };
 },[]);
 const [params,setParams]=useSearchParams();
 const selectedResponse=admin?params.get('response'):null;
 const reportRequested=admin&&(params.get('view')==='report'||!!selectedResponse);
 const base=admin?'/admin/evaluations':'/student/evaluations';
 async function load(){setLoading(true);setError('');try{if(id){const {data}=await api.get('/evaluations/'+id);const loadedForm=data.form;
 if(admin&&loadedForm.status==='draft'&&!loadedForm.responseCount){
   loadedForm.questions=loadedForm.questions.filter(q=>!(q.key==='course'&&q.title==='Course'&&q.type==='choice'));
 }
 setForm(loadedForm);setResponse(data.response);setAnswers(data.response?.answers||{});setEditing(false);if(reportRequested){setReportPage(1);setSearch('');await getReport(1,'',selectedResponse);}}else{const {data}=await api.get('/evaluations',{params:{page}});setForms(data.forms);setTotal(data.total);}if(admin&&id)setCourses((await api.get('/evaluations/courses')).data.courses);}catch(e){setError(message(e));}finally{setLoading(false);}}
 useEffect(()=>{setForm(null);setStudents([]);setEligible(0);setStudentPage(1);setReport(null);setPreview(false);setNotice('');load();},[id,page,admin,selectedResponse,reportRequested]);
 useEffect(()=>{if(!admin||(!form?.course&&!form?.allCourses))return;let current=true;api.get('/evaluations/eligible/'+(form.allCourses?'all':form.course?._id||form.course),{params:{page:studentPage}}).then(({data})=>{if(current){setStudents(data.students);setEligible(data.total);}}).catch(e=>{if(current)setError(message(e));});return()=>{current=false;};},[admin,form?.course,form?.allCourses,studentPage]);
 async function run(fn){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(message(e));}finally{setBusy(false);}}
 const addField=()=>{const field={key:key(),type:'short',title:'Untitled question',description:'',required:false,options:[],max:5};setForm(f=>({...f,questions:[...f.questions,field]}));setEditField(field.key);setPreview(false);setReport(null);};
 const generateForm=()=>{
   if(form.questions.length&&!window.confirm('Replace the current questions with the course evaluation template?'))return;
   const course=courses.find(item=>item._id===(form.course?._id||form.course))||form.course;
   setForm(f=>({...f,...courseFormContent(f.allCourses?null:course)}));
   setEditField(null);
   setPreview(false);
   setReport(null);
   setNotice('Form generated. Review the questions and save your changes.');
 };
 function selectCourse(course,allCourses) {
   setForm(f=>({...f,course,allCourses,students:[],assignAll:false}));
   setStudents([]);
   setEligible(0);
   setStudentPage(1);
 }
 const patch=(field,value)=>setForm(f=>({...f,[field]:value}));
 const question=(i,field,value)=>setForm(f=>({...f,questions:f.questions.map((q,j)=>j===i?{...q,[field]:value}:q)}));
 const reorder=(from,to)=>{const qs=[...form.questions];qs.splice(to,0,qs.splice(from,1)[0]);patch('questions',qs);};
 async function save(showNotice=true){const {data}=await api.put('/evaluations/'+id,{...form,course:form.allCourses?null:form.course?._id||form.course});setForm(data.form);if(showNotice)setNotice('Changes saved.');return data.form;}
 async function action(name){await api.post(`/evaluations/${id}/${name}`);await load();setNotice(name==='publish'?'Published. Assigned students can open this form in Evaluation Forms and find it in their notifications.':'Evaluation '+name+' completed.');}
 async function getReport(p=reportPage,s=search,responseId=null){const {data}=await api.get(`/evaluations/${id}/report`,{params:{page:p,search:s,response:responseId}});setReport(data);}
 async function exportPdf(){
   const {data}=await api.get('/evaluations/'+id+'/report');
   const answeredByKey=new Map(data.questionCounts.map(q=>[q.key,q.answered]));
   const statsByKey=new Map(data.stats.map(q=>[q.key,q.counts]));
   const records=data.courseCounts.map(course=>({
     courseName:course.name,
     responses:course.count
   }));
   let number=0;
   for(const question of data.form.questions){
     if(question.type==='section')continue;
     number++;
     const answered=answeredByKey.get(question.key)||0;
     const base={question:question.title,answered,unanswered:data.submitted-answered};
     if(question.type==='grid'){
       for(const row of question.rows){
         const counts=statsByKey.get(question.key+' / '+row)||{};
         const rowAnswered=Object.values(counts).reduce((sum,count)=>sum+count,0);
         const ratings=Object.fromEntries(question.options.map(option=>[option+' responses',counts[option]||0]));
         records.push({number,question:question.title,statement:row,...ratings,answered:rowAnswered,skipped:data.submitted-rowAnswered});
       }
       continue;
     }
     const counts=statsByKey.get(question.key);
     const choices=question.type==='yesno'?['Yes','No']:
       ['scale','rating'].includes(question.type)?Array.from({length:question.max||5},(_,index)=>String(index+1)):
       question.options||[];
     const breakdown=counts?Object.fromEntries(choices.map(choice=>[choice+' responses',counts[choice]||0])):{};
     records.push({number,question:base.question,...breakdown,answered:base.answered,skipped:base.unanswered});
   }
   const pdf=buildReportPdf(records,'Evaluation Summary',{
     evaluation:data.form.title,
     courseScope:data.form.allCourses?'All Courses':undefined,
     counting:data.form.allCourses?'Students enrolled in multiple courses count once in each course.':undefined
   },{totalResponses:data.submitted},{evaluationCards:true});
   const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));
   const link=document.createElement('a');
   link.href=url;
   link.download='evaluation-summary.pdf';
   link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function exportCsv(){let rows=[],p=1,data;do{data=(await api.get(`/evaluations/${id}/report`,{params:{page:p++,search}})).data;rows.push(...data.responses);}while(rows.length<data.total);const qs=report.form.questions.filter(q=>q.type!=='section');const escape=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';const csv=[['Student ID','Student','Submitted (UTC)','Edited (UTC)',...qs.map(q=>q.title)],...rows.map(r=>[r.student?.studentId,r.student?.user?.name,r.submittedAt,r.editedAt,...qs.map(q=>answerText(r.answers[q.key]))])].map(row=>row.map(escape).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='evaluation-responses.csv';a.click();URL.revokeObjectURL(url);}
 const assignmentLocked=!!form?.responseCount;
 const locked=false;
 const submitted=!!response?.submittedAt;
 const open=form?.effectiveStatus==='published';
 const canEdit=form?.allowEdit&&(open||form?.allowClosedEdit)&&form?.status!=='draft';
 return <div className={`evaluations ${!admin&&!id?'ev-student-list':''}`}><div className="ev-actions"><h2>Evaluation Forms</h2>{id&&<Link to={base}>All evaluations</Link>}</div>{error&&<div className="ev-error" role="alert">{error} <button onClick={load}>Reload</button></div>}{notice&&<p className="ev-notice" role="status">{notice}</p>}{loading?<p>Loading evaluations…</p>:!id?<><div className={admin?"ev-grid ev-admin-grid":"ev-grid"}>{forms.map(f=>admin?<AdminEvaluationCard key={f._id} form={f} base={base}/>:<StudentEvaluationCard key={f._id} form={f} base={base}/>)}</div>{!forms.length&&<p>No evaluation forms available.</p>}{(admin||total>50)&&<Pager page={page} total={total} onChange={setPage}/>}</>:form&&<>
 {admin&&<div className="ev-actions ev-toolbar"><div className="ev-tool-group"><button className="btn btn-primary" disabled={busy} onClick={generateForm}>Generate Form</button><button disabled={busy} onClick={addField}>Add Field</button><button onClick={()=>{setPreview(false);setReport(null);}}>Edit Form</button><button disabled={busy} onClick={()=>run(save)}>Save Changes</button><button onClick={()=>setPreview(!preview)}>{preview?'Back to builder':'Preview'}</button></div><div className="ev-tool-group"><button className="ev-publish" disabled={busy} onClick={()=>run(async()=>{if(!(form.assignAll?eligible:form.students.length))throw new Error('Assign at least one enrolled student before publishing.');await save(false);await action('publish');})}>Publish</button></div><details ref={moreActions} className="ev-more"><summary>More actions</summary><div className="ev-more-panel"><button disabled={busy} onClick={()=>run(()=>action('unpublish'))}>Unpublish</button><button disabled={busy} onClick={()=>run(()=>action('close'))}>Close</button><button disabled={busy} onClick={()=>setParams({view:'report'})}>Responses & reports</button><button className="ev-delete" disabled={busy} onClick={()=>{if(window.confirm('Delete this evaluation and all its responses permanently?'))run(async()=>{await api.delete('/evaluations/'+id);navigate(base);});}}>Delete</button></div></details></div>}
 {admin&&!preview&&!report?<div className="ev-builder"><section className="ev-card ev-settings"><div className="ev-section-title"><div><span className="ev-eyebrow">FORM BUILDER</span><h3>Form details & settings</h3><p>Customize your evaluation and choose who can respond.</p></div><span className="ev-status">{form.effectiveStatus||form.status}</span></div><label>Title<input maxLength={200} value={form.title} onChange={e=>patch('title',e.target.value)}/></label><label>Description<textarea value={form.description||''} onChange={e=>patch('description',e.target.value)}/></label><fieldset className="ev-course-scope"><legend>Course selection</legend><div className="ev-scope-options"><label className="ev-check"><input type="radio" name="course-scope" checked={!!form.allCourses} disabled={assignmentLocked} onChange={()=>selectCourse(null,true)}/>All Courses</label><label className="ev-check"><input type="radio" name="course-scope" checked={!form.allCourses} disabled={assignmentLocked||!courses.length} onChange={()=>selectCourse(courses[0]._id,false)}/>Specific Course</label></div>{!form.allCourses&&<label>Choose a course<select disabled={assignmentLocked} value={form.course?._id||form.course||''} onChange={e=>selectCourse(e.target.value,false)}>{courses.map(c=><option key={c._id} value={c._id}>{c.name||c.title}</option>)}</select></label>}</fieldset><p>{eligible} enrolled students · {form.assignAll?eligible:form.students.length} selected · {form.responseCount} submitted</p><label className="ev-check"><input disabled={assignmentLocked} type="checkbox" checked={!!form.assignAll} onChange={e=>patch('assignAll',e.target.checked)}/>Assign all enrolled students</label><div className="ev-students">{students.map(s=><label className="ev-check" key={s._id}><input type="checkbox" disabled={assignmentLocked||form.assignAll} checked={!!form.assignAll||form.students.includes(s._id)} onChange={e=>patch('students',e.target.checked?[...form.students,s._id]:form.students.filter(id=>id!==s._id))}/>{s.studentId} · {s.user?.name}</label>)}</div><Pager page={studentPage} total={eligible} onChange={setStudentPage}/><label>Closing deadline (Africa/Nairobi)<input type="datetime-local" value={localDate(form.deadline)} onChange={e=>patch('deadline',e.target.value?new Date(e.target.value+':00+03:00').toISOString():null)}/></label><label>Response limit (empty for unlimited)<input type="number" min="1" step="1" value={form.responseLimit||''} onChange={e=>patch('responseLimit',e.target.value?Number(e.target.value):null)}/></label>{[['allowEdit','Allow students to edit submitted responses'],['allowClosedEdit','Explicitly allow response edits after closing'],['reminders','Enable reminder notices within 24 hours of the deadline']].map(([field,label])=><label key={field} className="ev-check"><input type="checkbox" checked={!!form[field]} onChange={e=>patch(field,e.target.checked)}/>{label}</label>)}<p>Status: {form.effectiveStatus||form.status} · {assignmentLocked?'You can edit questions and add fields. Existing submitted answers must remain valid; course and assignments are locked.':'Drag questions to reorder or use the arrow buttons.'}</p></section>
 <section className="ev-fields"><div className="ev-fields-heading"><div><span className="ev-eyebrow">COURSE FEEDBACK</span><h3>Questions</h3></div><span className="ev-status">{form.questions.length} fields</span></div>{form.questions.map((q,i)=><section className="ev-card" key={q.key} draggable={!locked} onDragStart={()=>setDrag(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(!locked&&drag!==null){reorder(drag,i);setDrag(null);}}}><div className="ev-actions"><strong>Question {i+1}</strong><button onClick={()=>setEditField(editField===q.key?null:q.key)}>{editField===q.key?'Done':'Edit'}</button><button disabled={locked||i===0} onClick={()=>reorder(i,i-1)}>↑</button><button disabled={locked||i===form.questions.length-1} onClick={()=>reorder(i,i+1)}>↓</button><button disabled={locked} onClick={()=>patch('questions',form.questions.filter((_,j)=>i!==j))}>Delete question</button></div>{editField!==q.key?<div className="ev-field-summary"><h3>{q.title}</h3><p>{types[q.type]} · {q.required?'Required':'Optional'}</p>{q.type==='grid'&&<p>{q.rows?.length||0} criteria · {q.options?.length||0} choices</p>}</div>:<><label>Question type<select disabled={locked} value={q.type} onChange={e=>setForm(f=>({...f,questions:f.questions.map((item,j)=>j===i?{...item,type:e.target.value,...(e.target.value==='grid'?{rows:item.rows?.length?item.rows:['New criterion'],options:item.options?.length?item.options:['Strongly disagree','Disagree','Neutral','Agree','Strongly agree']}: {})}:item)}))}>{Object.entries(types).map(([t,label])=><option key={t} value={t}>{label}</option>)}</select></label><label>{q.type==='section'?'Section heading':'Question title'}<input disabled={locked} value={q.title} onChange={e=>question(i,'title',e.target.value)}/></label><label>Description<textarea disabled={locked} value={q.description||''} onChange={e=>question(i,'description',e.target.value)}/></label>{['choice','checkbox','dropdown'].includes(q.type)&&<label>Answer options (one per line)<textarea value={(q.options||[]).join('\n')} onChange={e=>question(i,'options',e.target.value.split('\n'))}/></label>}{q.type==='grid'&&<div className="ev-grid-editor"><p>Students choose one rating for each statement.</p><GridList title="Statements" hint="What should students rate?" items={q.rows||[]} onChange={items=>question(i,'rows',items)} addLabel="Add statement"/><GridList title="Rating choices" hint="Which ratings can students choose from?" items={q.options||[]} onChange={items=>question(i,'options',items)} addLabel="Add rating"/></div>}{['scale','rating'].includes(q.type)&&<label>Maximum<select disabled={locked} value={q.max||5} onChange={e=>question(i,'max',Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option></select></label>}{q.type!=='section'&&<label className="ev-check"><input disabled={locked} type="checkbox" checked={!!q.required} onChange={e=>question(i,'required',e.target.checked)}/>{q.type==='grid'?'Require a rating for every statement':'Required'}</label>}</>}</section>)}<div className="ev-actions"><button disabled={busy} onClick={addField}>Add Field</button><button disabled={locked} onClick={()=>patch('questions',[...form.questions,{key:key(),type:'section',title:'New section',description:'',required:false,options:[],max:5}])}>Add section</button></div></section></div>:report?<section className="ev-card"><div className="ev-actions"><h3>Response report</h3><button onClick={()=>{setReport(null);if(reportRequested)setParams({});}}>Back to builder</button><button className="btn btn-primary" disabled={busy} onClick={()=>run(exportPdf)}>Export PDF</button><button disabled={busy} onClick={()=>run(exportCsv)}>Export CSV</button></div><p>{report.assigned} assigned · {report.submitted} submitted · {report.pendingCount} pending · {report.completion}% complete</p><p>Response limit: {report.form.responseLimit||'Unlimited'} · Opened: {date(report.form.openedAt)} · Deadline: {date(report.form.deadline)} · Closed: {date(report.form.closedAt)}</p><label>Search students or answers<input value={search} onChange={e=>setSearch(e.target.value)}/></label><button onClick={()=>run(async()=>{setReportPage(1);await getReport(1);})}>Filter responses</button>{report.stats.map(q=><div className="ev-question" key={q.key}><h4>{q.title}</h4>{Object.entries(q.counts).map(([option,count])=><div className="ev-bar" key={option}><span>{option}</span><progress max={Math.max(1,report.submitted)} value={count}/><span>{count}</span></div>)}</div>)}<h3>Individual submissions</h3>{report.responses.map(r=><details key={r._id} open={selectedResponse===r._id||undefined}><summary>{r.student?.studentId} · {r.student?.user?.name} · {date(r.submittedAt)}{r.editedAt?' · Edited '+date(r.editedAt):''}</summary>{report.form.questions.filter(q=>q.type!=='section').map(q=><p key={q.key}><strong>{q.title}: </strong>{answerText(r.answers[q.key])??'No answer'}</p>)}</details>)}<h3>Students who have not submitted ({report.pendingCount})</h3>{report.pending.map(s=><p key={s._id}>{s.studentId} · {s.user?.name}</p>)}<Pager page={reportPage} total={Math.max(report.total,report.pendingCount)} onChange={p=>run(async()=>{setReportPage(p);await getReport(p);})}/></section>:<section className="ev-card"><h2>{form.title}{preview?' — Preview':''}</h2><p>{form.allCourses?'All Courses':form.course?.name||form.course?.title}</p><p>{form.description}</p><p>Deadline: {date(form.deadline)} (Africa/Nairobi) · Status: {form.effectiveStatus||form.status}</p>{submitted&&<p className="ev-notice">You have already submitted this evaluation. {response.editedAt?'Edited':'Submitted'}: {date(response.editedAt||response.submittedAt)}</p>}{submitted&&canEdit&&!editing&&<button onClick={()=>setEditing(true)}>Edit My Response</button>}{!admin&&!submitted&&!open&&<p>This evaluation is closed or expired.</p>}<form onSubmit={e=>{e.preventDefault();if(preview){setNotice('Preview validation complete. No response was submitted.');return;}run(async()=>{const {data}=await api.put(`/evaluations/${id}/response`,{answers,submit:true});setResponse(data.response);setEditing(false);setNotice('Your evaluation response has been submitted.');});}}>{form.questions.map(q=><Answer key={q.key} q={q} value={answers[q.key]} disabled={!preview&&(submitted?!editing:!open)} onChange={value=>setAnswers(a=>({...a,[q.key]:value}))}/>)}<p>{form.questions.filter(q=>q.type!=='section'&&answers[q.key]!=null&&answers[q.key]!==''&&(!Array.isArray(answers[q.key])||answers[q.key].length)).length} of {form.questions.filter(q=>q.type!=='section').length} answered</p>{(preview||(!submitted&&open)||editing)&&<div className="ev-actions"><button className="btn btn-primary" disabled={busy} type="submit">{preview?'Test preview':editing?'Save edited response':'Submit Evaluation'}</button>{!preview&&!submitted&&<button disabled={busy} type="button" onClick={()=>run(async()=>{const {data}=await api.put(`/evaluations/${id}/response`,{answers,submit:false});setResponse(data.response);setNotice('Progress saved. You can continue later.');})}>Save progress</button>}</div>}</form></section>}
 </>}</div>;
}

