import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import { AIAnomalyDashboard } from '../AIAnomalyDashboard';

export default function AiBriefPage() {
  const { currentUser } = useAuth();

  return (
    <PageLayout title="AI: Brief lớp mình" breadcrumb={['ADVISOR', 'AI', 'Brief lớp mình']}>
      <AIAnomalyDashboard currentUser={currentUser} mode="brief" />
    </PageLayout>
  );
}
