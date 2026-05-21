import { PageLayout } from '../../components/layout/PageLayout';
import { StudentAppointments } from './StudentAppointments';

export default function AppointmentsPage() {
  return (
    <PageLayout title="Lịch hẹn" breadcrumb={['STUDENT', 'Lịch hẹn']}>
      <StudentAppointments />
    </PageLayout>
  );
}
