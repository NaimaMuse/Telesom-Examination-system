const assert = require('assert');
const User = require('../models/User');

const validEmails = [
  'amina@student.telesom.com',
  'user+test@academy.example',
  'integration@telesom.local',
];
for (const email of validEmails) {
  const user = new User({
    name: 'Test User',
    email,
    password: 'ValidPassword1',
    role: 'admin',
  });
  assert(!user.validateSync(), `${email} should pass validation`);
}

const invalidEmails = ['missing-at.example.com', 'user@', 'user name@example.com'];
for (const email of invalidEmails) {
  const user = new User({
    name: 'Test User',
    email,
    password: 'ValidPassword1',
    role: 'admin',
  });
  assert(user.validateSync()?.errors.email, `${email} should be rejected`);
}

console.log('User model validation tests passed.');
