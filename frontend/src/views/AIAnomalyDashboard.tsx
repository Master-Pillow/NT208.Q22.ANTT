import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Play,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient, {
  generateAiBrief,
  getAnomalies,
  getAnomalyPatterns,
  runAiQuery,
  runAnomalyDetection,
  updateAnomalyStatus,
} from '../lib/api';

interface CurrentUser {
  id?: number;
  role?: string;
}

interface AIAnomalyDashboardProps {
  currentUser?: CurrentUser | null;
  mode?: 'all' | 'query' | 'anomaly' | 'brief' | 'patterns';
}

interface Anomaly {
  id: number;
  student_id: number;
  student_name: string;
  mssv: string;
  class_code: string;
  current_gpa: number | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  anomaly_type: string;
  evidence_json: any;
  suggested_action: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
  course_name?: string;
}

interface Pattern {
  id: number;
  source_course_name: string;
  target_course_name: string;
  support_count: number;
  confidence: string | number;
  lift: string | number;
}

const severityClass: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const statusClass: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  DISMISSED: 'bg-slate-100 text-slate-500',
};

const typeLabel: Record<string, string> = {
  LOW_GPA: 'GPA thấp',
  MULTIPLE_FAILURES: 'Nhiều môn F',
  COURSE_FAILURE: 'Rớt môn',
  GPA_DROP: 'GPA giảm',
  LOW_ACCUMULATED_CREDITS: 'Chậm tín chỉ',
};

const safeEvidenceText = (value: any, anomalyType?: string) => {
  let evidence = value || {};
  if (typeof value === 'string') {
    try {
      evidence = JSON.parse(value || '{}');
    } catch {
      evidence = {};
    }
  }

  if (anomalyType === 'GPA_DROP') {
    const previous = evidence.previous_semester
      ? `${evidence.previous_semester}: GPA ${evidence.previous_gpa ?? 'N/A'}`
      : null;
    const latest = evidence.latest_semester
      ? `${evidence.latest_semester}: GPA ${evidence.latest_gpa ?? 'N/A'}`
      : null;
    const drop = evidence.drop !== undefined ? `Giảm ${evidence.drop}` : null;

    return [previous, latest, drop].filter(Boolean).join(' · ');
  }

  if (anomalyType === 'LOW_GPA') {
    return [
      evidence.current_gpa !== undefined ? `GPA ${evidence.current_gpa}` : null,
      evidence.threshold !== undefined ? `Ngưỡng ${evidence.threshold}` : null,
      evidence.failed_course_count !== undefined ? `${evidence.failed_course_count} môn F` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (anomalyType === 'LOW_ACCUMULATED_CREDITS') {
    return [
      evidence.accumulated_credits !== undefined
        ? `${evidence.accumulated_credits} tín chỉ tích lũy`
        : null,
      evidence.class_average_credits !== undefined
        ? `TB lớp ${evidence.class_average_credits}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (anomalyType === 'MULTIPLE_FAILURES' && Array.isArray(evidence.courses)) {
    const courses = evidence.courses
      .map((course: any) => course.course_name || course.course_code)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');

    return [
      evidence.failed_course_count !== undefined ? `${evidence.failed_course_count} môn F` : null,
      courses || null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  const parts = [
    evidence.course_name || evidence.course_code,
    evidence.current_gpa !== undefined ? `GPA ${evidence.current_gpa}` : null,
    evidence.numeric_grade !== undefined ? `Điểm ${evidence.numeric_grade}` : null,
    evidence.failed_course_count !== undefined ? `${evidence.failed_course_count} môn F` : null,
    evidence.accumulated_credits !== undefined ? `${evidence.accumulated_credits} tín chỉ` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : 'Không có dữ liệu chi tiết';
};

export const AIAnomalyDashboard: React.FC<AIAnomalyDashboardProps> = ({ currentUser, mode = 'all' }) => {
  const [classes, setClasses] = useState<string[]>([]);
  const [classCode, setClassCode] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [anomalyType, setAnomalyType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  const [question, setQuestion] = useState('Liệt kê sinh viên có nguy cơ rớt môn');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  const role = String(currentUser?.role || '').trim().toUpperCase();
  const showQuery = mode === 'all' || mode === 'query';
  const showAnomaly = mode === 'all' || mode === 'anomaly';
  const showBrief = mode === 'all' || mode === 'brief';
  const showPatterns = mode === 'all' || mode === 'patterns';

  const fetchClasses = async () => {
    if (role === 'ADMIN') {
      const { data } = await apiClient.get('/admin/classes');
      setClasses(data.map((item: any) => item.code || item.class_code).filter(Boolean));
      return;
    }

    const { data } = await apiClient.get('/advisor/students');
    const uniqueClasses = Array.from(new Set(data.map((item: any) => item.class_code)));
    setClasses(uniqueClasses as string[]);
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [anomalyRes, patternRes] = await Promise.all([
        getAnomalies({
          classCode: classCode || undefined,
          severity: severity || undefined,
          status: status || undefined,
          anomalyType: anomalyType || undefined,
        }),
        getAnomalyPatterns(),
      ]);

      setAnomalies(anomalyRes.data);
      setPatterns(patternRes.data);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Không thể tải dữ liệu AI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses().catch(() => setClasses([]));
  }, [role]);

  useEffect(() => {
    fetchDashboard();
  }, [classCode, severity, status, anomalyType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [classCode, severity, status, anomalyType, pageSize]);

  const totalPages = Math.max(1, Math.ceil(anomalies.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = anomalies.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, anomalies.length);
  const paginatedAnomalies = useMemo(
    () => anomalies.slice(pageStartIndex, pageEndIndex),
    [anomalies, pageStartIndex, pageEndIndex]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const metrics = useMemo(() => {
    const highRiskStudents = new Set(
      anomalies.filter((item) => item.severity === 'HIGH').map((item) => item.student_id)
    );
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = anomalies.filter(
      (item) => new Date(item.created_at).getTime() >= weekAgo
    ).length;
    const courseCounts = new Map<string, number>();

    anomalies.forEach((item) => {
      let evidence = item.evidence_json || {};
      if (typeof item.evidence_json === 'string') {
        try {
          evidence = JSON.parse(item.evidence_json || '{}');
        } catch {
          evidence = {};
        }
      }
      const course = item.course_name || evidence.course_name;
      if (course) courseCounts.set(course, (courseCounts.get(course) || 0) + 1);
    });

    const topCourses = Array.from(courseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([course]) => course);

    return {
      total: anomalies.length,
      highRiskStudents: highRiskStudents.size,
      newThisWeek,
      topCourses,
    };
  }, [anomalies]);

  const handleRunDetection = async () => {
    setRunning(true);
    setMessage('');
    try {
      const { data } = await runAnomalyDetection(classCode || undefined);
      const emailStats = data.summary.emailStats;
      let emailNote = '';
      if (emailStats) {
        if (emailStats.disabled) {
          emailNote = ' (email cảnh báo đang tắt)';
        } else if (emailStats.sent > 0) {
          emailNote = ` Đã gửi ${emailStats.sent} email cảnh báo tới sinh viên.`;
        } else if (emailStats.skippedNoSmtp > 0) {
          emailNote = ' (chưa cấu hình SMTP nên chưa gửi email)';
        } else if (emailStats.throttled > 0) {
          emailNote = ` (bỏ qua ${emailStats.throttled} email do gửi quá gần đây)`;
        }
      }
      setMessage(
        `Đã quét ${data.summary.scannedStudents} sinh viên, tạo ${data.summary.insertedAnomalies} cảnh báo mới.${emailNote}`
      );
      await fetchDashboard();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Chạy phát hiện bất thường thất bại.');
    } finally {
      setRunning(false);
    }
  };

  const handleStatus = async (id: number, nextStatus: string) => {
    await updateAnomalyStatus(id, nextStatus);
    await fetchDashboard();
  };

  const handleGenerateBrief = async () => {
    if (!classCode) {
      setMessage('Chọn một lớp trước khi sinh AI Brief.');
      return;
    }

    setBriefLoading(true);
    try {
      const { data } = await generateAiBrief(classCode);
      setBrief(data.brief.content);
      setMessage('Đã sinh AI Brief cho lớp đã chọn.');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Không thể sinh AI Brief.');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleAiQuery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;

    setQueryLoading(true);
    setQueryResult(null);
    try {
      const { data } = await runAiQuery({ question });
      setQueryResult(data);
    } catch (err: any) {
      setQueryResult({ summary: err.response?.data?.message || 'Không thể truy vấn dữ liệu.' });
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface mb-2">
            AI học vụ
          </h2>
          <p className="text-slate-500 font-medium">
            Chat-to-Data, phát hiện bất thường học tập và AI Brief cho cố vấn.
          </p>
        </div>

        {showAnomaly && (
          <button
            onClick={handleRunDetection}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Chạy phát hiện bất thường
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      )}

      {showQuery && <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Chat-to-Data</h3>
            <p className="text-xs text-slate-500">
              Hỏi bằng tiếng Việt, backend tạo JSON plan và query dữ liệu an toàn.
            </p>
          </div>
        </div>

        <form onSubmit={handleAiQuery} className="flex flex-col lg:flex-row gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="Ví dụ: Vẽ biểu đồ phổ điểm môn IT004 của khóa 2023"
          />
          <button
            type="submit"
            disabled={queryLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3 text-sm font-bold disabled:opacity-60"
          >
            {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Truy vấn
          </button>
        </form>

        {queryResult && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-800">{queryResult.summary}</p>
              {queryResult.plan && (
                <pre className="mt-3 max-h-32 overflow-auto text-[11px] text-slate-500">
                  {JSON.stringify(queryResult.plan, null, 2)}
                </pre>
              )}
            </div>

            {queryResult.chart?.data && (
              <div className="h-72 rounded-xl border border-slate-100 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={queryResult.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#004ac6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {queryResult.rows?.length > 0 && !queryResult.chart && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
                    <tr>
                      {(queryResult.columns || Object.keys(queryResult.rows[0]).map((key) => ({ key, label: key }))).map((column: any) => (
                        <th key={column.key} className="px-4 py-3 font-bold">{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queryResult.rows.slice(0, 20).map((row: any, index: number) => (
                      <tr key={index}>
                        {(queryResult.columns || Object.keys(row).map((key) => ({ key }))).map((column: any) => (
                          <td key={column.key} className="px-4 py-3 text-slate-700">
                            {String(row[column.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>}

      {showAnomaly && <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng cảnh báo', value: metrics.total, Icon: ShieldAlert },
          { label: 'Sinh viên rủi ro cao', value: metrics.highRiskStudents, Icon: AlertTriangle },
          { label: 'Cảnh báo tuần này', value: metrics.newThisWeek, Icon: Sparkles },
          { label: 'Môn rủi ro nổi bật', value: metrics.topCourses[0] || 'Chưa có', Icon: FileText },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <Icon className="w-5 h-5 text-primary mb-4" />
            <div className="text-2xl font-black text-slate-900">{value}</div>
            <div className="text-xs font-bold uppercase tracking-normal text-slate-400 mt-1">
              {label}
            </div>
          </div>
        ))}
      </section>}

      {(showAnomaly || showBrief) && <section className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className={`grid grid-cols-1 gap-3 ${showAnomaly ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
          <select value={classCode} onChange={(event) => setClassCode(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
            <option value="">Tất cả lớp</option>
            {classes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          {showAnomaly && (
            <>
              <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
                <option value="">Tất cả mức độ</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
                <option value="">Tất cả trạng thái</option>
                <option value="OPEN">OPEN</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="DISMISSED">DISMISSED</option>
              </select>
              <select value={anomalyType} onChange={(event) => setAnomalyType(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
                <option value="">Tất cả loại</option>
                {Object.entries(typeLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </>
          )}
        </div>
      </section>}

      {showAnomaly && <section className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Danh sách anomaly</h3>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Sinh viên</th>
                <th className="px-4 py-3">MSSV</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Mức độ</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Bằng chứng</th>
                <th className="px-4 py-3">Gợi ý</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    Chưa có cảnh báo phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedAnomalies.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-bold text-slate-800">{item.student_name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{item.mssv}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{item.class_code}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${severityClass[item.severity]}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{typeLabel[item.anomaly_type] || item.anomaly_type}</td>
                    <td className="px-4 py-4 text-slate-600 min-w-52">{safeEvidenceText(item.evidence_json, item.anomaly_type)}</td>
                    <td className="px-4 py-4 text-slate-600 min-w-64">{item.suggested_action}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleStatus(item.id, 'RESOLVED')} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Resolve">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleStatus(item.id, 'DISMISSED')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Dismiss">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-500">
            Hiển thị {anomalies.length === 0 ? 0 : pageStartIndex + 1}–{pageEndIndex} trong {anomalies.length} kết quả
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              Số dòng
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                &lt;&lt; Trang trước
              </button>
              <span className="min-w-28 text-center text-sm font-bold text-slate-600">
                Trang {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trang sau &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      </section>}

      {(showPatterns || showBrief) && <div className={`grid grid-cols-1 gap-6 ${mode === 'all' ? 'xl:grid-cols-2' : ''}`}>
        {showPatterns && <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Pattern rớt môn</h3>
          <div className="space-y-3">
            {patterns.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có pattern đủ ngưỡng support/confidence/lift.</p>
            ) : (
              patterns.slice(0, 8).map((pattern) => (
                <div key={pattern.id} className="rounded-xl border border-slate-100 p-4">
                  <p className="font-semibold text-slate-800">
                    Rớt {pattern.source_course_name} → nguy cơ rớt {pattern.target_course_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Confidence {Number(pattern.confidence).toFixed(2)} · Support {pattern.support_count} · Lift {Number(pattern.lift).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>}

        {showBrief && <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="font-bold text-slate-900">AI Brief</h3>
            <button
              onClick={handleGenerateBrief}
              disabled={briefLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {briefLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sinh brief
            </button>
          </div>
          <div className="min-h-72 rounded-xl bg-slate-50 border border-slate-100 p-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {brief || 'Chọn lớp ở bộ lọc, sau đó bấm Sinh brief để tạo bản tin học vụ bằng AI.'}
          </div>
        </section>}
      </div>}
    </div>
  );
};
