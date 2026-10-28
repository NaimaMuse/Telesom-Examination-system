// Explicit, local provisioning only. Never called by server startup or a public route.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
  let admin = await User.findOne({ role:'admin' }).sort({createdAt:1});
  if (admin) {
    console.log(JSON.stringify({email:admin.email,message:'Admin already exists. No additional account was created.'}));return;
  }
  const password = 'TL!' + crypto.randomBytes(15).toString('base64url');
  const hash = await bcrypt.hash(password,12);
  admin=await User.create({name:'Telesom Academy Admin',email:'admin@telesom.com',password:hash,role:'admin',isActive:true});
  console.log(JSON.stringify({email:admin.email,password,role:'admin',message:'Admin is ready. No additional admin account was created.'}));
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
