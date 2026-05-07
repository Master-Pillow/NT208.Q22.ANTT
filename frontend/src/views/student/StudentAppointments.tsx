import React, { useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import apiClient from '../../lib/api';

interface Appointment {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  advisor_name: string;
}

export const StudentAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  async function loadAppointments() {
    const { data } = await apiClient.get('/student/appointments');
    setAppointments(data || []);
  }

  useEffect(() => {
    loadAppointments().catch((err) => console.error('[StudentAppointments]', err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await apiClient.post('/student/appointments', form);

    setForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
    });

    await loadAppointments();
  }

  const statusText: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã xác nhận',
    REJECTED: 'Từ chối',
    DONE: 'Hoàn tất',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div>
        <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
          Lịch tư vấn
        </h2>
        <p className="text-on-surface-variant font-medium">
          Đặt lịch gặp cố vấn và theo dõi trạng thái lịch hẹn.
        </p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <CalendarPlus className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-bold text-blue-900">Đặt lịch mới</h3>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
            placeholder="Tiêu đề lịch hẹn"
            required
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none min-h-28"
            placeholder="Nội dung cần tư vấn"
          />

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Thời gian kết thúc</label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 outline-none"
              required
            />
          </div>

          <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
            Gửi yêu cầu đặt lịch
          </button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-blue-900 mb-6">Lịch hẹn của tôi</h3>

          {appointments.length === 0 ? (
            <p className="text-sm text-slate-400">Bạn chưa có lịch hẹn nào.</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((item) => (
                <div key={item.id} className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800">{item.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-3">
                        Cố vấn: {item.advisor_name || 'Chưa xác định'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.start_time).toLocaleString('vi-VN')} - {new Date(item.end_time).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <span className="h-fit px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      {statusText[item.status] || item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};