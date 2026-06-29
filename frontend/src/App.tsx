import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from './auth/AuthContext';
import { AIChatProvider } from './contexts/AIChatContext';
import { AppShell, routeForRole } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Unauthorized } from './components/layout/Unauthorized';
import { pageImporters } from './routes/preload';
import AdminAiHubPage from './views/admin/AiHubPage';

const LoginPage = lazy(pageImporters.login);
const UITFaqPage = lazy(pageImporters.uitFaq);
const AccountProfilePage = lazy(pageImporters.accountProfile);

const AdminDashboardPage = lazy(pageImporters.adminDashboard);
const AdminStudentsPage = lazy(pageImporters.adminStudents);
const AdminStudentAcademicPage = lazy(pageImporters.adminStudentAcademic);
const AdminClassesPage = lazy(pageImporters.adminClasses);
const AdminAdvisorsPage = lazy(pageImporters.adminAdvisors);
const AdminCoursesPage = lazy(pageImporters.adminCourses);
const AdminAiAnomalyPage = lazy(pageImporters.adminAiAnomaly);
const AdminAiBriefPage = lazy(pageImporters.adminAiBrief);
const AdminAiQueryPage = lazy(pageImporters.adminAiQuery);
const AdminAiPatternsPage = lazy(pageImporters.adminAiPatterns);

const AdvisorDashboardPage = lazy(pageImporters.advisorDashboard);
const AdvisorStudentsPage = lazy(pageImporters.advisorStudents);
const AdvisorAppointmentsPage = lazy(pageImporters.advisorAppointments);
const AdvisorMessagesPage = lazy(pageImporters.advisorMessages);
const AdvisorAiAnomalyPage = lazy(pageImporters.advisorAiAnomaly);
const AdvisorAiBriefPage = lazy(pageImporters.advisorAiBrief);

const StudentProfilePage = lazy(pageImporters.studentProfile);
const StudentGradesPage = lazy(pageImporters.studentGrades);
const StudentTimetablePage = lazy(pageImporters.studentTimetable);
const StudentExamsPage = lazy(pageImporters.studentExams);
const StudentAppointmentsPage = lazy(pageImporters.studentAppointments);
const StudentMessagesPage = lazy(pageImporters.studentMessages);
const StudentNotificationsPage = lazy(pageImporters.studentNotifications);

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center text-primary">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);

const HomeRedirect = () => {
  const { isAuthenticated, role } = useAuth();

  return (
    <Navigate
      to={isAuthenticated ? routeForRole(role) : '/login'}
      replace
    />
  );
};

const GuardedShell = ({ roles }: { roles: string[] }) => (
  <ProtectedRoute allowedRoles={roles}>
    <AppShell />
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <AIChatProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/" element={<HomeRedirect />} />

              <Route path="/admin" element={<GuardedShell roles={['ADMIN']} />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="students" element={<AdminStudentsPage />} />
                <Route path="students/:studentId/academic" element={<AdminStudentAcademicPage />} />
                <Route path="classes" element={<AdminClassesPage />} />
                <Route path="advisors" element={<AdminAdvisorsPage />} />
                <Route path="courses" element={<AdminCoursesPage />} />
                <Route path="ai" element={<AdminAiHubPage />} />
                <Route path="ai/anomaly" element={<AdminAiAnomalyPage />} />
                <Route path="ai/brief" element={<AdminAiBriefPage />} />
                <Route path="ai/query" element={<AdminAiQueryPage />} />
                <Route path="ai/patterns" element={<AdminAiPatternsPage />} />
                <Route path="faq" element={<UITFaqPage />} />
              </Route>

              <Route path="/advisor" element={<GuardedShell roles={['ADVISOR']} />}>
                <Route index element={<Navigate to="/advisor/dashboard" replace />} />
                <Route path="dashboard" element={<AdvisorDashboardPage />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="students" element={<AdvisorStudentsPage />} />
                <Route path="students/:studentId" element={<AdvisorStudentsPage />} />
                <Route path="students/class/:classCode" element={<AdvisorStudentsPage />} />
                <Route path="appointments" element={<AdvisorAppointmentsPage />} />
                <Route path="messages" element={<AdvisorMessagesPage />} />
                <Route path="ai/anomaly" element={<AdvisorAiAnomalyPage />} />
                <Route path="ai/brief" element={<AdvisorAiBriefPage />} />
                <Route path="faq" element={<UITFaqPage />} />
              </Route>

              <Route path="/student" element={<GuardedShell roles={['STUDENT']} />}>
                <Route index element={<Navigate to="/student/profile" replace />} />
                <Route path="profile" element={<StudentProfilePage />} />
                <Route path="grades" element={<StudentGradesPage />} />
                <Route path="timetable" element={<StudentTimetablePage />} />
                <Route path="exams" element={<StudentExamsPage />} />
                <Route path="appointments" element={<StudentAppointmentsPage />} />
                <Route path="messages" element={<StudentMessagesPage />} />
                <Route path="notifications" element={<StudentNotificationsPage />} />
                <Route path="faq" element={<UITFaqPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AIChatProvider>
    </AuthProvider>
  );
}
