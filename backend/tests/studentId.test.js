const assert = require('assert');
const Sequence = require('../models/Sequence');
const Student = require('../models/Student');
const ids = require('../services/studentIdService');

(async () => {
  const counters = new Map();
  let existing = [];
  Sequence.findById = key => ({ lean: async () => counters.has(key) ? { value: counters.get(key) } : null });
  Student.find = filter => {
    assert.match(filter.studentId.$regex, /^\^TL-\d{4}-/);
    return { select: () => ({ lean: async () => existing }) };
  };
  Sequence.updateOne = async (filter, update, options) => {
    assert.strictEqual(options.upsert, true);
    counters.set(filter._id, Math.max(counters.get(filter._id) || 0, update.$max.value));
  };
  Sequence.findOneAndUpdate = async (filter, update, options) => {
    assert.deepStrictEqual(update, { $inc: { value: 1 } });
    assert.strictEqual(options.new, true);
    const value = counters.get(filter._id) + 1;
    counters.set(filter._id, value);
    return { value };
  };
  const date = new Date('2026-10-26T12:00:00Z');
  assert.strictEqual(await ids.nextStudentId(date), 'TL-2026-01');
  assert.strictEqual(await ids.nextStudentId(date), 'TL-2026-02');
  const concurrent = await Promise.all(Array.from({length:50}, () => ids.nextStudentId(date)));
  assert.strictEqual(new Set(concurrent).size, 50);
  assert.strictEqual(concurrent[49], 'TL-2026-52');
  assert.strictEqual(await ids.nextStudentId(new Date('2026-12-31T20:59:59Z')), 'TL-2026-53');
  assert.strictEqual(await ids.nextStudentId(new Date('2026-12-31T21:00:00Z')), 'TL-2027-01');
  assert.strictEqual(await ids.nextStudentId(new Date('2027-01-01T12:00:00Z')), 'TL-2027-02');
  existing = [{studentId:'TL-2028-09'}, {studentId:'TL-2028-100'}, {studentId:'TL-2028-02'}];
  assert.strictEqual(await ids.nextStudentId(new Date('2028-01-01T12:00:00Z')), 'TL-2028-101');
  // A consumed counter is never reused after a failed account creation.
  assert.strictEqual(await ids.nextStudentId(new Date('2028-01-01T12:00:00Z')), 'TL-2028-102');
  console.log('Student ID tests passed: sequence, parallel allocations, Nairobi year rollover, existing IDs and 100+ students.');

  // Public signup uses the same allocator and ignores a supplied manual ID.
  const User = require('../models/User');
  const { register } = require('../controllers/authController');
  process.env.JWT_SECRET = 'student-id-test-secret';
  ids.nextStudentId = async () => 'TL-2026-54';
  User.findOne = async () => null;
  User.create = async payload => ({_id:'507f1f77bcf86cd799439011',...payload});
  Student.create = async payload => { assert.strictEqual(payload.studentId, 'TL-2026-54'); return {_id:'profile-a',...payload}; };
  let body;
  const res = {status(code){this.statusCode=code;return this;},json(data){body=data;}};
  await register({body:{name:'Amina',email:'amina@example.com',studentId:'MANUAL-99',role:'student'}},res,error=>{throw error;});
  assert.strictEqual(res.statusCode,201);
  assert.strictEqual(body.user.studentId,'TL-2026-54');
  console.log('Public registration auto-ID test passed.');
})().catch(error => { console.error(error); process.exitCode=1; });
