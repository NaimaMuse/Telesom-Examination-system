const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: {type:String, required:true},
  user: {type:mongoose.Schema.Types.ObjectId, required:true, index:true},
  authVersion: {type:Number, required:true},
  expiresAt: {type:Date, required:true, expires:0},
});

module.exports = mongoose.model('Session', schema);
