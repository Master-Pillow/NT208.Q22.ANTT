import { PageLayout } from '../../components/layout/PageLayout';
import { PlaceholderPage } from '../shared/PlaceholderPage';

export default function CoursesPage() {
  return (
    <PageLayout title="Quản lý môn học" breadcrumb={['ADMIN', 'Quản lý môn học']}>
      <PlaceholderPage
        title="Quản lý môn học"
        description="Route và page riêng cho quản lý môn học đã sẵn sàng. Phần thao tác dữ liệu sẽ dùng endpoint môn học khi backend cung cấp mà không cần đổi cấu trúc routing."
      />
    </PageLayout>
  );
}
