import { useMemo, type ReactNode } from 'react';
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
import { Award, TrendingDown } from 'lucide-react';
import type { StudentMetricsData } from '../lib/api';

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F', 'ABSENT', 'IN_PROGRESS'];
const GRADE_LABEL: Record<string, string> = {
  A: 'A', B: 'B', C: 'C', D: 'D', F: 'F', ABSENT: 'Bỏ thi', IN_PROGRESS: 'Đang học',
};
const GRADE_COLOR: Record<string, string> = {
  A: '#2563eb', B: '#22c55e', C: '#eab308', D: '#f97316', F: '#ef4444',
  ABSENT: '#a855f7', IN_PROGRESS: '#94a3b8',
};

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h4 className="text-base font-bold text-slate-800 mb-4">{title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Chấm đỏ đánh dấu kỳ tụt điểm trên đường GPA
function GpaDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const drop = payload?.gpa_drop;
  return (
    <circle cx={cx} cy={cy} r={drop ? 6 : 3.5} fill={drop ? '#dc2626' : '#2563eb'} stroke="#fff" strokeWidth={1.5} />
  );
}

export function StudentMetricsCharts({ metrics }: { metrics: StudentMetricsData }) {
  const semesterData = useMemo(
    () =>
      (metrics.by_semester || []).map((s) => ({
        semester: s.semester,
        gpa: s.gpa,
        avg_numeric: s.avg_numeric,
        credits_earned: s.credits_earned,
        credits_debt: s.credits_debt,
        failed: s.failed,
        absent: s.absent,
        gpa_drop: s.gpa_drop,
      })),
    [metrics]
  );

  const gradeData = useMemo(
    () =>
      GRADE_ORDER.filter((g) => (metrics.grade_distribution?.[g] || 0) > 0).map((g) => ({
        name: GRADE_LABEL[g],
        key: g,
        value: metrics.grade_distribution[g] || 0,
      })),
    [metrics]
  );

  return (
    <div className="space-y-6">
      {/* Thẻ tóm tắt */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">GPA tích lũy</p>
          <p className="mt-2 text-3xl font-black text-blue-900">{metrics.cumulative_gpa?.toFixed(2) ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Điểm TB (hệ 10)</p>
          <p className="mt-2 text-3xl font-black text-slate-700">{metrics.cumulative_avg_numeric?.toFixed(2) ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Kỳ tụt điểm</p>
          <p className="mt-2 text-3xl font-black text-red-700">{metrics.dropped_semesters?.length || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Tiến bộ</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{metrics.improving ? 'Có' : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* S1 — GPA theo kỳ (chấm đỏ kỳ tụt) */}
        <ChartCard title="GPA theo từng kỳ">
          <LineChart data={semesterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="gpa" name="GPA" stroke="#2563eb" strokeWidth={2.5} dot={<GpaDot />} connectNulls />
          </LineChart>
        </ChartCard>

        {/* S2 — Điểm TB hệ 10 theo kỳ */}
        <ChartCard title="Điểm trung bình (hệ 10) theo kỳ">
          <LineChart data={semesterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="avg_numeric" name="Điểm TB" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ChartCard>

        {/* S3 — Phân bố điểm chữ */}
        <ChartCard title="Phân bố điểm chữ">
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={gradeData} dataKey="value" nameKey="name" outerRadius={90} label>
              {gradeData.map((g) => (
                <Cell key={g.key} fill={GRADE_COLOR[g.key] || '#94a3b8'} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>

        {/* S4 — Tín chỉ đạt vs nợ theo kỳ */}
        <ChartCard title="Tín chỉ đạt / nợ theo kỳ">
          <BarChart data={semesterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="credits_earned" name="Tín chỉ đạt" stackId="c" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="credits_debt" name="Tín chỉ nợ" stackId="c" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        {/* S5 — Số môn rớt/vắng theo kỳ */}
        <ChartCard title="Số môn rớt / vắng theo kỳ">
          <BarChart data={semesterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="failed" name="Rớt (F)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="Vắng thi" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        {/* Tiến bộ / kỳ cần chú ý */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <h4 className="flex items-center gap-2 text-base font-bold text-emerald-700 mb-2">
              <Award className="w-4 h-4" /> Tiến bộ & tuyên dương
            </h4>
            {metrics.commendations?.length ? (
              <ul className="space-y-1.5">
                {metrics.commendations.map((c, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    <span className="font-bold text-emerald-700">{c.label}</span> — {c.semester}: {c.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Chưa có kỳ đủ điều kiện tuyên dương.</p>
            )}
          </div>
          <div>
            <h4 className="flex items-center gap-2 text-base font-bold text-red-700 mb-2">
              <TrendingDown className="w-4 h-4" /> Kỳ cần chú ý
            </h4>
            {metrics.dropped_semesters?.length ? (
              <div className="flex flex-wrap gap-2">
                {metrics.dropped_semesters.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-lg bg-red-50 text-red-700 text-sm font-bold">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Chưa phát hiện kỳ tụt điểm mạnh.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentMetricsCharts;
