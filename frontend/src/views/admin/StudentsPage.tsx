import { type FormEvent, useEffect, useState } from 'react';
import { Download, Eye, Loader2, Upload, Users } from 'lucide-react';
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

interface ImportResult {
  message: string;
  total_rows: number;
  class_count: number;
  classes: string[];
  created_count: number;
  updated_count: number;
  skipped_count: number;
  created: Array<{
    student: {
      mssv: string;
      full_name: string;
      email: string;
      class_code: string;
    };
    user: {
      email: string;
    };
    temporary_password: string;
  }>;
  skipped: Array<{
    row_number: number;
    mssv: string;
    reason: string;
  }>;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
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
    loadStudents();
  }, []);

  function downloadTemplate() {
    const rows = [
      'mssv,full_name,email,class_code,cohort,program,class_name,phone',
      '24521888,Nguyen Van A,24521888@gm.uit.edu.vn,ATTT2024.3,2024,An toan thong tin,ATTT2024.3,',
      '24521889,Tran Thi B,24521889@gm.uit.edu.vn,ATTT2024.3,2024,An toan thong tin,ATTT2024.3,',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'advisorhub_admin_student_accounts_template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError('Vui lòng chọn file CSV danh sách sinh viên.');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const { data } = await apiClient.post('/admin/student-accounts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(data);
      setFile(null);
      await loadStudents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể import danh sách sinh viên.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageLayout title="Danh sách sinh viên" breadcrumb={['ADMIN', 'Danh sách sinh viên']}>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface mb-2">
            Danh sách sinh viên
          </h2>
          <p className="text-slate-500 font-medium">
            Admin import danh sách sinh viên theo lớp để tạo hồ sơ và tài khoản đăng nhập cho sinh viên.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Import sinh viên và tài khoản</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  File CSV có thể tạo lớp mới, tạo sinh viên mới và tạo tài khoản STUDENT bằng mật khẩu tạm.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-blue-300"
            >
              <Download className="h-4 w-4" />
              Tải CSV mẫu
            </button>
          </div>

          <form onSubmit={handleImport} className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-blue-300">
              <Upload className="h-4 w-4" />
              <span className="truncate">{file?.name || 'Chọn file CSV danh sách sinh viên'}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setError(null);
                  setResult(null);
                }}
              />
            </label>

            <button
              type="submit"
              disabled={importing || !file}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import danh sách
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {result.message} Đã xử lý {result.class_count} lớp: {result.classes.join(', ') || '-'}.
              </div>

              {result.created.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">MSSV</th>
                        <th className="px-4 py-3">Họ tên</th>
                        <th className="px-4 py-3">Lớp</th>
                        <th className="px-4 py-3">Email đăng nhập</th>
                        <th className="px-4 py-3">Mật khẩu tạm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.created.map((item) => (
                        <tr key={item.student.mssv} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.student.mssv}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.student.full_name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.student.class_code}</td>
                          <td className="px-4 py-3 text-slate-600">{item.user.email}</td>
                          <td className="px-4 py-3 font-mono font-black text-blue-800">{item.temporary_password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-sm font-black text-orange-800">Dòng bị bỏ qua</p>
                  <div className="mt-2 space-y-1 text-sm font-medium text-orange-700">
                    {result.skipped.slice(0, 10).map((item) => (
                      <p key={`${item.row_number}-${item.mssv}`}>
                        Dòng {item.row_number}: {item.mssv || '-'} - {item.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
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
                    <td colSpan={7} className="px-6 py-8 text-center text-sm font-semibold text-slate-400">
                      Đang tải danh sách sinh viên...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm font-semibold text-slate-400">
                      Chưa có sinh viên. Hãy import danh sách CSV để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{student.mssv}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{student.full_name}</td>
                      <td className="px-6 py-4 font-bold text-blue-700">{student.class_code || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{student.cohort || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{student.login_email || student.email || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${student.has_account ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
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
