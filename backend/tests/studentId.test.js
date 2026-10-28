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

  const {register}=require('../controllers/authController');
  for(const role of ['student','teacher','admin']) {
    let body;const res={status(code){this.statusCode=code;return this;},json(data){body=data;}};
    register({body:{role}},res);
    assert.strictEqual(res.statusCode,403);assert.strictEqual(body.success,false);
  }
  console.log('Public registration is disabled for all roles.');
})().catch(error => { console.error(error); process.exitCode=1; });
