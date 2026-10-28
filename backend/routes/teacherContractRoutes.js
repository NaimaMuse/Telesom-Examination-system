const express = require('express');
const mongoose = require('mongoose');
const Contract = require('../models/TeacherContract');
const Lesson = require('../models/TeachingLesson');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/CourseTeacher');
const Course = require('../models/Course');
const service = require('../services/teacherContractService');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { asyncHandler } = require('../controllers/resourceController');
const router = express.Router();
router.use(protect,authorizeRoles('admin','teacher'));
const populated = query => query.populate({path:'teacher',populate:{path:'user',select:'name email'}}).populate('course','title name courseCode');
router.get('/options',authorizeRoles('admin'),asyncHandler(async(req,res)=>{
  const [teachers,courses,assignments]=await Promise.all([Teacher.find().populate('user','name').lean(),Course.find().select('title name courseCode academicYear').lean(),Assignment.find({status:'active'}).lean()]);
  res.json({teachers:teachers.map(t=>({_id:t._id,name:t.user?.name||t.teacherId,teacherId:t.teacherId})),courses,assignments});
}));
router.get('/',asyncHandler(async(req,res)=>{
  const filters={};
  for(const key of ['teacher','course'])if(req.query[key]){if(!mongoose.isValidObjectId(req.query[key]))throw Object.assign(new Error('Invalid '+key+' filter'),{statusCode:400});filters[key]=req.query[key];}
  if(req.query.batch)filters.batch=String(req.query.batch);
  if(req.user.role==='teacher'){
    const teacher=await Teacher.findOne({user:req.user._id}).lean();
    if(!teacher)return res.json({contracts:[]});
    filters.teacher=teacher._id;
  }
  const records=await populated(Contract.find(filters).sort({createdAt:-1})).lean();
  let contracts=await Promise.all(records.map(service.summary));
  if(req.query.status)contracts=contracts.filter(c=>c.contractStatus===req.query.status);
  res.json({contracts});
}));
router.post('/',authorizeRoles('admin'),asyncHandler(async(req,res)=>res.status(201).json({contract:await service.createContract(req.user,req.body)})));
router.put('/:id',authorizeRoles('admin'),asyncHandler(async(req,res)=>res.json({contract:await service.updateContract(req.user,req.params.id,req.body)})));
router.get('/:id',asyncHandler(async(req,res)=>{
  if(!mongoose.isValidObjectId(req.params.id))throw Object.assign(new Error('Invalid contract ID'),{statusCode:400});
  const contract=await populated(Contract.findById(req.params.id)).lean();
  if(!contract)throw Object.assign(new Error('Contract not found'),{statusCode:404});
  await service.authorize(req.user,contract);
  const lessons=await Lesson.find({contract:contract._id}).sort({plannedDate:1,createdAt:1}).lean();
  res.json({contract:await service.summary(contract),lessons});
}));
router.post('/:id/lessons',authorizeRoles('teacher'),asyncHandler(async(req,res)=>res.status(201).json({lesson:await service.createLesson(req.user,req.params.id,req.body)})));
router.put('/:id/lessons/:lessonId/status',authorizeRoles('teacher'),asyncHandler(async(req,res)=>res.json(await service.setLessonStatus(req.user,req.params.id,req.params.lessonId,req.body.status))));
module.exports=router;
