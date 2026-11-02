export function assessmentDateKey(value) {
  if(!value)return '';
  const raw=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)||/T00:00:00(?:\.000)?Z$/.test(raw))return raw.slice(0,10);
  const date=new Date(raw);if(Number.isNaN(date.getTime()))return '';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(key=>parts.find(part=>part.type===key).value).join('-');
}
export function normalizeCalendarAssessments(exams=[],quizzes=[]) {
  const rows=[...exams.map(row=>({...row,storageType:'exam',calendarKey:'exam:'+row._id})),...quizzes.map(row=>({...row,type:'quiz',storageType:'quiz',examDate:row.quizDate,calendarKey:'quiz:'+row._id}))];
  return rows.filter(row=>['scheduled','upcoming','ongoing','published'].includes(row.status)&&assessmentDateKey(row.examDate||row.date)).sort((a,b)=>String(a.examDate||a.date).localeCompare(String(b.examDate||b.date)));
}
export function assessmentTime(row) {
  const duration=Number(row.durationMinutes||row.duration);
  const start=String(row.startTime||'').match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  let minutes;
  if(start){let hours=Number(start[1]);if(start[3])hours=hours%12+(start[3].toUpperCase()==='PM'?12:0);if(hours>23||Number(start[2])>59)return 'Time not set';minutes=hours*60+Number(start[2]);}
  else {
    const raw=row.examDate||row.quizDate||row.date;
    if(!String(raw||'').includes('T')||/T00:00:00/.test(String(raw)))return 'Time not set';
    const date=new Date(raw);if(Number.isNaN(date.getTime()))return 'Time not set';
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
    minutes=Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);
  }
  const clock=value=>String(Math.floor(value/60)%24).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
  return clock(minutes)+(duration>0?'–'+clock(minutes+duration):'');
}
export function shiftCalendarDate(date,amount,view) {
  if(view!=='month'){const next=new Date(date);next.setDate(next.getDate()+(view==='week'?7:1)*amount);return next;}
  const target=new Date(date.getFullYear(),date.getMonth()+amount,1);
  return new Date(target.getFullYear(),target.getMonth(),Math.min(date.getDate(),new Date(target.getFullYear(),target.getMonth()+1,0).getDate()));
}
