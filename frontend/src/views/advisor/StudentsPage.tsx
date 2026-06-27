import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, GraduationCap, LineChart as LineChartIcon, Mail, TrendingDown } from 'lucide-react';
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

  const renderStudentTable = (rows: Student[]) => (
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
            {rows.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-900">{student.full_name}</td>
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
    </section>
  );

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
    </PageLayout>
  );
}
