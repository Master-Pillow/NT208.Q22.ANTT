import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import { AIAnomalyDashboard } from '../AIAnomalyDashboard';

export default function AiPatternsPage() {
  const { currentUser } = useAuth();

  return (
    <PageLayout title="AI: Pattern Mining" breadcrumb={['ADMIN', 'AI', 'Pattern Mining']}>
      <AIAnomalyDashboard currentUser={currentUser} mode="patterns" />
    </PageLayout>
  );
}
