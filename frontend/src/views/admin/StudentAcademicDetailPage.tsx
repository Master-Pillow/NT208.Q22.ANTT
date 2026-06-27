import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CircleAlert, GraduationCap, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import apiClient from '../../lib/api';

interface AcademicDetail {
  student: {
    id: number;
    mssv: string;
    full_name: string;
    email: string | null;
    login_email: string | null;
    class_code: string | null;
    cohort: string | null;
    status: string | null;
  };
  summary: {
    total_courses: number;
    total_credits: number;
    earned_credits: number;
    failed_courses: number;
    cumulative_gpa: string | number | null;
    average_numeric: string | number | null;
    last_synced_at: string | null;
  };
  courses: Array<{
    code: string;
    name: string;
    credits: number;
    semester: string;
    numeric_grade: string | number | null;
    letter_grade: string | null;
    gpa_points: string | number | null;
    status: string;
    source: string | null;
    imported_at: string | null;
  }>;
}

const statusLabel: Record<string, string> = {
  GRADED: 'Đã có điểm',
  IN_PROGRESS: 'Đang học',
  ABSENT: 'Bỏ/Vắng thi',
};

export default function StudentAcademicDetailPage() {
  const { studentId } = useParams();
  const [detail, setDetail] = useState<AcademicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const { data } = await apiClient.get(`/admin/students/${studentId}/academic`);
        setDetail(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải bảng điểm sinh viên.');
      } finally {
        setLoading(false);
      }
    }

    void loadDetail();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang tải bảng điểm...
      </div>
    );
  }

  return (
    <PageLayout title="Bảng điểm sinh viên" breadcrumb={['ADMIN', 'Sinh viên', 'Bảng điểm']}>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <Link
          to="/admin/students"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>

        {error ? (
          <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 font-semibold text-red-700">
            <CircleAlert className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : detail ? (
          <>
            <section className="border-b border-slate-200 pb-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{detail.student.full_name}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {detail.student.mssv} · {detail.student.class_code || 'Chưa có lớp'} · Khóa{' '}
                    {detail.student.cohort || '-'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {detail.student.login_email || detail.student.email || 'Chưa có email'}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['GPA tích lũy', Number(detail.summary.cumulative_gpa || 0).toFixed(2)],
                ['Điểm TB thang 10', detail.summary.average_numeric ?? '-'],
                ['Tổng số môn', detail.summary.total_courses],
                ['Tín chỉ đạt', `${detail.summary.earned_credits}/${detail.summary.total_credits}`],
                ['Môn rớt/vắng', detail.summary.failed_courses],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-700" />
                  <h3 className="font-black text-slate-900">Chi tiết môn học</h3>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  Đồng bộ gần nhất:{' '}
                  {detail.summary.last_synced_at
                    ? new Date(detail.summary.last_synced_at).toLocaleString('vi-VN')
                    : 'Chưa đồng bộ'}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Mã môn</th>
                      <th className="px-5 py-3">Tên môn</th>
                      <th className="px-5 py-3">Học kỳ</th>
                      <th className="px-5 py-3">TC</th>
                      <th className="px-5 py-3">Điểm</th>
                      <th className="px-5 py-3">Điểm chữ</th>
                      <th className="px-5 py-3">GPA</th>
                      <th className="px-5 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.courses.length ? (
                      detail.courses.map((course) => (
                        <tr key={`${course.semester}-${course.code}`} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-mono font-bold text-slate-700">{course.code}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{course.name}</td>
                          <td className="px-5 py-4 text-slate-600">{course.semester}</td>
                          <td className="px-5 py-4 text-slate-600">{course.credits}</td>
                          <td className="px-5 py-4 font-black text-blue-800">{course.numeric_grade ?? '-'}</td>
                          <td className="px-5 py-4 font-bold text-slate-700">{course.letter_grade || '-'}</td>
                          <td className="px-5 py-4 text-slate-600">{course.gpa_points ?? '-'}</td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {statusLabel[course.status] || course.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center font-semibold text-slate-400">
                          Sinh viên chưa đồng bộ điểm từ DAA.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PageLayout>
  );
}
