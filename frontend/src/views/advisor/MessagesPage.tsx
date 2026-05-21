import { useLocation } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { Messages } from '../Messages';

export default function MessagesPage() {
  const location = useLocation();
  const initialContact = (location.state as any)?.initialContact || null;

  return (
    <PageLayout title="Nhắn tin với sinh viên" breadcrumb={['ADVISOR', 'Nhắn tin']}>
      <Messages initialContact={initialContact} />
    </PageLayout>
  );
}
