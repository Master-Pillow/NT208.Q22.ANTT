import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Loader2, MapPin, User } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import apiClient from '../../lib/api';

interface ScheduleEntry {
  semester: string;
  course_code: string | null;
  class_code: string;
  course_name: string | null;
  room: string | null;
  lecturer: string | null;
  day_of_week: number;
  start_period: number | null;
  end_period: number | null;
  start_date: string | null;
  end_date: string | null;
  weeks_note: string | null;
}

interface ScheduleResponse {
  semester: string | null;
  semesters: string[];
  entries: ScheduleEntry[];
}

const PERIODS = [
  { period: 1, label: 'Tiết 1', time: '7:30 - 8:15' },
  { period: 2, label: 'Tiết 2', time: '8:15 - 9:00' },
  { period: 3, label: 'Tiết 3', time: '9:00 - 9:45' },
  { period: 4, label: 'Tiết 4', time: '10:00 - 10:45' },
  { period: 5, label: 'Tiết 5', time: '10:45 - 11:30' },
  { period: 6, label: 'Tiết 6', time: '13:00 - 13:45' },
  { period: 7, label: 'Tiết 7', time: '13:45 - 14:30' },
  { period: 8, label: 'Tiết 8', time: '14:30 - 15:15' },
  { period: 9, label: 'Tiết 9', time: '15:30 - 16:15' },
  { period: 10, label: 'Tiết 10', time: '16:15 - 17:00' },
];

const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

const BLOCK_COLORS = [
  'bg-blue-50 border-blue-300 text-blue-900',
  'bg-emerald-50 border-emerald-300 text-emerald-900',
  'bg-amber-50 border-amber-300 text-amber-900',
  'bg-violet-50 border-violet-300 text-violet-900',
  'bg-rose-50 border-rose-300 text-rose-900',
  'bg-cyan-50 border-cyan-300 text-cyan-900',
];

function formatDate(value: string | null) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export default function TimetablePage() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<ScheduleResponse>('/student/schedule', {
        params: semester ? { semester } : undefined,
      })
      .then(({ data }) => {
        setData(data);
        if (!semester && data.semester) setSemester(data.semester);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [semester]);

  const entries = data?.entries ?? [];

  // Màu ổn định theo class_code
  const colorByClass = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const e of entries) {
      if (!map.has(e.class_code)) {
        map.set(e.class_code, BLOCK_COLORS[i % BLOCK_COLORS.length]);
        i += 1;
      }
    }
    return map;
  }, [entries]);

  const hasSunday = entries.some((e) => e.day_of_week === 8);
  const days = hasSunday ? [2, 3, 4, 5, 6, 7, 8] : [2, 3, 4, 5, 6, 7];

  // Ô bắt đầu cho mỗi (day, period) + số tiết span
  const blockAt = (day: number, period: number) =>
    entries.find((e) => e.day_of_week === day && e.start_period === period);
  const isCovered = (day: number, period: number) =>
    entries.some(
      (e) =>
        e.day_of_week === day &&
        e.start_period != null &&
        e.end_period != null &&
        period > e.start_period &&
        period <= e.end_period
    );

  return (
    <PageLayout title="Thời khoá biểu" breadcrumb={['STUDENT', 'Thời khoá biểu']}>
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <CalendarRange className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-blue-900">Thời khoá biểu</h2>
              <p className="text-sm text-slate-500">
                Đồng bộ trực tiếp từ DAA khi đăng nhập bằng tài khoản DAA.
              </p>
            </div>
          </div>
          {data?.semesters && data.semesters.length > 0 && (
            <select
              aria-label="Chọn học kỳ"
              title="Chọn học kỳ"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
            >
              {data.semesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thời khoá biểu...
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400">
            Chưa có dữ liệu thời khoá biểu. Hãy đăng nhập lại bằng tài khoản DAA để đồng bộ.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-28 border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-500">
                    Tiết
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className="border border-slate-200 bg-slate-50 p-2 text-sm font-bold text-slate-700"
                    >
                      {DAY_LABELS[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p.period}>
                    <td className="border border-slate-200 bg-slate-50/60 p-2 text-center align-top">
                      <div className="text-xs font-bold text-slate-600">{p.label}</div>
                      <div className="text-[10px] text-slate-400">{p.time}</div>
                    </td>
                    {days.map((d) => {
                      if (isCovered(d, p.period)) return null;
                      const block = blockAt(d, p.period);
                      if (!block) {
                        return (
                          <td key={d} className="border border-slate-200 h-12 align-top" />
                        );
                      }
                      const span =
                        block.end_period && block.start_period
                          ? block.end_period - block.start_period + 1
                          : 1;
                      return (
                        <td
                          key={d}
                          rowSpan={span}
                          className="border border-slate-200 p-1 align-top"
                        >
                          <div
                            className={`h-full rounded-lg border-l-4 p-2 ${
                              colorByClass.get(block.class_code) || BLOCK_COLORS[0]
                            }`}
                          >
                            <div className="font-bold text-xs">{block.class_code}</div>
                            <div className="text-xs font-medium leading-snug">
                              {block.course_name}
                            </div>
                            {block.room && (
                              <div className="mt-1 flex items-center gap-1 text-[11px]">
                                <MapPin className="w-3 h-3" /> {block.room}
                              </div>
                            )}
                            {block.lecturer && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <User className="w-3 h-3" /> {block.lecturer}
                              </div>
                            )}
                            {(block.start_date || block.weeks_note) && (
                              <div className="mt-1 text-[10px] text-slate-500">
                                {block.start_date && block.end_date
                                  ? `${formatDate(block.start_date)} → ${formatDate(block.end_date)}`
                                  : ''}
                                {block.weeks_note ? ` · ${block.weeks_note}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
