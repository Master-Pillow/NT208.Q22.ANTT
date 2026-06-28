import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { Dashboard } from '../Dashboard';
import { AdvisorAnalytics } from './AdvisorAnalytics';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <PageLayout title="Tổng quan lớp phụ trách" breadcrumb={['ADVISOR', 'Tổng quan']}>
      <div className="space-y-10">
        <Dashboard
          onNavigate={(view) => {
            if (view === 'messages') navigate('/advisor/messages');
            else if (view === 'profiles' || view === 'cohort' || view === 'classlist') navigate('/advisor/students');
            else navigate('/advisor/dashboard');
          }}
          onMessageStudent={(student) => navigate('/advisor/messages', { state: { initialContact: student } })}
        />

        {/* Phân tích tổng hợp toàn bộ lớp phụ trách + AI */}
        <AdvisorAnalytics />
      </div>
    </PageLayout>
  );
}
