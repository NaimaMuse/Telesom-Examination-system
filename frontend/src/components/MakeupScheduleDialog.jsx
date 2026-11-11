import {useEffect,useRef,useState} from 'react';
import {teachingDateKey} from '../pages/teacher/teachingSchedule.mjs';
export default function MakeupScheduleDialog({row,absence,lessons,busy,error,onClose,onSave}) {
  const ref=useRef(null);
  const [form,setForm]=useState(()=>({lesson:row?.lesson?._id||'',originalDate:absence?.date||row?.originalDate||'',date:row?.date||(row?.start?teachingDateKey(row.start):''),reason:row?.reason||(absence?'Teacher absence':'')}));
  const [scope,setScope]=useState({teacher:'',course:'',cohort:''});
  const teacherOptions=[...new Map(lessons.map(lesson=>[String(lesson.teacher?._id||lesson.teacher),lesson.teacher?.user?.name||'Teacher'])).entries()];
  const teacherLessons=lessons.filter(lesson=>String(lesson.teacher?._id||lesson.teacher)===scope.teacher);
  const courseOptions=[...new Map(teacherLessons.map(lesson=>[String(lesson.course?._id||lesson.course),lesson.course?.title||lesson.course?.name||'Course'])).entries()];
  const courseLessons=teacherLessons.filter(lesson=>String(lesson.course?._id||lesson.course)===scope.course);
  const cohortKey=lesson=>JSON.stringify([lesson.academicYear||lesson.contract?.academicYear||'',lesson.cohort||'']);
  const cohorts=[...new Map(courseLessons.map(lesson=>[cohortKey(lesson),((lesson.academicYear||lesson.contract?.academicYear)?(lesson.academicYear||lesson.contract?.academicYear)+' / ':'')+(lesson.cohort||'No cohort')])).entries()];
  const availableLessons=row?lessons:courseLessons.filter(lesson=>cohortKey(lesson)===scope.cohort);
  useEffect(()=>{
    if(row||absence)return;
    if(scope.teacher&&courseOptions.length===1&&scope.course!==courseOptions[0][0])setScope(current=>({...current,course:courseOptions[0][0],cohort:''}));
    else if(scope.course&&cohorts.length===1&&scope.cohort!==cohorts[0][0])setScope(current=>({...current,cohort:cohorts[0][0]}));
    else if(availableLessons.length===1&&form.lesson!==availableLessons[0]._id)setForm(current=>({...current,lesson:availableLessons[0]._id,originalDate:availableLessons[0].plannedDate||''}));
  },[scope.teacher,scope.course,scope.cohort,lessons]);
  const lesson=lessons.find(l=>l._id===form.lesson)||row?.lesson;
  const field=(key,value)=>setForm(current=>({...current,[key]:value}));
  useEffect(()=>{const previous=document.activeElement,element=ref.current;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
  const submit=event=>{event.preventDefault();onSave({...form,status:'scheduled'},row?._id);};
  return <dialog ref={ref} className="ms-dialog ms-schedule-dialog" aria-label={row?'Reschedule makeup class':'Schedule makeup class'} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><header><div><small className="ms-dialog-kicker">ADMIN · CLASS SCHEDULING</small><h2>{row?'Edit / Reschedule class':'Schedule makeup class'}</h2></div><button type="button" aria-label="Close schedule form" disabled={busy} onClick={onClose}>×</button></header><p>{absence?'Choose a makeup date for the recorded absence.':'Choose the missed lesson and its makeup date.'}</p><form onSubmit={submit}>
    {!row&&!absence&&<div className="makeup-schedule-scope"><label>Teacher<select required disabled={busy||!lessons.length} value={scope.teacher} onChange={event=>{setScope({teacher:event.target.value,course:'',cohort:''});setForm(current=>({...current,lesson:'',originalDate:''}));}}><option value="">Select teacher with a missed lesson</option>{teacherOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Course<select required disabled={busy||!scope.teacher||courseOptions.length===1} value={scope.course} onChange={event=>{setScope(current=>({...current,course:event.target.value,cohort:''}));setForm(current=>({...current,lesson:'',originalDate:''}));}}><option value="">Select course</option>{courseOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Year / Cohort<select required disabled={busy||!scope.course} value={scope.cohort} onChange={event=>{setScope(current=>({...current,cohort:event.target.value}));setForm(current=>({...current,lesson:'',originalDate:''}));}}><option value="">Select year / cohort</option>{cohorts.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>}
    {absence?<div className="ms-selected-lesson"><strong>{absence.teacher}</strong><span>{absence.course} · {absence.cohort} · Absent on {absence.date}</span></div>:<label>Missed lesson<select required disabled={busy||!!row||!scope.cohort} value={form.lesson} onChange={event=>{const selected=lessons.find(l=>l._id===event.target.value);setForm(current=>({...current,lesson:event.target.value,originalDate:selected?.plannedDate||''}));}}><option value="">Select a lesson</option>{availableLessons.map(l=><option key={l._id} value={l._id}>{l.title} · {l.teacher?.user?.name||'Teacher'} · {l.course?.title||l.course?.name} · {l.cohort}</option>)}{row&&!lessons.some(l=>l._id===row.lesson?._id)&&<option value={row.lesson?._id}>{row.lesson?.title}</option>}</select></label>}
    {lesson&&<div className="ms-selected-lesson"><strong>{lesson.title}</strong><span>{row?.teacher?.user?.name||lesson.teacher?.user?.name} · {row?.course?.title||lesson.course?.title||lesson.course?.name} · {row?.cohort||lesson.cohort}</span></div>}
    {!row&&!absence&&!lessons.length&&<p role="status">No missed lessons are available. First create a teacher contract and add a planned lesson in Teaching & Outlines. Its planned date must be before today and it must remain incomplete, without an existing makeup class.</p>}
    {!absence&&<label>Original missed date<input type="date" required value={form.originalDate} disabled={busy||!!row||!!lesson?.plannedDate} max={new Date(Date.now()+10800000-86400000).toISOString().slice(0,10)} onChange={event=>field('originalDate',event.target.value)}/></label>}
    <div className="ms-dialog-dates"><label>Makeup date<input type="date" required disabled={busy} min={teachingDateKey()} value={form.date} onChange={event=>field('date',event.target.value)}/></label></div>
    <label>Reason for makeup class<textarea required maxLength={1000} rows={3} disabled={busy} value={form.reason} placeholder="Why does this lesson need a replacement class?" onChange={event=>field('reason',event.target.value)}/></label>
    {error&&<p className="academy-error" role="alert">{error}</p>}
    <footer><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy||(!absence&&!form.lesson)}>{busy?'Saving…':row?'Save schedule':'Schedule class'}</button></footer>
  </form></dialog>;
}
