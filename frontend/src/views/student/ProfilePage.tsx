import { PageLayout } from '../../components/layout/PageLayout';
import { StudentDashboard } from './StudentDashboard';

export default function ProfilePage() {
  return (
    <PageLayout title="Hồ sơ học tập cá nhân" breadcrumb={['STUDENT', 'Hồ sơ học tập']}>
      <StudentDashboard />
    </PageLayout>
  );
}
