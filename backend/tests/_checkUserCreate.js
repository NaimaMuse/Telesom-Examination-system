const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  console.log('hashing');
  const password = await bcrypt.hash('AdminTestPass1', 10);
  console.log('hashed');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log('connected');
  const user = await User.create({
    name: 'Temp Check Admin',
    email: `temp.check.${Date.now()}@telesom.local`,
    password,
    role: 'admin',
    isActive: true,
  });
  console.log('created', String(user._id));
  await User.findByIdAndDelete(user._id);
  console.log('deleted');
  await mongoose.disconnect();
})().catch((error) => {
  console.error('FAIL', error);
  process.exit(1);
});
