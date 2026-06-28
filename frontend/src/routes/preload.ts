import type { ComponentType } from 'react';

type PageModule = { default: ComponentType<any> };
type PageImporter = () => Promise<PageModule>;

export const pageImporters = {
  login: () => import('../views/LoginPage'),
  accountProfile: () => import('../views/shared/AccountProfilePage'),
  uitFaq: () => import('../views/shared/UITFaqPage'),

  adminDashboard: () => import('../views/admin/DashboardPage'),
  adminStudents: () => import('../views/admin/StudentsPage'),
  adminStudentAcademic: () => import('../views/admin/StudentAcademicDetailPage'),
  adminClasses: () => import('../views/admin/ClassesPage'),
  adminAdvisors: () => import('../views/admin/AdvisorsPage'),
  adminCourses: () => import('../views/admin/CoursesPage'),
  adminAiAnomaly: () => import('../views/admin/AiAnomalyPage'),
  adminAiBrief: () => import('../views/admin/AiBriefPage'),
  adminAiQuery: () => import('../views/admin/AiQueryPage'),
  adminAiPatterns: () => import('../views/admin/AiPatternsPage'),

  advisorDashboard: () => import('../views/advisor/DashboardPage'),
  advisorStudents: () => import('../views/advisor/StudentsPage'),
  advisorAppointments: () => import('../views/advisor/AppointmentsPage'),
  advisorMessages: () => import('../views/advisor/MessagesPage'),
  advisorAiAnomaly: () => import('../views/advisor/AiAnomalyPage'),
  advisorAiBrief: () => import('../views/advisor/AiBriefPage'),

  studentProfile: () => import('../views/student/ProfilePage'),
  studentGrades: () => import('../views/student/GradesPage'),
  studentAppointments: () => import('../views/student/AppointmentsPage'),
  studentMessages: () => import('../views/student/MessagesPage'),
  studentNotifications: () => import('../views/student/NotificationsPage'),
};

const loadedImporters = new WeakSet<PageImporter>();

const preloadImporters = (importers: PageImporter[]) =>
  Promise.all(
    importers.map((importer) => {
      if (loadedImporters.has(importer)) return Promise.resolve();
      loadedImporters.add(importer);
      return importer().catch(() => undefined);
    })
  );

const routePreloads: Record<string, PageImporter[]> = {
  '/login': [pageImporters.login],

  '/admin/profile': [pageImporters.accountProfile],
  '/admin/faq': [pageImporters.uitFaq],
  '/admin/dashboard': [pageImporters.adminDashboard],
  '/admin/students': [pageImporters.adminStudents],
  '/admin/classes': [pageImporters.adminClasses],
  '/admin/advisors': [pageImporters.adminAdvisors],
  '/admin/courses': [pageImporters.adminCourses],
  '/admin/ai': [
    pageImporters.adminAiAnomaly,
    pageImporters.adminAiBrief,
    pageImporters.adminAiQuery,
    pageImporters.adminAiPatterns,
  ],
  '/admin/ai/anomaly': [pageImporters.adminAiAnomaly],
  '/admin/ai/brief': [pageImporters.adminAiBrief],
  '/admin/ai/query': [pageImporters.adminAiQuery],
  '/admin/ai/patterns': [pageImporters.adminAiPatterns],

  '/advisor/profile': [pageImporters.accountProfile],
  '/advisor/faq': [pageImporters.uitFaq],
  '/advisor/dashboard': [pageImporters.advisorDashboard],
  '/advisor/students': [pageImporters.advisorStudents],
  '/advisor/appointments': [pageImporters.advisorAppointments],
  '/advisor/messages': [pageImporters.advisorMessages],
  '/advisor/ai/anomaly': [pageImporters.advisorAiAnomaly],
  '/advisor/ai/brief': [pageImporters.advisorAiBrief],

  '/student/faq': [pageImporters.uitFaq],
  '/student/profile': [pageImporters.studentProfile],
  '/student/grades': [pageImporters.studentGrades],
  '/student/appointments': [pageImporters.studentAppointments],
  '/student/messages': [pageImporters.studentMessages],
  '/student/notifications': [pageImporters.studentNotifications],
};

const rolePreloads: Record<string, PageImporter[]> = {
  ADMIN: [
    pageImporters.adminDashboard,
    pageImporters.adminStudents,
    pageImporters.adminClasses,
    pageImporters.adminAdvisors,
    pageImporters.adminAiAnomaly,
  ],
  ADVISOR: [
    pageImporters.advisorDashboard,
    pageImporters.advisorStudents,
    pageImporters.advisorAppointments,
    pageImporters.advisorMessages,
    pageImporters.advisorAiAnomaly,
  ],
  STUDENT: [
    pageImporters.studentProfile,
    pageImporters.studentGrades,
    pageImporters.studentAppointments,
    pageImporters.studentMessages,
    pageImporters.studentNotifications,
  ],
};

export const preloadRoute = (path: string) => {
  const importers = routePreloads[path] || [];
  return preloadImporters(importers);
};

export const preloadRoleRoutes = (role: string) => {
  const importers = rolePreloads[String(role || '').trim().toUpperCase()] || [];
  return preloadImporters(importers);
};
