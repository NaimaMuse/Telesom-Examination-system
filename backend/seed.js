const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

dotenv.config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const CourseTeacher = require('./models/CourseTeacher');
const Enrollment = require('./models/Enrollment');
const Exam = require('./models/Exam');
const ExamResult = require('./models/ExamResult');
const Quiz = require('./models/Quiz');
const QuizResult = require('./models/QuizResult');
const Attendance = require('./models/Attendance');
const Note = require('./models/Note');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Starting database seed...');

    // Clear existing collections safely
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Teacher.deleteMany({}),
      Course.deleteMany({}),
      CourseTeacher.deleteMany({}),
      Enrollment.deleteMany({}),
      Exam.deleteMany({}),
      ExamResult.deleteMany({}),
      Quiz.deleteMany({}),
      QuizResult.deleteMany({}),
      Attendance.deleteMany({}),
      Note.deleteMany({}),
    ]);
    console.log('Cleared existing data.');

    // 1. Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      name: 'Telesom Academy Admin Office',
      email: 'admin@telesom.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin created: ${adminUser.email}`);

    // 2. Create Teacher
    const teacherPassword = await bcrypt.hash('password123', 10);
    const teacherUser = await User.create({
      name: 'Dr. Sahra Cabdi Warsame',
      email: 'teacher@telesom.com',
      password: teacherPassword,
      role: 'teacher',
      isActive: true,
    });
    const teacherProfile = await Teacher.create({
      user: teacherUser._id,
      teacherId: 'TCH-2001',
      gender: 'female',
      phone: '+252 63 4112233',
      department: 'Cisco CCNA / Network Engineering',
      specialization: 'Routing, Switching & Network Security',
      status: 'active',
    });
    console.log(`Teacher created: ${teacherUser.email} (ID: ${teacherProfile.teacherId})`);

    // 3. Create Students
    const student1User = await User.create({
      name: 'Ahmed Mohamed Ismail',
      email: 'ahmed.student@telesom.com',
      role: 'student',
      isActive: true,
    });
    const student1Profile = await Student.create({
      user: student1User._id,
      studentId: 'STD-1001',
      gender: 'male',
      phone: '+252 63 4455667',
      address: 'Hargeisa, Somaliland',
      academicYear: '2025-2026',
      status: 'active',
    });

    const student2User = await User.create({
      name: 'Farhiya Hassan Nuur',
      email: 'farhiya.student@telesom.com',
      role: 'student',
      isActive: true,
    });
    const student2Profile = await Student.create({
      user: student2User._id,
      studentId: 'STD-1002',
      gender: 'female',
      phone: '+252 63 5566778',
      address: 'Hargeisa, Somaliland',
      academicYear: '2025-2026',
      status: 'active',
    });
    console.log(`Students created: ${student1Profile.studentId}, ${student2Profile.studentId}`);

    // 4. Create Courses
    const course1 = await Course.create({
      courseCode: 'CCNA-201',
      title: 'Cisco Certified Network Associate',
      description: 'Comprehensive network engineering, routing protocols, VLANs, and firewall configuration.',
      credits: 4,
      department: 'Cisco CCNA / Network Engineering',
      semester: 'Semester 1',
      academicYear: '2025-2026',
      isActive: true,
    });

    const course2 = await Course.create({
      courseCode: 'SWE-301',
      title: 'Full-Stack Web Development & MERN Stack',
      description: 'Building modern full-stack web applications using React, Node.js, Express, and MongoDB.',
      credits: 4,
      department: 'Software Engineering & Web Technologies',
      semester: 'Semester 1',
      academicYear: '2025-2026',
      isActive: true,
    });

    const course3 = await Course.create({
      courseCode: 'SEC-101',
      title: 'Cybersecurity Fundamentals & Ethical Hacking',
      description: 'Core concepts in cybersecurity, threat analysis, cryptography, and network defense.',
      credits: 3,
      department: 'Cybersecurity & Ethical Hacking',
      semester: 'Semester 1',
      academicYear: '2025-2026',
      isActive: true,
    });
    console.log(`Courses created: CCNA-201, SWE-301, SEC-101`);

    // 5. Assign Teacher to Courses
    await CourseTeacher.create([
      {
        teacher: teacherProfile._id,
        course: course1._id,
        academicYear: '2025-2026',
        semester: 'Semester 1',
        role: 'lead',
        isPrimary: true,
        status: 'active',
      },
    ]);

    // 6. Enroll Students in Courses
    await Enrollment.create([
      {
        student: student1Profile._id,
        course: course1._id,
        academicYear: '2025-2026',
        semester: 'Semester 1',
        status: 'enrolled',
      },
      {
        student: student1Profile._id,
        course: course2._id,
        academicYear: '2025-2026',
        semester: 'Semester 1',
        status: 'enrolled',
      },
      {
        student: student2Profile._id,
        course: course1._id,
        academicYear: '2025-2026',
        semester: 'Semester 1',
        status: 'enrolled',
      },
    ]);
    console.log('Enrollments and CourseTeacher assignments created.');

    // 7. Create Exams
    const exam1 = await Exam.create({
      title: 'CCNA Midterm Examination',
      examCode: 'EX-CCNA-MID',
      course: course1._id,
      type: 'midterm',
      totalMarks: 100,
      passingMarks: 50,
      weightage: 40,
      examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
      startTime: '09:00 AM',
      durationMinutes: 90,
      room: 'Lab 204',
      academicYear: '2025-2026',
      semester: 'Semester 1',
      status: 'scheduled',
      createdBy: teacherUser._id,
    });

    const exam2 = await Exam.create({
      title: 'Web Dev Frontend & API Exam',
      examCode: 'EX-SWE-FINAL',
      course: course2._id,
      type: 'final',
      totalMarks: 100,
      passingMarks: 50,
      weightage: 50,
      examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // in 14 days
      startTime: '10:00 AM',
      durationMinutes: 120,
      room: 'Auditorium 1',
      academicYear: '2025-2026',
      semester: 'Semester 1',
      status: 'scheduled',
      createdBy: teacherUser._id,
    });

    // 8. Add a Completed Exam with Results
    const completedExam = await Exam.create({
      title: 'Network Protocols Practical Test',
      examCode: 'EX-CCNA-PRAC-01',
      course: course1._id,
      type: 'practical',
      totalMarks: 50,
      passingMarks: 25,
      weightage: 20,
      examDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      startTime: '11:00 AM',
      durationMinutes: 60,
      room: 'Lab 204',
      academicYear: '2025-2026',
      semester: 'Semester 1',
      status: 'completed',
      createdBy: teacherUser._id,
    });

    await ExamResult.create([
      {
        exam: completedExam._id,
        student: student1Profile._id,
        marksObtained: 46,
        grade: 'A',
        isPassed: true,
        remarks: 'Excellent practical knowledge of OSPF and VLAN configuration',
      },
      {
        exam: completedExam._id,
        student: student2Profile._id,
        marksObtained: 42,
        grade: 'B+',
        isPassed: true,
        remarks: 'Good setup, minor subnetting delays',
      },
    ]);

    // 9. Create Sample Notes
    await Note.create([
      {
        title: 'Cisco VLAN & Trunking Summary Guide',
        content: 'Key concepts: 802.1Q tags, Native VLAN, VTP modes (Server, Client, Transparent), Router-on-a-stick routing.',
        course: course1._id,
        createdBy: teacherUser._id,
      },
      {
        title: 'MERN Stack Architecture & REST API Design',
        content: 'Express routing patterns, JWT authentication headers, MongoDB indexing, and React hooks best practices.',
        course: course2._id,
        createdBy: teacherUser._id,
      },
    ]);

    // 10. Sample Attendance
    await Attendance.create([
      {
        student: student1Profile._id,
        course: course1._id,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'present',
        markedBy: teacherUser._id,
      },
      {
        student: student2Profile._id,
        course: course1._id,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'present',
        markedBy: teacherUser._id,
      },
    ]);

    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
