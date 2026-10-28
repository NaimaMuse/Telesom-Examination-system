import {useEffect,useRef,useState} from 'react';
const local=value=>value?new Date(new Date(value).getTime()+10800000).toISOString().slice(0,16):'';
export default function MakeupScheduleDialog({row,lessons,busy,error,onClose,onSave}) {
  const ref=useRef(null);
  const [form,setForm]=useState(()=>({lesson:row?.lesson?._id||'',originalDate:row?.originalDate||'',start:local(row?.start),end:local(row?.end),reason:row?.reason||''}));
  const lesson=lessons.find(l=>l._id===form.lesson)||row?.lesson;
  const field=(key,value)=>setForm(current=>({...current,[key]:value}));
  useEffect(()=>{const previous=document.activeElement,element=ref.current;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
  const submit=event=>{event.preventDefault();if(form.end<=form.start)return;onSave({...form,start:form.start+':00+03:00',end:form.end+':00+03:00',status:'scheduled'},row?._id);};
  return <dialog ref={ref} className="ms-dialog ms-schedule-dialog" aria-label={row?'Reschedule makeup class':'Schedule makeup class'} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><header><div><small className="ms-dialog-kicker">ADMIN · CLASS SCHEDULING</small><h2>{row?'Edit / Reschedule class':'Schedule makeup class'}</h2></div><button type="button" aria-label="Close schedule form" disabled={busy} onClick={onClose}>×</button></header><p>Choose the missed lesson and its replacement time. All times use Nairobi (UTC+3).</p><form onSubmit={submit}>
    <label>Missed lesson<select required disabled={busy||!!row} value={form.lesson} onChange={event=>{const selected=lessons.find(l=>l._id===event.target.value);setForm(current=>({...current,lesson:event.target.value,originalDate:selected?.plannedDate||''}));}}><option value="">Select a lesson</option>{lessons.map(l=><option key={l._id} value={l._id}>{l.title} · {l.teacher?.user?.name||'Teacher'} · {l.course?.title||l.course?.name} · {l.batch}</option>)}{row&&!lessons.some(l=>l._id===row.lesson?._id)&&<option value={row.lesson?._id}>{row.lesson?.title}</option>}</select></label>
    {lesson&&<div className="ms-selected-lesson"><strong>{lesson.title}</strong><span>{row?.teacher?.user?.name||lesson.teacher?.user?.name} · {row?.course?.title||lesson.course?.title||lesson.course?.name} · {row?.batch||lesson.batch}</span></div>}
    {!row&&!lessons.length&&<p role="status">No available incomplete lessons. Completed lessons and lessons with an existing makeup schedule cannot be selected.</p>}
    <label>Original missed date<input type="date" required value={form.originalDate} disabled={busy||!!row||!!lesson?.plannedDate} max={new Date(Date.now()+10800000-86400000).toISOString().slice(0,10)} onChange={event=>field('originalDate',event.target.value)}/></label>
    <div className="ms-dialog-dates"><label>Makeup start<input type="datetime-local" required disabled={busy} value={form.start} onChange={event=>field('start',event.target.value)}/></label><label>Makeup end<input type="datetime-local" required disabled={busy} min={form.start||undefined} value={form.end} onChange={event=>field('end',event.target.value)}/></label></div>
    {form.start&&form.end&&form.end<=form.start&&<p className="academy-error" role="alert">End time must be after the start time.</p>}
    <label>Reason for makeup class<textarea required maxLength={1000} rows={3} disabled={busy} value={form.reason} placeholder="Why does this lesson need a replacement class?" onChange={event=>field('reason',event.target.value)}/></label>
    {error&&<p className="academy-error" role="alert">{error}</p>}
    <footer><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy||!form.lesson||!!(form.start&&form.end&&form.end<=form.start)}>{busy?'Saving…':row?'Save schedule':'Schedule class'}</button></footer>
  </form></dialog>;
}
