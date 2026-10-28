const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  outline: {type:mongoose.Schema.Types.ObjectId,ref:'CourseOutline',default:null},
  contract: {type:mongoose.Schema.Types.ObjectId,ref:'TeacherContract',required:true,index:true},
  teacher: {type:mongoose.Schema.Types.ObjectId,ref:'Teacher',required:true},
  course: {type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
  batch: {type:String,required:true},
  title: {type:String,required:true,trim:true,maxlength:200},
  position: {type:Number,default:0,min:0},
  progress: {type:Number,default:0,min:0,max:100},
  description: {type:String,trim:true,maxlength:4000,default:''},
  plannedDate: {type:String,required:function(){return !this.outline;},default:null},
  status: {type:String,enum:['planned','completed'],default:'planned'},
  completedAt: {type:Date,default:null},
  completedDay: {type:String,default:null},
  completedBy: {type:mongoose.Schema.Types.ObjectId,ref:'User',default:null},
  history: [{_id:false,action:{type:String,enum:['completed','reversed']},at:Date,by:{type:mongoose.Schema.Types.ObjectId,ref:'User'},teachingDay:String}],
}, {timestamps:true});
schema.index({contract:1,status:1,completedDay:1});
module.exports = mongoose.model('TeachingLesson',schema);
