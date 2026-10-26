const assert = require('assert');
const { getNotifications } = require('../services/notificationService');
const models = Object.fromEntries(['Student','Teacher','CourseTeacher','Enrollment','Course','Exam','Quiz','ExamResult','QuizResult','Attendance','Note'].map(name=>[name,require(`../models/${name}`)]));
const now = new Date('2026-10-26T12:00:00Z');
const recent = new Date('2026-10-25T12:00:00Z');
const old = new Date('2026-08-01T12:00:00Z');
const base = (id, values) => ({_id:id,updatedAt:recent,...values});
const exam = base('exam-a',{title:'Assigned exam',course:'course-a',academicYear:'2026',semester:'S1',status:'completed'});
const other = base('exam-b',{title:'Private other course',course:'course-b',academicYear:'2026',status:'completed'});
const upcoming = base('upcoming',{title:'This week',course:'course-a',academicYear:'2026',semester:'S1',status:'scheduled',examDate:new Date('2026-10-28'),updatedAt:old});
const fixtures = {
 Student:[base('student-a',{studentId:'TL-2026-01',user:{name:'Amina'}})], Teacher:[],
 CourseTeacher:[base('assignment-a',{teacher:'teacher-a',course:'course-a',academicYear:'2026',semester:'S1',status:'active'})],
 Enrollment:[base('enrollment-a',{student:'student-a',course:'course-a',academicYear:'2026',semester:'S1',status:'enrolled'})],
 Course:[], Exam:[upcoming,base('future',{...upcoming,title:'Far future',examDate:new Date('2026-11-20')}),base('past',{...upcoming,title:'Past exam',examDate:new Date('2026-10-24')}),exam,other,base('old',{title:'Old update',status:'completed',course:'course-a',academicYear:'2026',semester:'S1',updatedAt:old}),base('cancelled',{title:'Cancelled exam',status:'cancelled',course:'course-a',academicYear:'2026',semester:'S1'})], Quiz:[],
 ExamResult:[base('result-a',{student:'student-a',exam}),base('result-b',{student:'student-b',exam:other}),base('deleted-exam',{student:'student-a',exam:null})],
 QuizResult:[], Attendance:[], Note:[base('note-a',{student:'student-a',title:'Personal study note'}),base('note-b',{student:'student-b',title:'Other student note'})],
};
const id = value => value?._id || value;
const matches = (row, filter) => Object.entries(filter).every(([key,value]) => {
 if(key==='$or') return value.some(part=>matches(row,part));
 const actual=id(row[key]);
 if(value && typeof value==='object' && !(value instanceof Date)) {
  if('$in' in value) return value.$in.includes(actual);
  if('$ne' in value) return actual!==value.$ne;
  if('$gte' in value || '$lt' in value) return (!('$gte' in value) || new Date(actual)>=value.$gte) && (!('$lt' in value) || new Date(actual)<value.$lt);
 }
 return actual===value;
});
for(const [name,Model] of Object.entries(models)) Model.find = filter => {
 let rows=fixtures[name].filter(row=>matches(row,filter));
 return {populate(){return this;},select(){return this;},sort(){rows.sort((a,b)=>b.updatedAt-a.updatedAt);return this;},limit(n){rows=rows.slice(0,n);return this;},lean:async()=>rows};
};
models.Student.findOne = filter => {assert.deepStrictEqual(filter,{user:'user-a'});return {lean:async()=>({_id:'student-a'})};};
models.Teacher.findOne = filter => {assert.deepStrictEqual(filter,{user:'teacher-user'});return {lean:async()=>({_id:'teacher-a'})};};
fixtures.Exam.push(base('assessment',{...upcoming,_id:'assessment',type:'assessment',title:'Practical assessment'}));
fixtures.Exam.push(base('exam-quiz',{...upcoming,_id:'exam-quiz',type:'quiz',title:'Exam-backed quiz'}));
fixtures.Exam.push(base('other-upcoming',{...upcoming,_id:'other-upcoming',course:'course-b',title:'Private other upcoming'}));
fixtures.Quiz.push(base('quiz',{course:'course-a',academicYear:'2026',semester:'S1',title:'Native quiz',status:'published',quizDate:new Date('2026-10-29')}));
fixtures.Quiz.push(base('draft',{course:'course-a',academicYear:'2026',semester:'S1',title:'Draft quiz',status:'draft',quizDate:new Date('2026-10-29')}));
(async()=>{
 const student = await getNotifications({_id:'user-a',role:'student'},now);
 assert(student.every(n=>['exam','quiz','assessment'].includes(n.type)));
 assert(student.some(n=>n.title==='This week: upcoming exam'));
 assert(student.some(n=>n.type==='assessment'));
 assert.strictEqual(student.filter(n=>n.type==='quiz').length,2);
 assert(student.every(n=>n.scheduledAt));
 assert(!student.some(n=>/Far future|Past exam|Assigned exam|Draft quiz|Private other|marks|note/.test(n.title)));
 assert(student.every(n=>n.href.startsWith('/student')));
 const before=student.find(n=>n.title==='This week: upcoming exam').id;
 upcoming.updatedAt=now;
 const after=await getNotifications({_id:'user-a',role:'student'},now);
 assert.notStrictEqual(after.find(n=>n.title==='This week: upcoming exam').id,before);
 const teacher=await getNotifications({_id:'teacher-user',role:'teacher'},now);
 assert(teacher.some(n=>n.type==='assessment'));
 assert(!teacher.some(n=>n.title.includes('Private other')));
 assert(teacher.every(n=>n.href==='/teacher/exams'));
 const admin=await getNotifications({_id:'admin-user',role:'admin'},now);
 assert(admin.some(n=>n.title.includes('Private other upcoming')));
 assert(admin.every(n=>['exam','quiz','assessment'].includes(n.type)));
 models.Teacher.findOne=()=>({lean:async()=>null});
 await assert.rejects(getNotifications({_id:'teacher-user',role:'teacher'},now),error=>error.statusCode===404);
 console.log('Notifications tests passed: upcoming exams, both quiz stores, assessments, no results or routine updates, seven-day window and role privacy.');
})().catch(error=>{console.error(error);process.exitCode=1;});
