import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
      <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4" />
      <h1 className="text-2xl font-black text-slate-900 mb-2">Không có quyền truy cập</h1>
      <p className="text-sm text-slate-500 mb-6">
        Tài khoản hiện tại không được phép mở trang này.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
      >
        Về trang chính
      </Link>
    </div>
  </div>
);
