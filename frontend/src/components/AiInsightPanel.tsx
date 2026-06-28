import { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Award,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { getGradeInsight, type GradeInsight, type InsightScope } from '../lib/api';

interface AiInsightPanelProps {
  scope: InsightScope;
  id?: string | number;
  /** Tiêu đề hiển thị; mặc định theo scope */
  title?: string;
  className?: string;
}

const TREND_META: Record<GradeInsight['trend'], { label: string; color: string; Icon: any }> = {
  up: { label: 'Đi lên', color: 'text-emerald-600 bg-emerald-50', Icon: TrendingUp },
  down: { label: 'Đi xuống', color: 'text-red-600 bg-red-50', Icon: TrendingDown },
  stable: { label: 'Ổn định', color: 'text-slate-600 bg-slate-100', Icon: Minus },
};

/** Render rất nhẹ cho **bold** trong từng dòng markdown đơn giản. */
function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function BulletList({
  items,
  Icon,
  color,
  label,
}: {
  items: string[];
  Icon: any;
  color: string;
  label: string;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-700 flex gap-2">
            <span className="text-slate-300 mt-0.5">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiInsightPanel({ scope, id, title, className = '' }: AiInsightPanelProps) {
  const [insight, setInsight] = useState<GradeInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const heading =
    title ||
    {
      student: 'AI phân tích sinh viên',
      class: 'AI phân tích lớp',
      cohort: 'AI phân tích khoá',
      system: 'AI phân tích toàn trường',
      advisor: 'AI phân tích lớp phụ trách',
    }[scope];

  const run = async (refresh: boolean) => {
    if (scope !== 'system' && (id === undefined || id === null || id === '')) {
      setError('Chưa chọn đối tượng để phân tích.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await getGradeInsight(scope, id, refresh);
      setInsight(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo phân tích AI.');
    } finally {
      setLoading(false);
    }
  };

  const trend = insight ? TREND_META[insight.trend] : null;

  return (
    <div
      className={`bg-gradient-to-br from-indigo-50/60 to-white border border-indigo-100 rounded-2xl p-6 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-indigo-900">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          🤖 {heading}
        </h3>
        {insight ? (
          <button
            type="button"
            onClick={() => run(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        ) : null}
      </div>

      {!insight && !loading && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 mb-4">
            Nhấn để AI tổng hợp nhận định từ số liệu học tập (xu hướng, rủi ro, tuyên dương, đề xuất).
          </p>
          <button
            type="button"
            onClick={() => run(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Phân tích
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-3 animate-pulse py-2">
          <div className="h-4 bg-indigo-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-5/6" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {insight && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {trend && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${trend.color}`}>
                <trend.Icon className="w-3.5 h-3.5" />
                {trend.label}
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                insight.source === 'gemini'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {insight.source === 'gemini' ? 'Gemini AI' : 'Phân tích theo luật'}
            </span>
            {insight.cached && (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                Đã lưu
              </span>
            )}
          </div>

          {insight.headline && (
            <p className="text-base font-semibold text-slate-800 leading-relaxed">{insight.headline}</p>
          )}

          {insight.summary_md && (
            <div className="text-sm text-slate-600 leading-relaxed space-y-1 bg-white/70 rounded-xl p-4 border border-slate-100">
              {insight.summary_md.split('\n').map((line, i) =>
                line.trim() === '' ? (
                  <div key={i} className="h-1.5" />
                ) : (
                  <p key={i}>
                    <InlineMd text={line} />
                  </p>
                )
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <BulletList items={insight.highlights} Icon={Sparkles} color="text-blue-600" label="Điểm sáng" />
            <BulletList items={insight.risks} Icon={AlertTriangle} color="text-red-600" label="Rủi ro" />
            <BulletList items={insight.commendations} Icon={Award} color="text-emerald-600" label="Tuyên dương" />
            <BulletList items={insight.actions} Icon={Lightbulb} color="text-amber-600" label="Đề xuất hành động" />
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Cập nhật: {new Date(insight.generated_at).toLocaleString('vi-VN')}
          </p>
        </div>
      )}
    </div>
  );
}

export default AiInsightPanel;
