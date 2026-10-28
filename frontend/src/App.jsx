import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import RoleRedirect from './pages/RoleRedirect';
import DashboardLayout from './components/DashboardLayout';

/**
 * App — root router + auth context wrapper.
 *
 * Routes:
 *   /           → redirect to /login
 *   /login      → LoginPage (public)
 *   /signup     → SignupPage (public)
 *   /dashboard  → RoleRedirect (protected, redirects based on role)
 *   /admin/*    → Admin dashboards (protected, role=admin)
 *   /teacher/*  → Teacher dashboards (protected, role=teacher)
 *   /student/*  → Student dashboards (protected, role=student)
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Default: redirect root to /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
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
  );
}
