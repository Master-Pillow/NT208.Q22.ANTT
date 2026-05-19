import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import { AIAnomalyDashboard } from '../AIAnomalyDashboard';

export default function AiAnomalyPage() {
  const { currentUser } = useAuth();

  return (
    <PageLayout title="AI: Phát hiện bất thường" breadcrumb={['ADMIN', 'AI', 'Phát hiện bất thường']}>
      <AIAnomalyDashboard currentUser={currentUser} mode="anomaly" />
    </PageLayout>
  );
}
