const mongoose = require('mongoose');
const {Schema} = mongoose;

const schema = new Schema({
  course: {type:Schema.Types.ObjectId,ref:'Course',required:true,index:true},
  assessment: {type:Schema.Types.ObjectId},
  assessmentType: {type:String,enum:['exam','quiz']},
  assessmentTitle: {type:String},
  assessmentTotalMarks: {type:Number,min:0.01},
  students: [{type:Schema.Types.ObjectId,ref:'Student'}],
  groupAssignmentEnforced: {type:Boolean},
  workflowForm: {type:Schema.Types.ObjectId,ref:'DefenseRubric',index:true},
  workflowFormTitle: String,
  workflowRevision: Number,
  workflowSections: {type:[new Schema({
    title:String, marks:Number,
    questions:[new Schema({title:String})],
  })],default:undefined},
  workflowEvaluators: {type:[new Schema({
    user:{type:Schema.Types.ObjectId,ref:'User',required:true},
    scores:[{type:Number}],
    questionRatings:{type:[[Number]],default:undefined},
    comments:[{type:String,maxlength:4000}],
    revision:{type:Number,default:0},
    submittedAt:Date,
  },{_id:false})],default:undefined},
  workflowFinalMark: Number,
  evaluator: {type:Schema.Types.ObjectId,ref:'User',required:true},
  assignedJudge: {type:Schema.Types.ObjectId,ref:'User',default:null,index:true},
  evaluatorName: {type:String,trim:true,maxlength:200,default:''},
  teacherOwned: {type:Boolean,default:false},
  submittedAt: {type:Date},
  additionalEvaluations: [{
    name: {type:String,trim:true,maxlength:200,default:''},
    ratings: {type:Map,of:{type:Number,min:1},default:{}},
    notes: {type:Map,of:{type:String,maxlength:4000},default:{}},
  }],
  groupName: {type:String,trim:true,maxlength:120,default:''},
  projectTitle: {type:String,trim:true,maxlength:200,default:''},
  cohort: {type:String,trim:true,maxlength:120,default:''},
  cohortYear: {type:String,trim:true,maxlength:30,default:''},
  defenseDate: {type:String,default:''},
  projectTotalMarks: {type:Number,default:90},
  appendCustomRubric: {type:Boolean},
  customRubric: {type:[new Schema({
    key:String,title:String,marks:Number,
    questions:[new Schema({key:String,title:String,marks:Number},{_id:false})],
  },{_id:false})],default:undefined},
  rubricSectionMarks: {
    type:Map,of:Number,default:()=>({B:15,C:20,D:20,E:15,F:10,G:10}),
  },
  ratingOptions: {type:[Number],default:()=>[1,2,3,4,5]},
  ratings: {type:Map,of:{type:Number,min:1},default:{}},
  notes: {type:Map,of:{type:String,maxlength:4000},default:{}},
  wording: {type:Map,of:{type:String,maxlength:500},default:{}},
  outcome: {type:String,enum:['','pass','pass_minor','pass_coaching','resubmit','fail'],default:''},
  summary: {type:String,maxlength:6000,default:''},
  signature: {type:String,trim:true,maxlength:200,default:''},
  signatureDate: {type:String,default:''},
  status: {type:String,enum:['draft','finalized'],default:'draft'},
  submittedAt: {type:Date,default:null},
},{timestamps:true,optimisticConcurrency:true});

schema.index({course:1,assessment:1,assessmentType:1,students:1},{
  unique:true,
  partialFilterExpression:{groupAssignmentEnforced:true,'students.0':{$exists:true}},
  name:'unique_defense_student_group',
});
schema.index({'workflowEvaluators.user':1});

module.exports = mongoose.model('ProjectDefense',schema);
