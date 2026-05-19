import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import { AIAnomalyDashboard } from '../AIAnomalyDashboard';

export default function AiQueryPage() {
  const { currentUser } = useAuth();

  return (
    <PageLayout title="AI: Chat-to-Data" breadcrumb={['ADMIN', 'AI', 'Chat-to-Data']}>
      <AIAnomalyDashboard currentUser={currentUser} mode="query" />
    </PageLayout>
  );
}
