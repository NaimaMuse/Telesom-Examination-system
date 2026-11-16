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

const router = express.Router();
const criteria = ['b1','b2','b3','c1','d1','e1','f1','g1','g2','g3','g4'];
const fields = ['groupName','projectTitle','cohort','cohortYear','evaluatorName','defenseDate','ratings','notes','wording','outcome','summary','signature','signatureDate'];
const wordingKeys = new Set(['title','A','B','C','D','E','F','G','I',...criteria,
  ...criteria.filter(key=>!key.startsWith('g')).map(key=>key+'Hint')]);

function validateRatingOptions(options){
  if(!Array.isArray(options)||!options.length||new Set(options).size!==options.length||
      options.some(value=>!Number.isSafeInteger(value)||value<1)){
    fail('Enter distinct positive whole numbers for the rating options.');
  }
}

function validateRatings(ratings,options){
  if(!ratings||typeof ratings!=='object'||Array.isArray(ratings)||
      Object.entries(ratings).some(([key,value])=>!criteria.includes(key)||!options.includes(value))){
    fail('Every rating must use one of the configured rating options.');
  }
}

async function saveVersion(record){
  try{
    await record.save();
  }catch(error){
    if(error.name==='VersionError')fail('This evaluation has changed. Reopen it before editing.',409);
    throw error;
  }
}

router.get('/',asyncHandler(async(req,res)=>{
  const page=Math.max(1,parseInt(req.query.page,10)||1);
  const [records,total]=await Promise.all([
    Defense.find().select('course groupName projectTitle cohort status updatedAt')
      .populate('course','name title').sort({updatedAt:-1,_id:-1}).skip((page-1)*50).limit(50).lean(),
    Defense.countDocuments(),
  ]);
  res.json({records,total});
}));

router.get('/recent',asyncHandler(async(req,res)=>{
  const {course}=req.query;
  if(typeof course!=='string'||!mongoose.isObjectIdOrHexString(course))fail('Choose a valid course.');
  const records=await Defense.find({course})
    .select('groupName projectTitle defenseDate status')
    .sort({updatedAt:-1,_id:-1}).limit(5).lean();
  res.json({records});
}));

router.get('/courses/:course/cohorts',asyncHandler(async(req,res)=>{
  const {course}=req.params;
  if(!mongoose.isObjectIdOrHexString(course))fail('Choose a valid course.');
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

router.get('/assessments',asyncHandler(async(req,res)=>{
  const teachers=await User.distinct('_id',{role:'teacher'});
  const filter={createdBy:{$in:teachers}};
  const [exams,quizzes]=await Promise.all([Exam,Quiz].map(Model=>
    Model.find(filter).select('title course').populate('course','name title').sort({title:1,_id:1}).lean()));
  const assessments=[...exams.map(exam=>({...exam,type:'exam'})),...quizzes.map(quiz=>({...quiz,type:'quiz'}))]
    .filter(assessment=>assessment.course);
  res.json({assessments});
}));

router.get('/:id',asyncHandler(async(req,res)=>{
  const record=await Defense.findById(req.params.id);
  if(!record)fail('Defense evaluation not found.',404);
  res.json({record});
}));

async function save(req,res){
  const record=req.params.id?await Defense.findById(req.params.id):new Defense({
    evaluator:req.user._id,evaluatorName:req.user.name,
  });
  if(!record)fail('Defense evaluation not found.',404);
  if(record.status==='finalized')fail('This defense evaluation is finalized.',409);
  if(!record.isNew&&req.body.__v!==record.__v)fail('This evaluation has changed. Reopen it before editing.',409);

  const {course,students,ratings={},notes={}}=req.body;
  const {assessment,assessmentType}=req.body;
  if(assessment||assessmentType){
    const Model=assessmentType==='exam'?Exam:assessmentType==='quiz'?Quiz:null;
    if(!Model||!mongoose.isObjectIdOrHexString(assessment))fail('Choose a valid exam or quiz.');
    if(String(record.assessment)!==assessment||record.assessmentType!==assessmentType||String(record.course)!==course){
      const selected=await Model.findById(assessment).select('course createdBy title').lean();
      if(!selected||String(selected.course)!==course||!await User.exists({_id:selected.createdBy,role:'teacher'})){
        fail('Choose a teacher-created exam or quiz for this course.');
      }
      record.set({assessment,assessmentType,assessmentTitle:selected.title});
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
  const scope=cohortYear?{batch:cohort,academicYear:cohortYear}:{};
  if(cohortYear&&(!cohort||(
      (configured.batch!==cohort||configured.academicYear!==cohortYear)&&
      !await Enrollment.exists({course,status:'enrolled',...scope})
  )))fail('Choose a cohort associated with the course.');
  if(!Array.isArray(students)||students.some(id=>!mongoose.isObjectIdOrHexString(id)))fail('Choose valid enrolled students.');
  const studentIds=[...new Set(students.map(id=>String(id).toLowerCase()))];
  if(studentIds.length){
    const enrolled=await Enrollment.distinct('student',{course,student:{$in:studentIds},status:'enrolled',...scope});
    if(enrolled.length!==studentIds.length)fail('Every selected student must be enrolled in the selected course and cohort.');
  }
  const ratingOptions=req.body.ratingOptions===undefined?record.ratingOptions:req.body.ratingOptions;
  validateRatingOptions(ratingOptions);
  validateRatings(ratings,ratingOptions);
  if(!notes||typeof notes!=='object'||Array.isArray(notes)||
      Object.entries(notes).some(([key,value])=>!criteria.includes(key)||typeof value!=='string')){
    fail('Evaluation notes must be text attached to a rubric criterion.');
  }
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
  record.set({...pick(req.body,fields),course,students:studentIds,ratings,notes,
    ratingOptions:[...ratingOptions].sort((a,b)=>a-b)});
  if(req.body.finalize===true){
    const missingRatings=criteria.filter(key=>ratings[key]===undefined).length;
    const missing=[
      !record.evaluatorName&&'evaluator name',
      !studentIds.length&&'at least one student',
      !record.projectTitle&&'project title',
      !record.cohort&&'training cohort',
      !record.defenseDate&&'defense date',
      missingRatings>0&&`${missingRatings} remaining ${missingRatings===1?'rating':'ratings'}`,
    ].filter(Boolean);
    if(missing.length)fail(`Complete the following before finalizing: ${missing.join(', ')}.`);
    record.status='finalized';
  }
  await saveVersion(record);
  res.status(creating?201:200).json({record});
}
router.post('/',asyncHandler(save));
router.put('/:id',asyncHandler(save));

router.patch('/:id/marks',asyncHandler(async(req,res)=>{
  const record=await Defense.findById(req.params.id);
  if(!record)fail('Defense evaluation not found.',404);
  if(req.body.__v!==record.__v)fail('This evaluation has changed. Reopen it before editing.',409);
  if(record.status!=='finalized')fail('Save draft marks from the evaluation form.',409);
  const {ratings}=req.body;
  validateRatings(ratings,record.ratingOptions);
  if(criteria.some(key=>ratings[key]===undefined))fail('Rate every criterion before saving finalized marks.');
  record.ratings=ratings;
  await saveVersion(record);
  res.json({record});
}));

module.exports=router;
