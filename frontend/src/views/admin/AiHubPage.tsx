import { Link } from 'react-router-dom';
import { AlertTriangle, Bot, FileText, Sparkles } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';

const aiFeatures = [
  {
    to: '/admin/ai/anomaly',
    title: 'Phát hiện bất thường',
    description: 'Quét GPA thấp, rớt môn, GPA giảm và tín chỉ tích lũy bất thường.',
    Icon: AlertTriangle,
  },
  {
    to: '/admin/ai/brief',
    title: 'Sinh AI Brief',
    description: 'Tạo bản tin học vụ theo lớp để cố vấn nắm nhanh tình hình sinh viên.',
    Icon: Sparkles,
  },
  {
    to: '/admin/ai/query',
    title: 'Chat-to-Data',
    description: 'Hỏi dữ liệu học vụ bằng tiếng Việt và nhận bảng hoặc biểu đồ.',
    Icon: Bot,
  },
  {
    to: '/admin/ai/patterns',
    title: 'Pattern Mining',
    description: 'Xem các mẫu liên quan giữa các môn rớt có support, confidence và lift.',
    Icon: FileText,
  },
];

export default function AiHubPage() {
  return (
    <PageLayout title="AI học vụ" breadcrumb={['ADMIN', 'AI học vụ']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface mb-2">AI học vụ</h2>
          <p className="text-slate-500 font-medium">
            Chọn đúng công cụ AI cần dùng thay vì trộn tất cả vào một màn hình.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {aiFeatures.map(({ to, title, description, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-primary">
                {title}
              </h3>
              <p className="text-sm leading-6 text-slate-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
