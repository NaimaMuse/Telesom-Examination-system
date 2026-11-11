import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import AdminLoginPage from './pages/admin/AdminLogin';
import RoleRedirect from './pages/RoleRedirect';
import DashboardLayout from './components/DashboardLayout';

class AppErrorBoundary extends Component {
  state = { failed:false };

  static getDerivedStateFromError() {
    return {failed:true};
  }

  render() {
    if (this.state.failed) {
      return <main className="card card-body" role="alert">
        <h1>This page could not load</h1>
        <button className="btn btn-primary" type="button" onClick={()=>window.location.reload()}>Reload page</button>
      </main>;
    }
    return this.props.children;
  }
}

/**
 * App — root router + auth context wrapper.
 *
 * Routes:
 *   /           → redirect to /staff/login
 *   /login      → LoginPage (public)
 *   /signup     → SignupPage (public)
 *   /dashboard  → RoleRedirect (protected, redirects based on role)
 *   /admin/*    → Admin dashboards (protected, role=admin)
 *   /teacher/*  → Teacher dashboards (protected, role=teacher)
 *   /student/*  → Student dashboards (protected, role=student)
 */
export default function App() {
  return (
    <AppErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Default: open staff sign-in */}
          <Route path="/" element={<Navigate to="/staff/login" replace />} />

          {/* Public Authentication Pages */}
          <Route path="/login" element={<LoginPage key="student" />} />
          <Route path="/student/forgot-password" element={<LoginPage key="student-recovery" recovery />} />
          <Route path="/staff/login" element={<LoginPage key="staff" staff />} />
          <Route path="/staff/forgot-password" element={<LoginPage key="staff-recovery" staff recovery />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />

          {/* Protected base redirect based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          {/* Admin area */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={['admin']}>
                <DashboardLayout role="admin" />
              </ProtectedRoute>
            }
          />

          {/* Teacher area */}
          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute roles={['teacher']}>
                <DashboardLayout role="teacher" />
              </ProtectedRoute>
            }
          />

          {/* Student area */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute roles={['student']}>
                <DashboardLayout role="student" />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </AppErrorBoundary>
  );
}
