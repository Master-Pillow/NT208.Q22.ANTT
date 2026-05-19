import { PageLayout } from '../../components/layout/PageLayout';
import { AdminClasses } from './AdminClasses';

export default function ClassesPage() {
  return (
    <PageLayout title="Quản lý lớp học" breadcrumb={['ADMIN', 'Quản lý lớp học']}>
      <AdminClasses />
    </PageLayout>
  );
}
