const {Form,Notice,Response}=require('../models/Evaluation');
const Student=require('../models/Student');
async function evaluationNotices(user){
 if(user.role==='admin'){
  const submissions=await Response.find({submittedAt:{$ne:null}})
   .sort({submittedAt:-1,_id:-1}).limit(60)
   .populate('form','title')
   .populate({path:'student',populate:{path:'user',select:'name'}}).lean();
  return submissions.filter(response=>response.form).map(response=>({
   id:'evaluation-submission:'+response._id,
   type:'evaluation',
   title:(response.student?.user?.name||'A student')+' submitted '+response.form.title,
   href:'/admin/evaluations/'+response.form._id+'?response='+response._id,
   scheduledAt:response.submittedAt.toISOString()
  }));
 }
 if(user.role!=='student')return [];
 const student=await Student.findOne({user:user._id}).lean();if(!student)return [];
 const forms=await Form.find({students:student._id,status:'published',reminders:true,deadline:{$gt:new Date(),$lte:new Date(Date.now()+86400000)}}).lean();
 for(const f of forms){if(f.responseLimit&&f.responseCount>=f.responseLimit)continue;await Notice.updateOne({student:student._id,form:f._id,event:'reminder:'+new Date(f.deadline).toISOString()},{$setOnInsert:{title:'Evaluation deadline approaching',message:f.title}},{upsert:true});}
 const rows=await Notice.find({student:student._id}).sort('-createdAt').limit(60).lean();
 const visible=await Form.find({_id:{$in:rows.map(r=>r.form)},students:student._id,status:{$ne:'draft'}}).select('_id').lean();const ids=new Set(visible.map(f=>String(f._id)));
 return rows.filter(r=>ids.has(String(r.form))).map(r=>({id:'evaluation:'+r._id,type:'evaluation',title:r.title,message:r.message,href:'/student/evaluations/'+r.form,scheduledAt:r.createdAt.toISOString(),readAt:r.readAt,persisted:true}));
}
module.exports={evaluationNotices};
