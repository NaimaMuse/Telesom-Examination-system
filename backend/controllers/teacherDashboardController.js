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
  if (!teacher) return { teacher: null, assignment: null };

  const assignment = await CourseTeacher.findOne({ teacher: teacher._id, status: 'active' })
    .populate('course')
    .lean();

  return { teacher, assignment };
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

    const [studentCount, totalExams, totalQuizzes, upcomingExams] = await Promise.all([
      Enrollment.countDocuments({ course: courseId, status: 'enrolled' }),
      Exam.countDocuments({ course: courseId }),
      Quiz.countDocuments({ course: courseId }),
      Exam.find({
        course: courseId,
        status: { $in: ['scheduled', 'ongoing'] },
        examDate: { $gte: new Date() },
      }).sort({ examDate: 1 }).lean(),
      Quiz.find({ course: courseId, status: { $in: ['published', 'draft'] } }).sort({ quizDate: 1 }).lean(),
    ]);

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
    const { teacher, assignment } = await getTeacherAssignment(req.user._id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
    }

    if (!assignment || !assignment.course) {
      return res.status(200).json({
        success: true,
        course: null,
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
    const { assignment } = await getTeacherAssignment(req.user._id);
    if (!assignment || !assignment.course) {
      return res.status(200).json({ success: true, students: [] });
    }

    const enrollments = await Enrollment.find({ course: assignment.course._id, status: 'enrolled' })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .lean();

    return res.status(200).json({
      success: true,
      students: enrollments.map((item) => {
        const student = item.student || {};
        const user = student.user || {};
        return {
          _id: student._id,
          name: user.name || 'Student',
          email: user.email || '',
          studentId: student.studentId || '—',
          status: student.status || 'active',
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherExams = async (req, res, next) => {
  try {
    const { assignment } = await getTeacherAssignment(req.user._id);
    if (!assignment || !assignment.course) {
      return res.status(200).json({ success: true, exams: [], quizzes: [] });
    }

    const [exams, quizzes] = await Promise.all([
      Exam.find({ course: assignment.course._id }).sort({ examDate: 1 }).lean(),
      Quiz.find({ course: assignment.course._id }).sort({ quizDate: 1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      exams,
      quizzes,
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherPerformance = async (req, res, next) => {
  try {
    const { assignment } = await getTeacherAssignment(req.user._id);
    if (!assignment || !assignment.course) {
      return res.status(200).json({ success: true, results: [] });
    }

    const [examResults, quizResults] = await Promise.all([
      ExamResult.find().populate('exam').populate('student').lean(),
      QuizResult.find().populate('quiz').populate('student').lean(),
    ]);

    const combined = [...examResults, ...quizResults].filter((result) => {
      const targetExam = result.exam && result.exam.course ? String(result.exam.course) : null;
      const targetQuiz = result.quiz && result.quiz.course ? String(result.quiz.course) : null;
      return targetExam === String(assignment.course._id) || targetQuiz === String(assignment.course._id);
    });

    return res.status(200).json({
      success: true,
      results: combined.map((result) => ({
        _id: result._id,
        student: result.student ? (result.student.user ? result.student.user.name : 'Student') : 'Student',
        studentId: result.student ? result.student.studentId || '—' : '—',
        course: assignment.course.title || assignment.course.name || 'Course',
        examTitle: result.exam?.title || result.quiz?.title || 'Assessment',
        marks: result.marksObtained ?? 0,
        totalMarks: result.exam?.totalMarks || result.quiz?.totalMarks || 0,
        grade: result.grade || '—',
      })),
    });
  } catch (error) {
    next(error);
  }
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
    const { assignment } = await getTeacherAssignment(req.user._id);
    if (!assignment?.course) {
      return res.status(200).json({ success: true, assessments: [] });
    }

    const [exams, quizzes] = await Promise.all([
      Exam.find({ course: assignment.course._id }).sort({ examDate: -1 }).lean(),
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

const getTeacherAssessmentResults = async (req, res, next) => {
  try {
    const { assignment } = await getTeacherAssignment(req.user._id);
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
    const students = enrollments
      .filter((enrollment) => enrollment.student)
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
    const { assignment, teacher } = await getTeacherAssignment(req.user._id);
    const { assessmentType, assessmentId } = req.params;
    const { results } = req.body;
    if (!teacher || !assignment?.course) {
      return res.status(404).json({ success: false, message: 'No course is assigned to this teacher.' });
    }
    if (!['exam', 'quiz'].includes(assessmentType) || !mongoose.isValidObjectId(assessmentId)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment.' });
    }
    if (!Array.isArray(results)) {
      return res.status(400).json({ success: false, message: 'Results must be a list of student marks.' });
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
      const studentId = String(result.studentId || '');
      const marks = Number(result.marksObtained);
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
    if (submittedIds.size !== enrolledStudentIds.size) {
      return res.status(400).json({ success: false, message: 'Enter marks for every enrolled student before saving.' });
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
  saveTeacherAssessmentResults,
};
