const assert = require('assert/strict');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
(async () => {
  for (const Model of [Exam, Quiz]) {
    const fields = { title: 'Threshold test', course: new mongoose.Types.ObjectId(), quizCode: 'PASS-TEST', quizDate: new Date() };
    const assessment = new Model({ ...fields, totalMarks: 5 });
    assert.equal(assessment.passingMarks, 2.5);
    await assessment.validate();
    const configured = new Model({ ...fields, totalMarks: 5, passingMarks: 3 });
    await configured.validate();
    assert.equal(configured.passingMarks, 3);
    await assert.rejects(new Model({ ...fields, totalMarks: 5, passingMarks: 50 }).validate(), /Passing marks cannot exceed total marks/);
  }
  console.log('Pass mark tests passed: 2.5/5 default, valid custom threshold preserved, impossible threshold rejected.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
