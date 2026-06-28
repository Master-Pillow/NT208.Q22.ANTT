import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
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

const chartMargin = { top: 12, right: 16, bottom: 4, left: 0 };

export const StudentAcademic = () => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [metrics, setMetrics] = useState<StudentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
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
          Đồng bộ điểm trực tiếp từ DAA và theo dõi xu hướng học tập theo từng học kỳ.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

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
