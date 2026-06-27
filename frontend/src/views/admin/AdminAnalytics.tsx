import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, AlertCircle, Building2, Layers } from 'lucide-react';
import { getCohortMetrics, getSystemMetrics } from '../../lib/api';
import { AiInsightPanel } from '../../components/AiInsightPanel';

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F', 'ABSENT', 'IN_PROGRESS'];
const GRADE_LABEL: Record<string, string> = {
  A: 'A', B: 'B', C: 'C', D: 'D', F: 'F', ABSENT: 'Bỏ thi', IN_PROGRESS: 'Đang học',
};
const GRADE_COLOR: Record<string, string> = {
  A: '#2563eb', B: '#22c55e', C: '#eab308', D: '#f97316', F: '#ef4444',
  ABSENT: '#a855f7', IN_PROGRESS: '#94a3b8',
};
const STATUS_COLORS = ['#22c55e', '#ef4444', '#cbd5e1'];

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface-container-lowest p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
      <h4 className="text-base font-bold text-slate-800 mb-4">{title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function gradeDistToArray(dist: Record<string, number> = {}) {
  return GRADE_ORDER.filter((g) => (dist[g] || 0) > 0).map((g) => ({
    name: GRADE_LABEL[g],
    key: g,
    value: dist[g] || 0,
  }));
}

export function AdminAnalytics() {
  const [system, setSystem] = useState<any>(null);
  const [cohort, setCohort] = useState<string>('');
  const [cohortData, setCohortData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await getSystemMetrics();
        setSystem(data);
        const firstCohort = data?.cohorts_compare?.[0]?.cohort;
        if (firstCohort) setCohort(String(firstCohort));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải phân tích toàn trường.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!cohort) return;
    (async () => {
      try {
        setCohortLoading(true);
        const { data } = await getCohortMetrics(cohort);
        setCohortData(data);
      } catch {
        setCohortData(null);
      } finally {
        setCohortLoading(false);
      }
    })();
  }, [cohort]);

  const statusData = useMemo(() => {
    const s = system?.status_distribution || {};
    return [
      { name: 'Đang học tốt', value: s.ACTIVE || 0 },
      { name: 'Rủi ro', value: s.AT_RISK || 0 },
      { name: 'Chưa có điểm', value: s.NO_DATA || 0 },
    ].filter((x) => x.value > 0);
  }, [system]);

  const cohortOptions: string[] = useMemo(
    () => (system?.cohorts_compare || []).map((c: any) => String(c.cohort)),
    [system]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-primary gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-bold">Đang tải phân tích chuyên sâu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 text-red-600 bg-red-50 p-6 rounded-2xl border border-red-100">
        <AlertCircle className="w-6 h-6" />
        <span className="font-bold">{error}</span>
      </div>
    );
  }

  const systemGrade = gradeDistToArray(system?.grade_distribution);
  const cohortGrade = gradeDistToArray(cohortData?.grade_distribution);

  return (
    <div className="space-y-10">
      {/* ===== TOÀN TRƯỜNG (T1–T4) ===== */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-headline font-black text-on-surface">Phân tích Toàn trường</h3>
            <p className="text-sm text-slate-500 font-medium">
              {system?.total_students || 0} sinh viên · GPA TB {system?.avg_gpa ?? '—'} · {system?.at_risk_count || 0} SV rủi ro
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* T1 — Phân bố trạng thái SV */}
          <ChartCard title="Phân bố trạng thái sinh viên">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartCard>

          {/* T2 — Xu hướng GPA toàn trường theo kỳ */}
          <ChartCard title="Xu hướng GPA toàn trường theo kỳ">
            <LineChart data={system?.gpa_trend_by_semester || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg_gpa" name="GPA TB" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ChartCard>

          {/* T3 — Số cảnh báo theo loại */}
          <ChartCard title="Số cảnh báo theo loại bất thường">
            <BarChart data={system?.anomalies_by_type || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Số cảnh báo" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>

          {/* T4 — So sánh các khoá */}
          <ChartCard title="So sánh các khoá">
            <BarChart data={system?.cohorts_compare || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" domain={[0, 4]} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avg_gpa" name="GPA TB" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="fail_rate" name="Tỷ lệ rớt (%)" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>

        <AiInsightPanel scope="system" />
      </section>

      {/* ===== KHOÁ (K1–K4) ===== */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-headline font-black text-on-surface">Phân tích theo Khoá</h3>
              <p className="text-sm text-slate-500 font-medium">
                {cohortData
                  ? `${cohortData.total_students} SV · ${cohortData.total_classes} lớp · GPA TB ${cohortData.avg_gpa ?? '—'}`
                  : 'Chọn khoá để xem chi tiết'}
              </p>
            </div>
          </div>
          <select
            aria-label="Chọn khoá để phân tích"
            title="Chọn khoá"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-300 outline-none"
          >
            {cohortOptions.map((c) => (
              <option key={c} value={c}>
                Khoá {c}
              </option>
            ))}
          </select>
        </div>

        {cohortLoading ? (
          <div className="flex items-center justify-center py-12 text-indigo-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-bold">Đang tải dữ liệu khoá {cohort}...</span>
          </div>
        ) : cohortData ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* K1 — GPA TB theo năm */}
              <ChartCard title="GPA trung bình theo năm học">
                <LineChart data={cohortData.gpa_by_year || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_gpa" name="GPA TB" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ChartCard>

              {/* K2 — Tỷ lệ rớt theo năm */}
              <ChartCard title="Tỷ lệ rớt/vắng theo năm học">
                <LineChart data={cohortData.failrate_by_year || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="fail_rate" name="Tỷ lệ rớt (%)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ChartCard>

              {/* K3 — So sánh các lớp cùng khoá */}
              <ChartCard title="So sánh các lớp cùng khoá">
                <BarChart data={cohortData.classes_compare || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="class_code" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" domain={[0, 4]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avg_gpa" name="GPA TB" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="fail_rate" name="Tỷ lệ rớt (%)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>

              {/* K4 — Phân bố điểm toàn khoá */}
              <ChartCard title="Phân bố điểm toàn khoá">
                <BarChart data={cohortGrade}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Số lượt" radius={[6, 6, 0, 0]}>
                    {cohortGrade.map((g) => (
                      <Cell key={g.key} fill={GRADE_COLOR[g.key] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
            </div>

            {cohort && <AiInsightPanel scope="cohort" id={cohort} title={`AI phân tích khoá ${cohort}`} />}
          </>
        ) : (
          <p className="text-sm text-slate-400 py-8 text-center">Chưa có dữ liệu cho khoá này.</p>
        )}
      </section>

      {/* Phân bố điểm toàn trường (bổ trợ) */}
      {systemGrade.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Phân bố điểm toàn trường">
            <BarChart data={systemGrade}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Số lượt" radius={[6, 6, 0, 0]}>
                {systemGrade.map((g) => (
                  <Cell key={g.key} fill={GRADE_COLOR[g.key] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </section>
      )}
    </div>
  );
}

export default AdminAnalytics;
