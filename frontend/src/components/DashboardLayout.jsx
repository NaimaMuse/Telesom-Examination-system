import NotificationBell from './NotificationBell';
import TelesomLogo from './TelesomLogo';
import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './dashboard.css';
import { PageSearchContext } from '../context/PageSearchContext';

// ─── Admin Pages ───────────────────────────────────────────────
import AdminDashboard    from '../pages/admin/AdminDashboard';
import StudentMgmt       from '../pages/admin/StudentMgmt';
import TeacherMgmt       from '../pages/admin/TeacherMgmt';
import CourseMgmt        from '../pages/admin/CourseMgmt';
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

const PAGE_META = {
  '/admin': { title: 'Admin Dashboard', hint: 'Overview of students, courses, exams, and reports.' },
  '/admin/students': { title: 'Student Management', hint: 'Add, edit, and manage student records.' },
  '/admin/teachers': { title: 'Teacher Management', hint: 'Manage faculty accounts and assignments.' },
  '/admin/courses': { title: 'Course Management', hint: 'Create and organize academic courses.' },
  '/admin/exams': { title: 'Exam & Quiz Management', hint: 'Schedule and configure assessments.' },
  '/admin/marks': { title: 'Marks & Results', hint: 'Review student marks and course results.' },
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
  '/student/exams': { title: 'Exams & Results', hint: 'Your marks, grades, and academic results.' },
  '/student/quizzes': { title: 'Quizzes', hint: 'Quiz scores and practice.' },
  '/student/notes': { title: 'Study Notes', hint: 'Notes shared by your teachers.' },
  '/student/attendance': { title: 'My Attendance', hint: 'Track your attendance across all courses.' },
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
  const [dataVersion, setDataVersion] = useState(0);
  const [showGreeting, setShowGreeting] = useState(true);
  useEffect(() => {
    setShowGreeting(true);
    const timer = setTimeout(() => setShowGreeting(false), 5000);
    return () => clearTimeout(timer);
  }, [user?._id]);
  const [pageSearch, setPageSearch] = useState({ path: location.pathname, query: '' });
  const search = pageSearch.path === location.pathname ? pageSearch.query : '';
  const setSearch = query => setPageSearch({ path: location.pathname, query });

  const navSections = NAV[role] || [];
  const userRole = role.toUpperCase();
  const pageMeta = getPageMeta(location.pathname);
  const firstName = user?.name?.split(' ')[0] || 'User';
  const isStudentCoursesPage = role === 'student' && location.pathname === '/student/courses';
  const isStudentExamsPage = role === 'student' && location.pathname === '/student/exams';
  const isStudentQuizzesPage = role === 'student' && location.pathname === '/student/quizzes';
  const isStudentNotesPage = role === 'student' && location.pathname === '/student/notes';
  const isStudentAttendancePage = role === 'student' && location.pathname === '/student/attendance';
  const profilePath = role === 'admin' ? '/admin' : `/${role}/profile`;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`dash-shell ${role === 'teacher' ? 'teacher-shell' : ''}`}>
      {showGreeting && <div className="dashboard-greeting-popup" role="status">
        <span className="dashboard-greeting-mark" aria-hidden="true">☀</span>
        <div><strong>{greeting()}, {firstName}</strong><p>Welcome to your {role} dashboard.</p></div>
        <button type="button" aria-label="Dismiss greeting" onClick={() => setShowGreeting(false)}>×</button>
      </div>}
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`dash-sidebar ${role === 'teacher' ? 'teacher-sidebar' : ''} ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <TelesomLogo size="lg" showText={false} />
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
              <div className="topbar-page-title">
                {pageMeta.title}
              </div>
              <div className="topbar-page-subtitle">{pageMeta.hint}</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
              <input
                type="text"
                placeholder={`Search ${pageMeta.title.toLowerCase()}…`}
                aria-label={`Search ${pageMeta.title}`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <NotificationBell key={user?._id || user?.id} userId={user?._id || user?.id} onNavigate={() => setDataVersion(value => value + 1)} />

            <NavLink
              to={profilePath}
              className="topbar-profile"
              aria-label="My profile"
              style={{ textDecoration: 'none' }}
            >
              <span className="topbar-profile-name" style={{ display: 'inline' }}>{userRole}</span>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className={`dash-content ${isStudentCoursesPage ? 'student-courses-content' : ''} ${isStudentExamsPage ? 'student-exams-content' : ''} ${isStudentQuizzesPage ? 'student-quizzes-content' : ''} ${isStudentNotesPage ? 'student-notes-content' : ''} ${isStudentAttendancePage ? 'student-attendance-content' : ''} ${role === 'teacher' && location.pathname === '/teacher' ? 'teacher-home-content' : ''}`}>
          <PageSearchContext.Provider key={`${user?._id || user?.id || 'anonymous'}:${dataVersion}`} value={[search, setSearch]}>{ROLE_ROUTES[role]}</PageSearchContext.Provider>
        </main>
      </div>
    </div>
  );
}
