import { PageLayout } from '../../components/layout/PageLayout';
import { AdminDashboard } from './AdminDashboard';

export default function DashboardPage() {
  return (
    <PageLayout title="Tổng quan hệ thống" breadcrumb={['ADMIN', 'Tổng quan hệ thống']}>
      <AdminDashboard />
    </PageLayout>
  );
}
