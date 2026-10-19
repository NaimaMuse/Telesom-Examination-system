import { useState } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './dashboard.css';

// ─── Admin Pages ───────────────────────────────────────────────
import AdminDashboard    from '../pages/admin/AdminDashboard';
import StudentMgmt       from '../pages/admin/StudentMgmt';
import TeacherMgmt       from '../pages/admin/TeacherMgmt';
import CourseMgmt        from '../pages/admin/CourseMgmt';
import EnrollmentMgmt    from '../pages/admin/EnrollmentMgmt';
import ExamMgmt          from '../pages/admin/ExamMgmt';
import MarksMgmt         from '../pages/admin/MarksMgmt';
import AttendanceMgmt    from '../pages/admin/AttendanceMgmt';
import AnalyticsPage     from '../pages/admin/AnalyticsPage';

// ─── Teacher Pages ──────────────────────────────────────────────
import TeacherDashboard  from '../pages/teacher/TeacherDashboard';
import MyCourse          from '../pages/teacher/MyCourse';
import TeacherExams      from '../pages/teacher/TeacherExams';
import TeacherPerformance from '../pages/teacher/TeacherPerformance';
import TeacherProfile    from '../pages/teacher/TeacherProfile';
import TeacherResults    from '../pages/teacher/TeacherResults';

// ─── Student Pages ──────────────────────────────────────────────
import StudentDashboard  from '../pages/student/StudentDashboard';
import StudentCourses    from '../pages/student/StudentCourses';
import StudentExams      from '../pages/student/StudentExams';
import StudentQuizzes    from '../pages/student/StudentQuizzes';
import StudentNotes      from '../pages/student/StudentNotes';
import StudentAttendance from '../pages/student/StudentAttendance';
import StudentProfile    from '../pages/student/StudentProfile';

// ─── Nav config per role ─────────────────────────────────────────
const NAV = {
  admin: [
    {
      section: 'Overview',
      items: [
        { to: '/admin',            label: 'Dashboard',         icon: '🏠', end: true },
      ],
    },
    {
      section: 'Management',
      items: [
        { to: '/admin/students',   label: 'Student Management', icon: '🎓' },
        { to: '/admin/teachers',   label: 'Teacher Management', icon: '👨‍🏫' },
        { to: '/admin/courses',    label: 'Course Management',  icon: '📚' },
        { to: '/admin/enrollment', label: 'Student Enrollment', icon: '📋' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { to: '/admin/exams',      label: 'Exam & Quiz Mgmt',  icon: '📝' },
        { to: '/admin/marks',      label: 'Marks & Results',   icon: '📊' },
        { to: '/admin/attendance', label: 'Attendance',         icon: '📅' },
        { to: '/admin/analytics',  label: 'Analytics & Reports',icon: '📈' },
      ],
    },
  ],
  teacher: [
    {
      section: 'Overview',
      items: [
        { to: '/teacher', label: 'Dashboard', icon: '🏠', end: true },
        { to: '/teacher/my-course', label: 'My Course', icon: '📚' },
        { to: '/teacher/exams', label: 'Exams & Quizzes', icon: '📝' },
        { to: '/teacher/results', label: 'Results & Marks', icon: '📋' },
        { to: '/teacher/performance', label: 'Student Performance', icon: '📊' },
        { to: '/teacher/profile', label: 'My Profile', icon: '👤' },
      ],
    },
  ],
  student: [
    {
      section: 'Overview',
      items: [
        { to: '/student',           label: 'Dashboard',       icon: '🏠', end: true },
      ],
    },
    {
      section: 'Academics',
      items: [
        { to: '/student/courses',   label: 'My Courses',      icon: '📚' },
        { to: '/student/exams',     label: 'Exams & Results', icon: '📊' },
        { to: '/student/quizzes',   label: 'Quizzes',         icon: '📝' },
        { to: '/student/notes',     label: 'Study Notes',     icon: '📄' },
        { to: '/student/attendance',label: 'Attendance',      icon: '📅' },
      ],
    },
    {
      section: 'Account',
      items: [
        { to: '/student/profile',   label: 'My Profile',      icon: '👤' },
      ],
    },
  ],
};

const ROLE_ROUTES = {
  admin: (
    <Routes>
      <Route index            element={<AdminDashboard />} />
      <Route path="students"  element={<StudentMgmt />} />
      <Route path="teachers"  element={<TeacherMgmt />} />
      <Route path="courses"   element={<CourseMgmt />} />
      <Route path="enrollment"element={<EnrollmentMgmt />} />
      <Route path="exams"     element={<ExamMgmt />} />
      <Route path="marks"     element={<MarksMgmt />} />
      <Route path="attendance"element={<AttendanceMgmt />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="*"         element={<Navigate to="/admin" replace />} />
    </Routes>
  ),
  teacher: (
    <Routes>
      <Route index              element={<TeacherDashboard />} />
      <Route path="my-course"  element={<MyCourse />} />
      <Route path="exams"     element={<TeacherExams />} />
      <Route path="results"  element={<TeacherResults />} />
      <Route path="performance" element={<TeacherPerformance />} />
      <Route path="profile"   element={<TeacherProfile />} />
      <Route path="*"         element={<Navigate to="/teacher" replace />} />
    </Routes>
  ),
  student: (
    <Routes>
      <Route index              element={<StudentDashboard />} />
      <Route path="courses"     element={<StudentCourses />} />
      <Route path="exams"       element={<StudentExams />} />
      <Route path="quizzes"     element={<StudentQuizzes />} />
      <Route path="notes"       element={<StudentNotes />} />
      <Route path="attendance"  element={<StudentAttendance />} />
      <Route path="profile"     element={<StudentProfile />} />
      <Route path="*"           element={<Navigate to="/student" replace />} />
    </Routes>
  ),
};

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

const PAGE_META = {
  '/admin': { title: 'Admin Dashboard', hint: 'Overview of students, courses, exams, and reports.' },
  '/admin/students': { title: 'Student Management', hint: 'Add, edit, and manage student records.' },
  '/admin/teachers': { title: 'Teacher Management', hint: 'Manage faculty accounts and assignments.' },
  '/admin/courses': { title: 'Course Management', hint: 'Create and organize academic courses.' },
  '/admin/enrollment': { title: 'Student Enrollment', hint: 'Enroll students in courses and sections.' },
  '/admin/exams': { title: 'Exam & Quiz Management', hint: 'Schedule and configure assessments.' },
  '/admin/marks': { title: 'Marks & Results', hint: 'Enter grades and publish results.' },
  '/admin/attendance': { title: 'Attendance', hint: 'Track and review class attendance.' },
  '/admin/analytics': { title: 'Analytics & Reports', hint: 'Insights and performance summaries.' },
  '/teacher': { title: 'Teacher Dashboard', hint: 'Your courses, exams, and class at a glance.' },
  '/teacher/my-course': { title: 'My Course', hint: 'Course content and enrolled students.' },
  '/teacher/exams': { title: 'Exams & Quizzes', hint: 'Create and manage assessments.' },
  '/teacher/results': { title: 'Results & Marks', hint: 'Enter and review results for your enrolled students.' },
  '/teacher/performance': { title: 'Student Performance', hint: 'Scores, trends, and progress.' },
  '/teacher/profile': { title: 'My Profile', hint: 'Your account and contact details.' },
  '/student': { title: 'Student Dashboard', hint: 'Courses, marks, and upcoming exams.' },
  '/student/courses': { title: 'My Courses', hint: 'Enrolled courses and materials.' },
<<<<<<< HEAD
  '/student/exams': { title: 'Exams & Results', hint: 'Your marks, grades, and academic results.' },
  '/student/quizzes': { title: 'Quizzes', hint: 'Quiz scores and practice.' },
  '/student/notes': { title: 'Study Notes', hint: 'Notes shared by your teachers.' },
  '/student/attendance': { title: 'My Attendance', hint: 'Track your attendance across all courses.' },
=======
  '/student/exams': { title: 'Exams & Results', hint: 'Exam schedules and your grades.' },
  '/student/quizzes': { title: 'Quizzes', hint: 'Quiz scores and practice.' },
  '/student/notes': { title: 'Study Notes', hint: 'Notes shared by your teachers.' },
  '/student/attendance': { title: 'Attendance', hint: 'Your attendance record by course.' },
>>>>>>> origin/main
  '/student/profile': { title: 'My Profile', hint: 'Personal info and student ID.' },
};

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const match = Object.keys(PAGE_META)
    .filter((p) => p !== `/${pathname.split('/')[1]}` && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_META[match] : { title: 'Dashboard', hint: 'Telesom Academy portal.' };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  const navSections = NAV[role] || [];
  const userRole = role.toUpperCase();
  const pageMeta = getPageMeta(location.pathname);
  const firstName = user?.name?.split(' ')[0] || 'User';
<<<<<<< HEAD
  const isStudentCoursesPage = role === 'student' && location.pathname === '/student/courses';
  const isStudentExamsPage = role === 'student' && location.pathname === '/student/exams';
  const isStudentQuizzesPage = role === 'student' && location.pathname === '/student/quizzes';
  const isStudentNotesPage = role === 'student' && location.pathname === '/student/notes';
  const isStudentAttendancePage = role === 'student' && location.pathname === '/student/attendance';
  const isStudentAcademicPage = isStudentCoursesPage || isStudentExamsPage || isStudentQuizzesPage || isStudentNotesPage || isStudentAttendancePage;
=======
>>>>>>> origin/main
  const profilePath = role === 'admin' ? '/admin' : `/${role}/profile`;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`dash-shell ${role === 'teacher' ? 'teacher-shell' : ''}`}>
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar ${role === 'teacher' ? 'teacher-sidebar' : ''} ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🎓</div>
          <div className="sidebar-brand-text">
            <strong>Telesom</strong>
            <span>Academy Portal</span>
          </div>
        </div>

        {/* Role badge */}
        <div className="sidebar-role-badge">{userRole}</div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map((item) => (
                item.logout ? (
                  <button
                    key={item.to}
                    type="button"
                    className="sidebar-link sidebar-link-button"
                    onClick={() => {
                      setSidebarOpen(false);
                      handleLogout();
                    }}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                )
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {role !== 'teacher' && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials(user?.name)}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name || '—'}</div>
                <div className="sidebar-user-email">{user?.email || user?.studentId || ''}</div>
              </div>
            </div>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="dash-main">
        {/* Top Bar */}
        <header className="dash-topbar">
          <div className="topbar-left">
            <button
              className="topbar-menu-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <div>
<<<<<<< HEAD
              <div className={`topbar-page-title ${isStudentAcademicPage ? 'topbar-greeting' : ''}`}>
                {isStudentAcademicPage ? `${greeting()}, ${firstName}` : pageMeta.title}
              </div>
              {!isStudentAcademicPage && (
                <div className="topbar-page-subtitle">{pageMeta.hint}</div>
              )}
=======
              <div className="topbar-page-title">{pageMeta.title}</div>
              <div className="topbar-page-subtitle">{pageMeta.hint}</div>
>>>>>>> origin/main
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button className="topbar-icon-btn" title="Notifications">
              🔔
              <span className="notif-dot" />
            </button>

            <NavLink
              to={profilePath}
              className="topbar-profile"
              style={{ textDecoration: 'none' }}
            >
              <div className="topbar-avatar">{initials(user?.name)}</div>
              <span className="topbar-profile-name">{user?.name?.split(' ')[0] || 'User'}</span>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
<<<<<<< HEAD
        <main className={`dash-content ${isStudentCoursesPage ? 'student-courses-content' : ''} ${isStudentExamsPage ? 'student-exams-content' : ''} ${isStudentQuizzesPage ? 'student-quizzes-content' : ''} ${isStudentNotesPage ? 'student-notes-content' : ''} ${isStudentAttendancePage ? 'student-attendance-content' : ''} ${role === 'teacher' && location.pathname === '/teacher' ? 'teacher-home-content' : ''}`}>
=======
        <main className={`dash-content ${role === 'teacher' && location.pathname === '/teacher' ? 'teacher-home-content' : ''}`}>
>>>>>>> origin/main
          {!(role === 'teacher' && ['/teacher', '/teacher/my-course', '/teacher/exams', '/teacher/results', '/teacher/performance', '/teacher/profile'].includes(location.pathname)
            || role === 'admin' && ['/admin/students', '/admin/teachers', '/admin/courses'].includes(location.pathname)) && (
            <div className="dash-welcome" role="region" aria-label="Welcome">
              <div className="dash-welcome-text">
<<<<<<< HEAD
                <h2>{isStudentAcademicPage ? pageMeta.title : `${greeting()}, ${firstName}`}</h2>
                <p>{pageMeta.hint}</p>
              </div>
              <div className="dash-welcome-meta">
                {role === 'student' ? 'ID:' : 'Role:'}{' '}
                <strong>{role === 'student' ? user?.studentId || '—' : userRole}</strong>
=======
                <h2>{greeting()}, {firstName}</h2>
                <p>{pageMeta.hint}</p>
              </div>
              <div className="dash-welcome-meta">
                Role: <strong>{userRole}</strong>
>>>>>>> origin/main
              </div>
            </div>
          )}
          {ROLE_ROUTES[role]}
        </main>
      </div>
    </div>
  );
}
