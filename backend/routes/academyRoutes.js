const {orderPlan,lessonProgress,numberChapters,moveItem}=require('../services/outlinePlanService');
const express=require('express'),multer=require('multer'),mongoose=require('mongoose');
const {protect}=require('../middleware/authMiddleware');
const {authorizeRoles}=require('../middleware/roleMiddleware');
const {asyncHandler,pick}=require('../controllers/resourceController');
const Batch=require('../models/Batch'),Outline=require('../models/CourseOutline'),Makeup=require('../models/MakeupClass');
const Lesson=require('../models/TeachingLesson'),Teacher=require('../models/Teacher'),Student=require('../models/Student');
const Contract=require('../models/TeacherContract'),Enrollment=require('../models/Enrollment');
const contractService=require('../services/teacherContractService');
const {getStudentProgress}=require('../services/academicProgressService');
const {withCourseLock}=require('../services/gradebookIntegrityService');
const router=express.Router();router.use(protect);
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
const id=value=>{if(!mongoose.isValidObjectId(value))fail('Invalid record ID.');return value;};
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
const teacherFor=async user=>{const t=await Teacher.findOne({user:user._id});if(!t)fail('Teacher not found.',404);return t;};
async function outlineAccess(user,outline,write=false) {
  if(!outline)fail('Outline not found.',404);
  if(user.role==='student') {
    const student=await Student.findOne({user:user._id});
    if(write||!student||!outline.published||!await Enrollment.exists({student:student._id,course:outline.course,academicYear:outline.academicYear,status:'enrolled',...(outline.batch?{batch:outline.batch}:{})}))fail('Outline unavailable.',403);
  } else {
    const contract=await contractService.loadContract(outline.contract);
    await contractService.authorize(user,contract,write);
  }
}
router.get('/batches',asyncHandler(async(req,res)=>{
  const filter={};if(req.query.academicYear){if(typeof req.query.academicYear!=='string')fail('Invalid academic year.');filter.academicYear=req.query.academicYear;}
  if(req.user.role!=='admin'){
    filter.status='active';let enrollments=[];
    if(req.user.role==='student'){const student=await Student.findOne({user:req.user._id});if(student)enrollments=await Enrollment.find({student:student._id,status:'enrolled'}).lean();}
    else {const teacher=await teacherFor(req.user);const assignments=await require('../models/CourseTeacher').find({teacher:teacher._id,status:'active'}).lean();if(assignments.length)enrollments=await Enrollment.find({status:'enrolled',$or:assignments.map(a=>({course:a.course,academicYear:a.academicYear}))}).lean();}
    const pairs=enrollments.filter(e=>e.batch).map(e=>({name:e.batch,academicYear:e.academicYear}));if(!pairs.length)return res.json({batches:[]});filter.$or=pairs;
  }
  res.json({batches:await Batch.find(filter).sort({academicYear:-1,name:1}).lean()});
}));
router.post('/batches',authorizeRoles('admin'),asyncHandler(async(req,res)=>res.status(201).json({batch:await Batch.create(pick(req.body,['name','academicYear']))})));
router.patch('/batches/:id',authorizeRoles('admin'),asyncHandler(async(req,res)=>{
  const batch=await Batch.findById(id(req.params.id));if(!batch)fail('Batch not found.',404);
  if(!['active','archived'].includes(req.body.status))fail('Invalid batch status.');batch.status=req.body.status;await batch.save();res.json({batch});
}));
router.get('/progress',authorizeRoles('student'),asyncHandler(async(req,res)=>{
  const student=await Student.findOne({user:req.user._id});if(!student)fail('Student not found.',404);
  res.json(await getStudentProgress(student._id));
}));
router.get('/profile-picture/:teacherId',asyncHandler(async(req,res)=>{
  const teacher=await Teacher.findById(id(req.params.teacherId)).select('+profilePicture');if(!teacher)fail('Teacher not found.',404);
  if(req.user.role!=='admin'&&String(teacher.user)!==String(req.user._id))fail('Access denied.',403);
  res.json({picture:teacher.profilePicture||''});
}));
router.put('/profile-picture',authorizeRoles('teacher'),upload.single('file'),asyncHandler(async(req,res)=>{
  const teacher=await teacherFor(req.user),file=req.file;
  if(!file||file.size>2*1024*1024)fail('Select a PNG, JPEG or WebP image up to 2 MB.');
  const b=file.buffer;
  const type=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'?'image/webp':null;
  if(!type||type!==file.mimetype)fail('Only valid PNG, JPEG and WebP images are supported.');
  teacher.profilePicture=`data:${type};base64,${b.toString('base64')}`;await teacher.save();res.json({picture:teacher.profilePicture});
}));
router.delete('/profile-picture',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{const teacher=await teacherFor(req.user);teacher.profilePicture='';await teacher.save();res.json({picture:''});}));
router.get('/outlines',asyncHandler(async(req,res)=>{
  let filter={};
  if(req.user.role==='teacher')filter.teacher=(await teacherFor(req.user))._id;
  if(req.user.role==='student'){
    const student=await Student.findOne({user:req.user._id});
    const rows=student?await Enrollment.find({student:student._id,status:'enrolled'}).lean():[];
    if(!rows.length)return res.json({outlines:[]});
    filter={published:true,$or:rows.map(e=>({course:e.course,academicYear:e.academicYear,batch:e.batch||''}))};
  }
  const outlines=await Outline.find(filter).populate('teacher','teacherId').populate('course','title name').lean();
  const chapterIndex=numberChapters(await Outline.find({contract:{$in:outlines.map(o=>o.contract)}}).select('_id contract position createdAt').lean());
  const numbers=new Map(chapterIndex.map(o=>[String(o._id),o.chapterNumber]));
  const lessons=(await Lesson.find({outline:{$in:outlines.map(o=>o._id)}}).lean()).sort(orderPlan);
  res.json({outlines:outlines.sort(orderPlan).map(o=>{const rows=lessons.filter(l=>String(l.outline)===String(o._id)).map((l,index)=>({...l,lessonNumber:index+1,progress:lessonProgress(l)}));const completed=rows.filter(l=>l.status==='completed').length;return {...o,chapterNumber:numbers.get(String(o._id)),lessons:req.user.role==='student'?rows.map(l=>({_id:l._id,title:l.title,description:l.description,plannedDate:l.plannedDate,status:l.status,progress:l.progress,lessonNumber:l.lessonNumber,completedDay:l.completedDay})):rows,totalLessons:rows.length,completedLessons:completed,remainingLessons:rows.length-completed,progress:rows.length?Math.round(rows.reduce((sum,l)=>sum+l.progress,0)/rows.length):0};})});
}));router.post('/outlines',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const contract=await contractService.loadContract(id(req.body.contract));await contractService.authorize(req.user,contract,true);
  const outline=await contractService.withContractLock(contract._id,async()=>{const siblings=await Outline.find({contract:contract._id}).select('position').lean();return Outline.create({contract:contract._id,teacher:contract.teacher,course:contract.course,batch:contract.batch,academicYear:contract.academicYear,position:Math.max(-1,...siblings.map(o=>o.position||0))+1,...pick(req.body,['title','description','published'])});});
  res.status(201).json({outline});
}));
router.patch('/outlines/:id',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);outline.set(pick(req.body,['title','description','published']));await outline.save();res.json({outline});
}));
router.post('/outlines/:id/lessons',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  const lesson=await contractService.withContractLock(outline.contract,async()=>{if(!await Outline.exists({_id:outline._id}))fail('Chapter not found.',404);const siblings=await Lesson.find({outline:outline._id}).select('position').lean();const lesson=await contractService.createLesson(req.user,outline.contract,req.body,{outlineId:outline._id});lesson.position=Math.max(-1,...siblings.map(l=>l.position||0))+1;await lesson.save();return lesson;});res.status(201).json({lesson});
}));
router.patch('/outlines/:id/lessons/:lessonId',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  const lesson=await Lesson.findOne({_id:id(req.params.lessonId),outline:outline._id,contract:outline.contract});
  if(!lesson)fail('Lesson not found.',404);
  const updates=pick(req.body,['title','description','plannedDate']);
  if(updates.plannedDate!==undefined&&updates.plannedDate!==lesson.plannedDate){
    if(lesson.status==='completed')fail('Reverse completion before changing the lesson schedule.');
    const contract=await contractService.loadContract(outline.contract);
    if(!contractService.validDate(updates.plannedDate)||updates.plannedDate<contract.startDate||(contract.endDate&&updates.plannedDate>contract.endDate))fail('Planned date must be within the contract dates.');
  }
  const saved=await Lesson.findOneAndUpdate({_id:lesson._id,status:lesson.status},{$set:updates},{new:true,runValidators:true});
  if(!saved)fail('The lesson changed while you were editing. Please reload.',409);
  res.json({lesson:saved});
}));
router.post('/outlines/:id/move',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  await contractService.withContractLock(outline.contract,()=>moveItem(Outline,{contract:outline.contract},outline._id,req.body.direction));
  res.json({message:'Chapter order updated.'});
}));
router.post('/outlines/:id/lessons/:lessonId/move',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  await contractService.withContractLock(outline.contract,()=>moveItem(Lesson,{outline:outline._id},id(req.params.lessonId),req.body.direction));
  res.json({message:'Lesson order updated.'});
}));
router.patch('/outlines/:id/lessons/:lessonId/progress',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  const progress=req.body.progress;
  if(!Number.isInteger(progress)||progress<0||progress>100)fail('Progress must be a whole number from 0 to 100.');
  const lesson=await Lesson.findOne({_id:id(req.params.lessonId),outline:outline._id});if(!lesson)fail('Lesson not found.',404);
  if(progress===100)return res.json(await contractService.setLessonStatus(req.user,outline.contract,lesson._id,'completed'));
  await contractService.withContractLock(outline.contract,async()=>{
    const current=await Lesson.findOne({_id:lesson._id,outline:outline._id});if(!current)fail('Lesson not found.',404);
    if(current.status==='completed')fail('Undo completion before changing lesson progress.');
    current.progress=progress;await current.save();
  });
  res.json({message:'Lesson progress updated.'});
}));
router.delete('/outlines/:id',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  const Course=require('../models/Course');const lockCourse=await Course.findOne().sort({_id:1}).select('_id');
  if(!lockCourse)fail('Course not found.',404);
  const result=await withCourseLock(lockCourse._id,()=>contractService.withContractLock(outline.contract,async()=>{
    const lessons=await Lesson.find({outline:outline._id}).select('_id').lean();
    if(await Makeup.exists({lesson:{$in:lessons.map(l=>l._id)}}))fail('This chapter has linked makeup classes. Contact Admin before removing it.',409);
    await Lesson.deleteMany({outline:outline._id});
    await Outline.deleteOne({_id:outline._id});
    return {deletedLessons:lessons.length,contract:await contractService.summary(await contractService.loadContract(outline.contract))};
  }));
  res.json({message:'Chapter and its lessons deleted.',...result});
}));
router.put('/outlines/:id/document',authorizeRoles('teacher'),upload.single('file'),asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id));await outlineAccess(req.user,outline,true);
  const file=req.file;if(!file)fail('Select a PDF or DOCX document.');
  const pdf=file.buffer.toString('ascii',0,5)==='%PDF-'&&/\.pdf$/i.test(file.originalname);
  const docx=file.buffer.toString('ascii',0,2)==='PK'&&file.buffer.includes(Buffer.from('word/document.xml'))&&/\.docx$/i.test(file.originalname);
  if(!pdf&&!docx)fail('Only valid PDF or DOCX documents are supported.');
  outline.document={name:file.originalname.slice(0,200),mime:pdf?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',data:file.buffer};await outline.save();res.json({message:'Document uploaded.'});
}));
router.get('/outlines/:id/document',asyncHandler(async(req,res)=>{
  const outline=await Outline.findById(id(req.params.id)).select('+document.data');await outlineAccess(req.user,outline);
  if(!outline.document?.data)fail('No document uploaded.',404);
  res.set('Content-Type',outline.document.mime).set('Content-Disposition',`attachment; filename="${encodeURIComponent(outline.document.name)}"`).set('X-Content-Type-Options','nosniff').send(outline.document.data);
}));
router.get('/missed-lessons',authorizeRoles('admin'),asyncHandler(async(req,res)=>res.json({lessons:await Lesson.find({status:'planned',$or:[{plannedDate:{$lt:contractService.teachingDay()}},{plannedDate:null}]}).populate({path:'teacher',populate:{path:'user',select:'name'}}).populate('course','title name').sort('plannedDate').lean()})));
router.get('/makeup-classes',authorizeRoles('admin','teacher','student'),asyncHandler(async(req,res)=>{
  let filter=req.user.role==='teacher'?{teacher:(await teacherFor(req.user))._id}:{};
  if(req.user.role==='student'){const student=await Student.findOne({user:req.user._id});const enrollments=student?await Enrollment.find({student:student._id,status:'enrolled'}).lean():[];if(!enrollments.length)return res.json({classes:[]});filter={$or:enrollments.map(e=>({course:e.course,batch:e.batch||'',academicYear:e.academicYear}))};}

  const rows=await Makeup.find(filter).populate('lesson','title description status completedDay').populate({path:'teacher',populate:{path:'user',select:'name'}}).populate('course','title name courseCode').sort({start:1}).lean();
  res.json({classes:rows.map(r=>({...r,...(req.user.role==='student'?{reason:undefined,createdBy:undefined,teacher:undefined}:{}),displayStatus:r.status==='cancelled'?'Cancelled':r.lesson?.status==='completed'?'Completed':'Scheduled'}))});
}));
async function saveMakeup(req,res) {
  const existing=req.params.id?await Makeup.findById(id(req.params.id)):null;
  if(req.params.id&&!existing)fail('Makeup class not found.',404);
  const lesson=await Lesson.findById(id(existing?.lesson||req.body.lesson));if(!lesson)fail('Lesson not found.',404);
  if(existing&&lesson.status==='completed')fail('A completed class cannot be rescheduled or cancelled.');
  const start=new Date(req.body.start||existing?.start),end=new Date(req.body.end||existing?.end),status=req.body.status||existing?.status||'scheduled';
  if(!['scheduled','cancelled'].includes(status)||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)fail('Enter a valid schedule.');
  const originalDate=lesson.plannedDate||existing?.originalDate||req.body.originalDate;
  if(status==='scheduled'&&(lesson.status==='completed'||!contractService.validDate(originalDate)||originalDate>=contractService.teachingDay()))fail('Select an incomplete lesson and an original missed date before today.');
  const contract=await contractService.loadContract(lesson.contract);
  if(status==='scheduled'&&(contractService.teachingDay(start)<contract.startDate||(contract.endDate&&contractService.teachingDay(end)>contract.endDate)))fail('Makeup dates must be within the contract.');
  if(status==='scheduled'&&contractService.teachingDay(start)<contractService.teachingDay())fail('Choose today or a future date for the replacement class.');
  // Serialize all scheduling on one existing course document, including cross-course teacher conflicts.
  const Course=require('../models/Course');const lockCourse=await Course.findOne().sort({_id:1}).select('_id');
  await withCourseLock(lockCourse._id,async()=>{
    if(!await Lesson.exists({_id:lesson._id}))fail('Lesson not found.',404);
    const other={...(existing?{_id:{$ne:existing._id}}:{}),status:'scheduled'};
    if(status==='scheduled'&&await Makeup.exists({...other,$or:[{lesson:lesson._id},{start:{$lt:end},end:{$gt:start},$or:[{teacher:lesson.teacher},{course:lesson.course,batch:lesson.batch}]}]}))fail('This lesson already has a makeup class or the teacher/batch schedule conflicts.');
    const fields={lesson:lesson._id,contract:lesson.contract,teacher:lesson.teacher,course:lesson.course,batch:lesson.batch,academicYear:contract.academicYear,originalDate,start,end,status,reason:req.body.reason||existing?.reason,createdBy:existing?.createdBy||req.user._id};
    const record=existing?Object.assign(existing,fields):new Makeup(fields);await record.save();res.status(existing?200:201).json({class:record});
  });
}
router.post('/makeup-classes',authorizeRoles('admin'),asyncHandler(saveMakeup));
router.patch('/makeup-classes/:id',authorizeRoles('admin'),asyncHandler(saveMakeup));
router.put('/makeup-classes/:id/complete',authorizeRoles('teacher'),asyncHandler(async(req,res)=>{
  const record=await Makeup.findById(id(req.params.id));if(!record||record.status==='cancelled')fail('Makeup class unavailable.',404);
  const teacher=await teacherFor(req.user);if(String(record.teacher)!==String(teacher._id))fail('Class not assigned to you.',403);
  if(contractService.teachingDay(record.start)!==contractService.teachingDay())fail('Complete the class on its scheduled teaching day.');
  res.json(await contractService.setLessonStatus(req.user,record.contract,record.lesson,'completed'));
}));
router.get('/reports/:type',authorizeRoles('admin'),asyncHandler(async(req,res)=>res.json(await require('../services/academyReportService').getReport(req.params.type,req.query))));
router.use((err,req,res,next)=>{if(err instanceof multer.MulterError)err.statusCode=err.code==='LIMIT_FILE_SIZE'?413:400;next(err);});
module.exports=router;
