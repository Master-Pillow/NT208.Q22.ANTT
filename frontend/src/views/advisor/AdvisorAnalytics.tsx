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
import { Loader2, AlertCircle, LayoutDashboard } from 'lucide-react';
import { getAdvisorMetrics } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
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

function gradeDistToArray(dist: Record<string, number> = {}) {
  return GRADE_ORDER.filter((g) => (dist[g] || 0) > 0).map((g) => ({
    name: GRADE_LABEL[g],
    key: g,
    value: dist[g] || 0,
  }));
}

export function AdvisorAnalytics() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getAdvisorMetrics();
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải phân tích tổng hợp.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusData = useMemo(() => {
    const s = data?.status_distribution || {};
    return [
      { name: 'Đang học tốt', value: s.ACTIVE || 0 },
      { name: 'Rủi ro', value: s.AT_RISK || 0 },
      { name: 'Chưa có điểm', value: s.NO_DATA || 0 },
    ].filter((x) => x.value > 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-primary gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-bold">Đang tải phân tích tổng hợp...</span>
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

  if (!data || data.total_students === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-500 font-medium">
        Chưa có dữ liệu điểm cho các lớp bạn phụ trách.
      </div>
    );
  }

  const gradeData = gradeDistToArray(data.grade_distribution);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-headline font-black text-on-surface">Phân tích tổng hợp lớp phụ trách</h3>
          <p className="text-sm text-slate-500 font-medium">
            {data.total_students} sinh viên · {data.total_classes} lớp · GPA TB {data.avg_gpa ?? '—'} · {data.at_risk_count} SV rủi ro
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Trạng thái SV */}
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

        {/* Xu hướng GPA theo kỳ */}
        <ChartCard title="Xu hướng GPA theo kỳ (tất cả lớp)">
          <LineChart data={data.gpa_trend_by_semester || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avg_gpa" name="GPA TB" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="fail_rate" name="Tỷ lệ rớt (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ChartCard>

        {/* So sánh các lớp */}
        <ChartCard title="So sánh các lớp phụ trách">
          <BarChart data={data.classes_compare || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="class_code" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
            <YAxis yAxisId="left" domain={[0, 4]} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="avg_gpa" name="GPA TB" fill="#2563eb" radius={[6, 6, 0, 0]} />
            <Bar yAxisId="right" dataKey="fail_rate" name="Tỷ lệ rớt (%)" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        {/* Môn có tỷ lệ rớt cao */}
        <ChartCard title="Môn có tỷ lệ rớt cao">
          <BarChart data={data.failrate_by_course || []} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
            <Tooltip />
            <Bar dataKey="fail_rate" name="Tỷ lệ rớt/vắng (%)" fill="#dc2626" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>

        {/* Phân bố điểm */}
        <ChartCard title="Phân bố điểm (tất cả lớp)">
          <BarChart data={gradeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" name="Số lượt" radius={[6, 6, 0, 0]}>
              {gradeData.map((g) => (
                <Cell key={g.key} fill={GRADE_COLOR[g.key] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* Cảnh báo theo loại */}
        <ChartCard title="Số cảnh báo theo loại">
          <BarChart data={data.anomalies_by_type || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" name="Số cảnh báo" fill="#f97316" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {currentUser?.id && <AiInsightPanel scope="advisor" id={currentUser.id} title="AI phân tích lớp phụ trách" />}
    </div>
  );
}

export default AdvisorAnalytics;
