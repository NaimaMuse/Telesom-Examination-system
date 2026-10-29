import AttendanceHistory from './AttendanceHistory';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { usePageSearch, matchesPageSearch } from '../../context/PageSearchContext';
import './AssessmentOverview.css';
import './MarksOverview.css';
import './AttendanceRegister.css';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const statuses=['present','absent','late','excused'];
const label=value=>value?value[0].toUpperCase()+value.slice(1):'Not recorded';
export default function AttendanceMgmt(){
  const mode='register';
  const [course,setCourse]=useState(''),[batch,setBatch]=useState(''),[date,setDate]=useState(today),[from,setFrom]=useState(()=>today().slice(0,8)+'01'),[to,setTo]=useState(today);
  const [courses,setCourses]=useState([]),[batches,setBatches]=useState([]),[students,setStudents]=useState([]),[report,setReport]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[revision,setRevision]=useState(0),[page,setPage]=useState(1);
  const [historyId,setHistoryId]=useState(null);
  const closeHistory=useCallback(()=>setHistoryId(null),[]);
  const historyStudent=report.find(student=>student._id===historyId);
  const [search]=usePageSearch();const editRef=useRef(false),saveRef=useRef(false);
  useEffect(()=>{let active=true,busy=false;const controller=new AbortController();setLoading(true);setError('');setStudents([]);setReport([]);setHistoryId(null);const load=async()=>{if(busy||editRef.current||saveRef.current)return;busy=true;try{const {data}=await api.get('/attendance/register',{params:{course:course||undefined,batch,date},signal:controller.signal});if(!active||editRef.current)return;setCourses(data.courses||[]);setBatches(data.batches||[]);if(!course&&data.courseId){setCourse(String(data.courseId));return;}setStudents((data.students||[]).map(s=>({...s,savedStatus:s.status})));if(mode==='report'&&data.courseId){const result=await api.get('/attendance/report',{params:{course:data.courseId,batch,from,to},signal:controller.signal});if(active)setReport(result.data.students||[]);}if(active)setError('');}catch(err){if(active)setError(err.response?.data?.message||'Attendance could not load. Retrying automatically.');}finally{busy=false;if(active)setLoading(false);}};load();const refresh=()=>{if(!document.hidden)load();};const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[course,batch,date,mode,from,to,revision]);
  const edit=(id,field,value)=>{editRef.current=true;setDirty(true);setNotice('');setStudents(rows=>rows.map(s=>s._id===id?{...s,[field]:value}:s));};
  const discard=()=>{editRef.current=false;setDirty(false);setNotice('');setRevision(v=>v+1);};
  const save=async()=>{const marked=students.filter(s=>s.status);if(!marked.length)return;saveRef.current=true;setSaving(true);setError('');setNotice('');try{const {data}=await api.put('/attendance/register',{course,batch,date,records:marked.map(s=>({student:s._id,status:s.status,remarks:s.remarks}))});editRef.current=false;setDirty(false);setNotice('Attendance saved for '+data.savedCount+' students.');setRevision(v=>v+1);}catch(err){setError(err.response?.data?.message||'Attendance could not be saved. Your changes are still here.');}finally{saveRef.current=false;setSaving(false);}};
  const visible=(mode==='register'?students:report).filter(s=>matchesPageSearch(search,s.name,s.studentId,s.batches));
  const counts=students.reduce((sum,s)=>{if(s.status)sum[s.status]++;else sum.unrecorded++;return sum;},{present:0,absent:0,late:0,excused:0,unrecorded:0});
  const denominator=counts.present+counts.absent+counts.late,rate=denominator?Math.round((counts.present+counts.late)/denominator*100):null;
  const pages=Math.max(1,Math.ceil(visible.length/15)),safePage=Math.min(page,pages);
  const selection=setter=>e=>{setter(e.target.value);setPage(1);setNotice('');};
  const uploadRef=useRef(null);
  const [importing,setImporting]=useState(false);
  const importAttendance=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    setImporting(true);editRef.current=true;setError('');setNotice('');
    try{
      if(file.size>5*1024*1024)throw new Error('Choose a file up to 5 MB.');
      const book=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
      if(!rows.length)throw new Error('The file contains no attendance rows.');
      const updates=new Map();
      for(const [index,row] of rows.entries()){
        const fields=Object.fromEntries(Object.entries(row).map(([key,value])=>[key.trim().toLowerCase().replace(/[_-]/g,' '),String(value).trim()]));
        const studentId=fields['student id']||fields.studentid;
        const student=students.find(item=>String(item.studentId).toLowerCase()===studentId?.toLowerCase());
        if(!student)throw new Error('Row '+(index+2)+': Student ID does not match this course / batch.');
        const status=(fields.status||'').toLowerCase();
        if(!statuses.includes(status))throw new Error('Row '+(index+2)+': Use Present, Absent, Late or Excused.');
        if(updates.has(student._id))throw new Error('Row '+(index+2)+': Duplicate Student ID.');
        if(fields.date&&fields.date!==date)throw new Error('Row '+(index+2)+': Date must match '+date+' (YYYY-MM-DD).');
        if((fields.remarks||'').length>250)throw new Error('Row '+(index+2)+': Remarks must be 250 characters or fewer.');
        updates.set(student._id,{status,remarks:fields.remarks||''});
      }
      setStudents(current=>current.map(student=>updates.has(student._id)?{...student,...updates.get(student._id)}:student));
      setDirty(true);setNotice(updates.size+' entries loaded for '+date+'. Review and click Save Attendance.');setPage(1);
    }catch(error){editRef.current=false;setError(error.message||'The file could not be read.');}
    finally{setImporting(false);}
  };
  return <div className="ao-page attendance-register"><div className="attendance-toolbar"><input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={importAttendance}/><button className="marks-export" disabled={loading||saving||dirty||importing||!students.length||mode!=='register'} onClick={()=>uploadRef.current?.click()}>{importing?'Reading…':'↑ Upload Attendance'}</button></div>{error&&<div className="ao-error" role="alert">{error} <button onClick={()=>setRevision(v=>v+1)}>Retry</button></div>}{notice&&<div className="attendance-notice" role="status">{notice}</div>}<section className="ao-panel"><div className="ao-filters attendance-filters"><label>Course<select disabled={dirty||saving||importing} value={course} onChange={e=>{setCourse(e.target.value);setBatch('');setPage(1);setNotice('');}}>{!courses.length&&<option value="">No courses available</option>}{courses.map(c=><option key={c._id} value={c._id}>{c.courseCode} · {c.title}</option>)}</select></label><label>Year / Batch<select disabled={dirty||saving||importing} value={batch} onChange={selection(setBatch)}><option value="">All batches</option>{batches.map(b=><option key={b}>{b}</option>)}</select></label>{mode==='register'?<label>Date<input type="date" required value={date} disabled={dirty||saving||importing} onChange={selection(setDate)}/></label>:<><label>From<input type="date" required value={from} onChange={selection(setFrom)}/></label><label>To<input type="date" required min={from} value={to} onChange={selection(setTo)}/></label></>}</div><div className="ao-list-heading"><h2>{mode==='register'?'Student register':'Student attendance report'} <span>{visible.length}</span></h2>{mode==='register'&&<div className="attendance-register-tools"><div className="attendance-presence-counts" aria-label="Attendance counts"><span className="present"><strong>{counts.present}</strong> Present</span><span className="absent"><strong>{counts.absent}</strong> Absent</span></div><button className="ao-view" disabled={loading||saving||!students.length} onClick={()=>{editRef.current=true;setDirty(true);setNotice('');setStudents(rows=>rows.map(s=>({...s,status:'present'})));}}>Mark all Present</button></div>}</div>{loading?<div className="ao-empty" role="status">Loading attendance…</div>:!visible.length?<div className="ao-empty">No enrolled students match this course, batch or search.</div>:<div className="ao-table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Year / Batch</th>{mode==='register'?<><th>Status</th></>:<><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Attendance</th><th>History</th></>}</tr></thead><tbody>{visible.slice((safePage-1)*15,safePage*15).map(s=><tr key={s._id}><td><strong>{s.name}</strong></td><td>{s.studentId}</td><td>{s.batches.join(', ')||'—'}</td>{mode==='register'?<><td><select aria-label={'Attendance for '+s.name} value={s.status} disabled={saving} onChange={e=>edit(s._id,'status',e.target.value)}><option value="" disabled={!!s.savedStatus}>Not recorded</option>{statuses.map(value=><option key={value} value={value}>{label(value)}</option>)}</select></td></>:<><td>{s.present}</td><td>{s.absent}</td><td>{s.late}</td><td>{s.excused}</td><td><strong>{s.attendanceRate==null?'—':s.attendanceRate+'%'}</strong><small>{s.recordedDays} recorded days</small></td><td><button className="ao-view" aria-label={'View attendance history for '+s.name} onClick={()=>setHistoryId(s._id)}>View history ↗</button></td></>}</tr>)}</tbody></table></div>}<footer className="ao-pagination"><span>{visible.length?(safePage-1)*15+1:0}–{Math.min(safePage*15,visible.length)} of {visible.length} students</span><div><button disabled={safePage===1} onClick={()=>setPage(safePage-1)}>‹</button><span>{safePage} / {pages}</span><button disabled={safePage===pages} onClick={()=>setPage(safePage+1)}>›</button></div></footer>{mode==='register'?<div className="attendance-save"><span>{dirty?'Unsaved changes. Save or discard before changing course or date.':'Unmarked students remain Not recorded.'}</span><div>{dirty&&<button className="ao-view" disabled={saving} onClick={discard}>Discard changes</button>}<button className="marks-export" onClick={save} disabled={loading||saving||!dirty||!students.some(s=>s.status)}>{saving?'Saving…':'Save Attendance'}</button></div></div>:<p className="attendance-rate-note">Attendance % = (Present + Late) ÷ (Present + Late + Absent). Excused and unrecorded days are excluded.</p>}</section>{historyStudent&&<AttendanceHistory student={historyStudent} course={courses.find(c=>c._id===course)} from={from} to={to} onClose={closeHistory}/>}</div>;
}
