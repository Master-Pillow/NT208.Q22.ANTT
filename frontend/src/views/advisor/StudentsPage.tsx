import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, GraduationCap, LineChart as LineChartIcon, Loader2, Mail, TrendingDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { PageLayout } from '../../components/layout/PageLayout';
import apiClient, { getAdvisorStudentMetrics, type StudentMetricsData } from '../../lib/api';
import { AiInsightPanel } from '../../components/AiInsightPanel';
import { StudentMetricsCharts } from '../../components/StudentMetricsCharts';

interface Student {
  id: number;
  full_name: string;
  mssv: string;
  class_code: string;
  cohort: string;
  current_gpa: number;
  credit_debt: number;
}

interface AdvisorClass {
  code: string;
  name?: string | null;
  cohort?: string | null;
  program?: string | null;
  student_count: number;
}

interface SelectedClass {
  code: string;
  title: string;
  students: Student[];
}

interface ClassMetrics {
  total_students: number;
  avg_gpa: number | null;
  fail_rate: number;
  at_risk_count: number;
  grade_distribution: Record<string, number>;
  gpa_by_semester: Array<{ semester: string; avg_gpa: number | null; fail_rate: number }>;
  failrate_by_course: Array<{ code: string; name: string; fail_rate: number }>;
  gpa_histogram: Array<{ bucket: string; count: number }>;
  top_improving: Array<{ full_name: string; mssv: string; gpa_delta: number }>;
  top_declining: Array<{ full_name: string; mssv: string; gpa_delta: number }>;
}

interface AdvisorGradeCourse {
  semester: string;
  course_code: string;
  course_name: string;
  credits: number;
  letter_grade: string | null;
  numeric_grade: string | number | null;
  gpa_points: string | number | null;
  status: string;
}

interface AdvisorAcademicSemester {
  semester: string;
  total_credits: number;
  earned_credits: number;
  debt_credits: number;
  failed_courses: number;
  gpa: number | null;
  courses: AdvisorGradeCourse[];
}

interface AdvisorAcademicDetail {
  student: Student;
  summary: {
    total_credits: number;
    earned_credits: number;
    debt_credits: number;
    current_gpa: number | null;
  };
  semesters: AdvisorAcademicSemester[];
}

const STUDENTS_PER_PAGE = 15;
const gradeColors: Record<string, string> = {
  A: '#2563eb',
  B: '#059669',
  C: '#f59e0b',
  D: '#ea580c',
  F: '#dc2626',
  ABSENT: '#7c2d12',
  IN_PROGRESS: '#64748b',
};

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<AdvisorClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<SelectedClass | null>(null);
  const [classMetrics, setClassMetrics] = useState<ClassMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentMetrics, setStudentMetrics] = useState<StudentMetricsData | null>(null);
  const [studentMetricsLoading, setStudentMetricsLoading] = useState(false);
  const [academicDetail, setAcademicDetail] = useState<AdvisorAcademicDetail | null>(null);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicError, setAcademicError] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [studentsRes, classesRes] = await Promise.all([
          apiClient.get('/advisor/students'),
          apiClient.get('/advisor/classes'),
        ]);
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      } catch (error) {
        console.error('Lỗi lấy dữ liệu lớp cố vấn:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    setStudentPage(1);
  }, [selectedClass?.code]);
  useEffect(() => {
    async function fetchClassMetrics() {
      if (!selectedClass) {
        setClassMetrics(null);
        return;
      }

      try {
        setMetricsLoading(true);
        const { data } = await apiClient.get(`/advisor/classes/${selectedClass.code}/metrics`);
        setClassMetrics(data);
      } catch (error) {
        console.error('Lỗi lấy phân tích lớp:', error);
        setClassMetrics(null);
      } finally {
        setMetricsLoading(false);
      }
    }

    fetchClassMetrics();
  }, [selectedClass]);

  useEffect(() => {
    async function fetchStudentMetrics() {
      if (!selectedStudent) {
        setStudentMetrics(null);
        return;
      }
      try {
        setStudentMetricsLoading(true);
        const { data } = await getAdvisorStudentMetrics(selectedStudent.id);
        setStudentMetrics(data);
      } catch (error) {
        console.error('Lỗi lấy phân tích sinh viên:', error);
        setStudentMetrics(null);
      } finally {
        setStudentMetricsLoading(false);
      }
    }

    fetchStudentMetrics();
  }, [selectedStudent]);

  const gradeDistribution = useMemo(() => {
    if (!classMetrics) return [];
    return Object.entries(classMetrics.grade_distribution)
      .filter(([, value]) => Number(value) > 0)
      .map(([name, value]) => ({ name, value }));
  }, [classMetrics]);

  const openClass = (item: AdvisorClass) => {
    setSelectedClass({
      code: item.code,
      title: `${item.code} - Khóa ${item.cohort || 'N/A'}`,
      students: students.filter((student) => student.class_code === item.code),
    });
  };

  const openMessages = (student: Student) => {
    navigate('/advisor/messages', {
      state: {
        initialContact: {
          id: student.id,
          name: student.full_name,
          mssv: student.mssv,
        },
      },
    });
  };
  const openAcademicDetail = async (student: Student) => {
    try {
      setAcademicLoading(true);
      setAcademicError(null);
      setAcademicDetail({
        student,
        summary: {
          total_credits: 0,
          earned_credits: 0,
          debt_credits: 0,
          current_gpa: null,
        },
        semesters: [],
      });

      const { data } = await apiClient.get(`/advisor/students/${student.id}/academic`);
      setAcademicDetail(data);
    } catch (error: any) {
      setAcademicError(error.response?.data?.message || 'Không thể tải bảng điểm sinh viên.');
    } finally {
      setAcademicLoading(false);
    }
  };

  const closeAcademicDetail = () => {
    setAcademicDetail(null);
    setAcademicError(null);
    setAcademicLoading(false);
  };

  const getCourseStatusLabel = (course: AdvisorGradeCourse) => {
    if (course.status === 'ABSENT') return 'Vắng thi';
    if (course.status === 'IN_PROGRESS') return 'Đang học';
    if (course.status === 'EXEMPT') return 'Miễn';
    if (course.letter_grade === 'F') return 'Rớt';
    return 'Đã có điểm';
  };

  const renderClassMetrics = () => {
    if (!selectedClass) return null;

    if (metricsLoading) {
      return <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-500">Đang tải phân tích lớp...</div>;
    }

    if (!classMetrics) return null;

    return (
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">GPA TB lớp</p>
            <p className="mt-2 text-3xl font-black text-blue-900">{classMetrics.avg_gpa?.toFixed(2) || '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">Tỷ lệ rớt/vắng</p>
            <p className="mt-2 text-3xl font-black text-red-700">{classMetrics.fail_rate.toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">Sinh viên rủi ro</p>
            <p className="mt-2 text-3xl font-black text-orange-700">{classMetrics.at_risk_count}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">Sĩ số</p>
            <p className="mt-2 text-3xl font-black text-blue-900">{classMetrics.total_students}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">GPA trung bình theo kỳ</h3>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={classMetrics.gpa_by_semester}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="semester" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="avg_gpa" name="GPA TB" stroke="#2563eb" strokeWidth={3} connectNulls />
                  <Line dataKey="fail_rate" name="Tỷ lệ rớt (%)" stroke="#dc2626" strokeWidth={3} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Phân bố điểm</h3>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={gradeDistribution} dataKey="value" nameKey="name" outerRadius={96} label>
                    {gradeDistribution.map((entry) => (
                      <Cell key={entry.name} fill={gradeColors[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Phân bố GPA</h3>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classMetrics.gpa_histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Số sinh viên" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Môn có tỷ lệ rớt cao</h3>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classMetrics.failrate_by_course} layout="vertical" margin={{ left: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="code" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="fail_rate" name="Tỷ lệ rớt/vắng (%)" fill="#dc2626" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <AiInsightPanel scope="class" id={selectedClass.code} title={`AI phân tích lớp ${selectedClass.code}`} />
      </section>
    );
  };

  const renderAcademicModal = () => {
    if (!academicDetail) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
        <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-slate-400">Bảng điểm sinh viên</p>
              <h3 className="mt-1 truncate text-2xl font-black text-slate-900">{academicDetail.student.full_name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {academicDetail.student.mssv} · {academicDetail.student.class_code}
              </p>
            </div>
            <button
              type="button"
              onClick={closeAcademicDetail}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Đóng bảng điểm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            {academicLoading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tải bảng điểm...
              </div>
            ) : academicError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {academicError}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">GPA tích lũy</p>
                    <p className="mt-2 text-2xl font-black text-blue-900">
                      {academicDetail.summary.current_gpa?.toFixed(2) || '-'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Tín chỉ đăng ký</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{academicDetail.summary.total_credits}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-600">Tín chỉ đạt</p>
                    <p className="mt-2 text-2xl font-black text-emerald-800">{academicDetail.summary.earned_credits}</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-xs font-bold uppercase text-red-600">Tín chỉ nợ</p>
                    <p className="mt-2 text-2xl font-black text-red-800">{academicDetail.summary.debt_credits}</p>
                  </div>
                </div>

                {academicDetail.semesters.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                    Chưa có dữ liệu điểm cho sinh viên này.
                  </div>
                ) : (
                  academicDetail.semesters.map((semester) => (
                    <section key={semester.semester} className="overflow-hidden rounded-2xl border border-slate-100">
                      <div className="flex flex-col gap-3 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h4 className="text-lg font-black text-slate-900">{semester.semester}</h4>
                          <p className="text-sm font-semibold text-slate-500">
                            GPA kỳ: {semester.gpa?.toFixed(2) || '-'} · {semester.courses.length} môn
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-white px-3 py-1 text-slate-600">Đăng ký: {semester.total_credits} TC</span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Đạt: {semester.earned_credits} TC</span>
                          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Nợ: {semester.debt_credits} TC</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                          <thead className="text-xs uppercase text-slate-400">
                            <tr className="border-b border-slate-100">
                              <th className="px-5 py-3">Mã môn</th>
                              <th className="px-5 py-3">Tên môn</th>
                              <th className="px-5 py-3 text-center">Tín chỉ</th>
                              <th className="px-5 py-3 text-center">Điểm HP</th>
                              <th className="px-5 py-3 text-center">Điểm chữ</th>
                              <th className="px-5 py-3 text-center">GPA</th>
                              <th className="px-5 py-3 text-right">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {semester.courses.map((course) => (
                              <tr key={`${semester.semester}-${course.course_code}`}>
                                <td className="px-5 py-3 font-mono font-semibold text-slate-600">{course.course_code}</td>
                                <td className="px-5 py-3 font-semibold text-slate-800">{course.course_name}</td>
                                <td className="px-5 py-3 text-center text-slate-600">{course.credits}</td>
                                <td className="px-5 py-3 text-center font-bold text-blue-900">{course.numeric_grade ?? '-'}</td>
                                <td className="px-5 py-3 text-center font-bold text-blue-900">{course.letter_grade || '-'}</td>
                                <td className="px-5 py-3 text-center text-slate-600">{course.gpa_points ?? '-'}</td>
                                <td className="px-5 py-3 text-right">
                                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                    {getCourseStatusLabel(course)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const renderStudentTable = (rows: Student[]) => {
    const totalResults = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / STUDENTS_PER_PAGE));
    const currentPage = Math.min(studentPage, totalPages);
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
    const endIndex = Math.min(startIndex + STUDENTS_PER_PAGE, totalResults);
    const pagedRows = rows.slice(startIndex, endIndex);

    return (
      <section className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">Họ và tên</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">MSSV</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-center">Lớp sinh hoạt</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-center">GPA</th>
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => openAcademicDetail(student)}
                        className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        title="Xem điểm chi tiết"
                      >
                        <img
                          src={`https://i.pravatar.cc/100?u=${student.mssv}`}
                          alt={student.full_name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 transition hover:ring-primary"
                        />
                      </button>
                      <div>
                        <p className="font-bold text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-400">{student.mssv}@uit.edu.vn</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono font-semibold text-slate-600">{student.mssv}</td>
                  <td className="px-6 py-5 text-center font-bold text-primary">{student.class_code}</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-700">{Number(student.current_gpa || 0).toFixed(2)}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white"
                      >
                        <LineChartIcon className="w-4 h-4" />
                        Xem phân tích
                      </button>
                      <button
                        type="button"
                        onClick={() => openMessages(student)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white"
                      >
                        <Mail className="w-4 h-4" />
                        Nhắn tin
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            {totalResults > 0
              ? `Hiển thị ${startIndex + 1}-${endIndex} trong ${totalResults} sinh viên`
              : 'Không có sinh viên để hiển thị'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setStudentPage((page) => Math.max(1, page - 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="min-w-28 text-center text-sm font-bold text-slate-600">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setStudentPage((page) => Math.min(totalPages, page + 1))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      </section>
    );
  };
  const renderStudentDetail = () => {
    if (!selectedStudent) return null;
    return (
      <>
        <button
          type="button"
          onClick={() => setSelectedStudent(null)}
          className="flex items-center text-sm font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại danh sách sinh viên
        </button>

        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-slate-400">Sinh viên</p>
          <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">{selectedStudent.full_name}</h2>
          <p className="mt-2 text-slate-500 font-medium">MSSV {selectedStudent.mssv} · Lớp {selectedStudent.class_code}</p>
        </div>

        <AiInsightPanel scope="student" id={selectedStudent.id} title={`AI phân tích ${selectedStudent.full_name}`} />

        {studentMetricsLoading ? (
          <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-500">Đang tải phân tích sinh viên...</div>
        ) : studentMetrics ? (
          <StudentMetricsCharts metrics={studentMetrics} />
        ) : (
          <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-400">Chưa có dữ liệu điểm cho sinh viên này.</div>
        )}
      </>
    );
  };

  return (
    <PageLayout title="Sinh viên lớp mình" breadcrumb={['ADVISOR', 'Sinh viên lớp mình']}>
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
        {selectedStudent ? (
          renderStudentDetail()
        ) : selectedClass ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedClass(null)}
              className="flex items-center text-sm font-semibold text-slate-500 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại danh sách lớp
            </button>

            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-slate-400">Lớp sinh hoạt</p>
              <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">{selectedClass.title}</h2>
              <p className="mt-2 text-slate-500 font-medium">{selectedClass.students.length} sinh viên</p>
            </div>

            {renderClassMetrics()}
            {renderStudentTable(selectedClass.students)}
          </>
        ) : (
          <>
            <div>
              <h2 className="text-4xl font-headline font-black text-on-surface mb-2">Quản lý lớp cố vấn</h2>
              <p className="text-slate-500 font-medium">
                Lớp được lấy từ phân công của admin. Admin import sinh viên và tài khoản, cố vấn xem danh sách và phân tích lớp.
              </p>
            </div>

            <section>
              <div className="flex items-center gap-4 mb-5">
                <div className="h-8 w-1.5 bg-secondary-container rounded-full" />
                <h3 className="font-headline text-2xl font-bold text-on-surface">Lớp sinh hoạt đang cố vấn</h3>
              </div>
              {loading ? (
                <p className="text-sm text-slate-400">Đang tải dữ liệu lớp...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-slate-400">Bạn chưa được admin phân công lớp sinh hoạt nào.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {classes.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => openClass(item)}
                      className="relative overflow-hidden text-left rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-md transition-all"
                    >
                      <GraduationCap className="absolute -right-8 -top-8 w-32 h-32 text-primary opacity-[0.04]" />
                      <h4 className="text-3xl font-black text-slate-900">{item.code}</h4>
                      <p className="text-sm font-semibold text-slate-400 mt-1">Khóa {item.cohort || 'N/A'}</p>
                      <p className="mt-8 text-4xl font-black text-primary">{item.student_count}</p>
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">Sinh viên cố vấn</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-700">
                        <TrendingDown className="h-4 w-4" />
                        Xem phân tích lớp
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      {renderAcademicModal()}
    </PageLayout>
  );
}
