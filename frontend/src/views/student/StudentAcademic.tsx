import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../../lib/api';
import { AiInsightPanel } from '../../components/AiInsightPanel';
import { useAuth } from '../../auth/AuthContext';

interface CourseItem {
  code: string;
  name: string;
  credits: number;
  semester: string;
  letter_grade: string | null;
  numeric_grade?: string | number | null;
  gpa_points: string | number | null;
  status?: string | null;
}

interface PreviewCourse {
  semester: string;
  academic_year: string;
  course_code: string;
  course_name: string;
  credits: number;
  numeric_grade: number | null;
  letter_grade: string | null;
  status: string;
}

interface ImportPreview {
  import_id: number;
  status: string;
  error_message?: string | null;
  student: {
    mssv?: string;
    full_name?: string;
    class_code?: string;
  };
  summary?: {
    credits_studied?: number;
    credits_accumulated?: number;
    avg_grade?: number;
    cumulative_avg_grade?: number;
  };
  courses: PreviewCourse[];
  page_count: number;
}

interface SemesterMetric {
  semester: string;
  gpa: number | null;
  avg_numeric: number | null;
  cumulative_gpa: number | null;
  cumulative_avg_numeric: number | null;
  credits_total: number;
  credits_earned: number;
  credits_debt: number;
  failed: number;
  absent: number;
  in_progress: number;
  gpa_drop: boolean;
  gpa_delta: number | null;
  commendation: string | null;
}

interface StudentMetrics {
  cumulative_gpa: number | null;
  cumulative_avg_numeric: number | null;
  by_semester: SemesterMetric[];
  grade_distribution: Record<string, number>;
  dropped_semesters: string[];
  improving: boolean;
  commendations: Array<{
    semester: string;
    label: string;
    reason: string;
  }>;
}

const statusText: Record<string, string> = {
  GRADED: 'Đã có điểm',
  IN_PROGRESS: 'Đang học',
  ABSENT: 'Bỏ thi/Vắng thi',
  EXEMPT: 'Miễn',
};

const chartMargin = { top: 12, right: 16, bottom: 4, left: 0 };

export const StudentAcademic = () => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAcademic() {
    try {
      setLoading(true);
      const [academicResponse, metricsResponse] = await Promise.all([
        apiClient.get('/student/academic'),
        apiClient.get('/student/metrics'),
      ]);

      setSummary(academicResponse.data.summary);
      setCourses(academicResponse.data.courses || []);
      setMetrics(metricsResponse.data);
    } catch (err) {
      console.error('[StudentAcademic]', err);
      setError('Không thể tải kết quả học tập.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAcademic();
  }, []);

  const previewStats = useMemo(() => {
    if (!preview) return null;

    return {
      graded: preview.courses.filter((course) => course.status === 'GRADED').length,
      inProgress: preview.courses.filter((course) => course.status === 'IN_PROGRESS').length,
      exempt: preview.courses.filter((course) => course.status === 'EXEMPT').length,
      absent: preview.courses.filter((course) => course.status === 'ABSENT').length,
    };
  }, [preview]);

  const chartData = useMemo(() => {
    return (metrics?.by_semester || []).map((item) => ({
      ...item,
      gpaLabel: item.gpa_drop ? `${item.semester} ↓` : item.semester,
    }));
  }, [metrics]);

  const latestSemester = useMemo(() => {
    return [...(metrics?.by_semester || [])].reverse().find((item) => item.gpa !== null) || null;
  }, [metrics]);

  const getStatus = (course: CourseItem) => {
    const status = course.status || 'GRADED';

    if (status === 'ABSENT' || course.letter_grade === 'F') {
      return { label: status === 'ABSENT' ? 'Bỏ thi/Vắng thi' : 'Rớt', icon: XCircle, className: 'text-red-600 bg-red-50' };
    }

    if (status === 'IN_PROGRESS') {
      return { label: 'Đang học', icon: AlertCircle, className: 'text-sky-700 bg-sky-50' };
    }

    if (status === 'EXEMPT') {
      return { label: 'Miễn', icon: CheckCircle2, className: 'text-violet-700 bg-violet-50' };
    }

    if (course.letter_grade === 'D') {
      return { label: 'Cần cải thiện', icon: AlertCircle, className: 'text-orange-600 bg-orange-50' };
    }

    return { label: 'Đạt', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50' };
  };

  async function handlePreviewImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError('Vui lòng chọn file PDF bảng điểm.');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data } = await apiClient.post('/student/grade-imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreview(data);
      if (data.error_message) setError(data.error_message);
    } catch (err: any) {
      setPreview(err.response?.data?.courses ? err.response.data : null);
      setError(err.response?.data?.message || err.response?.data?.error_message || 'Không thể đọc file PDF bảng điểm.');
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmImport() {
    if (!preview || preview.status === 'FAILED') return;

    try {
      setImporting(true);
      setError(null);
      setMessage(null);

      const { data } = await apiClient.post(`/student/grade-imports/${preview.import_id}/confirm`);
      setMessage(`${data.message} Đã import ${data.imported_count} môn.`);
      setPreview(null);
      setSelectedFile(null);
      await loadAcademic();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xác nhận import bảng điểm.');
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải kết quả học tập...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div>
        <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
          Kết quả học tập
        </h2>
        <p className="text-on-surface-variant font-medium">
          Xem điểm, đồng bộ bảng điểm PDF và theo dõi xu hướng học tập theo từng học kỳ.
        </p>
      </div>

      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Đồng bộ bảng điểm PDF</h3>
                <p className="text-sm text-slate-500">
                  Lưu bảng điểm từ Portal bằng Ctrl + P, tải PDF lên, kiểm tra preview rồi xác nhận import.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePreviewImport} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-blue-300">
              <Upload className="h-4 w-4" />
              <span className="max-w-56 truncate">{selectedFile?.name || 'Chọn file PDF'}</span>
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setPreview(null);
                  setError(null);
                  setMessage(null);
                }}
              />
            </label>
            <button
              type="submit"
              disabled={importing || !selectedFile}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Đọc PDF
            </button>
          </form>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {preview && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Sinh viên</p>
                <p className="mt-1 font-black text-slate-900">{preview.student.full_name || '-'}</p>
                <p className="text-sm text-slate-500">{preview.student.mssv || '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Số môn đọc được</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{preview.courses.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Đã có điểm</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{previewStats?.graded || 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Tín chỉ tích lũy</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{preview.summary?.credits_accumulated ?? '-'}</p>
              </div>
            </div>

            <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Mã môn</th>
                    <th className="px-4 py-3">Tên môn</th>
                    <th className="px-4 py-3">Tín chỉ</th>
                    <th className="px-4 py-3">Học kỳ</th>
                    <th className="px-4 py-3">Điểm HP</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.courses.slice(0, 30).map((course) => (
                    <tr key={`${course.semester}-${course.course_code}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-slate-600">{course.course_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{course.course_name}</td>
                      <td className="px-4 py-3 text-slate-500">{course.credits}</td>
                      <td className="px-4 py-3 text-slate-500">{course.semester}</td>
                      <td className="px-4 py-3 font-bold text-blue-900">{course.numeric_grade ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{statusText[course.status] || course.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Hiển thị tối đa 30 môn đầu trong preview. Khi xác nhận, toàn bộ môn hợp lệ sẽ được import.
              </p>
              <button
                type="button"
                disabled={importing || preview.status === 'FAILED'}
                onClick={handleConfirmImport}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Xác nhận import
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">GPA tích lũy</p>
          <p className="text-3xl font-black text-blue-900 mt-2">
            {Number(metrics?.cumulative_gpa ?? summary?.current_gpa ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">Điểm TB tích lũy</p>
          <p className="text-3xl font-black text-blue-900 mt-2">
            {metrics?.cumulative_avg_numeric?.toFixed(2) || '-'}
          </p>
        </div>
        <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">Kỳ gần nhất</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{latestSemester?.gpa?.toFixed(2) || '-'}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{latestSemester?.semester || 'Chưa có dữ liệu'}</p>
        </div>
        <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">Kỳ tụt điểm</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{metrics?.dropped_semesters.length || 0}</p>
        </div>
      </section>

      {chartData.length > 0 && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Xu hướng GPA theo kỳ</h3>
                <p className="text-sm text-slate-500">Đường GPA học kỳ và GPA tích lũy.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-700" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="gpaLabel" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="gpa" name="GPA kỳ" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="cumulative_gpa" name="GPA tích lũy" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Điểm trung bình thang 10</h3>
                <p className="text-sm text-slate-500">Theo từng học kỳ và tích lũy.</p>
              </div>
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="semester" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="avg_numeric" name="Điểm TB kỳ" stroke="#7c3aed" fill="#ede9fe" strokeWidth={3} connectNulls />
                  <Line type="monotone" dataKey="cumulative_avg_numeric" name="Điểm TB tích lũy" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Tín chỉ đạt và tín chỉ nợ</h3>
                <p className="text-sm text-slate-500">Theo từng học kỳ, gồm môn rớt hoặc vắng thi.</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="semester" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="credits_earned" name="Tín chỉ đạt" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="credits_debt" name="Tín chỉ nợ" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {(metrics?.commendations.length || metrics?.dropped_semesters.length) ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Tiến bộ và tuyên dương</h3>
            <div className="mt-4 space-y-3">
              {metrics?.commendations.length ? (
                metrics.commendations.map((item, index) => (
                  <div key={`${item.semester}-${index}`} className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="font-black text-emerald-800">{item.label} - {item.semester}</p>
                    <p className="mt-1 text-sm font-medium text-emerald-700">{item.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Chưa có học kỳ đủ điều kiện tuyên dương.</p>
              )}
            </div>
          </div>

          <div className="min-w-0 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Kỳ cần chú ý</h3>
            <div className="mt-4 space-y-3">
              {metrics?.dropped_semesters.length ? (
                metrics.dropped_semesters.map((semester) => (
                  <div key={semester} className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="font-black text-red-800">{semester}</p>
                    <p className="mt-1 text-sm font-medium text-red-700">GPA giảm từ 0.5 trở lên so với học kỳ trước.</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Chưa phát hiện học kỳ tụt điểm mạnh.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {currentUser?.student_id ? (
        <AiInsightPanel scope="student" id={currentUser.student_id} title="AI phân tích kết quả học tập của bạn" />
      ) : null}

      <section className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase text-slate-400 border-b">
              <th className="py-3">Mã môn</th>
              <th className="py-3">Tên môn</th>
              <th className="py-3">Tín chỉ</th>
              <th className="py-3">Học kỳ</th>
              <th className="py-3">Điểm HP</th>
              <th className="py-3">Điểm chữ</th>
              <th className="py-3">GPA</th>
              <th className="py-3 text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, index) => {
              const status = getStatus(course);
              const Icon = status.icon;

              return (
                <tr key={`${course.code}-${index}`} className="border-b last:border-0">
                  <td className="py-4 font-mono text-sm text-slate-600">{course.code}</td>
                  <td className="py-4 font-semibold text-slate-800">{course.name}</td>
                  <td className="py-4 text-slate-500">{course.credits}</td>
                  <td className="py-4 text-slate-500">{course.semester}</td>
                  <td className="py-4 font-bold text-blue-900">{course.numeric_grade ?? '-'}</td>
                  <td className="py-4 font-bold text-blue-900">{course.letter_grade || '-'}</td>
                  <td className="py-4 text-slate-600">{course.gpa_points ?? '-'}</td>
                  <td className="py-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.className}`}>
                      <Icon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};
