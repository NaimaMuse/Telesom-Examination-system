const mongoose = require('mongoose');
const {Schema} = mongoose;

const question = new Schema({
  title: {type:String, default:''},
});
const section = new Schema({
  title: {type:String, default:''},
  marks: Number,
  questions: [question],
});

const schema = new Schema({
  exam: {type:Schema.Types.ObjectId, ref:'Exam', required:true, index:true},
  title: {type:String, required:true},
  sections: [section],
  maximum: Number,
  status: {type:String, enum:['draft','review','approved'], default:'draft'},
  handoff: {
    recipient: {type:Schema.Types.ObjectId, ref:'User', index:true},
    sender: {type:Schema.Types.ObjectId, ref:'User'},
    sentAt: Date,
  },
},{timestamps:true, optimisticConcurrency:true});

module.exports = mongoose.model('DefenseRubric',schema);
