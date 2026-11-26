const express = require('express');
const mongoose = require('mongoose');
const {createHash} = require('node:crypto');
const Rubric = require('../models/DefenseRubric');
const Defense = require('../models/ProjectDefense');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const {asyncHandler} = require('../controllers/resourceController');
const {authorizeRoles} = require('../middleware/roleMiddleware');
const {assessmentReadScope, withCourseLock, gradeFor, round} = require('../services/gradebookIntegrityService');
const {enrollmentCohortFilter} = require('../services/batchService');
const {allStudentsGraded} = require('../services/assessmentCompletionService');
const {fail} = require('../services/evaluationRules');

const router = express.Router();
const staff = authorizeRoles('admin','teacher');
const admin = authorizeRoles('admin');
const manager = req => req.user.role !== 'judge';
const same = (a,b) => String(a) === String(b);
const isId = value => typeof value === 'string' && mongoose.isObjectIdOrHexString(value);
const activeExam = {status:{$ne:'cancelled'}};
const workflow = {workflowForm:{$exists:true}};
const total = scores => scores.reduce((sum,score)=>sum+score,0);

async function examScope(req) {
  if (req.user.role === 'admin') return activeExam;
  return {...activeExam,$or:[{createdBy:req.user._id},await assessmentReadScope(req)]};
}

async function findExam(req,id) {
  if (!isId(id)) fail('Choose an exam.');
  const exam = await Exam.findOne({_id:id,...await examScope(req)});
  if (!exam) fail('This exam is unavailable to you.',404);
  return exam;
}

async function examPeople(exam) {
  const assignments = await CourseTeacher.distinct('teacher',{course:exam.course,status:'active'});
  const teachers = await Teacher.distinct('user',{_id:{$in:assignments}});
  return User.find({isActive:true,$or:[
    {role:{$in:['admin','judge']}},
    {role:'teacher',_id:{$in:[...teachers,...(exam.createdBy?[exam.createdBy]:[])]}},
  ]}).select('name email role').sort({name:1,_id:1}).lean();
}

async function enrollmentFilter(exam,session) {
  const filter = {course:exam.course,status:'enrolled'};
  if (exam.batch && exam.academicYear) {
    const course = await Course.findById(exam.course).select('batch academicYear').session(session||null).lean();
    Object.assign(filter,enrollmentCohortFilter(course,exam.academicYear,exam.batch));
  } else if (exam.academicYear) filter.academicYear = exam.academicYear;
  else if (exam.batch) filter.batch = exam.batch;
  return filter;
}

function requiredText(value,label,max=200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length>max) fail('Enter a valid '+label+'.');
  return value.trim();
}

function marks(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value<=0 || value>100 || value!==round(value)) {
    fail('Maximum marks must be positive and use at most two decimal places.');
  }
  return value;
}

function validateSections(sections,maximum,draft=false) {
  if (!Array.isArray(sections) || !sections.length || sections.length>30) fail('Add between 1 and 30 sections.');
  const title = (value,label,max) => draft && value==='' ? '' : requiredText(value,label,max);
  const score = value => draft && value===null ? null : marks(value);
  const cleaned = sections.map(section=>{
    if (!Array.isArray(section?.questions) || !section.questions.length || section.questions.length>50) {
      fail('Every section needs between 1 and 50 questions.');
    }
    const questions = section.questions.map(question=>({
      title:title(question?.title,'question',500),
    }));
    const max = score(section.marks);
    return {title:title(section.title,'section title'),marks:max,questions};
  });
  if (!draft && round(total(cleaned.map(section=>section.marks)))!==maximum) fail('Section marks must add up to the exam maximum of '+maximum+'.');
  return cleaned;
}

function assertVersion(record,version) {
  if (record.__v!==version) fail('This record changed. Reload it and try again.',409);
}
async function save(record,session) {
  try { await record.save({session}); }
  catch(error) {
    if (error.name==='VersionError') fail('This record changed. Reload it and try again.',409);
    if (error.code===11000) fail('A student already belongs to a group for this exam.',409);
    throw error;
  }
}

async function findForm(req,id) {
  if (!isId(id)) fail('Invalid evaluation form.');
  const form = await Rubric.findById(id);
  if (!form) fail('Evaluation form not found.',404);
  return {form,exam:await findExam(req,String(form.exam))};
}

router.get('/exams',staff,asyncHandler(async(req,res)=>{
  const exams = await Exam.find(await examScope(req)).select('title examCode course totalMarks batch academicYear')
    .populate('course','name title').sort({title:1,_id:1}).lean();
  res.json({exams});
}));
router.get('/exams/:id/options',staff,asyncHandler(async(req,res)=>{
  const exam = await findExam(req,req.params.id);
  const [people,enrolled,assigned] = await Promise.all([
    examPeople(exam),
    Enrollment.distinct('student',await enrollmentFilter(exam)),
    Defense.distinct('students',{assessment:exam._id,assessmentType:'exam',course:exam.course}),
  ]);
  const taken = new Set(assigned.map(String));
  const students = await Student.find({_id:{$in:enrolled.filter(id=>!taken.has(String(id)))}})
    .select('studentId user').populate('user','name').sort('studentId').lean();
  res.json({people,students});
}));

router.get('/forms',staff,asyncHandler(async(req,res)=>{
  const exam = await findExam(req,req.query.exam);
  res.json({forms:await Rubric.find({exam:exam._id}).sort({updatedAt:-1}).lean()});
}));
router.get('/forms/:id',staff,asyncHandler(async(req,res)=>{
  const {form} = await findForm(req,req.params.id);
  res.json({form});
}));
async function saveForm(req,res) {
  const {form,exam} = req.params.id ? await findForm(req,req.params.id) : {
    form:new Rubric(),exam:await findExam(req,req.body.exam),
  };
  if (!form.isNew) assertVersion(form,req.body.__v);
  form.set({
    exam:exam._id,title:requiredText(req.body.title,'form title'),
    sections:validateSections(req.body.sections,exam.totalMarks,true),maximum:exam.totalMarks,
    ...(form.status==='review'?{}:{status:'draft',handoff:undefined}),
  });
  const created = form.isNew;
  await save(form);
  res.status(created?201:200).json({form});
}
router.post('/forms',staff,asyncHandler(saveForm));
router.put('/forms/:id',staff,asyncHandler(saveForm));
router.post('/forms/:id/send',staff,asyncHandler(async(req,res)=>{
  const {form,exam} = await findForm(req,req.params.id);
  assertVersion(form,req.body.__v);
  const recipient = (await examPeople(exam)).find(person=>
    same(person._id,req.body.recipient)&&person.role===(req.user.role==='teacher'?'admin':'teacher'));
  if (!recipient) fail('Choose an eligible recipient.');
  if (form.maximum!==exam.totalMarks) fail('Update the form to match the current exam maximum.',409);
  validateSections(form.sections,exam.totalMarks);
  form.set({status:form.status==='approved'?'approved':'review',
    handoff:{recipient:recipient._id,sender:req.user._id,sentAt:new Date()}});
  await save(form);
  res.json({form});
}));
router.post('/forms/:id/approve',staff,asyncHandler(async(req,res)=>{
  const {form,exam} = await findForm(req,req.params.id);
  assertVersion(form,req.body.__v);
  if (form.status!=='review' || !same(form.handoff?.recipient,req.user._id)) fail('Only the current reviewer can approve this form.',403);
  validateSections(form.sections,exam.totalMarks);
  form.status='approved';
  await save(form);
  res.json({form});
}));

function ids(values,label,max) {
  if (!Array.isArray(values) || !values.length || values.length>max || values.some(id=>!isId(id))) fail('Choose valid '+label+'.');
  return [...new Set(values.map(value=>value.toLowerCase()))];
}
async function evaluatorIds(exam,values) {
  const selected = ids(values,'evaluators',30);
  const eligible = new Set((await examPeople(exam)).map(user=>String(user._id)));
  if (selected.some(id=>!eligible.has(id))) fail('Choose active evaluators available for this exam.');
  return selected.map(user=>({user}));
}

async function groupById(id,session) {
  if (!isId(id)) fail('Invalid group.');
  const group = await Defense.findOne({_id:id,...workflow}).session(session||null);
  if (!group) fail('Group not found.',404);
  return group;
}

function isReady(group) {
  return group.workflowEvaluators.length>0 && group.workflowEvaluators.every(item=>item.submittedAt);
}
function average(group) {
  return isReady(group) ? round(total(group.workflowEvaluators.map(item=>total(item.scores)))/group.workflowEvaluators.length) : null;
}

router.get('/groups',asyncHandler(async(req,res)=>{
  const scope = manager(req) && req.query.exam
    ? {assessment:(await findExam(req,req.query.exam))._id}
    : {'workflowEvaluators.user':req.user._id};
  const groups = await Defense.find({...workflow,...scope}).select('groupName assessmentTitle assessment assessmentTotalMarks status workflowFinalMark workflowEvaluators.user workflowEvaluators.submittedAt')
    .sort({createdAt:1,_id:1}).lean();
  res.json({groups});
}));

router.post('/groups',staff,asyncHandler(async(req,res)=>{
  const exam = await findExam(req,req.body.exam);
  const form = isId(req.body.form) && await Rubric.findOne({_id:req.body.form,exam:exam._id});
  if (!form || form.maximum!==exam.totalMarks) fail('Choose an evaluation form matching this exam maximum.');
  validateSections(form.sections,exam.totalMarks);
  const students = ids(req.body.students,'enrolled students',250);
  const enrollment = await enrollmentFilter(exam);
  if ((await Enrollment.distinct('student',{...enrollment,student:{$in:students}})).length!==students.length) fail('Every member must be enrolled in this exam’s course and cohort.');
  if (await Defense.exists({course:exam.course,assessment:exam._id,assessmentType:'exam',students:{$in:students}})) fail('A student already belongs to a group for this exam.',409);
  const group = new Defense({
    course:exam.course,assessment:exam._id,assessmentType:'exam',assessmentTitle:exam.title,
    assessmentTotalMarks:exam.totalMarks,projectTotalMarks:exam.totalMarks,
    evaluator:req.user._id,groupName:requiredText(req.body.groupName,'group name',120),
    projectTitle:typeof req.body.projectTitle==='string'?req.body.projectTitle.trim():'',
    students,groupAssignmentEnforced:true,workflowForm:form._id,workflowFormTitle:form.title,workflowRevision:form.__v,
    workflowSections:form.toObject().sections,workflowEvaluators:await evaluatorIds(exam,req.body.evaluators),
  });
  await save(group);
  res.status(201).json({id:group._id});
}));

router.get('/groups/:id',asyncHandler(async(req,res)=>{
  const group = await groupById(req.params.id);
  const mine = group.workflowEvaluators.find(item=>same(item.user,req.user._id));
  const exams = manager(req) ? await examScope(req) : null;
  const canManage = !!exams && !!await Exam.exists({_id:group.assessment,...exams});
  if (!canManage&&!mine) fail('This evaluation is unavailable to you.',403);
  await group.populate([
    {path:'students',select:'studentId user',populate:{path:'user',select:'name'}},
    {path:'workflowEvaluators.user',select:'name'},
  ]);
  const data = group.toObject();
  data.workflowEvaluators = canManage ? data.workflowEvaluators.map(item=>({
    user:item.user,submittedAt:item.submittedAt,total:item.submittedAt?total(item.scores):null,
    ...(item.submittedAt?{scores:item.scores,questionRatings:item.questionRatings,comments:item.comments}:{}),
  })) : [];
  res.json({group:data,canManage,average:average(group),mine:mine?{
    scores:mine.scores,questionRatings:mine.questionRatings,comments:mine.comments,submittedAt:mine.submittedAt,revision:mine.revision,
  }:null,canChangeEvaluators:canManage&&group.status!=='finalized'&&group.workflowEvaluators.every(item=>!item.scores.length&&!item.submittedAt)});
}));

router.put('/groups/:id/evaluators',staff,asyncHandler(async(req,res)=>{
  const group = await groupById(req.params.id);
  const exam = await findExam(req,String(group.assessment));
  assertVersion(group,req.body.__v);
  if (group.status==='finalized'||group.workflowEvaluators.some(item=>item.scores.length||item.submittedAt)) fail('Evaluator assignments lock once scoring begins.',409);
  group.workflowEvaluators = await evaluatorIds(exam,req.body.evaluators);
  await save(group);
  res.json({success:true});
}));

router.put('/groups/:id/score',asyncHandler(async(req,res)=>{
  const group = await groupById(req.params.id);
  const evaluator = group.workflowEvaluators.find(item=>same(item.user,req.user._id));
  if (!evaluator) fail('Only assigned evaluators may enter scores.',403);
  if (group.status==='finalized'||evaluator.submittedAt) fail('This score has already been submitted.',409);
  const {ratings,comments,submit} = req.body;
  if (evaluator.revision!==req.body.revision) fail('Your evaluation changed. Reload before saving.',409);
  const sections=group.workflowSections;
  if (!Array.isArray(ratings)||ratings.length!==sections.length||
      sections.some((section,index)=>!Array.isArray(ratings[index])||ratings[index].length!==section.questions.length||
        ratings[index].some(rating=>rating===null?submit===true:!Number.isInteger(rating)||rating<1||rating>5))) {
    fail('Choose 1 to 5 stars for every question before submitting.');
  }
  const scores=sections.map((section,index)=>ratings[index].includes(null)?null:
    total(ratings[index])/(5*section.questions.length)*section.marks);
  if (!Array.isArray(comments)||comments.length!==scores.length||comments.some(comment=>typeof comment!=='string'||comment.length>4000)) {
    fail('Enter valid section comments.');
  }
  const scoreFilter = {user:req.user._id,submittedAt:null,revision:evaluator.revision};
  const updated = await Defense.updateOne({_id:group._id,status:{$ne:'finalized'},workflowEvaluators:{$elemMatch:scoreFilter}},{
    $set:{'workflowEvaluators.$.scores':scores,'workflowEvaluators.$.questionRatings':ratings,'workflowEvaluators.$.comments':comments,
      ...(submit===true?{'workflowEvaluators.$.submittedAt':new Date()}:{})},
    $inc:{'workflowEvaluators.$.revision':1,__v:1},
  });
  if (!updated.modifiedCount) fail('Your assignment or score changed. Reload before saving.',409);
  res.json({revision:evaluator.revision+1});
}));

async function finalization(group,session) {
  if (!isReady(group)) fail('Wait for all evaluators to submit their scores.',409);
  const exam = await Exam.findOne({_id:group.assessment,...activeExam}).session(session||null);
  if (!exam || exam.totalMarks!==group.assessmentTotalMarks || !same(exam.course,group.course)) {
    fail('The exam or its maximum marks changed after the group was created.',409);
  }
  const proposed = average(group);
  const current = await ExamResult.find({exam:exam._id,student:{$in:group.students}})
    .select('student marksObtained updatedAt').sort({_id:1}).session(session||null).lean();
  const token = createHash('sha256').update(JSON.stringify([group._id,group.__v,proposed,current])).digest('hex');
  return {exam,proposed,current,token};
}

router.get('/groups/:id/finalization',admin,asyncHandler(async(req,res)=>{
  const group = await groupById(req.params.id);
  if (group.status==='finalized') return res.json({finalized:true,proposed:group.workflowFinalMark});
  const {proposed,current,token} = await finalization(group);
  res.json({proposed,current,token,maximum:group.assessmentTotalMarks});
}));

router.post('/groups/:id/finalize',admin,asyncHandler(async(req,res)=>{
  const opened = await groupById(req.params.id);
  if (opened.status==='finalized') return res.json({finalized:true,mark:opened.workflowFinalMark});
  const topology = await mongoose.connection.db.admin().command({hello:1});
  if (!topology.setName&&topology.msg!=='isdbgrid') fail('Finalization requires MongoDB replica-set transactions.',503);
  const mark = await withCourseLock(opened.course,async()=>{
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async()=>{
        const group = await groupById(req.params.id,session);
        if (group.status==='finalized') return group.workflowFinalMark;
        const {exam,proposed,current,token} = await finalization(group,session);
        if (req.body.token!==token || (current.length&&req.body.replaceExisting!==true)) fail('Review the current marks and confirm any replacements before finalizing.',409);
        const enrollment = await enrollmentFilter(exam,session);
        const enrolled = await Enrollment.distinct('student',enrollment).session(session);
        const allowed = new Set(enrolled.map(String));
        if (group.students.some(id=>!allowed.has(String(id)))) fail('A group member is no longer enrolled for this exam.',409);
        const percentage = round(proposed/exam.totalMarks*100);
        await ExamResult.bulkWrite(group.students.map(student=>({updateOne:{
          filter:{exam:exam._id,student},
          update:{$set:{marksObtained:proposed,percentage,grade:gradeFor(percentage),
            isPassed:proposed>=exam.passingMarks,gradedBy:req.user._id}},
          upsert:true,
        }})),{session});
        const results = await ExamResult.find({exam:exam._id}).select('student marksObtained').session(session).lean();
        if (allStudentsGraded(enrolled,results,exam.totalMarks)) {
          await Exam.updateOne({_id:exam._id},{$set:{status:'completed'}},{session});
        }
        group.status='finalized';
        group.workflowFinalMark=proposed;
        await save(group,session);
        return proposed;
      });
    } finally { await session.endSession(); }
  });
  res.json({finalized:true,mark});
}));

module.exports = router;
