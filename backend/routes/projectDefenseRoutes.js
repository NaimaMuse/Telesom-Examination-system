const express = require('express');
const mongoose = require('mongoose');
const Defense = require('../models/ProjectDefense');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const {asyncHandler,pick} = require('../controllers/resourceController');
const {fail} = require('../services/evaluationRules');

const router = express.Router();
const criteria = ['b1','b2','b3','c1','d1','e1','f1','g1','g2','g3','g4'];
const fields = ['groupName','projectTitle','cohort','defenseDate','ratings','notes','wording','outcome','summary','signature','signatureDate'];
const wordingKeys = new Set(['title','A','B','C','D','E','F','G','I',...criteria,
  ...criteria.filter(key=>!key.startsWith('g')).map(key=>key+'Hint')]);

router.get('/',asyncHandler(async(req,res)=>{
  const page=Math.max(1,parseInt(req.query.page,10)||1);
  const [records,total]=await Promise.all([
    Defense.find().select('course groupName projectTitle cohort status updatedAt')
      .populate('course','name title').sort({updatedAt:-1,_id:-1}).skip((page-1)*50).limit(50).lean(),
    Defense.countDocuments(),
  ]);
  res.json({records,total});
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
  if(!mongoose.isObjectIdOrHexString(course)||!await Course.exists({_id:course}))fail('Choose an existing course.');
  if(!Array.isArray(students)||students.some(id=>!mongoose.isObjectIdOrHexString(id)))fail('Choose valid enrolled students.');
  const studentIds=[...new Set(students.map(id=>String(id).toLowerCase()))];
  if(studentIds.length){
    const enrolled=await Enrollment.distinct('student',{course,student:{$in:studentIds},status:'enrolled'});
    if(enrolled.length!==studentIds.length)fail('Every selected student must be enrolled in this course.');
  }
  if(!ratings||typeof ratings!=='object'||Array.isArray(ratings)||
      Object.entries(ratings).some(([key,value])=>!criteria.includes(key)||!Number.isInteger(value)||value<1||value>5)){
    fail('Ratings must be whole numbers from 1 to 5.');
  }
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
  record.set({...pick(req.body,fields),course,students:studentIds,ratings,notes});
  if(req.body.finalize===true){
    if(!record.projectTitle||!record.cohort||!record.defenseDate||!studentIds.length||
       !record.outcome||criteria.some(key=>!ratings[key])){
      fail('Select at least one student and complete the project details, all ratings, and the outcome before finalizing.');
    }
    record.status='finalized';
  }
  try{
    await record.save();
  }catch(error){
    if(error.name==='VersionError')fail('This evaluation has changed. Reopen it before editing.',409);
    throw error;
  }
  res.status(creating?201:200).json({record});
}
router.post('/',asyncHandler(save));
router.put('/:id',asyncHandler(save));

module.exports=router;
