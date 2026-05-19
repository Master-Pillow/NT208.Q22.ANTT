import { PageLayout } from '../../components/layout/PageLayout';
import { Schedule } from '../Schedule';

export default function AppointmentsPage() {
  return (
    <PageLayout title="Lịch hẹn tư vấn" breadcrumb={['ADVISOR', 'Lịch hẹn tư vấn']}>
      <Schedule />
    </PageLayout>
  );
}
