/**
 * academicService.js
 * ------------------
 * Centralised API service for all Telesom Academy academic endpoints.
 * Every function wraps its network call in try/catch.
 * When the backend is offline (any network/server error) the function
 * falls through to the PLACEHOLDER DATA block so the UI works standalone.
 */

import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER DATA  (realistic Somali university data)
// ─────────────────────────────────────────────────────────────────────────────

/* PLACEHOLDER */
const PLACEHOLDER_STUDENTS = [
  {
    _id: 'stu_001',
    name: 'Abdullahi Hassan Warsame',
    email: 'abdullahi.hassan@telesom.edu.so',
    studentId: 'TSA-2024-001',
    phone: '+252612345678',
    department: 'Information Technology',
    courses: ['course_001', 'course_002', 'course_005'],
    isActive: true,
    createdAt: '2024-09-01T08:00:00Z',
  },
  {
    _id: 'stu_002',
    name: 'Faadumo Abdi Jama',
    email: 'faadumo.abdi@telesom.edu.so',
    studentId: 'TSA-2024-002',
    phone: '+252615678901',
    department: 'Information Technology',
    courses: ['course_001', 'course_003'],
    isActive: true,
    createdAt: '2024-09-01T08:00:00Z',
  },
  {
    _id: 'stu_003',
    name: 'Mohamed Nur Farah',
    email: 'mohamed.nur@telesom.edu.so',
    studentId: 'TSA-2024-003',
    phone: '+252618901234',
    department: 'Telecommunications',
    courses: ['course_004', 'course_006'],
    isActive: true,
    createdAt: '2024-09-02T08:00:00Z',
  },
  {
    _id: 'stu_004',
    name: 'Hodan Bile Isse',
    email: 'hodan.bile@telesom.edu.so',
    studentId: 'TSA-2024-004',
    phone: '+252611234567',
    department: 'Cybersecurity',
    courses: ['course_002', 'course_005'],
    isActive: true,
    createdAt: '2024-09-03T08:00:00Z',
  },
  {
    _id: 'stu_005',
    name: 'Cabdirashid Cali Ducaale',
    email: 'cabdirashid.cali@telesom.edu.so',
    studentId: 'TSA-2024-005',
    phone: '+252617890123',
    department: 'Information Technology',
    courses: ['course_001', 'course_003', 'course_004'],
    isActive: true,
    createdAt: '2024-09-03T08:00:00Z',
  },
  {
    _id: 'stu_006',
    name: 'Sahra Muuse Xirsi',
    email: 'sahra.muuse@telesom.edu.so',
    studentId: 'TSA-2024-006',
    phone: '+252613456789',
    department: 'Cloud Computing',
    courses: ['course_005', 'course_006'],
    isActive: false,
    createdAt: '2024-09-04T08:00:00Z',
  },
  {
    _id: 'stu_007',
    name: 'Yasin Ibrahim Guled',
    email: 'yasin.ibrahim@telesom.edu.so',
    studentId: 'TSA-2024-007',
    phone: '+252619012345',
    department: 'Information Technology',
    courses: ['course_002', 'course_004'],
    isActive: true,
    createdAt: '2024-09-05T08:00:00Z',
  },
  {
    _id: 'stu_008',
    name: 'Amina Sharif Qasim',
    email: 'amina.sharif@telesom.edu.so',
    studentId: 'TSA-2024-008',
    phone: '+252614567890',
    department: 'Telecommunications',
    courses: ['course_004', 'course_006'],
    isActive: true,
    createdAt: '2024-09-06T08:00:00Z',
  },
  {
    _id: 'stu_009',
    name: 'Bashir Dahir Osman',
    email: 'bashir.dahir@telesom.edu.so',
    studentId: 'TSA-2024-009',
    phone: '+252616789012',
    department: 'Cybersecurity',
    courses: ['course_005', 'course_002'],
    isActive: true,
    createdAt: '2024-09-07T08:00:00Z',
  },
  {
    _id: 'stu_010',
    name: 'Maryan Abdirahman Hashi',
    email: 'maryan.abdirahman@telesom.edu.so',
    studentId: 'TSA-2024-010',
    phone: '+252612309876',
    department: 'Cloud Computing',
    courses: ['course_003', 'course_005', 'course_006'],
    isActive: true,
    createdAt: '2024-09-08T08:00:00Z',
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_TEACHERS = [
  {
    _id: 'tch_001',
    name: 'Dr. Khalid Abdullahi Farah',
    email: 'khalid.abdullahi@telesom.edu.so',
    teacherId: 'TST-2022-001',
    phone: '+252612000111',
    department: 'Information Technology',
    courses: ['course_001', 'course_003'],
    specialization: 'Full-Stack Development & Web Technologies',
    isActive: true,
    createdAt: '2022-01-15T08:00:00Z',
  },
  {
    _id: 'tch_002',
    name: 'Eng. Nasrin Yusuf Ahmed',
    email: 'nasrin.yusuf@telesom.edu.so',
    teacherId: 'TST-2022-002',
    phone: '+252613000222',
    department: 'Telecommunications',
    courses: ['course_004', 'course_006'],
    specialization: 'Networking & Telecommunications Engineering',
    isActive: true,
    createdAt: '2022-01-15T08:00:00Z',
  },
  {
    _id: 'tch_003',
    name: 'Prof. Abdinur Mohamud Idle',
    email: 'abdinur.mohamud@telesom.edu.so',
    teacherId: 'TST-2021-003',
    phone: '+252614000333',
    department: 'Cybersecurity',
    courses: ['course_002', 'course_005'],
    specialization: 'Cybersecurity & Ethical Hacking',
    isActive: true,
    createdAt: '2021-06-01T08:00:00Z',
  },
  {
    _id: 'tch_004',
    name: 'Ms. Ifrah Salad Hassan',
    email: 'ifrah.salad@telesom.edu.so',
    teacherId: 'TST-2023-004',
    phone: '+252615000444',
    department: 'Cloud Computing',
    courses: ['course_005'],
    specialization: 'Cloud Infrastructure & AWS',
    isActive: true,
    createdAt: '2023-02-01T08:00:00Z',
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_COURSES = [
  {
    _id: 'course_001',
    name: 'Full-Stack Web Development',
    code: 'IT-FSW-301',
    teacher: { _id: 'tch_001', name: 'Dr. Khalid Abdullahi Farah' },
    enrolledCount: 42,
    department: 'Information Technology',
    status: 'active',
    description: 'Comprehensive full-stack development using React, Node.js, and MongoDB.',
    startDate: '2024-09-01',
    endDate: '2025-01-31',
  },
  {
    _id: 'course_002',
    name: 'Cybersecurity Fundamentals',
    code: 'CS-SEC-201',
    teacher: { _id: 'tch_003', name: 'Prof. Abdinur Mohamud Idle' },
    enrolledCount: 35,
    department: 'Cybersecurity',
    status: 'active',
    description: 'Core cybersecurity principles, threat analysis, and defensive strategies.',
    startDate: '2024-09-01',
    endDate: '2025-01-31',
  },
  {
    _id: 'course_003',
    name: 'Python Programming',
    code: 'IT-PY-101',
    teacher: { _id: 'tch_001', name: 'Dr. Khalid Abdullahi Farah' },
    enrolledCount: 58,
    department: 'Information Technology',
    status: 'active',
    description: 'Python programming from basics to data structures and automation.',
    startDate: '2024-09-01',
    endDate: '2025-01-31',
  },
  {
    _id: 'course_004',
    name: 'CCNA Routing & Switching',
    code: 'TL-CCNA-401',
    teacher: { _id: 'tch_002', name: 'Eng. Nasrin Yusuf Ahmed' },
    enrolledCount: 29,
    department: 'Telecommunications',
    status: 'active',
    description: 'Cisco CCNA certification prep covering routing, switching, and network design.',
    startDate: '2024-09-01',
    endDate: '2025-01-31',
  },
  {
    _id: 'course_005',
    name: 'Cloud Computing & AWS',
    code: 'CC-AWS-301',
    teacher: { _id: 'tch_004', name: 'Ms. Ifrah Salad Hassan' },
    enrolledCount: 31,
    department: 'Cloud Computing',
    status: 'active',
    description: 'AWS services, cloud architecture, and hands-on lab exercises.',
    startDate: '2024-09-01',
    endDate: '2025-01-31',
  },
  {
    _id: 'course_006',
    name: 'Telecommunications Systems',
    code: 'TL-SYS-201',
    teacher: { _id: 'tch_002', name: 'Eng. Nasrin Yusuf Ahmed' },
    enrolledCount: 24,
    department: 'Telecommunications',
    status: 'active',
    description: 'Mobile networks, fiber optics, VoIP systems, and signal processing.',
    startDate: '2024-09-01',
    endDate: '2025-01-31',
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_EXAMS = [
  {
    _id: 'exam_001',
    title: 'Midterm – Full-Stack Development',
    course: { _id: 'course_001', name: 'Full-Stack Web Development', code: 'IT-FSW-301' },
    date: '2024-11-15T09:00:00Z',
    duration: 120,
    totalMarks: 100,
    type: 'midterm',
    venue: 'Lab A – Room 204',
    status: 'upcoming',
  },
  {
    _id: 'exam_002',
    title: 'Final – Cybersecurity Fundamentals',
    course: { _id: 'course_002', name: 'Cybersecurity Fundamentals', code: 'CS-SEC-201' },
    date: '2025-01-20T09:00:00Z',
    duration: 150,
    totalMarks: 100,
    type: 'final',
    venue: 'Exam Hall 1',
    status: 'upcoming',
  },
  {
    _id: 'exam_003',
    title: 'Midterm – Python Programming',
    course: { _id: 'course_003', name: 'Python Programming', code: 'IT-PY-101' },
    date: '2024-11-10T10:00:00Z',
    duration: 90,
    totalMarks: 80,
    type: 'midterm',
    venue: 'Room 105',
    status: 'completed',
  },
  {
    _id: 'exam_004',
    title: 'CCNA Practical Assessment',
    course: { _id: 'course_004', name: 'CCNA Routing & Switching', code: 'TL-CCNA-401' },
    date: '2024-11-25T08:00:00Z',
    duration: 180,
    totalMarks: 100,
    type: 'practical',
    venue: 'Network Lab – Room 301',
    status: 'upcoming',
  },
  {
    _id: 'exam_005',
    title: 'Final – Cloud Computing & AWS',
    course: { _id: 'course_005', name: 'Cloud Computing & AWS', code: 'CC-AWS-301' },
    date: '2025-01-22T09:00:00Z',
    duration: 120,
    totalMarks: 100,
    type: 'final',
    venue: 'Exam Hall 2',
    status: 'upcoming',
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_QUIZZES = [
  {
    _id: 'quiz_001',
    title: 'React Hooks Quiz',
    course: { _id: 'course_001', name: 'Full-Stack Web Development' },
    date: '2024-10-20T10:00:00Z',
    totalMarks: 20,
    questions: 10,
    duration: 30,
    status: 'completed',
  },
  {
    _id: 'quiz_002',
    title: 'Network Security Basics',
    course: { _id: 'course_002', name: 'Cybersecurity Fundamentals' },
    date: '2024-10-25T11:00:00Z',
    totalMarks: 15,
    questions: 15,
    duration: 25,
    status: 'completed',
  },
  {
    _id: 'quiz_003',
    title: 'Python Data Types Quiz',
    course: { _id: 'course_003', name: 'Python Programming' },
    date: '2024-10-22T09:00:00Z',
    totalMarks: 20,
    questions: 10,
    duration: 20,
    status: 'completed',
  },
  {
    _id: 'quiz_004',
    title: 'OSI Model & TCP/IP',
    course: { _id: 'course_004', name: 'CCNA Routing & Switching' },
    date: '2024-11-05T10:00:00Z',
    totalMarks: 25,
    questions: 25,
    duration: 30,
    status: 'upcoming',
  },
  {
    _id: 'quiz_005',
    title: 'AWS EC2 & S3 Quiz',
    course: { _id: 'course_005', name: 'Cloud Computing & AWS' },
    date: '2024-11-08T14:00:00Z',
    totalMarks: 20,
    questions: 20,
    duration: 25,
    status: 'upcoming',
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_MARKS = [
  {
    _id: 'mark_001',
    studentName: 'Abdullahi Hassan Warsame',
    studentId: 'TSA-2024-001',
    courseName: 'Python Programming',
    examTitle: 'Midterm – Python Programming',
    marks: 68,
    totalMarks: 80,
    grade: 'B+',
    percentage: 85.0,
  },
  {
    _id: 'mark_002',
    studentName: 'Faadumo Abdi Jama',
    studentId: 'TSA-2024-002',
    courseName: 'Python Programming',
    examTitle: 'Midterm – Python Programming',
    marks: 72,
    totalMarks: 80,
    grade: 'A',
    percentage: 90.0,
  },
  {
    _id: 'mark_003',
    studentName: 'Cabdirashid Cali Ducaale',
    studentId: 'TSA-2024-005',
    courseName: 'Python Programming',
    examTitle: 'Midterm – Python Programming',
    marks: 60,
    totalMarks: 80,
    grade: 'B',
    percentage: 75.0,
  },
  {
    _id: 'mark_004',
    studentName: 'Abdullahi Hassan Warsame',
    studentId: 'TSA-2024-001',
    courseName: 'Full-Stack Web Development',
    examTitle: 'React Hooks Quiz',
    marks: 17,
    totalMarks: 20,
    grade: 'A',
    percentage: 85.0,
  },
  {
    _id: 'mark_005',
    studentName: 'Hodan Bile Isse',
    studentId: 'TSA-2024-004',
    courseName: 'Cybersecurity Fundamentals',
    examTitle: 'Network Security Basics',
    marks: 13,
    totalMarks: 15,
    grade: 'A',
    percentage: 86.7,
  },
  {
    _id: 'mark_006',
    studentName: 'Yasin Ibrahim Guled',
    studentId: 'TSA-2024-007',
    courseName: 'Cybersecurity Fundamentals',
    examTitle: 'Network Security Basics',
    marks: 11,
    totalMarks: 15,
    grade: 'B+',
    percentage: 73.3,
  },
  {
    _id: 'mark_007',
    studentName: 'Maryan Abdirahman Hashi',
    studentId: 'TSA-2024-010',
    courseName: 'Python Programming',
    examTitle: 'Midterm – Python Programming',
    marks: 76,
    totalMarks: 80,
    grade: 'A+',
    percentage: 95.0,
  },
  {
    _id: 'mark_008',
    studentName: 'Amina Sharif Qasim',
    studentId: 'TSA-2024-008',
    courseName: 'CCNA Routing & Switching',
    examTitle: 'React Hooks Quiz',
    marks: 14,
    totalMarks: 20,
    grade: 'B',
    percentage: 70.0,
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_ATTENDANCE = [
  {
    _id: 'att_001',
    studentName: 'Abdullahi Hassan Warsame',
    studentId: 'TSA-2024-001',
    course: { _id: 'course_001', name: 'Full-Stack Web Development' },
    month: 'October 2024',
    presentDays: 20,
    absentDays: 2,
    totalDays: 22,
    percentage: 90.9,
  },
  {
    _id: 'att_002',
    studentName: 'Faadumo Abdi Jama',
    studentId: 'TSA-2024-002',
    course: { _id: 'course_001', name: 'Full-Stack Web Development' },
    month: 'October 2024',
    presentDays: 22,
    absentDays: 0,
    totalDays: 22,
    percentage: 100.0,
  },
  {
    _id: 'att_003',
    studentName: 'Mohamed Nur Farah',
    studentId: 'TSA-2024-003',
    course: { _id: 'course_004', name: 'CCNA Routing & Switching' },
    month: 'October 2024',
    presentDays: 18,
    absentDays: 4,
    totalDays: 22,
    percentage: 81.8,
  },
  {
    _id: 'att_004',
    studentName: 'Hodan Bile Isse',
    studentId: 'TSA-2024-004',
    course: { _id: 'course_002', name: 'Cybersecurity Fundamentals' },
    month: 'October 2024',
    presentDays: 21,
    absentDays: 1,
    totalDays: 22,
    percentage: 95.5,
  },
  {
    _id: 'att_005',
    studentName: 'Cabdirashid Cali Ducaale',
    studentId: 'TSA-2024-005',
    course: { _id: 'course_003', name: 'Python Programming' },
    month: 'October 2024',
    presentDays: 19,
    absentDays: 3,
    totalDays: 22,
    percentage: 86.4,
  },
  {
    _id: 'att_006',
    studentName: 'Sahra Muuse Xirsi',
    studentId: 'TSA-2024-006',
    course: { _id: 'course_005', name: 'Cloud Computing & AWS' },
    month: 'October 2024',
    presentDays: 14,
    absentDays: 8,
    totalDays: 22,
    percentage: 63.6,
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_STUDY_NOTES = [
  {
    _id: 'note_001',
    title: 'React Hooks – Complete Reference',
    course: { _id: 'course_001', name: 'Full-Stack Web Development' },
    uploadedBy: { _id: 'tch_001', name: 'Dr. Khalid Abdullahi Farah' },
    fileType: 'pdf',
    fileSize: '2.4 MB',
    uploadedAt: '2024-10-10T09:00:00Z',
    downloadUrl: '#',
  },
  {
    _id: 'note_002',
    title: 'Node.js REST API Design Patterns',
    course: { _id: 'course_001', name: 'Full-Stack Web Development' },
    uploadedBy: { _id: 'tch_001', name: 'Dr. Khalid Abdullahi Farah' },
    fileType: 'pdf',
    fileSize: '1.8 MB',
    uploadedAt: '2024-10-15T11:00:00Z',
    downloadUrl: '#',
  },
  {
    _id: 'note_003',
    title: 'Network Threat Vectors & Attack Taxonomy',
    course: { _id: 'course_002', name: 'Cybersecurity Fundamentals' },
    uploadedBy: { _id: 'tch_003', name: 'Prof. Abdinur Mohamud Idle' },
    fileType: 'pptx',
    fileSize: '5.1 MB',
    uploadedAt: '2024-10-08T10:00:00Z',
    downloadUrl: '#',
  },
  {
    _id: 'note_004',
    title: 'Python OOP – Classes, Inheritance & Decorators',
    course: { _id: 'course_003', name: 'Python Programming' },
    uploadedBy: { _id: 'tch_001', name: 'Dr. Khalid Abdullahi Farah' },
    fileType: 'pdf',
    fileSize: '3.2 MB',
    uploadedAt: '2024-10-12T09:30:00Z',
    downloadUrl: '#',
  },
  {
    _id: 'note_005',
    title: 'CCNA Lab Guide – OSPF & EIGRP',
    course: { _id: 'course_004', name: 'CCNA Routing & Switching' },
    uploadedBy: { _id: 'tch_002', name: 'Eng. Nasrin Yusuf Ahmed' },
    fileType: 'pdf',
    fileSize: '4.7 MB',
    uploadedAt: '2024-10-18T08:00:00Z',
    downloadUrl: '#',
  },
  {
    _id: 'note_006',
    title: 'AWS Core Services Overview',
    course: { _id: 'course_005', name: 'Cloud Computing & AWS' },
    uploadedBy: { _id: 'tch_004', name: 'Ms. Ifrah Salad Hassan' },
    fileType: 'pdf',
    fileSize: '2.9 MB',
    uploadedAt: '2024-10-20T10:00:00Z',
    downloadUrl: '#',
  },
];

/* PLACEHOLDER */
const PLACEHOLDER_ANALYTICS = {
  studentPerformance: [
    { grade: 'A+', count: 12, percentage: 10.9 },
    { grade: 'A',  count: 28, percentage: 25.5 },
    { grade: 'B+', count: 34, percentage: 30.9 },
    { grade: 'B',  count: 22, percentage: 20.0 },
    { grade: 'C+', count: 10, percentage: 9.1 },
    { grade: 'C',  count: 4,  percentage: 3.6 },
  ],
  courseStats: [
    { course: 'Full-Stack Dev', enrolled: 42, avgScore: 78, passRate: 92 },
    { course: 'Cybersecurity', enrolled: 35, avgScore: 74, passRate: 89 },
    { course: 'Python',        enrolled: 58, avgScore: 81, passRate: 95 },
    { course: 'CCNA',          enrolled: 29, avgScore: 72, passRate: 86 },
    { course: 'Cloud/AWS',     enrolled: 31, avgScore: 76, passRate: 90 },
    { course: 'Telecom Sys',   enrolled: 24, avgScore: 70, passRate: 83 },
  ],
  attendanceByMonth: [
    { month: 'Sep', percentage: 93.2 },
    { month: 'Oct', percentage: 88.7 },
    { month: 'Nov', percentage: 85.4 },
    { month: 'Dec', percentage: 82.1 },
    { month: 'Jan', percentage: 90.3 },
  ],
  examStats: {
    totalExams: 5,
    completedExams: 1,
    upcomingExams: 4,
    avgPassRate: 88.4,
  },
};

/* PLACEHOLDER */
const PLACEHOLDER_ADMIN_STATS = {
  totalStudents: 219,
  totalTeachers: 12,
  totalCourses: 6,
  totalExams: 5,
  totalQuizzes: 5,
  activeEnrollments: 219,
  passRate: 88.4,
  avgAttendance: 87.9,
};

/* PLACEHOLDER – Teacher stats keyed by teacherId */
const PLACEHOLDER_TEACHER_STATS = {
  default: {
    myCourses: 2,
    myStudents: 71,
    upcomingExams: 3,
    quizzes: 2,
  },
};

/* PLACEHOLDER – Student stats keyed by studentId */
const PLACEHOLDER_STUDENT_STATS = {
  default: {
    enrolledCourses: 3,
    upcomingExams: 4,
    avgMarks: 81.5,
    attendancePercentage: 89.2,
  },
};

/* PLACEHOLDER – Quiz results for a student */
const PLACEHOLDER_QUIZ_RESULTS = [
  {
    _id: 'qr_001',
    quizTitle: 'React Hooks Quiz',
    courseName: 'Full-Stack Web Development',
    date: '2024-10-20T10:00:00Z',
    marks: 17,
    totalMarks: 20,
    percentage: 85.0,
    grade: 'A',
  },
  {
    _id: 'qr_002',
    quizTitle: 'Python Data Types Quiz',
    courseName: 'Python Programming',
    date: '2024-10-22T09:00:00Z',
    marks: 18,
    totalMarks: 20,
    percentage: 90.0,
    grade: 'A+',
  },
  {
    _id: 'qr_003',
    quizTitle: 'Network Security Basics',
    courseName: 'Cybersecurity Fundamentals',
    date: '2024-10-25T11:00:00Z',
    marks: 13,
    totalMarks: 15,
    percentage: 86.7,
    grade: 'A',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic GET wrapper – returns data.data (unwrapped from Axios envelope).
 * Falls back to `fallback` if the backend is unreachable.
 */
async function safeGet(endpoint, fallback, params = {}) {
  try {
    const res = await api.get(endpoint, { params });
    return res.data?.data ?? res.data;
  } catch (_err) {
    console.warn(`[academicService] Backend offline – using placeholder for ${endpoint}`);
    return fallback;
  }
}

/**
 * Generic POST/PUT/DELETE wrapper.
 * Falls back to `fallback` on error.
 */
async function safePost(method, endpoint, payload, fallback = { success: true }) {
  try {
    const res = await api[method](endpoint, payload);
    return res.data?.data ?? res.data;
  } catch (_err) {
    console.warn(`[academicService] Backend offline – using placeholder for ${method.toUpperCase()} ${endpoint}`);
    return fallback;
  }
}

async function safeDelete(endpoint, fallback = { success: true }) {
  try {
    const res = await api.delete(endpoint);
    return res.data?.data ?? res.data;
  } catch (_err) {
    console.warn(`[academicService] Backend offline – using placeholder for DELETE ${endpoint}`);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch high-level admin statistics.
 * Returns: { totalStudents, totalTeachers, totalCourses, totalExams,
 *            totalQuizzes, activeEnrollments, passRate, avgAttendance }
 */
export async function getAdminStats() {
  return safeGet('/admin/stats', PLACEHOLDER_ADMIN_STATS);
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns array of student objects. */
export async function getStudents() {
  return safeGet('/students', PLACEHOLDER_STUDENTS);
}

/** Create a new student. */
export async function createStudent(data) {
  return safePost('post', '/students', data, {
    ...data,
    _id: `stu_${Date.now()}`,
    studentId: `TSA-2024-0${Math.floor(Math.random() * 99)}`,
    courses: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  });
}

/** Update an existing student by ID. */
export async function updateStudent(id, data) {
  return safePost('put', `/students/${id}`, data, { ...data, _id: id });
}

/** Delete a student by ID. */
export async function deleteStudent(id) {
  return safeDelete(`/students/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns array of teacher objects. */
export async function getTeachers() {
  return safeGet('/teachers', PLACEHOLDER_TEACHERS);
}

/** Create a new teacher. */
export async function createTeacher(data) {
  return safePost('post', '/teachers', data, {
    ...data,
    _id: `tch_${Date.now()}`,
    teacherId: `TST-2024-0${Math.floor(Math.random() * 99)}`,
    courses: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  });
}

/** Update a teacher by ID. */
export async function updateTeacher(id, data) {
  return safePost('put', `/teachers/${id}`, data, { ...data, _id: id });
}

/** Delete a teacher by ID. */
export async function deleteTeacher(id) {
  return safeDelete(`/teachers/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

/** Returns array of course objects. */
export async function getCourses() {
  return safeGet('/courses', PLACEHOLDER_COURSES);
}

/** Create a new course. */
export async function createCourse(data) {
  return safePost('post', '/courses', data, {
    ...data,
    _id: `course_${Date.now()}`,
    enrolledCount: 0,
    status: 'active',
  });
}

/** Update a course by ID. */
export async function updateCourse(id, data) {
  return safePost('put', `/courses/${id}`, data, { ...data, _id: id });
}

/** Delete a course by ID. */
export async function deleteCourse(id) {
  return safeDelete(`/courses/${id}`);
}

/** Enroll a student in a course. */
export async function enrollStudent(studentId, courseId) {
  return safePost('post', '/enrollments', { studentId, courseId }, { success: true, studentId, courseId });
}

/** Remove a student from a course. */
export async function unenrollStudent(studentId, courseId) {
  return safeDelete(`/enrollments/${studentId}/${courseId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns array of exam objects. */
export async function getExams() {
  return safeGet('/exams', PLACEHOLDER_EXAMS);
}

/** Create a new exam. */
export async function createExam(data) {
  return safePost('post', '/exams', data, {
    ...data,
    _id: `exam_${Date.now()}`,
    status: 'upcoming',
  });
}

/** Update an exam by ID. */
export async function updateExam(id, data) {
  return safePost('put', `/exams/${id}`, data, { ...data, _id: id });
}

/** Delete an exam by ID. */
export async function deleteExam(id) {
  return safeDelete(`/exams/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZZES
// ─────────────────────────────────────────────────────────────────────────────

/** Returns array of quiz objects. */
export async function getQuizzes() {
  return safeGet('/quizzes', PLACEHOLDER_QUIZZES);
}

/** Create a new quiz. */
export async function createQuiz(data) {
  return safePost('post', '/quizzes', data, {
    ...data,
    _id: `quiz_${Date.now()}`,
    status: 'upcoming',
  });
}

/** Update a quiz by ID. */
export async function updateQuiz(id, data) {
  return safePost('put', `/quizzes/${id}`, data, { ...data, _id: id });
}

/** Delete a quiz by ID. */
export async function deleteQuiz(id) {
  return safeDelete(`/quizzes/${id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch marks, optionally filtered by courseId.
 * Returns array of mark objects.
 */
export async function getMarks(courseId) {
  const params = courseId ? { courseId } : {};
  const fallback = courseId
    ? PLACEHOLDER_MARKS.filter((m) =>
        PLACEHOLDER_COURSES.find((c) => c._id === courseId)?.name === m.courseName
      )
    : PLACEHOLDER_MARKS;
  return safeGet('/marks', fallback, params);
}

/** Save new marks entry. */
export async function saveMarks(data) {
  return safePost('post', '/marks', data, { ...data, _id: `mark_${Date.now()}` });
}

/** Update an existing marks entry by ID. */
export async function updateMarks(id, data) {
  return safePost('put', `/marks/${id}`, data, { ...data, _id: id });
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch attendance records, optionally filtered by courseId and/or month.
 * Returns array of attendance objects.
 */
export async function getAttendance(courseId, month) {
  const params = {};
  if (courseId) params.courseId = courseId;
  if (month) params.month = month;

  let fallback = PLACEHOLDER_ATTENDANCE;
  if (courseId) {
    fallback = fallback.filter((a) => a.course._id === courseId);
  }
  return safeGet('/attendance', fallback, params);
}

/** Save a new attendance record. */
export async function saveAttendance(data) {
  return safePost('post', '/attendance', data, { ...data, _id: `att_${Date.now()}` });
}

/** Update an attendance record by ID. */
export async function updateAttendance(id, data) {
  return safePost('put', `/attendance/${id}`, data, { ...data, _id: id });
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDY NOTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch study notes for a given course.
 * Returns array of note objects.
 */
export async function getStudyNotes(courseId) {
  const params = courseId ? { courseId } : {};
  const fallback = courseId
    ? PLACEHOLDER_STUDY_NOTES.filter((n) => n.course._id === courseId)
    : PLACEHOLDER_STUDY_NOTES;
  return safeGet('/notes', fallback, params);
}

/**
 * Upload a study note (multipart/form-data).
 * @param {FormData} formData
 */
export async function uploadStudyNote(formData) {
  try {
    const res = await api.post('/notes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data ?? res.data;
  } catch (_err) {
    console.warn('[academicService] Backend offline – using placeholder for uploadStudyNote');
    /* PLACEHOLDER */
    return {
      _id: `note_${Date.now()}`,
      title: formData.get?.('title') ?? 'New Note',
      uploadedAt: new Date().toISOString(),
      downloadUrl: '#',
    };
  }
}

/** Delete a study note by ID. */
export async function deleteStudyNote(noteId) {
  return safeDelete(`/notes/${noteId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch analytics data.
 * Returns: { studentPerformance, courseStats, attendanceByMonth, examStats }
 */
export async function getAnalytics() {
  return safeGet('/analytics', PLACEHOLDER_ANALYTICS);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER-SCOPED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch summary stats for a specific teacher.
 * Returns: { myCourses, myStudents, upcomingExams, quizzes }
 */
export async function getTeacherStats(teacherId) {
  const fallback = PLACEHOLDER_TEACHER_STATS[teacherId] ?? PLACEHOLDER_TEACHER_STATS.default;
  return safeGet(`/teachers/${teacherId}/stats`, fallback);
}

/**
 * Fetch courses assigned to a specific teacher.
 */
export async function getTeacherCourses(teacherId) {
  const fallback = PLACEHOLDER_COURSES.filter((c) => c.teacher._id === teacherId);
  return safeGet(`/teachers/${teacherId}/courses`, fallback);
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT-SCOPED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch summary stats for a specific student.
 * Returns: { enrolledCourses, upcomingExams, avgMarks, attendancePercentage }
 */
export async function getStudentStats(studentId) {
  const fallback = PLACEHOLDER_STUDENT_STATS[studentId] ?? PLACEHOLDER_STUDENT_STATS.default;
  return safeGet(`/students/${studentId}/stats`, fallback);
}

/**
 * Fetch courses a student is enrolled in.
 */
export async function getStudentCourses(studentId) {
  const student = PLACEHOLDER_STUDENTS.find((s) => s._id === studentId || s.studentId === studentId);
  const courseIds = student?.courses ?? [];
  const fallback = PLACEHOLDER_COURSES.filter((c) => courseIds.includes(c._id));
  return safeGet(`/students/${studentId}/courses`, fallback);
}

/**
 * Fetch marks for a specific student.
 */
export async function getStudentMarks(studentId) {
  const student = PLACEHOLDER_STUDENTS.find((s) => s._id === studentId || s.studentId === studentId);
  const fallback = PLACEHOLDER_MARKS.filter((m) => m.studentId === student?.studentId);
  return safeGet(`/students/${studentId}/marks`, fallback);
}

/**
 * Fetch attendance for a specific student.
 */
export async function getStudentAttendance(studentId) {
  const student = PLACEHOLDER_STUDENTS.find((s) => s._id === studentId || s.studentId === studentId);
  const fallback = PLACEHOLDER_ATTENDANCE.filter((a) => a.studentId === student?.studentId);
  return safeGet(`/students/${studentId}/attendance`, fallback);
}

/**
 * Fetch quiz results for a specific student.
 */
export async function getStudentQuizResults(studentId) {
  return safeGet(`/students/${studentId}/quiz-results`, PLACEHOLDER_QUIZ_RESULTS);
}
