import { Mail, Shield, User, Fingerprint } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';

const roleLabel: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  ADVISOR: 'Cố vấn học vụ',
  STUDENT: 'Sinh viên',
};

export default function AccountProfilePage() {
  const { currentUser } = useAuth();

  const role = String(currentUser?.role || '').toUpperCase();
  const displayName = currentUser?.full_name || currentUser?.email || 'Người dùng';

  return (
    <PageLayout title="Hồ sơ tài khoản" breadcrumb={[roleLabel[role] || 'USER', 'Hồ sơ']}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-36 bg-gradient-to-r from-blue-600 to-indigo-600" />

          <div className="px-8 pb-8 -mt-16">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-full bg-purple-600 text-white border-4 border-white shadow-xl flex items-center justify-center text-4xl font-black">
                {displayName
                  .split(' ')
                  .map((word) => word[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="pb-3">
                <h2 className="text-3xl font-black text-slate-900">
                  {displayName}
                </h2>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  {roleLabel[role] || role}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Email</p>
                  <p className="font-semibold text-slate-800">{currentUser?.email || 'Chưa có'}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <Shield className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Vai trò</p>
                  <p className="font-semibold text-slate-800">{roleLabel[role] || role}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <Fingerprint className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">User ID</p>
                  <p className="font-semibold text-slate-800">{currentUser?.id || 'N/A'}</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <User className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Trạng thái</p>
                  <p className="font-semibold text-slate-800">Đang hoạt động</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}