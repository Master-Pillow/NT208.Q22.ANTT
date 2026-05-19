import { PageLayout } from '../../components/layout/PageLayout';
import { AdminAdvisors } from './AdminAdvisor';

export default function AdvisorsPage() {
  return (
    <PageLayout title="Quản lý cố vấn" breadcrumb={['ADMIN', 'Quản lý cố vấn']}>
      <AdminAdvisors />
    </PageLayout>
  );
}
