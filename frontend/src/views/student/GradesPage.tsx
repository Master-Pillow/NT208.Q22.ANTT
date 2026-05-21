import { PageLayout } from '../../components/layout/PageLayout';
import { StudentAcademic } from './StudentAcademic';

export default function GradesPage() {
  return (
    <PageLayout title="Xem điểm" breadcrumb={['STUDENT', 'Xem điểm']}>
      <StudentAcademic />
    </PageLayout>
  );
}
