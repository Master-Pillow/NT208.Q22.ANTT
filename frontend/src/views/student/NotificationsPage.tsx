import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import apiClient from '../../lib/api';

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/student/notifications')
      .then(({ data }) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout title="Thông báo" breadcrumb={['STUDENT', 'Thông báo']}>
      <section className="max-w-5xl mx-auto bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-blue-900">Thông báo</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có thông báo nào.</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between gap-4">
                  <h3 className="font-bold text-slate-800">{item.title}</h3>
                  <span className="text-xs font-bold text-blue-600">{item.type}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
