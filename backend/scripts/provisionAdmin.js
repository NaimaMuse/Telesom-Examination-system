// Explicit, local provisioning only. Never called by server startup or a public route.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto');
const {hashPassword} = require('../utils/passwords');
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
  let admin = await User.findOne({ role:'admin' }).sort({createdAt:1});
  if (admin) {
    console.log(JSON.stringify({email:admin.email,message:'Admin already exists. No additional account was created.'}));return;
  }
  const production = process.env.NODE_ENV === 'production';
  const supplied = process.env.INITIAL_ADMIN_PASSWORD;
  if (production && (!supplied || supplied.length < 15 || supplied.length > 128)) {
    throw new Error('Supply INITIAL_ADMIN_PASSWORD with 15–128 characters through the production secrets manager.');
  }
  const password = supplied || 'TL!' + crypto.randomBytes(15).toString('base64url');
  const hash = await hashPassword(password);
  admin=await User.create({name:'Telesom Academy Admin',email:'admin@telesom.com',password:hash,role:'admin',isActive:true});
  console.log(JSON.stringify({email:admin.email,...(!supplied ? {password} : {}),role:'admin',message:'Admin is ready. No additional admin account was created.'}));
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
