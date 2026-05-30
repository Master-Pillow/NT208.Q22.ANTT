import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { routeForRole } from '../components/layout/AppShell';
import { Login } from './Login';
import { preloadRoleRoutes } from '../routes/preload';

export default function LoginPage() {
  const { isAuthenticated, login, role } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to={routeForRole(role)} replace />;
  }

  return (
    <Login
      onLogin={(user) => {
        const normalizedRole = String(user?.role || '').trim().toUpperCase();
        login(user);
        navigate(routeForRole(normalizedRole), { replace: true });
        void preloadRoleRoutes(normalizedRole);
      }}
    />
  );
}
