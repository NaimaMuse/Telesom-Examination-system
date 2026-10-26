const round = n => Math.round(n * 100) / 100;
const rate = counts => { const total=counts.present+counts.late+counts.absent; return total?round((counts.present+counts.late)/total*100):null; };
const counts = records => records.reduce((sum,row)=>{if(Object.hasOwn(sum,row.status))sum[row.status]++;return sum;},{present:0,absent:0,late:0,excused:0});
function buildAnalytics(data,attendance,filters={}) {
  const students=data.students.filter(s=>(!filters.course||String(s.courseId)===filters.course)&&(!filters.teacher||s.teacherIds.includes(filters.teacher))&&(!filters.batch||s.batches.includes(filters.batch)));
  const pairs=new Set(students.map(s=>String(s.courseId)+':'+String(s._id)));
  const unique=new Map();
  for(const record of attendance){const date=new Date(record.date).toISOString().slice(0,10);if(pairs.has(String(record.course)+':'+String(record.student))&&(!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to))unique.set(String(record.course)+':'+String(record.student)+':'+date,{...record,day:date});}
  const records=[...unique.values()],recorded=students.filter(s=>s.hasMarks),final=students.filter(s=>s.finalized);
  const average=rows=>rows.length?round(rows.reduce((sum,s)=>sum+s.totalMarks,0)/rows.length):null;
  const distribution=['A','B','C','D','F'].map(grade=>({grade,count:final.filter(s=>(s.totalMarks>=90?'A':s.totalMarks>=80?'B':s.totalMarks>=70?'C':s.totalMarks>=60?'D':'F')===grade).length}));
  const monthly=[...new Set(records.map(row=>row.day.slice(0,7)))].sort().map(month=>{const rows=records.filter(row=>row.day.startsWith(month));return {month,...counts(rows),rate:rate(counts(rows))};});
  const courseRows=data.courses.filter(c=>(!filters.course||String(c._id)===filters.course)&&(!filters.teacher||students.some(s=>String(s.courseId)===String(c._id)))).map(course=>{const rows=students.filter(s=>String(s.courseId)===String(course._id)),scores=rows.filter(s=>s.hasMarks),present=records.filter(row=>String(row.course)===String(course._id));return {...course,enrolled:rows.length,recorded:scores.length,average:average(scores),finalized:rows.filter(s=>s.finalized).length,passed:rows.filter(s=>s.isPassed===true).length,attendanceRate:rate(counts(present)),attendanceRecords:present.length};});
  return {summary:{enrolledStudents:new Set(students.map(s=>String(s._id))).size,courseRecords:students.length,recorded:recorded.length,average:average(recorded),provisional:recorded.some(s=>!s.finalized),attendanceRate:rate(counts(records)),attendanceRecords:records.length,finalized:final.length,passed:final.filter(s=>s.isPassed===true).length},distribution,monthly,courses:courseRows};
}
module.exports={buildAnalytics};
