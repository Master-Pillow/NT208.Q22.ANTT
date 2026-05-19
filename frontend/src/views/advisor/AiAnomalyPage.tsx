import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import { AIAnomalyDashboard } from '../AIAnomalyDashboard';

export default function AiAnomalyPage() {
  const { currentUser } = useAuth();

  return (
    <PageLayout title="AI: Cảnh báo lớp mình" breadcrumb={['ADVISOR', 'AI', 'Cảnh báo lớp mình']}>
      <AIAnomalyDashboard currentUser={currentUser} mode="anomaly" />
    </PageLayout>
  );
}
