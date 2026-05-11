import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarPlus, Clock, RefreshCw } from 'lucide-react';
import apiClient from '../../lib/api';

interface Appointment {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: string;
  advisor_name: string;
  advisor_email?: string;
}

export const StudentAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const statusText: Record<string, string> = {
    pending: 'Chờ duyệt',
    confirmed: 'Đã xác nhận',
    cancelled: 'Đã hủy',
    completed: 'Hoàn tất',

    // phòng trường hợp dữ liệu cũ còn chữ hoa
    PENDING: 'Chờ duyệt',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Hoàn tất',
  };

  const statusClass: Record<string, string> = {
    pending: 'bg-orange-50 text-orange-700 border-orange-100',
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
    completed: 'bg-blue-50 text-blue-700 border-blue-100',

    PENDING: 'bg-orange-50 text-orange-700 border-orange-100',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    CANCELLED: 'bg-red-50 text-red-700 border-red-100',
    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  async function loadAppointments() {
    try {
      setErrorMsg('');
      const { data } = await apiClient.get('/student/appointments');
      setAppointments(data || []);
    } catch (err: any) {
      console.error('[StudentAppointments/load]', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải lịch tư vấn.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  function validateForm() {
    if (!form.title.trim()) {
      return 'Vui lòng nhập tiêu đề lịch hẹn.';
    }

    if (!form.start_time) {
      return 'Vui lòng chọn thời gian bắt đầu.';
    }

    if (!form.end_time) {
      return 'Vui lòng chọn thời gian kết thúc.';
    }

    const start = new Date(form.start_time);
    const end = new Date(form.end_time);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Thời gian lịch hẹn không hợp lệ.';
    }

    if (end <= start) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }

    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      setSuccessMsg('');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');
      setSuccessMsg('');

      /**
       * Backend hiện tại của bạn đang insert:
       * title, start_time, end_time
       *
       * Nếu DB chưa có cột description thì KHÔNG gửi description.
       */
      await apiClient.post('/student/appointments', {
        title: form.title.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
      });

      setForm({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
      });

      setSuccessMsg('Đã gửi yêu cầu đặt lịch tư vấn.');
      await loadAppointments();
    } catch (err: any) {
      console.error('[StudentAppointments/create]', err);
      setErrorMsg(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Không thể tạo lịch tư vấn.'
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Đang tải lịch tư vấn...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div>
        <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
          Lịch tư vấn
        </h2>
        <p className="text-on-surface-variant font-medium">
          Gửi yêu cầu đặt lịch gặp cố vấn và theo dõi trạng thái lịch hẹn.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <CalendarPlus className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-bold text-blue-900">Đặt lịch mới</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Tiêu đề
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Ví dụ: Tư vấn kế hoạch học tập"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Nội dung cần tư vấn
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 min-h-28"
              placeholder="Ví dụ: Em muốn hỏi về tín chỉ nợ và cách cải thiện GPA."
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Lưu ý: nội dung này hiện chỉ hiển thị trên form. Muốn lưu vào database thì cần thêm cột description.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Thời gian bắt đầu
            </label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">
              Thời gian kết thúc
            </label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Đang gửi...' : 'Gửi yêu cầu đặt lịch'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-blue-900">Lịch hẹn của tôi</h3>

            <button
              onClick={loadAppointments}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Bạn chưa có lịch tư vấn nào.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800">{item.title}</h4>

                      {item.description && (
                        <p className="text-sm text-slate-500 mt-1">
                          {item.description}
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-3">
                        Cố vấn: {item.advisor_name || 'Chưa xác định'}
                      </p>

                      {item.advisor_email && (
                        <p className="text-xs text-slate-400">
                          Email: {item.advisor_email}
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(item.start_time).toLocaleString('vi-VN')} -{' '}
                        {new Date(item.end_time).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <span
                      className={`h-fit px-3 py-1 rounded-full border text-xs font-bold ${
                        statusClass[item.status] ||
                        'bg-slate-50 text-slate-600 border-slate-100'
                      }`}
                    >
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