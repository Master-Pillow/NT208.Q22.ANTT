import { useEffect, useState } from 'react';
import { ClipboardList, Loader2, MapPin } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import apiClient from '../../lib/api';

interface ExamEntry {
  semester: string;
  exam_term: string | null;
  course_code: string | null;
  class_code: string | null;
  exam_slot: string | null;
  day_of_week: number | null;
  exam_date: string | null;
  room: string | null;
  exam_format: string | null;
  note: string | null;
}

interface ExamResponse {
  semester: string | null;
  semesters: string[];
  entries: ExamEntry[];
}

const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

export default function ExamsPage() {
  const [data, setData] = useState<ExamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<ExamResponse>('/student/exams', {
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

  return (
    <PageLayout title="Lịch thi" breadcrumb={['STUDENT', 'Lịch thi']}>
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-blue-900">Lịch thi</h2>
              <p className="text-sm text-slate-500">
                Lịch thi GK/CK đồng bộ từ DAA khi đăng nhập bằng tài khoản DAA.
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
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải lịch thi...
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400">
            Chưa có dữ liệu lịch thi. Hãy đăng nhập lại bằng tài khoản DAA để đồng bộ.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <th className="border border-slate-200 p-2 w-12">STT</th>
                  <th className="border border-slate-200 p-2">Kỳ thi</th>
                  <th className="border border-slate-200 p-2">Mã MH</th>
                  <th className="border border-slate-200 p-2">Mã lớp</th>
                  <th className="border border-slate-200 p-2">Ca / Tiết thi</th>
                  <th className="border border-slate-200 p-2">Thứ</th>
                  <th className="border border-slate-200 p-2">Ngày thi</th>
                  <th className="border border-slate-200 p-2">Phòng thi</th>
                  <th className="border border-slate-200 p-2">Hình thức</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.class_code}-${i}`} className="hover:bg-slate-50">
                    <td className="border border-slate-200 p-2 text-center text-slate-500">
                      {i + 1}
                    </td>
                    <td className="border border-slate-200 p-2">
                      {e.exam_term ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                            e.exam_term === 'CK'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {e.exam_term}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="border border-slate-200 p-2 font-bold text-slate-800">
                      {e.course_code || '—'}
                    </td>
                    <td className="border border-slate-200 p-2 text-slate-700">
                      {e.class_code || '—'}
                    </td>
                    <td className="border border-slate-200 p-2 text-slate-700">
                      {e.exam_slot || '—'}
                    </td>
                    <td className="border border-slate-200 p-2 text-slate-700">
                      {e.day_of_week ? DAY_LABELS[e.day_of_week] : '—'}
                    </td>
                    <td className="border border-slate-200 p-2 font-medium text-blue-700">
                      {formatDate(e.exam_date)}
                    </td>
                    <td className="border border-slate-200 p-2">
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3 h-3" /> {e.room || '—'}
                      </span>
                    </td>
                    <td className="border border-slate-200 p-2 text-slate-600">
                      {e.exam_format || e.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-slate-400">
              Ghi chú ca thi: Ca 1 từ 7h30 · Ca 2 từ 9h30 · Ca 3 từ 13h30 · Ca 4 từ 15h30.
            </p>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
