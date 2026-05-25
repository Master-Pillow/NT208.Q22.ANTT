import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Toolbar } from '../Toolbar';
import { useAuth } from '../../auth/AuthContext';
import { UITFaqWidget } from '../UITFaqWidget';

const legacyViewRoutes: Record<string, string> = {
  adminDashboard: '/admin/dashboard',
  adminAdvisors: '/admin/advisors',
  adminClasses: '/admin/classes',
  dashboard: '/advisor/dashboard',
  profiles: '/advisor/students',
  classlist: '/advisor/students',
  cohort: '/advisor/students',
  schedule: '/advisor/appointments',
  notes: '/advisor/appointments',
  messages: '/advisor/messages',
  ai: '/advisor/ai/anomaly',
  studentDashboard: '/student/profile',
  studentAcademic: '/student/grades',
  studentMessages: '/student/messages',
  studentAppointments: '/student/appointments',
};

export const routeForRole = (role: string) => {
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'STUDENT') return '/student/profile';
  return '/advisor/dashboard';
};

export const AppShell = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const navigateLegacyView = (view: string) => {
    if (view === 'profile') {
      navigate(routeForRole(String(currentUser?.role || '').toUpperCase()));
      return;
    }

    navigate(legacyViewRoutes[view] || routeForRole(String(currentUser?.role || '').toUpperCase()));
  };

  const handleSearchSelect = (item: { type: string; id: number | null; code: string }) => {
    if (item.type === 'student' && item.id) {
      navigate(`/advisor/students/${item.id}`);
      return;
    }

    if (item.type === 'class') {
      navigate(`/advisor/students/class/${encodeURIComponent(item.code)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex antialiased selection:bg-primary/20 selection:text-primary">
      <Sidebar />

      <main className="flex-grow lg:ml-[280px] flex flex-col min-h-screen relative overflow-hidden bg-surface">
        <Toolbar
          currentUser={currentUser}
          setCurrentView={navigateLegacyView}
          onLogout={handleLogout}
          onSearchSelect={handleSearchSelect}
        />

        <div className="flex-1 overflow-y-auto w-full pt-32 px-4 sm:px-8 lg:px-10 pb-12">
          <Outlet />
        </div>
        
        {/* UIT FAQ Widget — tất cả mọi người */}
        <UITFaqWidget />
      </main>
    </div>
  );
};
