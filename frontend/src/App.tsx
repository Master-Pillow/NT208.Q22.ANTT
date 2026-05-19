import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell, routeForRole } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Unauthorized } from './components/layout/Unauthorized';

const LoginPage = lazy(() => import('./views/LoginPage'));

const AdminDashboardPage = lazy(() => import('./views/admin/DashboardPage'));
const AdminStudentsPage = lazy(() => import('./views/admin/StudentsPage'));
const AdminClassesPage = lazy(() => import('./views/admin/ClassesPage'));
const AdminAdvisorsPage = lazy(() => import('./views/admin/AdvisorsPage'));
const AdminCoursesPage = lazy(() => import('./views/admin/CoursesPage'));
const AdminAiHubPage = lazy(() => import('./views/admin/AiHubPage'));
const AdminAiAnomalyPage = lazy(() => import('./views/admin/AiAnomalyPage'));
const AdminAiBriefPage = lazy(() => import('./views/admin/AiBriefPage'));
const AdminAiQueryPage = lazy(() => import('./views/admin/AiQueryPage'));
const AdminAiPatternsPage = lazy(() => import('./views/admin/AiPatternsPage'));

const AdvisorDashboardPage = lazy(() => import('./views/advisor/DashboardPage'));
const AdvisorStudentsPage = lazy(() => import('./views/advisor/StudentsPage'));
const AdvisorAppointmentsPage = lazy(() => import('./views/advisor/AppointmentsPage'));
const AdvisorMessagesPage = lazy(() => import('./views/advisor/MessagesPage'));
const AdvisorAiAnomalyPage = lazy(() => import('./views/advisor/AiAnomalyPage'));
const AdvisorAiBriefPage = lazy(() => import('./views/advisor/AiBriefPage'));

const StudentProfilePage = lazy(() => import('./views/student/ProfilePage'));
const StudentGradesPage = lazy(() => import('./views/student/GradesPage'));
const StudentAppointmentsPage = lazy(() => import('./views/student/AppointmentsPage'));
const StudentMessagesPage = lazy(() => import('./views/student/MessagesPage'));
const StudentNotificationsPage = lazy(() => import('./views/student/NotificationsPage'));

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center text-primary">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);

const HomeRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  return <Navigate to={isAuthenticated ? routeForRole(role) : '/login'} replace />;
};

const GuardedShell = ({ roles }: { roles: string[] }) => (
  <ProtectedRoute allowedRoles={roles}>
    <AppShell />
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<HomeRedirect />} />

            <Route path="/admin" element={<GuardedShell roles={['ADMIN']} />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="classes" element={<AdminClassesPage />} />
              <Route path="advisors" element={<AdminAdvisorsPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="ai" element={<AdminAiHubPage />} />
              <Route path="ai/anomaly" element={<AdminAiAnomalyPage />} />
              <Route path="ai/brief" element={<AdminAiBriefPage />} />
              <Route path="ai/query" element={<AdminAiQueryPage />} />
              <Route path="ai/patterns" element={<AdminAiPatternsPage />} />
            </Route>

            <Route path="/advisor" element={<GuardedShell roles={['ADVISOR']} />}>
              <Route index element={<Navigate to="/advisor/dashboard" replace />} />
              <Route path="dashboard" element={<AdvisorDashboardPage />} />
              <Route path="students" element={<AdvisorStudentsPage />} />
              <Route path="students/:studentId" element={<AdvisorStudentsPage />} />
              <Route path="students/class/:classCode" element={<AdvisorStudentsPage />} />
              <Route path="appointments" element={<AdvisorAppointmentsPage />} />
              <Route path="messages" element={<AdvisorMessagesPage />} />
              <Route path="ai/anomaly" element={<AdvisorAiAnomalyPage />} />
              <Route path="ai/brief" element={<AdvisorAiBriefPage />} />
            </Route>

            <Route path="/student" element={<GuardedShell roles={['STUDENT']} />}>
              <Route index element={<Navigate to="/student/profile" replace />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="grades" element={<StudentGradesPage />} />
              <Route path="appointments" element={<StudentAppointmentsPage />} />
              <Route path="messages" element={<StudentMessagesPage />} />
              <Route path="notifications" element={<StudentNotificationsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
