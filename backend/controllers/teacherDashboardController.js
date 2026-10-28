const Teacher = require('../models/Teacher');
const CourseTeacher = require('../models/CourseTeacher');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/Student');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Quiz = require('../models/Quiz');
const ExamResult = require('../models/ExamResult');
const QuizResult = require('../models/QuizResult');
const mongoose = require('mongoose');

const getTeacherAssignment = async (userId) => {
  const teacher = await Teacher.findOne({ user: userId }).lean();
  if (!teacher) return { teacher: null, assignment: null, assignments: [] };

  const assignments = await CourseTeacher.find({ teacher: teacher._id, status: 'active' })
    .populate('course')
    .lean();

  return { teacher, assignment: assignments[0] || null, assignments };
};

const formatCourse = (course) => {
  if (!course) return null;
  return {
    _id: course._id,
    name: course.title || course.name || 'Course',
    title: course.title || course.name || 'Course',
    courseCode: course.courseCode || course.code || '—',
    description: course.description || '',
    credits: course.credits || 0,
    department: course.department || '',
    semester: course.semester || '',
    academicYear: course.academicYear || '',
  };
};

const getTeacherDashboard = async (req, res, next) => {
  try {
    const { teacher, assignment } = await getTeacherAssignment(req.user._id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    if (!assignment || !assignment.course) {
      return res.status(200).json({
        success: true,
        summary: {
          myCourse: null,
          totalStudents: 0,
          totalExams: 0,
          upcomingExams: 0,
          totalQuizzes: 0,
        },
        upcomingExams: [],
        course: null,
      });
    }

    const courseId = assignment.course._id;

    const [studentCount, totalExams, nativeQuizzes, examQuizzes, scheduledExams, scheduledQuizzes] = await Promise.all([
      Enrollment.countDocuments({ course: courseId, status: 'enrolled' }),
      Exam.countDocuments({ course: courseId, type: { $ne: 'quiz' } }),
      Quiz.countDocuments({ course: courseId }),
      Exam.countDocuments({ course: courseId, type: 'quiz' }),
      Exam.find({
        course: courseId,
        status: { $in: ['upcoming', 'scheduled', 'ongoing'] },
        examDate: { $gte: new Date() },
      }).sort({ examDate: 1 }).lean(),
      Quiz.find({ course: courseId, status: { $in: ['published', 'draft', 'upcoming', 'scheduled', 'ongoing'] }, quizDate: { $gte: new Date() } }).sort({ quizDate: 1 }).lean(),
    ]);

    const totalQuizzes = nativeQuizzes + examQuizzes;
    const upcomingExams = [...scheduledExams, ...scheduledQuizzes.map(quiz => ({ ...quiz, type: 'quiz', examDate: quiz.quizDate }))].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

    return res.status(200).json({
      success: true,
      summary: {
        myCourse: assignment.course.title || assignment.course.name || 'Assigned course',
        totalStudents: studentCount,
        totalExams,
        upcomingExams: upcomingExams.length,
        totalQuizzes,
      },
      upcomingExams: upcomingExams.map((exam) => ({
        _id: exam._id,
        title: exam.title,
        type: exam.type || 'exam',
        examDate: exam.examDate,
        date: exam.examDate,
        courseName: assignment.course.title || assignment.course.name || 'Course',
        courseCode: assignment.course.courseCode || assignment.course.code || '—',
      })),
      course: formatCourse(assignment.course),
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherMyCourse = async (req, res, next) => {
  try {
    const { teacher, assignment, assignments } = await getTeacherAssignment(req.user._id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const assignedCourses = (assignments && assignments.length > 0)
      ? assignments.map((a) => a.course).filter(Boolean).map(formatCourse)
      : [];

    if (!assignment || !assignment.course) {
      return res.status(200).json({
        success: true,
        course: assignedCourses[0] || null,
        courses: assignedCourses,
        students: [],
        upcomingExams: [],
        notes: [],
      });
    }

    const courseId = assignment.course._id;

    const [students, upcomingExams, quizzes] = await Promise.all([
      Enrollment.find({ course: courseId, status: 'enrolled' })
        .populate({
          path: 'student',
          populate: { path: 'user', select: 'name email' },
        })
        .lean(),
      Exam.find({
        course: courseId,
        status: { $in: ['scheduled', 'ongoing'] },
        examDate: { $gte: new Date() },
      }).sort({ examDate: 1 }).lean(),
      Quiz.find({ course: courseId, status: { $in: ['published', 'draft'] } }).sort({ quizDate: 1 }).lean(),
    ]);

    const formattedStudents = students.map((item) => {
      const studentData = item.student || {};
      const userData = studentData.user || {};
      return {
        _id: studentData._id,
        name: userData.name || 'Student',
        email: userData.email || '',
        studentId: studentData.studentId || '—',
        status: studentData.status || 'active',
      };
    });

    return res.status(200).json({
      success: true,
      course: formatCourse(assignment.course),
      courses: assignedCourses,
      students: formattedStudents,
      upcomingExams: upcomingExams.map((exam) => ({
        _id: exam._id,
        title: exam.title,
        type: exam.type || 'exam',
        examDate: exam.examDate,
        date: exam.examDate,
        durationMinutes: exam.durationMinutes || null,
        totalMarks: exam.totalMarks || null,
        status: exam.status,
      })),
      quizzes: quizzes.map((quiz) => ({
        _id: quiz._id,
        title: quiz.title,
        type: 'quiz',
        quizDate: quiz.quizDate,
        durationMinutes: quiz.durationMinutes || null,
        totalMarks: quiz.totalMarks || null,
        status: quiz.status,
      })),
      notes: [],
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherStudents = async (req, res, next) => {
  try {
    const { assignments } = await getTeacherAssignment(req.user._id);
    const assignedCourseIds = (assignments || []).map((a) => a.course?._id || a.course).filter(Boolean);
    if (assignedCourseIds.length === 0) {
      return res.status(200).json({ success: true, students: [] });
    }

    const courseFilter = req.query.courseId && assignedCourseIds.some(id => String(id) === String(req.query.courseId))
      ? req.query.courseId
      : { $in: assignedCourseIds };

    const enrollments = await Enrollment.find({ course: courseFilter, status: 'enrolled' })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('course', 'courseCode title name')
      .lean();

    const uniqueStudents = [];
    const seen = new Set();
    for (const item of enrollments) {
      const student = item.student;
      if (!student || !student._id) continue;
      const key = String(student._id);
      if (!seen.has(key)) {
        seen.add(key);
        const user = student.user || {};
        const course = item.course || {};
        uniqueStudents.push({
          _id: student._id,
          name: user.name || 'Student',
          email: user.email || '',
          studentId: student.studentId || '—',
          courseCode: course.courseCode || course.code || '',
          courseName: course.title || course.name || '',
          academicYear: item.academicYear || student.academicYear || '',
          semester: item.semester || '',
          status: student.status || 'active',
        });
      }
    }

    return res.status(200).json({
      success: true,
      students: uniqueStudents,
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherExams = async (req, res, next) => {
  try {
    const { assignments } = await getTeacherAssignment(req.user._id);
    const assignedCourseIds = (assignments || []).map((a) => a.course?._id || a.course).filter(Boolean);

    const query = {
      $or: [
        { createdBy: req.user._id },
        ...(assignedCourseIds.length > 0 ? [{ course: { $in: assignedCourseIds } }] : []),
      ],
    };

    const exams = await Exam.find(query)
      .populate('course', 'courseCode title name')
      .populate('createdBy', 'name email role')
      .sort({ examDate: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: exams,
      exams,
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherPerformance = async (req, res, next) => {
  try { res.json(await require('../services/teacherPerformanceService').getPerformance(req)); }
  catch (error) { if (error.statusCode) res.status(error.statusCode); next(error); }
};

const getTeacherProfile = async (req, res, next) => {
  try {
    const { teacher, assignment } = await getTeacherAssignment(req.user._id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const user = await User.findById(req.user._id).select('-password').lean();
    return res.status(200).json({
      success: true,
      teacher: {
        _id: teacher._id,
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'teacher',
        department: teacher.department || '',
        specialization: teacher.specialization || '',
        qualification: teacher.qualification || '',
        phone: teacher.phone || '',
        assignedCourse: assignment?.course ? formatCourse(assignment.course) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateTeacherProfile = async (req, res, next) => {
  try {
    const { teacher } = await getTeacherAssignment(req.user._id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    const { name, email, phone, department, specialization, qualification } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required.' });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && String(existingUser._id) !== String(req.user._id)) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const [user, teacherProfile] = await Promise.all([
      User.findById(req.user._id),
      Teacher.findById(teacher._id),
    ]);
    if (!user || !teacherProfile) {
      return res.status(404).json({ success: false, message: 'Teacher account not found.' });
    }

    user.name = normalizedName;
    user.email = normalizedEmail;
    teacherProfile.phone = String(phone || '').trim();
    teacherProfile.department = String(department || '').trim();
    teacherProfile.specialization = String(specialization || '').trim();
    teacherProfile.qualification = String(qualification || '').trim();
    await Promise.all([user.save(), teacherProfile.save()]);

    const { assignment } = await getTeacherAssignment(req.user._id);
    return res.status(200).json({
      success: true,
      teacher: {
        _id: teacherProfile._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: teacherProfile.department,
        specialization: teacherProfile.specialization,
        qualification: teacherProfile.qualification,
        phone: teacherProfile.phone,
        assignedCourse: assignment?.course ? formatCourse(assignment.course) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherAssessments = async (req, res, next) => {
  try {
    const { assignments } = await getTeacherAssignment(req.user._id);
    const courseIds = assignments.map(a => a.course?._id).filter(Boolean);
    const assignment = assignments.find(a => a.course);
    if (!assignment?.course) {
      return res.status(200).json({ success: true, assessments: [] });
    }

    const [exams, quizzes] = await Promise.all([
      Exam.find({ course: { $in: courseIds } }).sort({ examDate: -1 }).lean(),
      Quiz.find({ course: assignment.course._id }).sort({ quizDate: -1 }).lean(),
    ]);

    const assessments = [
      ...exams.map((exam) => ({
        _id: exam._id,
        title: exam.title,
        type: 'exam',
        date: exam.examDate,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        status: exam.status,
      })),
      ...quizzes.map((quiz) => ({
        _id: quiz._id,
        title: quiz.title,
        type: 'quiz',
        date: quiz.quizDate,
        totalMarks: quiz.totalMarks,
        passingMarks: quiz.passingMarks,
        status: quiz.status,
      })),
    ].sort((left, right) => new Date(right.date) - new Date(left.date));

    return res.status(200).json({ success: true, assessments });
  } catch (error) {
    next(error);
  }
};

const assignmentForAssessment = async (req, assignments) => {
  const { assessmentType, assessmentId } = req.params;
  if (!['exam', 'quiz'].includes(assessmentType) || !mongoose.isValidObjectId(assessmentId)) throw Object.assign(new Error('Invalid assessment.'), { statusCode: 400 });
  const Model = assessmentType === 'exam' ? Exam : Quiz;
  const assessment = await Model.findById(assessmentId).select('course').lean();
  return assessment ? assignments.find(a => String(a.course?._id) === String(assessment.course)) : null;
};

const getTeacherAssessmentResults = async (req, res, next) => {
  try {
    const { assignments } = await getTeacherAssignment(req.user._id);
    const assignment = await assignmentForAssessment(req, assignments);
    const { assessmentType, assessmentId } = req.params;
    if (!assignment?.course) {
      return res.status(404).json({ success: false, message: 'No course is assigned to this teacher.' });
    }
    if (!['exam', 'quiz'].includes(assessmentType) || !mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment.' });
    }

    const Assessment = assessmentType === 'exam' ? Exam : Quiz;
    const Result = assessmentType === 'exam' ? ExamResult : QuizResult;
    const assessment = await Assessment.findOne({ _id: assessmentId, course: assignment.course._id }).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found for your assigned course.' });
    }

    const [enrollments, results] = await Promise.all([
      Enrollment.find({ course: assignment.course._id, status: 'enrolled' })
        .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
        .lean(),
      Result.find({ [assessmentType]: assessmentId }).lean(),
    ]);
    const resultByStudent = new Map(results.map((result) => [String(result.student), result]));
    const seenStudents = new Set();
    const students = enrollments
      .filter(({ student }) => { if (!student || seenStudents.has(String(student._id))) return false; seenStudents.add(String(student._id)); return true; })
      .map(({ student }) => {
        const result = resultByStudent.get(String(student._id));
        return {
          _id: student._id,
          studentId: student.studentId,
          name: student.user?.name || 'Student',
          email: student.user?.email || '',
          marksObtained: result?.marksObtained ?? null,
          percentage: result?.percentage ?? null,
          isPassed: result?.isPassed ?? null,
          remarks: result?.remarks || '',
        };
      });

    return res.status(200).json({
      success: true,
      assessment: {
        _id: assessment._id,
        title: assessment.title,
        type: assessmentType,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
      },
      students,
    });
  } catch (error) {
    next(error);
  }
};

const saveTeacherAssessmentResults = async (req, res, next) => {
  try {
    const { assignments, teacher } = await getTeacherAssignment(req.user._id);
    const assignment = await assignmentForAssessment(req, assignments);
    const { assessmentType, assessmentId } = req.params;
    const { results } = req.body;
    if (!teacher || !assignment?.course) {
      return res.status(404).json({ success: false, message: 'No course is assigned to this teacher.' });
    }
    if (!['exam', 'quiz'].includes(assessmentType) || !mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment.' });
    }
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ success: false, message: 'Submit marks for at least one student.' });
    }

    const Assessment = assessmentType === 'exam' ? Exam : Quiz;
    const Result = assessmentType === 'exam' ? ExamResult : QuizResult;
    const assessment = await Assessment.findOne({ _id: assessmentId, course: assignment.course._id }).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found for your assigned course.' });
    }

    const enrollments = await Enrollment.find({ course: assignment.course._id, status: 'enrolled' })
      .select('student')
      .lean();
    const enrolledStudentIds = new Set(enrollments.map(({ student }) => String(student)));
    const submittedIds = new Set();
    for (const result of results) {
      const studentId = String(result?.studentId || '');
      const marks = result?.marksObtained == null || typeof result.marksObtained === 'boolean' || String(result.marksObtained).trim() === '' ? NaN : Number(result.marksObtained);
      if (!mongoose.isValidObjectId(studentId) || !enrolledStudentIds.has(studentId)) {
        return res.status(403).json({ success: false, message: 'A submitted student is not enrolled in your course.' });
      }
      if (submittedIds.has(studentId)) {
        return res.status(400).json({ success: false, message: 'Each student can only appear once.' });
      }
      if (result.marksObtained === '' || !Number.isFinite(marks) || marks < 0 || marks > assessment.totalMarks) {
        return res.status(400).json({
          success: false,
          message: `Marks must be between 0 and ${assessment.totalMarks}.`,
        });
      }
      submittedIds.add(studentId);
    }

    const operations = results.map((result) => {
      const marksObtained = Number(result.marksObtained);
      const percentage = assessment.totalMarks ? (marksObtained / assessment.totalMarks) * 100 : 0;
      const values = {
        marksObtained,
        percentage: Number(percentage.toFixed(2)),
        isPassed: marksObtained >= assessment.passingMarks,
        remarks: String(result.remarks || '').trim(),
        gradedBy: req.user._id,
      };
      if (assessmentType === 'exam') {
        values.grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';
      }
      return {
        updateOne: {
          filter: { [assessmentType]: assessmentId, student: result.studentId },
          update: { $set: values, $setOnInsert: { [assessmentType]: assessmentId, student: result.studentId } },
          upsert: true,
        },
      };
    });

    if (operations.length) await Result.bulkWrite(operations, { ordered: true });
    return res.status(200).json({ success: true, savedCount: operations.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeacherDashboard,
  getTeacherMyCourse,
  getTeacherStudents,
  getTeacherExams,
  getTeacherPerformance,
  getTeacherProfile,
  updateTeacherProfile,
  getTeacherAssessments,
  getTeacherAssessmentResults,
  saveTeacherAssessmentResults: require('../services/gradebookIntegrityService').bulkResultWrite(saveTeacherAssessmentResults),
};
