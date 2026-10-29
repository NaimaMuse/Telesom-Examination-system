import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {Link} from 'react-router-dom';
import {CourseOutlines} from './AcademyWorkspace';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { usePageSearch, matchesPageSearch } from '../context/PageSearchContext';
import './TeacherContracts.css';

const dateLabel = value => value || '—';
const emptyContract = {teacher:'',course:'',academicYear:'',batch:'',startDate:'',endDate:'',totalDays:'',status:'active'};
function ContractDialog({ children, onClose, busy, label }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element=dialog.current, previous=document.activeElement, overflow=document.body.style.overflow;
    document.body.style.overflow='hidden'; element.showModal();
    return () => {element.close();document.body.style.overflow=overflow;if(previous&&document.contains(previous))previous.focus();};
  }, []);
  return <dialog ref={dialog} className="modal-box contract-dialog" aria-label={label} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>{children}</dialog>;
}

export default function TeacherContracts({ admin = false, combined = false, controlledContractId = '', workspaceMode = 'all', onContractUpdate, onEditingChange }) {
  const [search] = usePageSearch();
  const [contracts,setContracts] = useState([]);
  const [options,setOptions] = useState({teachers:[],courses:[],assignments:[]});
  const [localSelectedId,setSelectedId] = useState('');
  const selectedId=controlledContractId||localSelectedId;
  const [outlineBusy,setOutlineBusy]=useState(false);
  const [detail,setDetail] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [revision,setRevision] = useState(0);
  const [contractForm,setContractForm] = useState(null);
  const [lessonForm,setLessonForm] = useState(null);
  useEffect(()=>{onEditingChange?.(!!(busy||contractForm||lessonForm||outlineBusy));},[busy,contractForm,lessonForm,outlineBusy,onEditingChange]);
  useEffect(()=>()=>onEditingChange?.(false),[onEditingChange]);
  const [filters,setFilters] = useState({teacher:'',course:'',batch:'',status:''});
  useAutoRefresh(async ({signal,isCurrent})=>{
    try {
      const requests=[api.get('/teacher-contracts',{signal})];
      if(selectedId)requests.push(api.get('/teacher-contracts/'+selectedId,{signal}));
      if(admin)requests.push(api.get('/teacher-contracts/options',{signal}));
      const responses=await Promise.all(requests);
      if(!isCurrent())return;
      const next=responses[0].data.contracts||[];setContracts(next);
      if(!selectedId&&next.length)setSelectedId(next[0]._id);
      if(selectedId)setDetail(responses[1].data);
      if(admin)setOptions(responses[responses.length-1].data);
      setError('');
    }catch(err){if(isCurrent())setError(err.response?.data?.message||'Contracts could not refresh. Please retry.');}
    finally{if(isCurrent())setLoading(false);}
  },{enabled:!busy&&!contractForm&&!lessonForm,deps:[selectedId,revision,admin]});
  const current=contracts.find(c=>c._id===selectedId);
  const visible=contracts.filter(c=>Object.entries(filters).every(([key,value])=>!value||(key==='status'?c.contractStatus===value:key==='batch'?c.batch===value:String(c[key]?._id||c[key])===value))&&matchesPageSearch(search,c.teacher?.user?.name,c.teacher?.teacherId,c.course?.title,c.course?.name,c.batch,c.academicYear,c.contractStatus));
  const saveContract=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      const payload={...contractForm,totalDays:Number(contractForm.totalDays)};
      const {data}=contractForm._id?await api.put('/teacher-contracts/'+contractForm._id,payload):await api.post('/teacher-contracts',payload);
      setContractForm(null);setSelectedId(data.contract._id);setRevision(v=>v+1);setNotice('Contract saved. Teaching days update automatically when lessons are completed.');
    }catch(err){setError(err.response?.data?.message||'Contract could not be saved.');}
    finally{setBusy(false);}
  };
  const saveLesson=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{const {data}=await api.post('/teacher-contracts/'+selectedId+'/lessons',lessonForm);setDetail(previous=>previous?{...previous,lessons:[...previous.lessons,data.lesson]}:previous);setLessonForm(null);onContractUpdate?.({});setRevision(v=>v+1);setNotice('Lesson added. Mark it completed after teaching it.');}
    catch(err){setError(err.response?.data?.message||'Lesson could not be saved.');}
    finally{setBusy(false);}
  };
  const changeStatus=async lesson=>{
    setBusy(true);setError('');setNotice('');
    try{
      const {data}=await api.put('/teacher-contracts/'+selectedId+'/lessons/'+lesson._id+'/status',{status:lesson.status==='completed'?'planned':'completed'});
      onContractUpdate?.(data);
      const merge=old=>({...old,...data.contract,teacher:old.teacher,course:old.course});
      setContracts(previous=>previous.map(c=>c._id===selectedId?merge(c):c));
      setDetail(previous=>previous?{contract:merge(previous.contract),lessons:previous.lessons.map(row=>row._id===lesson._id?data.lesson:row)}:previous);
      setNotice(data.lesson.status==='completed'?'Lesson completed. Contract balance updated.':'Completion reversed. Contract balance recalculated.');
    }catch(err){setError(err.response?.data?.message||'Lesson status could not be changed.');}
    finally{setBusy(false);}
  };
  const field=(key,value)=>setContractForm(previous=>({...previous,[key]:value}));
  const assignedCourses=contractForm?options.assignments.filter(a=>String(a.teacher?._id||a.teacher)===String(contractForm.teacher)).map(a=>String(a.course?._id||a.course)):[];
  const formCourses=options.courses.filter(course=>assignedCourses.includes(String(course._id))||String(course._id)===contractForm?.course);
  const matchingAssignments=contractForm?options.assignments.filter(a=>String(a.teacher?._id||a.teacher)===String(contractForm.teacher)&&String(a.course?._id||a.course)===String(contractForm.course)):[];
  const formBatches=(options.batches||[]).filter(batch=>matchingAssignments.some(assignment=>assignment.academicYear===batch.academicYear));
  useEffect(()=>{
    if(!contractForm||contractForm._id||!contractForm.course)return;
    const valid=formBatches.some(batch=>batch.academicYear===contractForm.academicYear&&batch.name===contractForm.batch);
    if(valid)return;
    const single=formBatches.length===1?formBatches[0]:null;
    if(single||contractForm.academicYear||contractForm.batch)setContractForm(previous=>({...previous,academicYear:single?.academicYear||'',batch:single?.name||''}));
  },[contractForm?.teacher,contractForm?.course,options]);
  if(contractForm?.academicYear&&contractForm?.batch&&!formBatches.some(batch=>batch.academicYear===contractForm.academicYear&&batch.name===contractForm.batch))formBatches.push({_id:'existing',academicYear:contractForm.academicYear,name:contractForm.batch});
  const outlineChanged=data=>{
    onContractUpdate?.(data);
    if(data?.contract){const updated=data.contract;setContracts(previous=>previous.map(c=>c._id===updated._id?{...c,...updated,course:c.course,teacher:c.teacher}:c));}
    setRevision(v=>v+1);
  };
  const displayedLessons=(detail?.lessons||[]).filter(l=>!combined||!l.outline);
  return <section className={'contract-workspace'+(combined?' teaching-workspace':'')+(workspaceMode==='outline'?' course-outline-integrated':'')} aria-label="Teacher contracts and lessons">
    {workspaceMode!=='outline'&&<div className={combined?'contract-toolbar':'contract-heading'}><div hidden={combined}><h2>{combined?'Teaching & Course Outline':admin?'Teacher Contracts':'Teaching Contract'}</h2><p>{combined?'Manage your teaching days, course plan and lesson progress in one place.':'Remaining days = total contract days − unique completed teaching days.'}</p></div>{admin&&<button type="button" className="btn btn-primary" onClick={()=>{setError('');setContractForm({...emptyContract});}}>+ Add contract</button>}</div>}
    {error&&<div className="contract-alert error" role="alert">{error}</div>}{notice&&<div className="contract-alert" role="status">{notice}</div>}
    {admin&&<div className="contract-filters">
      <label>Teacher<select className="form-control" value={filters.teacher} onChange={event=>{
        const teacher=event.target.value;
        const contract=contracts.filter(c=>String(c.teacher?._id||c.teacher)===teacher).sort((a,b)=>String(b.createdAt||b.startDate||'').localeCompare(String(a.createdAt||a.startDate||'')))[0];
        const assignment=options.assignments.find(a=>String(a.teacher?._id||a.teacher)===teacher);
        setFilters({teacher,course:teacher?String(contract?.course?._id||contract?.course||assignment?.course?._id||assignment?.course||''):'',batch:'',status:teacher?contract?.contractStatus||'':''});
      }}><option value="">All teachers</option>{options.teachers.map(teacher=><option key={teacher._id} value={teacher._id}>{teacher.name||teacher.user?.name}</option>)}</select></label>
      <label>Course<input className="form-control" readOnly value={filters.teacher?options.courses.find(course=>String(course._id)===filters.course)?.title||options.courses.find(course=>String(course._id)===filters.course)?.name||'No assigned course':'Select a teacher'}/></label>
      <label>Batch<select className="form-control" value={filters.batch} onChange={event=>{
        const batch=event.target.value;
        const contract=contracts.find(c=>(!filters.teacher||String(c.teacher?._id||c.teacher)===filters.teacher)&&(!filters.course||String(c.course?._id||c.course)===filters.course)&&(!batch||c.batch===batch));
        setFilters(previous=>({...previous,batch,status:filters.teacher?contract?.contractStatus||'':''}));
      }}><option value="">All batches</option>{[...new Set(contracts.filter(c=>(!filters.teacher||String(c.teacher?._id||c.teacher)===filters.teacher)&&(!filters.course||String(c.course?._id||c.course)===filters.course)).map(c=>c.batch))].filter(Boolean).map(batch=><option key={batch}>{batch}</option>)}</select></label>
      <label>Status<input className="form-control" readOnly value={filters.teacher?filters.status||'No contract':'Select a teacher'}/></label>
    </div>}
    {loading?<p className="contract-empty">Loading contracts…</p>:!contracts.length?<div className="contract-empty contract-empty-state"><span className="contract-empty-icon" aria-hidden="true">▤</span><h3>No teaching contracts yet</h3><p>{admin?'Add a contract to set teaching dates, track days, and organize the course outline.':'Your administrator has not configured a teaching contract yet.'}</p></div>:<>
      {!admin&&!controlledContractId&&<label className="contract-selector">Course / Batch<select className="form-control" value={selectedId} onChange={event=>{setSelectedId(event.target.value);setDetail(null);}}>{contracts.map(c=><option key={c._id} value={c._id}>{c.course?.title||c.course?.name} · {c.batch} · {c.academicYear}</option>)}</select></label>}
      {admin&&<div className="table-responsive"><table className="data-table"><thead><tr><th>Teacher</th><th>Course / Batch</th><th>Total days</th><th>Completed days</th><th>Remaining days</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(c=><tr key={c._id}><td><strong>{c.teacher?.user?.name||'Teacher'}</strong><small className="contract-muted">{c.teacher?.teacherId}</small></td><td>{c.course?.title||c.course?.name}<small className="contract-muted">{c.batch} · {c.academicYear}</small></td><td>{c.totalContractDays}</td><td>{c.completedTeachingDays}</td><td>{c.remainingContractDays}</td><td>{c.contractStatus}</td><td><div className="contract-row-actions"><button className="btn btn-sm btn-secondary" onClick={()=>{setSelectedId(c._id);setDetail(null);}}>View</button><button className="btn btn-sm btn-secondary" onClick={()=>{setError('');setContractForm({...c,teacher:c.teacher._id,course:c.course._id,totalDays:c.totalContractDays});}}>Edit</button></div></td></tr>)}{!visible.length&&<tr><td colSpan={7}>No contracts match these filters.</td></tr>}</tbody></table></div>}
      {current&&<>
        {workspaceMode!=='outline'&&<><div className="contract-selected-heading"><h3>{current.course?.title||current.course?.name} · {current.batch}</h3><span>{current.contractStatus}</span></div>
        <div className="contract-metrics">{[['Total Contract Days',current.totalContractDays],['Completed Teaching Days',current.completedTeachingDays],['Remaining Contract Days',current.remainingContractDays],['Contract Progress',current.progress+'%']].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <div className="contract-progress" aria-label={'Contract progress '+current.progress+'%'}><span style={{width:current.progress+'%'}}/></div>
        <p className="contract-muted">{current.startDate} — {current.endDate||'No end date'} · One day counts once, even with multiple completed lessons.</p></>}
        {combined&&<CourseOutlines key={selectedId} role={admin?'admin':'teacher'} embedded contractId={selectedId} onChange={outlineChanged} onEditingChange={setOutlineBusy}/>}
        {workspaceMode!=='outline'&&(!combined||displayedLessons.length>0)&&<><div className="contract-heading lessons-heading"><h3>{combined?'Additional contract lessons':'Assigned lessons'}</h3>{!admin&&!combined&&<button type="button" className="btn btn-sm btn-primary" disabled={busy||current.status!=='active'} onClick={()=>{setError('');setLessonForm({title:'',description:'',plannedDate:''});}}>+ Add lesson</button>}</div>
        {!detail||detail.contract._id!==selectedId?<p className="contract-empty">Loading lessons…</p>:!displayedLessons.length?<p className="contract-empty">No lessons added to this contract.</p>:<div className="table-responsive"><table className="data-table"><thead><tr><th>Lesson</th><th>Planned date</th><th>Status</th><th>Actual teaching day</th>{!admin&&<th>Action</th>}</tr></thead><tbody>{displayedLessons.map(lesson=><tr key={lesson._id}><td><strong>{lesson.title}</strong>{lesson.description&&<small className="contract-muted">{lesson.description}</small>}</td><td>{dateLabel(lesson.plannedDate)}</td><td><span className={'badge badge-'+(lesson.status==='completed'?'success':'warning')}>{lesson.status==='completed'?'Completed':'Planned'}</span></td><td>{dateLabel(lesson.completedDay)}</td>{!admin&&<td><button type="button" className={'btn btn-sm '+(lesson.status==='completed'?'btn-secondary':'btn-primary')} disabled={busy} onClick={()=>changeStatus(lesson)}>{lesson.status==='completed'?'Reverse completion':'Mark completed'}</button></td>}</tr>)}</tbody></table></div>}</>}
      </>}
    </>}
    {contractForm&&<ContractDialog label="Teacher contract" busy={busy} onClose={()=>setContractForm(null)}><div className="modal-header"><h3 className="modal-title">{contractForm._id?'Edit contract':'New teacher contract'}</h3><button className="modal-close" disabled={busy} aria-label="Close contract form" onClick={()=>setContractForm(null)}>×</button></div><form onSubmit={saveContract}><div className="modal-body"><div className="grid-2">
      <label>Teacher<select className="form-control" required disabled={busy||!!contractForm._id} value={contractForm.teacher} onChange={event=>{
        const teacher=event.target.value;
        const ids=[...new Set(options.assignments.filter(a=>String(a.teacher?._id||a.teacher)===teacher).map(a=>String(a.course?._id||a.course)))];
        const course=ids.length===1?ids[0]:'';
        setContractForm(previous=>({...previous,teacher,course,academicYear:'',batch:''}));
      }}><option value="">Select teacher</option>{options.teachers.map(t=><option key={t._id} value={t._id}>{t.name}</option>)}</select></label>
      <label>Assigned course{formCourses.length===1?<input className="form-control" readOnly value={formCourses[0].title||formCourses[0].name}/>:<select className="form-control" required disabled={busy||!!contractForm._id||!contractForm.teacher} value={contractForm.course} onChange={event=>setContractForm(previous=>({...previous,course:event.target.value,academicYear:'',batch:''}))}><option value="">{contractForm.teacher?(formCourses.length?'Select course':'No assigned courses'):'Select teacher first'}</option>{formCourses.map(course=><option key={course._id} value={course._id}>{course.title||course.name}</option>)}</select>}</label>
      <label>Year / Batch<select className="form-control" required disabled={busy||!!contractForm._id} value={contractForm.academicYear&&contractForm.batch?JSON.stringify([contractForm.academicYear,contractForm.batch]):''} onChange={event=>{const [academicYear,batch]=event.target.value?JSON.parse(event.target.value):['',''];setContractForm(previous=>({...previous,academicYear,batch}));}}><option value="">{formBatches.length?'Select year / batch':'No batches for this assignment year'}</option>{formBatches.map(batch=><option key={batch._id} value={JSON.stringify([batch.academicYear,batch.name])}>{batch.academicYear} / {batch.name}</option>)}</select>{contractForm.course&&!formBatches.length&&!contractForm._id&&<small className="contract-muted">No active batches match the teacher's course assignment year. Configure a matching batch in Years &amp; Batches or update the course assignment.</small>}</label>
      {[['startDate','Start date','date'],['endDate','End date (optional)','date'],['totalDays','Total teaching days','number']].map(([key,label,type])=><label key={key}>{label}<input className="form-control" type={type} min={type==='number'?1:undefined} step={type==='number'?1:undefined} required={key!=='endDate'} disabled={busy} value={contractForm[key]||''} onChange={event=>field(key,event.target.value)}/></label>)}
      {contractForm._id&&<label>Status<select className="form-control" value={contractForm.status} disabled={busy} onChange={event=>field('status',event.target.value)}><option value="active">Active</option><option value="cancelled">Cancelled</option></select></label>}
    </div>{error&&<p className="contract-alert error" role="alert">{error}</p>}</div><div className="modal-footer"><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>setContractForm(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Save contract'}</button></div></form></ContractDialog>}
    {lessonForm&&<ContractDialog label="Assigned lesson" busy={busy} onClose={()=>setLessonForm(null)}><div className="modal-header"><h3 className="modal-title">Add assigned lesson</h3><button className="modal-close" disabled={busy} aria-label="Close lesson form" onClick={()=>setLessonForm(null)}>×</button></div><form onSubmit={saveLesson}><div className="modal-body">{[['title','Lesson title','text'],['description','Description (optional)','text'],['plannedDate','Planned date','date']].map(([key,label,type])=><label className="form-group contract-form-field" key={key}>{label}<input className="form-control" required={key!=='description'} type={type} maxLength={key==='title'?200:key==='description'?4000:undefined} disabled={busy} value={lessonForm[key]} onChange={event=>setLessonForm(previous=>({...previous,[key]:event.target.value}))}/></label>)}{error&&<p className="contract-alert error" role="alert">{error}</p>}</div><div className="modal-footer"><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>setLessonForm(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Add lesson'}</button></div></form></ContractDialog>}
  </section>;
}

export function TeachingWorkspaceShortcut(){
  return <section className="makeup-shortcut teaching-shortcut"><span className="makeup-shortcut-icon" aria-hidden="true">▤</span><div className="makeup-shortcut-copy"><span className="teacher-form-eyebrow">YOUR COURSE PLAN</span><h2>My Course workspace</h2><p>Contract days, outlines, study notes and class assessments together.</p></div><Link className="makeup-view-button" to="/teacher/my-course?tab=outline">View My Course <span aria-hidden="true">→</span></Link></section>;
}
export function ContractSummary({contract,lessonProgress}){
  return <section className="course-contract-summary" aria-label="Teaching contract summary"><div className="course-block-heading"><h3>Teaching contract</h3><span>{contract?.contractStatus||'Not configured'}</span></div>{contract?<><div className="contract-metrics">{[['Contract days',contract.totalContractDays],['Completed teaching days',contract.completedTeachingDays],['Remaining contract days',contract.remainingContractDays],['Course progress',(lessonProgress?.percentage||0)+'%']].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="course-contract-progress"><span>Lessons completed: {lessonProgress?.completed||0} / {lessonProgress?.total||0}</span><progress max="100" value={lessonProgress?.percentage||0} aria-label="Course lesson progress"/></div><p className="contract-muted">{contract.startDate} — {contract.endDate||'No end date'} · Multiple lessons completed on one teaching day count as one contract day.</p></>:<p className="contract-muted">Your administrator has not configured a contract for this course and batch yet.</p>}</section>;
}
