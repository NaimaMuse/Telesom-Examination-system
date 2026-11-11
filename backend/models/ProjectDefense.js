const mongoose = require('mongoose');
const {Schema} = mongoose;

const schema = new Schema({
  course: {type:Schema.Types.ObjectId,ref:'Course',required:true,index:true},
  students: [{type:Schema.Types.ObjectId,ref:'Student'}],
  evaluator: {type:Schema.Types.ObjectId,ref:'User',required:true},
  evaluatorName: {type:String,required:true,maxlength:200},
  groupName: {type:String,trim:true,maxlength:120,default:''},
  projectTitle: {type:String,trim:true,maxlength:200,default:''},
  cohort: {type:String,trim:true,maxlength:120,default:''},
  defenseDate: {type:String,default:''},
  ratings: {type:Map,of:{type:Number,min:1,max:5},default:{}},
  notes: {type:Map,of:{type:String,maxlength:4000},default:{}},
  wording: {type:Map,of:{type:String,maxlength:500},default:{}},
  outcome: {type:String,enum:['','pass','pass_minor','pass_coaching','resubmit','fail'],default:''},
  summary: {type:String,maxlength:6000,default:''},
  signature: {type:String,trim:true,maxlength:200,default:''},
  signatureDate: {type:String,default:''},
  status: {type:String,enum:['draft','finalized'],default:'draft'},
},{timestamps:true,optimisticConcurrency:true});

module.exports = mongoose.model('ProjectDefense',schema);
