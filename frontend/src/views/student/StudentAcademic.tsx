import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import apiClient from '../../lib/api';

interface CourseItem {
  code: string;
  name: string;
  credits: number;
  semester: string;
  letter_grade: string;
  gpa_points: string | number;
}

export const StudentAcademic = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAcademic() {
      try {
        const { data } = await apiClient.get('/student/academic');
        setSummary(data.summary);
        setCourses(data.courses || []);
      } catch (err) {
        console.error('[StudentAcademic]', err);
      } finally {
        setLoading(false);
      }
    }

    loadAcademic();
  }, []);

  const getStatus = (grade: string) => {
    if (grade === 'F') return { label: 'Rớt', icon: XCircle, className: 'text-red-600 bg-red-50' };
    if (grade === 'D') return { label: 'Cần cải thiện', icon: AlertCircle, className: 'text-orange-600 bg-orange-50' };
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
          Xem danh sách môn học, điểm số và tình trạng tín chỉ.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">GPA</p>
          <p className="text-3xl font-black text-blue-900 mt-2">
            {Number(summary?.current_gpa || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">Tổng môn</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{summary?.total_courses || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">Tổng tín chỉ</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{summary?.total_credits || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-xs uppercase font-bold text-slate-400">Tín chỉ nợ</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{summary?.credit_debt || 0}</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase text-slate-400 border-b">
              <th className="py-3">Mã môn</th>
              <th className="py-3">Tên môn</th>
              <th className="py-3">Tín chỉ</th>
              <th className="py-3">Học kỳ</th>
              <th className="py-3">Điểm chữ</th>
              <th className="py-3">GPA</th>
              <th className="py-3 text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, index) => {
              const status = getStatus(course.letter_grade);
              const Icon = status.icon;

              return (
                <tr key={`${course.code}-${index}`} className="border-b last:border-0">
                  <td className="py-4 font-mono text-sm text-slate-600">{course.code}</td>
                  <td className="py-4 font-semibold text-slate-800">{course.name}</td>
                  <td className="py-4 text-slate-500">{course.credits}</td>
                  <td className="py-4 text-slate-500">{course.semester}</td>
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