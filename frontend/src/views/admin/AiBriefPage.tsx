import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import { AIAnomalyDashboard } from '../AIAnomalyDashboard';

export default function AiBriefPage() {
  const { currentUser } = useAuth();

  return (
    <PageLayout title="AI: Sinh AI Brief" breadcrumb={['ADMIN', 'AI', 'Sinh AI Brief']}>
      <AIAnomalyDashboard currentUser={currentUser} mode="brief" />
    </PageLayout>
  );
}
