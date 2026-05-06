import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CalendarDays, GraduationCap, MessageCircle } from 'lucide-react';
import apiClient from '../../lib/api';

interface StudentInfo {
  full_name: string;
  mssv: string;
  class_code: string;
  cohort: string;
}

interface AcademicSummary {
  current_gpa: string | number;
  credit_debt: string | number;
  failed_courses: string | number;
  total_courses: string | number;
}

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export const StudentDashboard = () => {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [summary, setSummary] = useState<AcademicSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, academicRes, notiRes] = await Promise.all([
          apiClient.get('/student/me'),
          apiClient.get('/student/academic'),
          apiClient.get('/student/notifications'),
        ]);

        setStudent(meRes.data);
        setSummary(academicRes.data.summary);
        setNotifications(notiRes.data || []);
      } catch (err) {
        console.error('[StudentDashboard]', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const gpa = Number(summary?.current_gpa || 0);
  const debt = Number(summary?.credit_debt || 0);

  const status =
    debt >= 12 || gpa < 2
      ? 'Nguy cơ cao'
      : debt > 0 || gpa < 2.5
        ? 'Cần chú ý'
        : 'Ổn định';

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải dữ liệu sinh viên...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div>
        <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
          Tổng quan sinh viên
        </h2>
        <p className="text-on-surface-variant font-medium">
          Theo dõi tình hình học tập, lịch tư vấn và thông báo từ cố vấn học tập.
        </p>
      </div>

      <section className="bg-surface-container-lowest rounded-2xl p-8 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400 font-semibold uppercase">Sinh viên</p>
            <h3 className="text-2xl font-bold text-blue-900 mt-1">{student?.full_name}</h3>
            <p className="text-sm text-slate-500 mt-2">
              MSSV: <b>{student?.mssv}</b> · Lớp: <b>{student?.class_code}</b> · Khóa: <b>{student?.cohort}</b>
            </p>
          </div>

          <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
            {status}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <GraduationCap className="w-6 h-6 text-blue-600 mb-4" />
          <p className="text-xs uppercase font-bold text-slate-400">GPA hiện tại</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{gpa.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-orange-500 mb-4" />
          <p className="text-xs uppercase font-bold text-slate-400">Tín chỉ nợ</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{debt}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <CalendarDays className="w-6 h-6 text-emerald-600 mb-4" />
          <p className="text-xs uppercase font-bold text-slate-400">Môn đã học</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{summary?.total_courses || 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <MessageCircle className="w-6 h-6 text-purple-600 mb-4" />
          <p className="text-xs uppercase font-bold text-slate-400">Môn rớt</p>
          <p className="text-3xl font-black text-blue-900 mt-2">{summary?.failed_courses || 0}</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-bold text-blue-900">Thông báo gần đây</h3>
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có thông báo nào.</p>
        ) : (
          <div className="space-y-4">
            {notifications.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between gap-4">
                  <h4 className="font-bold text-slate-800">{item.title}</h4>
                  <span className="text-xs font-bold text-blue-600">{item.type}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};