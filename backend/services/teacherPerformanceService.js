const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');
const { gradeFor, round } = require('./gradebookIntegrityService');

const enrollmentBatch = enrollment => String(enrollment.batch || enrollment.student?.batch || enrollment.student?.academicYear || '').trim() || String(enrollment.academicYear || '').trim();

const primaryEnrollment=(enrollments,student,course)=>{const rows=enrollments.filter(e=>String(e.student?._id)===String(student));return rows.find(e=>course.academicYear&&e.academicYear===course.academicYear)||[...rows].sort((a,b)=>String(b.academicYear||'').localeCompare(String(a.academicYear||''),undefined,{numeric:true}))[0];};

// Course totals always use earned marks / 100; assessment percentages are separate.
const calculatePerformance = ({ course, assessments, enrollments, results, attendance }) => {
  const valid = assessments.filter(a => a.status !== 'cancelled' && Number.isFinite(a.totalMarks) && a.totalMarks > 0 && a.totalMarks <= 100);
  const invalidAssessmentCount = assessments.filter(a => a.status !== 'cancelled').length - valid.length;
  const allocatedMarks = round(valid.reduce((sum, a) => sum + a.totalMarks, 0));
  const ownThreshold = typeof course.passingMarks === 'number' && course.passingMarks >= 0 && course.passingMarks <= 100 ? course.passingMarks : null;
  const configured = valid.length > 0 && valid.every(a => typeof a.passingMarks === 'number' && a.passingMarks >= 0 && a.passingMarks <= a.totalMarks);
  const passingThreshold = ownThreshold ?? (configured && allocatedMarks === 100 && invalidAssessmentCount === 0 ? round(valid.reduce((sum, a) => sum + a.passingMarks, 0)) : null);
  const assessmentMap = new Map(valid.map(a => [`${a.storageType}:${a._id}`, a]));
  const students = new Map();
  for (const enrollment of enrollments) {
    const student = enrollment.student;
    if (!student?._id) continue;
    const batch = enrollmentBatch(enrollment);
    const previous = students.get(String(student._id));
    if (previous) { if (batch && !previous.batches.includes(batch)) previous.batches.push(batch); continue; }
    students.set(String(student._id), { _id: student._id, student: student.user?.name || 'Student record unavailable', studentId: student.studentId || '—', courseId: course._id, course: course.courseCode || course.title || course.name, courseName: course.title || course.name || course.courseCode, batches: batch ? [batch] : [], totalMarks: 0, gradedAssessments: 0, expectedAssessments: valid.length, gradedMaximum: 0, invalidScores: 0 });
  }
  const rows = [], seen = new Set();
  for (const result of [...results].sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))) {
    const assessment = assessmentMap.get(`${result.storageType}:${result.assessmentId}`);
    const student = students.get(String(result.student));
    const key = `${result.storageType}:${result.assessmentId}:${result.student}`;
    if (!assessment || !student || seen.has(key)) continue;
    if(attendance!==undefined){const enrollment=primaryEnrollment(enrollments,student._id,course);if(enrollment&&!require('./academicProgressService').assessmentApplies(assessment,enrollment))continue;}
    seen.add(key);
    if (typeof result.marksObtained !== 'number' || !Number.isFinite(result.marksObtained) || result.marksObtained < 0 || result.marksObtained > assessment.totalMarks) { student.invalidScores++; continue; }
    const percentage = round(result.marksObtained / assessment.totalMarks * 100);
    student.totalMarks += result.marksObtained; student.gradedAssessments++; student.gradedMaximum += assessment.totalMarks;
    rows.push({ _id: `${result.storageType}:${result._id}`, student: student.student, studentId: student.studentId, studentRecordId: student._id, course: student.course, courseId: course._id, assessmentId: `${assessment.storageType}:${assessment._id}`, exam: assessment.title, assessmentName: assessment.title, assessmentType: assessment.assessmentType, resultType: assessment.type || assessment.assessmentType, marks: result.marksObtained, totalMarks: assessment.totalMarks, percentage, marksLost: round(assessment.totalMarks - result.marksObtained), grade: result.grade || gradeFor(percentage) });
  }
  const allocationComplete = allocatedMarks === 100 && invalidAssessmentCount === 0;
  const totals = [...students.values()].map(student => {
    if (attendance !== undefined) {
      const {calculateCourseMarks,day,assessmentApplies}=require('./academicProgressService');
      const enrollment=primaryEnrollment(enrollments,student._id,course);
      const relevant=attendance.filter(r=>String(r.student)===String(student._id)&&String(r.course)===String(course._id)&&(!enrollment?.enrollmentDate||day(r.date)>=day(enrollment.enrollmentDate)));
      const marks=calculateCourseMarks(valid.filter(a=>!enrollment||assessmentApplies(a,enrollment)).map(a=>({...a,kind:a.storageType})),results.filter(r=>String(r.student)===String(student._id)).map(r=>({...r,kind:r.storageType,assessment:r.assessmentId})),relevant);
      const cohort=valid.filter(a=>!enrollment||assessmentApplies(a,enrollment));
      const maximum=cohort.reduce((sum,a)=>sum+a.totalMarks,0);
      const threshold=ownThreshold??(maximum>=90&&cohort.every(a=>Number.isFinite(a.passingMarks)&&a.passingMarks>=0&&a.passingMarks<=a.totalMarks)?round(cohort.reduce((sum,a)=>sum+a.passingMarks,0)/maximum*100):null);
      const finalized=marks.complete&&threshold!==null;
      return {...student,...marks,totalMarks:marks.finalMarks,courseMaximum:100,coursePercentage:marks.finalMarks,hasMarks:student.gradedAssessments>0||marks.eligibleSessions>0,gradedAssessments:marks.completedAssessments,expectedAssessments:marks.totalAssessments,finalized,isPassed:finalized?marks.finalMarks>=threshold:null,marksLost:marks.complete?round(100-marks.finalMarks):null,progress:marks.totalAssessments?round(marks.completedAssessments/marks.totalAssessments*100):0,status:finalized?(marks.finalMarks>=threshold?'Passed':'Failed'):marks.complete?'Pass threshold unavailable':'In progress'};
    }
    const complete = allocationComplete && student.gradedAssessments === valid.length && student.invalidScores === 0;
    const finalized = complete && passingThreshold !== null;
    return { ...student, totalMarks: round(student.totalMarks), courseMaximum: 100, coursePercentage: round(student.totalMarks), hasMarks: student.gradedAssessments > 0, complete, finalized, isPassed: finalized ? student.totalMarks >= passingThreshold : null, marksLost: complete ? round(100 - student.totalMarks) : null, gradedMarksLost: round(student.gradedMaximum - student.totalMarks), progress: valid.length ? round(student.gradedAssessments / valid.length * 100) : 0, status: finalized ? (student.totalMarks >= passingThreshold ? 'Passed' : 'Failed') : !student.gradedAssessments ? 'No marks' : !allocationComplete ? 'Allocation incomplete' : !complete ? 'Awaiting marks' : 'Pass threshold unavailable' };
  });
  const recorded = totals.filter(student => student.hasMarks);
  const summary = { classAverage: recorded.length ? round(recorded.reduce((sum, student) => sum + student.totalMarks, 0) / recorded.length) : null, highestScore: recorded.length ? Math.max(...recorded.map(student => student.totalMarks)) : null, passingStudents: totals.filter(student => student.isPassed === true).length, failingStudents: totals.filter(student => student.isPassed === false).length, enrolledStudents: totals.length, recordedStudents: recorded.length, incompleteStudents: totals.filter(student => !student.finalized).length, provisional: recorded.some(student => !student.finalized) };
  return { results: rows, students: totals, summary, allocation: { courseMaximum: 100, allocatedMarks, remainingMarks: round((attendance===undefined?100:90) - allocatedMarks), teacherMaximum:90, attendanceMaximum:10, allocationComplete:attendance===undefined?allocationComplete:allocatedMarks>=90, legacyNormalization:allocatedMarks>90, passingThreshold, passingThresholdSource: ownThreshold !== null ? 'Course passing marks' : 'Sum of configured assessment passing marks', invalidAssessmentCount }, assessments: valid.map(a => ({ _id: `${a.storageType}:${a._id}`, title: a.title, type: a.assessmentType, totalMarks: a.totalMarks })) };
};
// Assessment filters select participants without replacing their full course total.
const filterPerformanceReport = (report, { type = 'all', assessmentId = '', search = '' } = {}) => {
  const assessmentOptions = report.assessments.filter(a => type === 'all' || a.type === type);
  const selectedAssessmentId = assessmentOptions.some(a => a._id === assessmentId) ? assessmentId : '';
  const filteredAssessments = assessmentOptions.filter(a => !selectedAssessmentId || a._id === selectedAssessmentId);
  const filteredMaximum = round(filteredAssessments.reduce((sum, a) => sum + a.totalMarks, 0));
  const query = String(search).trim().toLowerCase();
  const matchesStudent = row => [row.student, row.studentId].some(value => String(value || '').toLowerCase().includes(query));
  const results = report.results.filter(row => (type === 'all' || row.assessmentType === type) && (!selectedAssessmentId || row.assessmentId === selectedAssessmentId) && matchesStudent(row));
  const participants = new Set(results.map(row => String(row.studentRecordId)));
  const hasAssessmentFilter = type !== 'all' || !!selectedAssessmentId;
  const students = report.students.filter(student => matchesStudent(student) && (!hasAssessmentFilter || participants.has(String(student._id)))).map(student => {
    const matching = results.filter(row => String(row.studentRecordId) === String(student._id));
    return { ...student, filteredMarks: round(matching.reduce((sum, row) => sum + row.marks, 0)), filteredMaximum, filteredAssessmentsRecorded: matching.length, assessmentResults: report.results.filter(row => String(row.studentRecordId) === String(student._id)) };
  });
  return { results, students, assessments: assessmentOptions, selectedAssessmentId, hasAssessmentFilter, filteredMaximum };
};

const getPerformance = async (req) => {
  const teacher = await Teacher.findOne({ user: req.user._id }).lean();
  const assignments = teacher ? await CourseTeacher.find({ teacher: teacher._id, status: 'active' }).populate('course').lean() : [];
  const courses = [...new Map(assignments.filter(a => a.course).map(a => [String(a.course._id), a.course])).values()];
  const course = req.query.courseId ? courses.find(c => String(c._id) === String(req.query.courseId)) : courses[0];
  if (req.query.courseId && !course) throw Object.assign(new Error('You can only view performance for your assigned courses.'), { statusCode: 403 });
  if (!['all','exam','quiz'].includes(req.query.assessmentType || 'all')) throw Object.assign(new Error('Invalid assessment type.'), { statusCode: 400 });
  if (req.query.batch !== undefined && typeof req.query.batch !== 'string') throw Object.assign(new Error('Invalid year/batch filter.'), { statusCode: 400 });
  if (!course) return { success: true, courses: [], batches: [], results: [], students: [], assessments: [], summary: { classAverage: null, highestScore: null, passingStudents: 0, failingStudents: 0, enrolledStudents: 0, recordedStudents: 0, incompleteStudents: 0 } };
  const [exams, quizzes, enrollments] = await Promise.all([
    Exam.find({ course: course._id }).lean(), Quiz.find({ course: course._id }).lean(),
    Enrollment.find({ course: course._id, status: 'enrolled' }).populate({ path: 'student', populate: { path: 'user', select: 'name email' } }).lean(),
  ]);
  const batches = [...new Set(enrollments.map(enrollmentBatch).filter(Boolean))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const selectedBatch = String(req.query.batch || '').trim();
  const cohortEnrollments = selectedBatch ? enrollments.filter(e => enrollmentBatch(e) === selectedBatch) : enrollments;
  const studentIds = cohortEnrollments.map(e => e.student?._id).filter(Boolean);
  const [examResults, quizResults] = await Promise.all([
    ExamResult.find({ exam: { $in: exams.map(e => e._id) }, student: { $in: studentIds } }).lean(),
    QuizResult.find({ quiz: { $in: quizzes.map(q => q._id) }, student: { $in: studentIds } }).lean(),
  ]);
  const report = calculatePerformance({ course, enrollments: cohortEnrollments,
    assessments: [...exams.map(a => ({ ...a, storageType: 'exam', assessmentType: a.type === 'quiz' ? 'quiz' : 'exam' })), ...quizzes.map(a => ({ ...a, storageType: 'quiz', assessmentType: 'quiz' }))],
    attendance:await require('../models/Attendance').find({course:course._id,student:{$in:studentIds}}).lean(),
    results: [...examResults.map(r => ({ ...r, storageType: 'exam', assessmentId: r.exam })), ...quizResults.map(r => ({ ...r, storageType: 'quiz', assessmentId: r.quiz }))],
  });
  const filtered = filterPerformanceReport(report, { type: req.query.assessmentType || 'all', assessmentId: req.query.assessmentId || '', search: req.query.search || '' });
  return { success: true, ...report, ...filtered, batches, selectedBatch,
    courses: courses.map(c => ({ _id: c._id, courseCode: c.courseCode, title: c.title || c.name })),
    course: { _id: course._id, courseCode: course.courseCode, title: course.title || course.name },
  };
};
module.exports = { calculatePerformance, filterPerformanceReport, enrollmentBatch, getPerformance };
