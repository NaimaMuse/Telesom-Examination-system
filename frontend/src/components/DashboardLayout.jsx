import TeacherAttendance from '../pages/admin/TeacherAttendance';
import Judges from '../pages/admin/Judges';
import TeacherStudents from '../pages/teacher/TeacherStudents';
import Evaluations, { NewEvaluation } from './Evaluations';
import {EvaluationCenter,ProjectDefenseEditor,ProjectDefenseList} from './ProjectDefenses';
import DefenseWorkflow from './DefenseWorkflow';
import AcademyHeader from './AcademyHeader';
import api from '../services/api';
import TeachingIcon from './TeachingIcon';
import {AcademyReports,CohortManagement,CourseOutlines,MakeupClasses} from './AcademyWorkspace';
import TeacherContracts from './TeacherContracts';
import NotificationBell from './NotificationBell';
import TelesomLogo from './TelesomLogo';
import StudentPageHeader from './StudentPageHeader';
import { useState, useEffect } from 'react';
import { Link, NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './dashboard.css';
import './dashboard-theme.css';
import './AcademySidebar.css';
import { PageSearchContext } from '../context/PageSearchContext';

// ─── Admin Pages ───────────────────────────────────────────────
import AdminDashboard    from '../pages/admin/AdminDashboard';
import AdminProfile     from '../pages/admin/AdminProfile';
import StudentMgmt       from '../pages/admin/StudentMgmt';
import Internships       from '../pages/admin/Internships';
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
import { StudentAssessments, StudentAwards } from '../pages/student/StudentAcademicPages';
import StudentNotes      from '../pages/student/StudentNotes';
import StudentAttendance from '../pages/student/StudentAttendance';
import StudentProfile    from '../pages/student/StudentProfile';
import Certificates from '../pages/Certificates';

import '../pages/teacher/TeacherDashboardLayout.css';
import '../pages/teacher/TeacherDashboardReference.css';
import '../pages/admin/AcademicRecordsDesign.css';
import '../pages/admin/AdminOutlinesDesign.css';
import '../pages/admin/AnalyticsMakeupDesign.css';
import './TeacherShellDesign.css';

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
        { to: '/admin/cohorts', label: 'Years & Cohorts', icon: 'reschedule' },
        { to: '/admin/courses',    label: 'Course Management',  icon: 'book' },
      ],
    },
    {
      section: 'Academic',
      items: [
        { to: '/admin/exams',      label: 'Exam & Quiz Mgmt',  icon: 'clipboard' },
        { to: '/admin/evaluation-center', label: 'Evaluation Center', icon: 'clipboard' },
        { to: '/admin/evaluations', label: 'Course Feedback Forms', icon: 'file', end: true },
        { to: '/admin/project-defenses', label: 'Project Defense', icon: 'chart' },
        { to: '/admin/marks',      label: 'Marks & Results',   icon: 'chart' },
        { to: '/admin/attendance', label: 'Attendance',         icon: 'calendar' },
        { to: '/admin/outlines', label: 'Teaching & Outlines', icon: 'book' },
        { to: '/admin/makeup', label: 'Makeup Classes', icon: 'reschedule' },
        { to: '/admin/internships', label: 'Internships', icon: 'briefcase' },
        { to: '/admin/certificates', label: 'Certificates', icon: 'graduate' },
        { to: '/admin/judges', label: 'Judges', icon: 'users' },
      ],
    },
    {
      section: 'Analytics',
      items: [
        { to: '/admin/reports', label: 'Reports Center', icon: 'file' },
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
        { to: '/teacher/project-defenses', label: 'Project Defense', icon: 'clipboard' },
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
        { to: '/student/results', label: 'Results & Certificates', icon: 'graduate' },
        { to: '/student/assessments', label: 'Exams & Quizzes', icon: 'chart' },
        { to: '/student/evaluations', label: 'Evaluation Forms', icon: 'clipboard' },
        { to: '/student/attendance',label: 'Attendance',      icon: 'calendar' },
        { to: '/student/makeup', label: 'Makeup Classes', icon: 'reschedule' },
      ],
    },
    {
      section: 'Account',
      items: [
        { to: '/student/profile',   label: 'My Profile',      icon: 'profile' },
      ],
    },
  ],
  judge: [
    {
      section: 'Project Defense',
      items: [
        { to: '/judge/project-defenses', label: 'Assigned Evaluations', icon: 'clipboard' },
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
      <Route path="profile" element={<AdminProfile />} />
      <Route path="evaluation-center" element={<EvaluationCenter admin />} />
      <Route path="evaluations" element={<Evaluations admin />} />
      <Route path="evaluations/new" element={<NewEvaluation />} />
      <Route path="evaluations/:id" element={<Evaluations admin />} />
      <Route path="project-defenses" element={<Navigate to="workflow" replace />} />
      <Route path="project-defenses/workflow" element={<DefenseWorkflow />} />
      <Route path="project-defenses/workflow/:kind/:id" element={<DefenseWorkflow />} />
      <Route path="project-defenses/legacy" element={<ProjectDefenseList />} />
      <Route path="project-defenses/new" element={<ProjectDefenseEditor />} />
      <Route path="project-defenses/:id" element={<ProjectDefenseEditor />} />
      <Route path="students"  element={<StudentMgmt />} />
      <Route path="internships" element={<Internships />} />
      <Route path="teachers"  element={<TeacherMgmt />} />
      <Route path="reports" element={<AcademyReports />} />
      <Route path="cohorts" element={<CohortManagement />} />
      <Route path="batches" element={<Navigate to="/admin/cohorts" replace />} />
      <Route path="outlines" element={<div className="admin-outlines-page"><TeacherContracts admin combined workspaceMode="outline" /></div>} />
      <Route path="makeup" element={<div className="admin-makeup-design"><MakeupClasses role="admin" /></div>} />
      <Route path="contracts" element={<TeacherContracts admin combined />} />
      <Route path="courses"   element={<CourseMgmt />} />
      <Route path="certificates" element={<Certificates key="admin-certificates" admin />} />
      <Route path="exams"     element={<ExamMgmt />} />
      <Route path="marks"     element={<MarksMgmt />} />
      <Route path="attendance"element={<AttendanceMgmt />} />
      <Route path="teacher-attendance" element={<TeacherAttendance />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="judges" element={<Judges />} />
      <Route path="*"         element={<Navigate to="/admin" replace />} />
    </Routes>
  ),
  teacher: (
    <Routes>
      <Route index              element={<TeacherDashboard />} />
      <Route path="my-course"  element={<MyCourse />} />
      <Route path="students" element={<TeacherStudents />} />
      <Route path="my-course/outline" element={<MyCourse outlinePage />} />
      <Route path="exams"     element={<TeacherExams />} />
      <Route path="evaluations/new" element={<ProjectDefenseEditor />} />
      <Route path="evaluation-center" element={<EvaluationCenter />} />
      <Route path="project-defenses" element={<Navigate to="workflow" replace />} />
      <Route path="project-defenses/workflow" element={<DefenseWorkflow />} />
      <Route path="project-defenses/workflow/:kind/:id" element={<DefenseWorkflow />} />
      <Route path="project-defenses/legacy" element={<ProjectDefenseList />} />
      <Route path="project-defenses/new" element={<ProjectDefenseEditor />} />
      <Route path="project-defenses/:id" element={<ProjectDefenseEditor />} />
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
      <Route path="evaluations" element={<Evaluations />} />
      <Route path="evaluations/:id" element={<Evaluations />} />
      <Route path="courses"     element={<StudentCourses />} />
      <Route path="results"     element={<StudentAwards />} />
      <Route path="assessments" element={<StudentAssessments />} />
      <Route path="certificates" element={<Navigate to="/student/results?tab=certificates" replace />} />
      <Route path="exams"       element={<Navigate to="/student/results" replace />} />
      <Route path="quizzes"     element={<Navigate to="/student/assessments?tab=quizzes" replace />} />
      <Route path="notes"       element={<StudentNotes />} />
      <Route path="attendance"  element={<StudentAttendance />} />
      <Route path="makeup" element={<MakeupClasses role="student" />} />
      <Route path="outlines" element={<CourseOutlines role="student" />} />
      <Route path="profile"     element={<StudentProfile />} />
      <Route path="*"           element={<Navigate to="/student" replace />} />
    </Routes>
  ),
  judge: (
    <Routes>
      <Route index element={<Navigate to="/judge/project-defenses" replace />} />
      <Route path="project-defenses" element={<Navigate to="workflow" replace />} />
      <Route path="project-defenses/workflow" element={<DefenseWorkflow />} />
      <Route path="project-defenses/workflow/:kind/:id" element={<DefenseWorkflow />} />
      <Route path="project-defenses/legacy" element={<ProjectDefenseList />} />
      <Route path="project-defenses/:id" element={<ProjectDefenseEditor />} />
      <Route path="*" element={<Navigate to="/judge/project-defenses" replace />} />
    </Routes>
  ),
};

const PAGE_META = {
  '/admin/judges': {title:'Judges',hint:'Create judge accounts and assign project defense evaluations.'},
  '/admin/evaluation-center': {title:'Evaluation Center',hint:'Coordinate project defense reviews between teachers and Admin.'},
  '/admin/evaluations': {title:'Course Feedback Forms',hint:'Manage course evaluations and review student feedback.'},


  '/admin/evaluations/new': {title:'Project Defense',hint:'Create or open a project defense evaluation.'},
  '/admin/project-defenses': {title:'Project Defenses',hint:'Evaluate student project presentations.'},
  '/teacher/evaluation-center': {title:'Project Defense',hint:'Evaluate student projects and submit completed assessments to Admin.'},
  '/teacher/evaluations/new': {title:'Project Defense',hint:'Create or open a project defense evaluation.'},
  '/teacher/project-defenses': {title:'Project Defenses',hint:'Evaluate student project presentations.'},
  '/judge/project-defenses': {title:'Assigned Evaluations',hint:'Evaluate the project defenses assigned to you.'},
  '/student/evaluations': {title:'Evaluation Forms',hint:'Share feedback on your courses and learning experience.'},
  '/teacher/my-course/outline': {title:'Course Planner',hint:'Plan lessons, organize topics and track teaching progress.'},
  '/admin/reports': {title:'Reports Center',hint:'Filtered academy reports and exports.'},
  '/admin/cohorts': {title:'Years & Cohorts',hint:'Organize enrollments by academic year and cohort.'},
  '/admin/outlines': {title:'Teaching & Outlines',hint:'Contract days, course plans and lesson progress.'},
  '/admin/makeup': {title:'Makeup Classes',hint:'Schedule replacements for missed lessons.'},
  '/teacher/outlines': {title:'Teaching & Outlines',hint:'Your contract and course plan in one workspace.'},
  '/teacher/makeup': {title:'Makeup Classes',hint:'Your assigned replacement lessons.'},
  '/student/outlines': {title:'Course Outlines',hint:'Explore published lessons and track your course progress.'},
  '/student/makeup': {title:'Makeup Classes',hint:'View course makeup notices and check the cohort listed on each class.'},
  '/admin': { title: 'Admin Dashboard', hint: 'Overview of students, courses, exams, and reports.' },
  '/admin/profile': { title: 'My Account', hint: 'Update your administrator email and password.' },
  '/admin/students': { title: 'Student Management', hint: 'Add, edit, and manage student records.' },
  '/admin/internships': { title: 'Internships', hint: 'Record internship students and their placement dates.' },
  '/admin/contracts': { title: 'Teacher Contracts', hint: 'Monitor completed teaching days and contract balances.' },
  '/admin/teachers': { title: 'Teacher Management', hint: 'Manage faculty accounts and assignments.' },
  '/admin/courses': { title: 'Course Management', hint: 'Create and organize academic courses.' },
  '/admin/certificates': { title: 'Certificates', hint: 'Issue certificates for completed courses.' },
  '/admin/exams': { title: 'Exam & Quiz Management', hint: 'Schedule and configure assessments.' },
  '/admin/marks': { title: 'Marks & Results', hint: 'Review student marks and course results.' },
  '/admin/teacher-attendance': { title: 'Teacher Attendance', hint: 'Mark attendance and schedule makeup classes.' },
  '/admin/attendance': { title: 'Attendance', hint: 'Track and review class attendance.' },
  '/admin/analytics': { title: 'Analytics & Reports', hint: 'Insights and performance summaries.' },
  '/teacher': { title: 'Teacher Dashboard', hint: 'Your courses, exams, and class at a glance.' },
  '/teacher/students': { title: 'Students', hint: 'Students enrolled in your assigned courses.' },
  '/teacher/my-course': { title: 'My Course', hint: 'Course information, outlines, materials, students and assessments.' },
  '/teacher/exams': { title: 'Exams & Quizzes', hint: 'Create and manage assessments.' },
  '/teacher/results': { title: 'Result', hint: 'Enter and review results for your enrolled students.' },
  '/teacher/performance': { title: 'Student Performance', hint: 'Scores, trends, and progress.' },
  '/teacher/profile': { title: 'My Profile', hint: 'Your account and contact details.' },
  '/student': { title: 'Student Dashboard', hint: 'See your courses, progress, and upcoming classes at a glance.' },
  '/student/courses': { title: 'My Courses', hint: 'Find your classes, follow lessons, and download study materials.' },
  '/student/results': { title: 'Results & Certificates', hint: 'Review your published marks and earned certificates.' },
  '/student/assessments': { title: 'Exams & Quizzes', hint: 'See upcoming exams and quizzes so you can prepare.' },
  '/student/notes': { title: 'Study Notes', hint: 'Browse study materials shared by your teachers.' },
  '/student/attendance': { title: 'My Attendance', hint: 'Review your class attendance and track your progress.' },
  '/student/profile': { title: 'My Profile', hint: 'Manage your personal information and student account.' },
};

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const match = Object.keys(PAGE_META)
    .filter((p) => p !== `/${pathname.split('/')[1]}` && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_META[match] : { title: 'Dashboard', hint: 'Telesom Academy portal.' };
}

function getStudentPageMeta(pathname, search) {
  if (pathname === '/student' || pathname === '/student/evaluations') return null;

  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const page = getPageMeta(pathname);

  if (pathname === '/student/courses') {
    if (tab === 'outline') return {title:'Course Outline',hint:'Follow published lessons and track your course progress.',variant:'courses'};
    if (tab === 'notes') return {title:'Study Notes',hint:'Browse and download study materials shared by your teachers.',variant:'notes'};
    return {...page,variant:'courses'};
  }
  if (pathname === '/student/assessments') {
    if (tab === 'quizzes') return {title:'Quizzes',hint:'Review your upcoming quizzes and prepare for each assessment.',variant:'assessments'};
    return {...page,variant:'assessments'};
  }
  if (pathname === '/student/makeup') return {...page,variant:'makeup'};
  if (pathname === '/student/results') {
    if (tab === 'certificates') return {title:'My Certificates',hint:'View and download certificates you have earned.',variant:'results'};
    return {...page,variant:'results'};
  }
  if (pathname.startsWith('/student/evaluations/')) {
    return {title:'Course Evaluation',hint:'Share your feedback on your learning experience.',variant:'evaluations'};
  }
  return {...page,variant:'default'};
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

  const navSections = NAV[role] || [];
  const userRole = role.toUpperCase();
  const pageMeta = getPageMeta(location.pathname);
  const studentPageMeta = role === 'student' ? getStudentPageMeta(location.pathname, location.search) : null;
  const firstName = user?.name?.split(' ')[0] || 'User';
  const isStudentCoursesPage = role === 'student' && location.pathname === '/student/courses';
  const isStudentAssessmentPage = role === 'student' && ['/student/assessments', '/student/results'].includes(location.pathname);
  const isStudentNotesPage = role === 'student' && location.pathname === '/student/notes';
  const isStudentAttendancePage = role === 'student' && location.pathname === '/student/attendance';
  const isStudentAcademicPage = isStudentCoursesPage || isStudentAssessmentPage || isStudentNotesPage || isStudentAttendancePage;
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      window.alert('Could not sign out. Please try again.');
    }
  };

  return (
    <div className={`dash-shell ${role === 'teacher' ? 'teacher-shell' : ''} ${teacherHome ? 'teacher-dashboard-shell' : ''} ${sidebarOpen ? 'academy-menu-open' : ''} ${teacherHome && sidebarOpen ? 'teacher-dashboard-collapsed' : ''} ${role === 'admin' && location.pathname === '/admin' ? 'admin-home-shell' : ''}`}>
      {showGreeting && !teacherHome && <div className="dashboard-greeting-popup" role="status">
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
        <Link to="/" className="sidebar-brand" aria-label="Telesom Academy home" onClick={() => setSidebarOpen(false)}>
          <TelesomLogo size="lg" showText={false} />
          <div className="sidebar-brand-text">
            <strong>Telesom Academy</strong>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.section}>
              {role === 'admin' && <h2 className="sidebar-section-label">{section.section}</h2>}
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
                      `sidebar-link ${isActive || (item.to === '/'+role+'/evaluations/new' && /^\/(admin|teacher)\/project-defenses(?:\/|$)/.test(location.pathname)) ? 'active' : ''}`
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

        {<><div className="teacher-sidebar-motto"><TeachingIcon name="graduate" size={48}/><p>Learn Today, Lead Tomorrow</p></div><svg className="teacher-sidebar-wave" viewBox="0 0 250 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18C65 72 125 66 250 108V120H0Z" fill="#E5A500"/><path d="M0 38C72 95 160 78 250 112V120H0Z" fill="#087A43"/><path d="M0 52C78 105 170 88 250 116V120H0Z" fill="#003d24"/></svg></>}
      </aside>

      {/* ── Main ── */}
      <div className={role === 'student' ? 'dash-main student-dashboard-main' : 'dash-main'}>
        <DashboardContentFrame active={role === 'teacher'}>
        {/* Top Bar */}
        <AcademyHeader role={role} user={user} avatar={role==='teacher' ? teacherAvatar : user?.profilePicture || ''} onToggleMenu={()=>setSidebarOpen(previous=>!previous)} onLogout={handleLogout} search={search} onSearch={setSearch} pageTitle={pageMeta.title} onNotificationNavigate={()=>setDataVersion(value=>value+1)} />

        {studentPageMeta && <StudentPageHeader {...studentPageMeta}/>}

        {/* Page content */}
        <main className={`dash-content ${isStudentCoursesPage ? 'student-courses-content' : ''} ${isStudentNotesPage ? 'student-notes-content' : ''} ${isStudentAttendancePage ? 'student-attendance-content' : ''} ${role === 'teacher' && location.pathname === '/teacher' ? 'teacher-home-content dashboard-content' : ''}`}>
          <PageSearchContext.Provider key={`${user?._id || user?.id || 'anonymous'}:${dataVersion}`} value={[search, setSearch]}>{ROLE_ROUTES[role]}</PageSearchContext.Provider>
        </main>
        </DashboardContentFrame>
      </div>
    </div>
  );
}
