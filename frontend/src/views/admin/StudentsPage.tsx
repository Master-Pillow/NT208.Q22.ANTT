import { type FormEvent, useEffect, useState } from 'react';
import { Eye, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import apiClient from '../../lib/api';

interface StudentRow {
  id: number;
  mssv: string;
  full_name: string;
  email: string | null;
  class_code: string | null;
  cohort: string | null;
  status: string;
  login_email: string | null;
  has_account: boolean;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mssv, setMssv] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStudents() {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/admin/students');
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[AdminStudents]', err);
      setError('Không thể tải danh sách sinh viên.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  async function handleQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedMssv = mssv.trim();

    if (!/^\d{6,12}$/.test(normalizedMssv)) {
      setError('MSSV phải gồm từ 6 đến 12 chữ số.');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setMessage(null);
      const { data } = await apiClient.post('/admin/students/quick-create', {
        mssv: normalizedMssv,
      });
      setMessage(data.message);
      setMssv('');
      await loadStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo sinh viên test.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <PageLayout title="Danh sách sinh viên" breadcrumb={['ADMIN', 'Danh sách sinh viên']}>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div>
          <h2 className="mb-2 text-4xl font-black text-on-surface">Danh sách sinh viên</h2>
          <p className="font-medium text-slate-500">
            Tạo nhanh MSSV để kiểm thử đăng nhập DAA và xem dữ liệu học tập đã đồng bộ.
          </p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Tạo MSSV test</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Chỉ cần nhập MSSV. Họ tên, lớp và điểm sẽ được cập nhật khi sinh viên đăng nhập bằng cookie DAA.
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickCreate} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                value={mssv}
                onChange={(event) => {
                  setMssv(event.target.value.replace(/\D/g, ''));
                  setError(null);
                  setMessage(null);
                }}
                placeholder="Nhập MSSV, ví dụ 24521888"
                className="min-h-11 w-full rounded-lg border border-slate-200 py-3 pl-12 pr-4 font-mono font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="submit"
              disabled={creating || !mssv.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Tạo sinh viên test
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
            <Users className="h-5 w-5 text-blue-700" />
            <h3 className="font-black text-slate-900">Sinh viên trong hệ thống</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-400">
                  <th className="px-6 py-4">MSSV</th>
                  <th className="px-6 py-4">Họ tên</th>
                  <th className="px-6 py-4">Lớp</th>
                  <th className="px-6 py-4">Khóa</th>
                  <th className="px-6 py-4">Email đăng nhập</th>
                  <th className="px-6 py-4">Tài khoản</th>
                  <th className="px-6 py-4 text-right">Bảng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-400">
                      Đang tải danh sách sinh viên...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm font-semibold text-slate-400">
                      Chưa có sinh viên. Nhập MSSV ở phía trên để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{student.mssv}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{student.full_name}</td>
                      <td className="px-6 py-4 font-bold text-blue-700">{student.class_code || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{student.cohort || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {student.login_email || student.email || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            student.has_account
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-orange-50 text-orange-700'
                          }`}
                        >
                          {student.has_account ? 'Đã tạo' : 'Chưa có'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/admin/students/${student.id}/academic`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-700 hover:bg-blue-50"
                          title={`Xem bảng điểm ${student.full_name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
