const express = require('express');
const mongoose = require('mongoose');
const Defense = require('../models/ProjectDefense');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const {asyncHandler,pick} = require('../controllers/resourceController');
const {fail} = require('../services/evaluationRules');
const {enrollmentCohortFilter} = require('../services/batchService');
const {assessmentReadScope} = require('../services/gradebookIntegrityService');
const {authorizeRoles} = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(asyncHandler(async(req,res,next)=>{
  req.defenseFilter={$or:[{teacherOwned:{$ne:true}},{submittedAt:{$ne:null}}]};
  if(req.user.role==='judge'){
    req.defenseFilter={assignedJudge:req.user._id};
  }else if(req.user.role==='teacher'){
    req.defenseAssessmentFilter={$or:[{createdBy:req.user._id},await assessmentReadScope(req)]};
    const [exams,quizzes]=await Promise.all([Exam,Quiz].map(Model=>Model.find(req.defenseAssessmentFilter).select('_id course').lean()));
    req.defenseFilter={teacherOwned:true,evaluator:req.user._id};
    req.defenseCourses=[...exams,...quizzes].map(item=>String(item.course));
    const course=req.params.course||req.query.course;
    if(course&&!req.defenseCourses.includes(String(course)))fail('This course is outside your project defense access.',403);
  }
  req.defenseFilter.workflowForm={$exists:false};
  next();
}));
const criteria = ['b1','b2','b3','c1','d1','e1','f1','g1','g2','g3','g4'];
const rubricSections = ['B','C','D','E','F','G'];
const fields = ['groupName','projectTitle','cohort','cohortYear','evaluatorName','defenseDate','ratings','notes','wording','outcome','summary','signature','signatureDate'];
const wordingKeys = new Set(['title','A','B','C','D','E','F','G','I',...criteria,
  ...criteria.filter(key=>!key.startsWith('g')).map(key=>key+'Hint')]);

function validateRatingOptions(options){
  if(!Array.isArray(options)||!options.length||new Set(options).size!==options.length||
      options.some(value=>!Number.isSafeInteger(value)||value<1)){
    fail('Enter distinct positive whole numbers for the rating options.');
  }
}

function validateRatings(ratings,options,criteria){
  if(!ratings||typeof ratings!=='object'||Array.isArray(ratings)||
      Object.entries(ratings).some(([key,value])=>!criteria.includes(key)||!options.includes(value))){
    fail('Every rating must use one of the configured rating options.');
  }
}

function validateNotes(notes,criteria){
  if(!notes||typeof notes!=='object'||Array.isArray(notes)||
      Object.entries(notes).some(([key,value])=>!criteria.includes(key)||typeof value!=='string'||value.length>4000)){
    fail('Evaluation notes must be text attached to a rubric criterion.');
  }
}

function validateAdditionalEvaluations(evaluations,options,finalize,criteria){
  if(!Array.isArray(evaluations))fail('Provide a list of evaluators.');
  for(const evaluation of evaluations){
    if(!evaluation||typeof evaluation.name!=='string'||evaluation.name.length>200){
      fail('Enter a valid evaluator name.');
    }
    validateRatings(evaluation.ratings,options,criteria);
    validateNotes(evaluation.notes,criteria);
    if(finalize&&(!evaluation.name.trim()||criteria.some(key=>evaluation.ratings[key]===undefined))){
      fail('Enter a name and complete the rubric for every evaluator before finalizing.');
    }
  }
}

function customRubricMarks(sections,append){
  if(!Array.isArray(sections)||(!append&&!sections.length)||sections.length>30)fail('Add between 1 and 30 rubric sections.');
  const keys=new Set();
  const validItem=item=>item&&typeof item.key==='string'&&/^[sq][a-f0-9-]{36}$/.test(item.key)&&
    typeof item.title==='string'&&item.title.trim()&&item.title.length<=500&&
    Number.isFinite(item.marks)&&item.marks>0;
  for(const section of sections){
    if(!validItem(section)||!Number.isSafeInteger(section.marks)||!section.key.startsWith('s')||keys.has(section.key)||
      !Array.isArray(section.questions)||!section.questions.length||section.questions.length>50){
      fail('Give each section a title, marks and 1 to 50 questions.');
    }
    keys.add(section.key);
    for(const question of section.questions){
      if(!validItem(question)||!question.key.startsWith('q')||keys.has(question.key)){
        fail('Give each question a title and positive marks.');
      }
      keys.add(question.key);
    }
    if(Math.abs(section.questions.reduce((sum,question)=>sum+question.marks,0)-section.marks)>0.000001){
      fail('Question marks must add up to their section marks.');
    }
  }
  return sections.reduce((sum,section)=>sum+section.marks,0);
}

function getRubricCriteria(customRubric,append){
  const customCriteria=customRubric?.flatMap(section=>section.questions.map(question=>question.key))||[];
  return !customRubric||append?[...criteria,...customCriteria]:customCriteria;
}

async function saveVersion(record){
  try{
    await record.save();
  }catch(error){
    if(error.name==='VersionError')fail('This evaluation has changed. Reopen it before editing.',409);
    if(error.code===11000&&error.keyPattern?.students)fail('A selected student already belongs to another group for this assessment.',409);
    throw error;
  }
}

router.get('/',asyncHandler(async(req,res)=>{
  const page=Math.max(1,parseInt(req.query.page,10)||1);
  const filter={...req.defenseFilter,...require('../services/pageSearch').textSearchFilter(req.query.search,
    ['groupName','projectTitle','assessmentTitle','cohort','evaluatorName','status'])};
  const [records,total]=await Promise.all([
    Defense.find(filter).select('course groupName projectTitle cohort status updatedAt submittedAt teacherOwned assignedJudge __v')
      .populate('course','name title').populate('assignedJudge','name email')
      .sort({updatedAt:-1,_id:-1}).skip((page-1)*50).limit(50).lean(),
    Defense.countDocuments(filter),
  ]);
  res.json({records,total});
}));

router.get('/recent',asyncHandler(async(req,res)=>{
  const {course}=req.query;
  if(course!==undefined&&(typeof course!=='string'||!mongoose.isObjectIdOrHexString(course)))fail('Choose a valid course.');
  const records=await Defense.find({...req.defenseFilter,...(course?{course}:{})})
    .select('course groupName projectTitle defenseDate status submittedAt teacherOwned')
    .populate('course','name title')
    .sort({updatedAt:-1,_id:-1}).limit(5).lean();
  res.json({records});
}));

router.get('/courses/:course/groups',asyncHandler(async(req,res)=>{
  const {course}=req.params;
  if(!mongoose.isObjectIdOrHexString(course))fail('Choose a valid course.');
  if(req.defenseCourses&&!req.defenseCourses.includes(course))fail('This course is outside your project defense access.',403);
  const records=await Defense.find({...req.defenseFilter,course}).sort({createdAt:1,_id:1}).lean();
  res.json({records});
}));

router.get('/courses/:course/cohorts',asyncHandler(async(req,res)=>{
  const {course}=req.params;
  if(!mongoose.isObjectIdOrHexString(course))fail('Choose a valid course.');
  if(req.defenseCourses&&!req.defenseCourses.includes(course))fail('This course is outside your project defense access.',403);
  const [configured,enrolled]=await Promise.all([
    Course.findById(course).select('batch academicYear').lean(),
    Enrollment.aggregate([
      {$match:{course:new mongoose.Types.ObjectId(course),status:'enrolled',batch:{$exists:true,$ne:''}}},
      {$group:{_id:{batch:'$batch',academicYear:'$academicYear'}}},
    ]),
  ]);
  if(!configured)fail('Course not found.',404);
  const cohorts=new Map();
  for(const row of [configured,...enrolled.map(row=>row._id)]){
    if(row.batch&&row.academicYear){
      cohorts.set(JSON.stringify([row.batch,row.academicYear]),{name:row.batch,academicYear:row.academicYear});
    }
  }
  res.json({cohorts:[...cohorts.values()].sort((a,b)=>b.academicYear.localeCompare(a.academicYear)||a.name.localeCompare(b.name))});
}));

router.get('/assessments',authorizeRoles('admin','teacher'),asyncHandler(async(req,res)=>{
  const teachers=await User.distinct('_id',{role:'teacher'});
  const filter=req.user.role==='teacher'?req.defenseAssessmentFilter:{createdBy:{$in:teachers}};
  const [exams,quizzes]=await Promise.all([Exam,Quiz].map(Model=>
    Model.find(filter).select('title course totalMarks type').populate('course','name title').sort({title:1,_id:1}).lean()));
  const assessments=[...exams.map(exam=>({...exam,type:'exam'})),
    ...(req.user.role==='teacher'?[]:quizzes.map(quiz=>({...quiz,type:'quiz'})))]
    .filter(assessment=>assessment.course);
  res.json({assessments});
}));

router.get('/:id',asyncHandler(async(req,res)=>{
  const record=await Defense.findOne({...req.defenseFilter,_id:req.params.id});
  if(!record)fail('Defense evaluation not found.',404);
  const course=await Course.findById(record.course).select('name title').lean();
  res.json({record,course});
}));

router.patch('/:id/judge',authorizeRoles('admin'),asyncHandler(async(req,res)=>{
  if(!mongoose.isObjectIdOrHexString(req.params.id))fail('Choose a valid defense form.');
  if(!Number.isSafeInteger(req.body.__v))fail('Reload this form before assigning a judge.',409);
  const record=await Defense.findOne({_id:req.params.id,workflowForm:{$exists:false}});
  if(!record)fail('Defense evaluation not found.',404);
  if(req.body.__v!==record.__v)fail('This form has changed. Reload before assigning a judge.',409);
  if(record.status==='finalized')fail('A finalized defense cannot be assigned to a judge.',409);
  const judgeId=req.body.judge;
  if(judgeId!==null&&judgeId!==''&&(!mongoose.isObjectIdOrHexString(judgeId)||
      !await User.exists({_id:judgeId,role:'judge',isActive:true}))){
    fail('Choose an active judge account.');
  }
  record.assignedJudge=judgeId||null;
  await saveVersion(record);
  res.json({record:{_id:record._id,assignedJudge:record.assignedJudge,__v:record.__v}});
}));

async function saveJudge(req,res){
  if(!req.params.id||!mongoose.isObjectIdOrHexString(req.params.id)){
    fail('Judges can only evaluate an assigned project defense form.',403);
  }
  const record=await Defense.findOne({...req.defenseFilter,_id:req.params.id});
  if(!record)fail('Defense evaluation not found.',404);
  if(record.status==='finalized')fail('This defense evaluation is finalized.',409);
  if(req.body.__v!==record.__v)fail('This evaluation has changed. Reopen it before editing.',409);
  if(req.body.finalize!==undefined&&typeof req.body.finalize!=='boolean')fail('Choose a valid evaluation status.');
  const {ratings={},notes={},outcome='',summary='',signature='',signatureDate=''}=req.body;
  const rubricCriteria=getRubricCriteria(record.customRubric,record.appendCustomRubric);
  validateRatings(ratings,record.ratingOptions,rubricCriteria);
  validateNotes(notes,rubricCriteria);
  if(!['','pass','pass_minor','pass_coaching','resubmit','fail'].includes(outcome)||
      typeof summary!=='string'||summary.length>6000||
      typeof signature!=='string'||signature.length>200){
    fail('Enter valid project evaluation details.');
  }
  if(signatureDate!==''&&(
      typeof signatureDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(signatureDate)||
      Number.isNaN(Date.parse(signatureDate+'T00:00:00.000Z'))||
      new Date(signatureDate+'T00:00:00.000Z').toISOString().slice(0,10)!==signatureDate)){
    fail('Enter a valid signature date.');
  }
  record.set({ratings,notes,outcome,summary,signature,signatureDate,evaluatorName:req.user.name});
  if(req.body.finalize){
    const missingRatings=rubricCriteria.filter(key=>ratings[key]===undefined).length;
    const missing=[
      !record.students.length&&'at least one student',
      !record.projectTitle&&'project title',
      !record.cohort&&'training cohort',
      !record.defenseDate&&'defense date',
      missingRatings>0&&`${missingRatings} remaining ${missingRatings===1?'rating':'ratings'}`,
    ].filter(Boolean);
    if(missing.length)fail(`Complete the following before finalizing: ${missing.join(', ')}.`);
    record.status='finalized';
  }
  await saveVersion(record);
  res.json({record});
}

async function save(req,res){
  if(req.user.role==='judge')return saveJudge(req,res);
  const record=req.params.id?await Defense.findOne({...req.defenseFilter,_id:req.params.id}):new Defense({
    evaluator:req.user._id,evaluatorName:req.user.name,teacherOwned:req.user.role==='teacher',
  });
  if(!record)fail('Defense evaluation not found.',404);
  if(req.user.role==='teacher'&&record.submittedAt)fail('This form has already been sent to the admin.',409);
  if(record.status==='finalized')fail('This defense evaluation is finalized.',409);
  if(req.user.role==='teacher'&&record.submittedAt)fail('This form has already been sent to the admin.',409);
  if(!record.isNew&&req.body.__v!==record.__v)fail('This evaluation has changed. Reopen it before editing.',409);

  const {course,students,ratings={},notes={}}=req.body;
  const {assessment,assessmentType}=req.body;
  if(req.user.role==='teacher'){
    const Model=assessmentType==='exam'?Exam:null;
    if(!Model||!mongoose.isObjectIdOrHexString(assessment)||
      !await Model.exists({...req.defenseAssessmentFilter,_id:assessment,course})){
      fail('Choose an exam available to you for this course.',403);
    }
    if(!Array.isArray(students)||students.length)fail('The admin assigns students to defense groups.',403);
    if(req.body.finalize===true||Object.keys(ratings).length||Object.keys(notes).length||
      req.body.additionalEvaluations?.length)fail('Teachers prepare the rubric. The admin manages group evaluations.',403);
  }
  if(assessment||assessmentType){
    const Model=assessmentType==='exam'?Exam:assessmentType==='quiz'?Quiz:null;
    if(!Model||!mongoose.isObjectIdOrHexString(assessment))fail('Choose a valid exam or quiz.');
    if(String(record.assessment)!==assessment||record.assessmentType!==assessmentType||String(record.course)!==course){
      const selected=await Model.findById(assessment).select('course createdBy title totalMarks').lean();
      if(!selected||String(selected.course)!==course||
        (req.user.role!=='teacher'&&!await User.exists({_id:selected.createdBy,role:'teacher'}))){
        fail('Choose a teacher-created exam or quiz for this course.');
      }
      record.set({assessment,assessmentType,assessmentTitle:selected.title,assessmentTotalMarks:selected.totalMarks});
    }
  }else if(record.isNew){
    fail('Choose a teacher-created exam or quiz.');
  }else if(record.assessment&&String(record.course)!==course){
    fail('Choose an exam or quiz for the new course.');
  }
  if(!mongoose.isObjectIdOrHexString(course))fail('Choose an existing course.');
  const configured=await Course.findById(course).select('batch academicYear').lean();
  if(!configured)fail('Choose an existing course.');
  for(const field of ['evaluatorName','cohort','cohortYear']){
    if(req.body[field]!==undefined&&typeof req.body[field]!=='string')fail('Enter valid evaluator and cohort details.');
  }
  const cohort=req.body.cohort?.trim()??record.cohort;
  const cohortYear=req.body.cohortYear?.trim()??record.cohortYear;
  const scope=cohortYear?enrollmentCohortFilter(configured,cohortYear,cohort):{};
  if(cohortYear&&(!cohort||(
      (configured.batch!==cohort||configured.academicYear!==cohortYear)&&
      !await Enrollment.exists({course,status:'enrolled',...scope})
  )))fail('Choose a cohort associated with the course.');
  if(!Array.isArray(students)||students.some(id=>!mongoose.isObjectIdOrHexString(id)))fail('Choose valid enrolled students.');
  const studentIds=[...new Set(students.map(id=>String(id).toLowerCase()))];
  if(studentIds.length){
    const enrolled=await Enrollment.distinct('student',{course,student:{$in:studentIds},status:'enrolled',...scope});
    if(enrolled.length!==studentIds.length)fail('Every selected student must be enrolled in the selected course and cohort.');
    if(record.assessment&&await Defense.exists({
      _id:{$ne:record._id},course,assessment:record.assessment,assessmentType:record.assessmentType,
      students:{$in:studentIds},
    }))fail('A selected student already belongs to another group for this assessment.',409);
  }
  const ratingOptions=req.body.ratingOptions===undefined?record.ratingOptions:req.body.ratingOptions;
  validateRatingOptions(ratingOptions);
  const projectTotalMarks=req.body.projectTotalMarks===undefined?record.projectTotalMarks:req.body.projectTotalMarks;
  if(req.user.role==='teacher'){
    const Model=record.assessmentType==='exam'?Exam:Quiz;
    const selected=await Model.findById(record.assessment).select('totalMarks').lean();
    if(!selected)fail('Choose an existing assessment.');
    if(projectTotalMarks!==selected.totalMarks)fail(`Section marks must add up to the assessment maximum of ${selected.totalMarks}.`);
    record.assessmentTotalMarks=selected.totalMarks;
  }
  const customRubric=req.body.customRubric===undefined?record.customRubric:req.body.customRubric;
  const appendCustomRubric=req.body.appendCustomRubric??record.appendCustomRubric;
  if(appendCustomRubric!==undefined&&typeof appendCustomRubric!=='boolean')fail('Choose a valid rubric format.');
  if(!Number.isSafeInteger(projectTotalMarks)||projectTotalMarks<1)fail('Enter positive whole marks for the project total.');
  const customMarks=customRubric===undefined?0:customRubricMarks(customRubric,appendCustomRubric);
  const useStandardRubric=!customRubric||appendCustomRubric;
  const rubricSectionMarks=req.body.rubricSectionMarks===undefined
    ? Object.fromEntries(record.rubricSectionMarks) : req.body.rubricSectionMarks;
  if(useStandardRubric&&(!rubricSectionMarks||typeof rubricSectionMarks!=='object'||Array.isArray(rubricSectionMarks)||
      Object.keys(rubricSectionMarks).length!==rubricSections.length||
      rubricSections.some(section=>!Number.isSafeInteger(rubricSectionMarks[section])||rubricSectionMarks[section]<1))){
    fail('Enter positive whole marks for the project total and every rubric section.');
  }
  const standardMarks=useStandardRubric?rubricSections.reduce((sum,section)=>sum+rubricSectionMarks[section],0):0;
  if(standardMarks+customMarks!==projectTotalMarks){
    fail('The section marks must add up to the project total.');
  }
  const rubricCriteria=getRubricCriteria(customRubric,appendCustomRubric);
  validateRatings(ratings,ratingOptions,rubricCriteria);
  validateNotes(notes,rubricCriteria);
  const additionalEvaluations=req.body.additionalEvaluations??record.toJSON().additionalEvaluations??[];
  validateAdditionalEvaluations(additionalEvaluations,ratingOptions,req.body.finalize===true,rubricCriteria);
  const {wording}=req.body;
  if(wording!==undefined&&(!wording||typeof wording!=='object'||Array.isArray(wording)||
      Object.entries(wording).some(([key,value])=>!wordingKeys.has(key)||typeof value!=='string'||value.length>500))){
    fail('Enter valid form wording up to 500 characters per field.');
  }
  for(const field of ['defenseDate','signatureDate']){
    const value=req.body[field];
    if(value===undefined||value==='')continue;
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('Enter a valid date.');
    const date=new Date(value+'T00:00:00.000Z');
    if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)fail('Enter a valid date.');
  }
  const creating=record.isNew;
  record.set({...pick(req.body,fields),course,students:studentIds,ratings,notes,additionalEvaluations,
    ratingOptions:[...ratingOptions].sort((a,b)=>a-b),projectTotalMarks,rubricSectionMarks,customRubric,appendCustomRubric});
  if(record.assessment)record.groupAssignmentEnforced=req.user.role==='admin';
  if(req.body.finalize===true){
    const missingRatings=rubricCriteria.filter(key=>ratings[key]===undefined).length;
    const missing=[
      !record.evaluatorName&&'evaluator name',
      !studentIds.length&&'at least one student',
      !record.projectTitle&&'project title',
      !record.cohort&&'training cohort',
      !record.defenseDate&&'defense date',
      missingRatings>0&&`${missingRatings} remaining ${missingRatings===1?'rating':'ratings'}`,
    ].filter(Boolean);
    if(missing.length)fail(`Complete the following before finalizing: ${missing.join(', ')}.`);
    if(record.assessment){
      const Model=record.assessmentType==='exam'?Exam:Quiz;
      const assessment=await Model.findById(record.assessment).select('totalMarks').lean();
      if(assessment?.totalMarks>0)record.assessmentTotalMarks=assessment.totalMarks;
    }
    record.status='finalized';
  }
  await saveVersion(record);
  res.status(creating?201:200).json({record});
}
router.post('/',authorizeRoles('admin','teacher'),asyncHandler(save));
router.put('/:id',authorizeRoles('admin','teacher','judge'),asyncHandler(save));
router.post('/:id/submit',asyncHandler(async(req,res)=>{
  if(req.user.role!=='teacher')fail('Only a teacher can send a form to the admin.',403);
  const record=await Defense.findOne({...req.defenseFilter,_id:req.params.id});
  if(!record)fail('Defense evaluation not found.',404);
  if(record.submittedAt)return res.json({record});
  if(req.body.__v!==record.__v)fail('This form has changed. Reopen it before sending.',409);
  if(!record.customRubric?.length)fail('Create the sections and sub-questions before sending.');
  customRubricMarks(record.toObject().customRubric,record.appendCustomRubric);
  const Model=record.assessmentType==='exam'?Exam:Quiz;
  const assessment=await Model.findById(record.assessment).select('totalMarks').lean();
  if(!assessment)fail('Choose an existing assessment.');
  if(record.projectTotalMarks!==assessment.totalMarks)fail('Section marks must add up to the assessment maximum.');
  record.assessmentTotalMarks=assessment.totalMarks;
  record.submittedAt=new Date();
  await saveVersion(record);
  res.json({record});
}));
router.delete('/:id',authorizeRoles('admin','teacher'),asyncHandler(async(req,res)=>{
  if(!mongoose.isObjectIdOrHexString(req.params.id))fail('Choose a valid group.');
  if(!Number.isSafeInteger(req.body?.__v))fail('Reload this group before deleting it.',409);
  const filter={...req.defenseFilter,_id:req.params.id};
  if(req.user.role==='teacher')filter.submittedAt=null;
  const result=await Defense.deleteOne({...filter,__v:req.body.__v});
  if(!result.deletedCount){
    if(await Defense.exists(filter))fail('This group has changed. Reopen it before deleting.',409);
    fail('Defense group not found.',404);
  }
  res.status(204).end();
}));

router.patch('/:id/marks',authorizeRoles('admin','teacher'),asyncHandler(async(req,res)=>{
  const record=await Defense.findOne({...req.defenseFilter,_id:req.params.id});
  if(!record)fail('Defense evaluation not found.',404);
  if(req.user.role==='teacher'&&record.submittedAt)fail('This form has already been sent to the admin.',409);
  if(req.body.__v!==record.__v)fail('This evaluation has changed. Reopen it before editing.',409);
  if(record.status!=='finalized')fail('Save draft marks from the evaluation form.',409);
  const {ratings}=req.body;
  const rubricCriteria=getRubricCriteria(record.customRubric,record.appendCustomRubric);
  validateRatings(ratings,record.ratingOptions,rubricCriteria);
  if(rubricCriteria.some(key=>ratings[key]===undefined))fail('Rate every criterion before saving finalized marks.');
  const evaluatorId=req.body.evaluatorId;
  if(evaluatorId){
    const evaluation=record.additionalEvaluations.id(evaluatorId);
    if(!evaluation)fail('Evaluator not found.',404);
    evaluation.ratings=ratings;
  }else{
    record.ratings=ratings;
  }
  await saveVersion(record);
  res.json({record});
}));

module.exports=router;
