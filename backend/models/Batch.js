const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: {type:String,required:true,trim:true,maxlength:100},
  academicYear: {type:String,required:true,trim:true,maxlength:30},
  status: {type:String,enum:['active','archived'],default:'active'},
}, {timestamps:true});
schema.index({academicYear:1,name:1},{unique:true});
module.exports = mongoose.model('Batch',schema);
