import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { Dashboard } from '../Dashboard';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <PageLayout title="Tổng quan lớp phụ trách" breadcrumb={['ADVISOR', 'Tổng quan']}>
      <Dashboard
        onNavigate={(view) => {
          if (view === 'messages') navigate('/advisor/messages');
          else if (view === 'profiles' || view === 'cohort' || view === 'classlist') navigate('/advisor/students');
          else navigate('/advisor/dashboard');
        }}
        onMessageStudent={(student) => navigate('/advisor/messages', { state: { initialContact: student } })}
      />
    </PageLayout>
  );
}
