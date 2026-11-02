import AcademyHeader from './AcademyHeader';
import api from '../services/api';
import TeachingIcon from './TeachingIcon';
import {AcademyReports,BatchManagement,CourseOutlines,MakeupClasses} from './AcademyWorkspace';
import TeacherContracts from './TeacherContracts';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationBell from './NotificationBell';
import TelesomLogo from './TelesomLogo';
import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './dashboard.css';
import './dashboard-theme.css';
import './AcademySidebar.css';
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

import '../pages/teacher/TeacherDashboardLayout.css';
import '../pages/teacher/TeacherDashboardReference.css';

function DashboardContentFrame({active, children}) {
  return active ? <div className="dashboard-main">{children}</div> : children;
}

// ─── Nav config per role ─────────────────────────────────────────
const NAV = {
  admin: [
    {
      section: 'Overview',
      items: [
        { to: '/admin',            label: 'Dashboard',         icon: 'grid', end: true },
      ],
    },
    {
      section: 'Management',
      items: [
        { to: '/admin/students',   label: 'Student Management', icon: 'graduate' },
        { to: '/admin/teachers',   label: 'Teacher Management', icon: 'teacher' },
        { to: '/admin/batches', label: 'Years & Batches', icon: 'reschedule' },
        { to: '/admin/courses',    label: 'Course Management',  icon: 'book' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { to: '/admin/exams',      label: 'Exam & Quiz Mgmt',  icon: 'clipboard' },
        { to: '/admin/marks',      label: 'Marks & Results',   icon: 'chart' },
        { to: '/admin/attendance', label: 'Attendance',         icon: 'calendar' },
        { to: '/admin/reports', label: 'Reports Center', icon: 'file' },
        { to: '/admin/outlines', label: 'Teaching & Outlines', icon: 'book' },
        { to: '/admin/makeup', label: 'Makeup Classes', icon: 'reschedule' },
        { to: '/admin/analytics',  label: 'Analytics & Reports',icon: 'chart' },
      ],
    },
  ],
  teacher: [
    {
      section: 'Overview',
      items: [
        { to: '/teacher', label: 'Dashboard', icon: 'grid', end: true },
        { to: '/teacher/my-course', label: 'My Course', icon: 'book' },
        { to: '/teacher/exams', label: 'Exams & Quizzes', icon: 'clipboard' },
        { to: '/teacher/results', label: 'Results & Marks', icon: 'clipboard' },
        { to: '/teacher/performance', label: 'Student Performance', icon: 'chart' },
        { to: '/teacher/makeup', label: 'Makeup Classes', icon: 'reschedule' },
        { to: '/teacher/profile', label: 'My Profile', icon: 'profile' },
      ],
    },
  ],
  student: [
    {
      section: 'Overview',
      items: [
        { to: '/student',           label: 'Dashboard',       icon: 'grid', end: true },
      ],
    },
    {
      section: 'Academics',
      items: [
        { to: '/student/courses',   label: 'My Courses',      icon: 'book' },
        { to: '/student/exams',     label: 'Exams & Results', icon: 'chart' },
        { to: '/student/quizzes',   label: 'Quizzes',         icon: 'clipboard' },
        { to: '/student/makeup', label: 'Makeup Classes', icon: 'reschedule' },
        { to: '/student/outlines', label: 'Course Outlines', icon: 'book' },
        { to: '/student/notes',     label: 'Study Notes',     icon: 'file' },
        { to: '/student/attendance',label: 'Attendance',      icon: 'calendar' },
      ],
    },
    {
      section: 'Account',
      items: [
        { to: '/student/profile',   label: 'My Profile',      icon: 'profile' },
      ],
    },
  ],
};

function LegacyTeachingRedirect({tab='outline'}) {
  const location=useLocation();const params=new URLSearchParams(location.search);params.set('tab',tab);
  return <Navigate to={'/teacher/my-course?'+params.toString()} replace/>;
}

const ROLE_ROUTES = {
  admin: (
    <Routes>
      <Route index            element={<AdminDashboard />} />
      <Route path="students"  element={<StudentMgmt />} />
      <Route path="teachers"  element={<TeacherMgmt />} />
      <Route path="reports" element={<AcademyReports />} />
      <Route path="batches" element={<BatchManagement />} />
      <Route path="outlines" element={<TeacherContracts admin combined />} />
      <Route path="makeup" element={<MakeupClasses role="admin" />} />
      <Route path="contracts" element={<TeacherContracts admin combined />} />
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
      <Route path="my-course/outline" element={<MyCourse outlinePage />} />
      <Route path="exams"     element={<TeacherExams />} />
      <Route path="results"  element={<TeacherResults />} />
      <Route path="performance" element={<TeacherPerformance />} />
      <Route path="outlines" element={<LegacyTeachingRedirect />} />
      <Route path="contracts" element={<LegacyTeachingRedirect tab="overview" />} />
      <Route path="makeup" element={<MakeupClasses role="teacher" />} />
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
      <Route path="makeup" element={<MakeupClasses role="student" />} />
      <Route path="outlines" element={<CourseOutlines role="student" />} />
      <Route path="profile"     element={<StudentProfile />} />
      <Route path="*"           element={<Navigate to="/student" replace />} />
    </Routes>
  ),
};

const PAGE_META = {
  '/teacher/my-course/outline': {title:'Course Planner',hint:'Plan lessons, organize topics and track teaching progress.'},
  '/admin/reports': {title:'Reports Center',hint:'Filtered academy reports and exports.'},
  '/admin/batches': {title:'Years & Batches',hint:'Organize enrollments by academic year and batch.'},
  '/admin/outlines': {title:'Teaching & Outlines',hint:'Contract days, course plans and lesson progress.'},
  '/admin/makeup': {title:'Makeup Classes',hint:'Schedule replacements for missed lessons.'},
  '/teacher/outlines': {title:'Teaching & Outlines',hint:'Your contract and course plan in one workspace.'},
  '/teacher/makeup': {title:'Makeup Classes',hint:'Your assigned replacement lessons.'},
  '/student/outlines': {title:'Course Outlines',hint:'Published lessons and course progress.'},
  '/admin': { title: 'Admin Dashboard', hint: 'Overview of students, courses, exams, and reports.' },
  '/admin/students': { title: 'Student Management', hint: 'Add, edit, and manage student records.' },
  '/admin/contracts': { title: 'Teacher Contracts', hint: 'Monitor completed teaching days and contract balances.' },
  '/admin/teachers': { title: 'Teacher Management', hint: 'Manage faculty accounts and assignments.' },
  '/admin/courses': { title: 'Course Management', hint: 'Create and organize academic courses.' },
  '/admin/exams': { title: 'Exam & Quiz Management', hint: 'Schedule and configure assessments.' },
  '/admin/marks': { title: 'Marks & Results', hint: 'Review student marks and course results.' },
  '/admin/attendance': { title: 'Attendance', hint: 'Track and review class attendance.' },
  '/admin/analytics': { title: 'Analytics & Reports', hint: 'Insights and performance summaries.' },
  '/teacher': { title: 'Teacher Dashboard', hint: 'Your courses, exams, and class at a glance.' },
  '/teacher/my-course': { title: 'My Course', hint: 'Course information, outlines, materials, students and assessments.' },
  '/teacher/exams': { title: 'Exams & Quizzes', hint: 'Create and manage assessments.' },
  '/teacher/results': { title: 'Result', hint: 'Enter and review results for your enrolled students.' },
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
  const teacherHome = role === 'teacher' && location.pathname === '/teacher';
  const [teacherAvatar, setTeacherAvatar] = useState('');
  useEffect(() => {
    setTeacherAvatar('');
    if (role !== 'teacher') return;
    const controller = new AbortController();
    api.get('/teacher/profile', {signal:controller.signal}).then(({data}) => {
      if (!controller.signal.aborted) setTeacherAvatar(data.teacher?.profilePicture || '');
    }).catch(() => {});
    return () => controller.abort();
  }, [role, user?._id, location.pathname]);
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

  const staffSidebar = role === 'admin' || role === 'teacher';
  const navSections = staffSidebar
    ? [{ section: 'Navigation', items: NAV[role].flatMap(section => section.items) }]
    : NAV[role] || [];
  const userRole = role.toUpperCase();
  const pageMeta = getPageMeta(location.pathname);
  const firstName = user?.name?.split(' ')[0] || 'User';
  const isStudentCoursesPage = role === 'student' && location.pathname === '/student/courses';
  const isStudentExamsPage = role === 'student' && location.pathname === '/student/exams';
  const isStudentQuizzesPage = role === 'student' && location.pathname === '/student/quizzes';
  const isStudentNotesPage = role === 'student' && location.pathname === '/student/notes';
  const isStudentAttendancePage = role === 'student' && location.pathname === '/student/attendance';
  const isStudentAcademicPage = isStudentCoursesPage || isStudentExamsPage || isStudentQuizzesPage || isStudentNotesPage || isStudentAttendancePage;
  const isTeacherMyCoursePage = role === 'teacher' && location.pathname === '/teacher/my-course';
  const isTeacherExamsPage = role === 'teacher' && location.pathname === '/teacher/exams';
  const showGreetingInTopbar = isStudentAcademicPage;
  const hideTopbarSubtitle = showGreetingInTopbar || isTeacherMyCoursePage || isTeacherExamsPage;
  const topbarTitle = isTeacherMyCoursePage
    ? 'Course overview'
    : isTeacherExamsPage
      ? 'Exams & Quizzes'
      : showGreetingInTopbar
        ? `${greeting()}, ${firstName}`
        : pageMeta.title;
  const profilePath = role === 'admin' ? '/admin' : `/${role}/profile`;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`dash-shell ${role === 'teacher' ? 'teacher-shell' : ''} ${teacherHome ? 'teacher-dashboard-shell' : ''} ${sidebarOpen ? 'academy-menu-open' : ''} ${teacherHome && sidebarOpen ? 'teacher-dashboard-collapsed' : ''} ${role === 'admin' && location.pathname === '/admin' ? 'admin-home-shell' : ''}`}>
      {role === 'teacher' && user?.mustChangePassword && <ChangePasswordModal required onSignOut={handleLogout} />}
      {showGreeting && !teacherHome && !user?.mustChangePassword && <div className="dashboard-greeting-popup" role="status">
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
      <aside className={`dash-sidebar academy-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <TelesomLogo size="lg" showText={false} />
          <div className="sidebar-brand-text">
            <strong>Telesom Academy</strong>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.section}>
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
                    <span className="sidebar-link-icon"><TeachingIcon name={item.icon} size={21}/></span>
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
                    <span className="sidebar-link-icon"><TeachingIcon name={item.icon} size={21}/></span>
                    {item.label}
                  </NavLink>
                )
              ))}
            </div>
          ))}
          {<button type="button" className="sidebar-link sidebar-link-button academy-sidebar-signout" onClick={handleLogout}><span className="sidebar-link-icon"><TeachingIcon name="arrow" size={21}/></span>Sign Out</button>}
        </nav>

        {<><div className="teacher-sidebar-motto"><TeachingIcon name="graduate" size={48}/><p>Learn <span>•</span> Excel <span>•</span> Achieve</p></div><svg className="teacher-sidebar-wave" viewBox="0 0 250 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18C65 72 125 66 250 108V120H0Z" fill="#E5A500"/><path d="M0 38C72 95 160 78 250 112V120H0Z" fill="#087A43"/><path d="M0 52C78 105 170 88 250 116V120H0Z" fill="#003d24"/></svg></>}
      </aside>

      {/* ── Main ── */}
      <div className="dash-main">
        <DashboardContentFrame active={teacherHome}>
        {/* Top Bar */}
        <AcademyHeader role={role} user={user} avatar={role==='teacher' ? teacherAvatar : user?.profilePicture || ''} onToggleMenu={()=>setSidebarOpen(previous=>!previous)} onLogout={handleLogout} search={search} onSearch={setSearch} pageTitle={pageMeta.title} onNotificationNavigate={()=>setDataVersion(value=>value+1)} />

        {/* Page content */}
        <main className={`dash-content ${isStudentCoursesPage ? 'student-courses-content' : ''} ${isStudentExamsPage ? 'student-exams-content' : ''} ${isStudentQuizzesPage ? 'student-quizzes-content' : ''} ${isStudentNotesPage ? 'student-notes-content' : ''} ${isStudentAttendancePage ? 'student-attendance-content' : ''} ${role === 'teacher' && location.pathname === '/teacher' ? 'teacher-home-content dashboard-content' : ''}`}>
          <PageSearchContext.Provider key={`${user?._id || user?.id || 'anonymous'}:${dataVersion}`} value={[search, setSearch]}>{ROLE_ROUTES[role]}</PageSearchContext.Provider>
        </main>
        </DashboardContentFrame>
      </div>
    </div>
  );
}
