import { useEffect, useRef } from 'react';
const labels={present:'Present',absent:'Absent',late:'Late',excused:'Excused'};
const formatDate=value=>new Date(value+'T12:00:00').toLocaleDateString('en',{day:'numeric',month:'short',year:'numeric'});
export default function AttendanceHistory({student,course,from,to,onClose}){
  const dialog=useRef(null),close=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';close.current?.focus();
    const key=event=>{
      if(event.key==='Escape'){event.preventDefault();onClose();}
      if(event.key!=='Tab')return;
      const buttons=[...dialog.current.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons[buttons.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(document.contains(previous))previous.focus();};
  },[onClose]);
  const history=[...student.history].sort((a,b)=>b.date.localeCompare(a.date));
  return <div className="ao-overlay" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={dialog} className="attendance-history-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-history-title"><header className="ah-header"><span className="ah-avatar" aria-hidden="true">{student.name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('')}</span><div><span className="ah-eyebrow">ATTENDANCE HISTORY</span><h2 id="attendance-history-title">{student.name}</h2><p>{student.studentId} · {student.batches.join(', ')||'Batch not specified'}</p></div><button ref={close} className="ah-close" onClick={onClose} aria-label="Close attendance history">×</button></header><div className="ah-body"><div className="ah-course"><div><span>{course?.title||'Course'}</span><small>{course?.courseCode} · {formatDate(from)} – {formatDate(to)}</small></div><div className="ah-rate"><strong>{student.attendanceRate==null?'—':student.attendanceRate+'%'}</strong><small>Attendance rate</small></div></div><div className="ah-stats">{Object.entries(labels).map(([key,label])=><div key={key} className={key}><span className="ah-dot"/><span>{label}</span><strong>{student[key]}</strong></div>)}</div><div className="ah-section-title"><h3>Daily records</h3><span>{student.recordedDays} recorded days</span></div>{history.length?<div className="ah-table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Recorded by</th><th>Remarks</th></tr></thead><tbody>{history.map(row=><tr key={row.date}><td><strong>{formatDate(row.date)}</strong><small>{new Date(row.date+'T12:00:00').toLocaleDateString('en',{weekday:'long'})}</small></td><td><span className={'ah-badge '+row.status}>{labels[row.status]||row.status}</span></td><td>{row.recordedBy}</td><td className="ah-remarks">{row.remarks||'—'}</td></tr>)}</tbody></table></div>:<div className="ah-empty">No attendance was recorded in this date range.</div>}<p className="ah-note">Late counts as attendance. Excused and unrecorded days are excluded from the rate.</p></div><footer className="ah-footer"><span>Most recent records first</span><button className="marks-export" onClick={onClose}>Done</button></footer></section></div>;
}
