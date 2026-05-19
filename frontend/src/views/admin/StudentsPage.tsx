import { PageLayout } from '../../components/layout/PageLayout';
import { PlaceholderPage } from '../shared/PlaceholderPage';

export default function StudentsPage() {
  return (
    <PageLayout title="Danh sách sinh viên" breadcrumb={['ADMIN', 'Danh sách sinh viên']}>
      <PlaceholderPage
        title="Danh sách sinh viên"
        description="Trang này đã được tách route riêng theo cấu trúc mới. Backend hiện chưa có endpoint ADMIN chuyên biệt cho danh sách toàn bộ sinh viên, nên phần dữ liệu sẽ được nối vào API hiện có khi backend sẵn sàng."
      />
    </PageLayout>
  );
}
