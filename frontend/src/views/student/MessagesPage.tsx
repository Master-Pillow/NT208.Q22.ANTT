import { PageLayout } from '../../components/layout/PageLayout';
import { StudentMessages } from './StudentMessages';

export default function MessagesPage() {
  return (
    <PageLayout title="Nhắn tin với cố vấn" breadcrumb={['STUDENT', 'Nhắn tin']}>
      <StudentMessages />
    </PageLayout>
  );
}
