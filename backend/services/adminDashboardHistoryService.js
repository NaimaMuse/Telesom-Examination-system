const {Student,Teacher,Course,Exam,Quiz}=Object.fromEntries(['Student','Teacher','Course','Exam','Quiz'].map(name=>[name,require('../models/'+name)]));
function dashboardHistory(groups,now=new Date()){
 const local=new Date(now.getTime()+10800000),year=local.getUTCFullYear(),month=local.getUTCMonth();
 return Array.from({length:12},(_,i)=>{const date=new Date(Date.UTC(year,month-11+i,1));const key=date.toISOString().slice(0,7);const sum=name=>(groups[name]||[]).filter(r=>r._id&&r._id<=key).reduce((n,r)=>n+r.count,0);return {month:key,label:date.toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'}),students:sum('Student'),teachers:sum('Teacher'),courses:sum('Course'),assessments:sum('Exam')+sum('Quiz')};});
}
async function loadDashboardHistory(now = new Date(), teacherFilter = {}) {
  const models = {Student, Teacher, Course, Exam, Quiz};
  const groups = await Promise.all(Object.entries(models).map(async ([name, Model]) => {
    const match = {createdAt: {$lte: now}, ...(name === 'Teacher' ? teacherFilter : {})};
    const counts = await Model.aggregate([
      {$match: match},
      {$group: {_id: {$dateToString: {format:'%Y-%m', date:'$createdAt', timezone:'Africa/Nairobi'}}, count: {$sum:1}}},
    ]);
    return [name, counts];
  }));
  return dashboardHistory(Object.fromEntries(groups), now);
}
module.exports={dashboardHistory,loadDashboardHistory};
