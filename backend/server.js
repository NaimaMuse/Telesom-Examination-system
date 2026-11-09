const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const {installSecurity, validateInput} = require('./middleware/security');

dotenv.config();

const app = express();

installSecurity(app);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit:'1mb', parameterLimit:1000 }));
app.use(validateInput);

app.get('/api/health', (req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;
  res.status(isDatabaseReady ? 200 : 503).json({
    status: isDatabaseReady ? 'success' : 'error',
    message: isDatabaseReady
      ? 'Telesom Examination System API is running'
      : 'Database is not connected',
    timestamp: new Date().toISOString(),
  });
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const teacherDashboardRoutes = require('./routes/teacherDashboardRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const courseTeacherRoutes = require('./routes/courseTeacherRoutes');
const examRoutes = require('./routes/examRoutes');
const examResultRoutes = require('./routes/examResultRoutes');
const quizRoutes = require('./routes/quizRoutes');
const quizResultRoutes = require('./routes/quizResultRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const attendanceImportRoutes = require('./routes/attendanceImportRoutes');
const noteRoutes = require('./routes/noteRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const profileRoutes = require('./routes/profileRoutes');
app.use('/api/academy', require('./routes/academyRoutes'));
app.use('/api/auth', authRoutes);
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/internships', require('./routes/internshipRoutes'));
app.use('/api/student', require('./routes/studentPortalRoutes'));
app.use('/api/teachers', teacherRoutes);
app.use('/api/teacher', teacherDashboardRoutes);
app.use('/api/teacher-contracts', require('./routes/teacherContractRoutes'));
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/course-teachers', courseTeacherRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exam-results', examResultRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quiz-results', quizResultRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-imports', attendanceImportRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/profile', profileRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (process.env.NODE_ENV === 'production' &&
      (Buffer.byteLength(process.env.JWT_SECRET || '') < 32 || /^replace_/i.test(process.env.JWT_SECRET))) {
    throw new Error('Set a strong production JWT_SECRET of at least 32 bytes.');
  }
  await connectDB();
  await require('./models/User').ensureOptionalStudentEmailIndex();
  await Promise.all(Object.values(require('./models/Evaluation')).map(model => model.init()));
  await require('./models/Session').init();
  const server = app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 120_000;
  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
