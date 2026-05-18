import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarPlus, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import apiClient from '../lib/api';

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

type PeriodSlot = {
  label: string;
  start: string;
  end: string;
};

const periodSlots: PeriodSlot[] = [
  { label: 'Tiết 1', start: '07:30', end: '08:15' },
  { label: 'Tiết 2', start: '08:15', end: '09:00' },
  { label: 'Tiết 3', start: '09:00', end: '09:45' },
  { label: 'Tiết 4', start: '10:00', end: '10:45' },
  { label: 'Tiết 5', start: '10:45', end: '11:30' },
  { label: 'Tiết 6', start: '13:00', end: '13:45' },
  { label: 'Tiết 7', start: '13:45', end: '14:30' },
  { label: 'Tiết 8', start: '14:30', end: '15:15' },
  { label: 'Tiết 9', start: '15:30', end: '16:15' },
  { label: 'Tiết 10', start: '16:15', end: '17:00' },
];

const toDateInputValue = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toDateTimeLocalValue = (date: Date) => {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${toDateInputValue(date)}T${h}:${min}`;
};

const toLocalDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return toDateInputValue(date);
};

const getWeekStart = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const setSlotTimeOnDate = (date: Date, time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(date);
  value.setHours(hour, minute, 0, 0);
  return value;
};

const appointmentOverlapsSlot = (appointment: Appointment, day: Date, slot: PeriodSlot) => {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const slotStart = setSlotTimeOnDate(day, slot.start);
  const slotEnd = setSlotTimeOnDate(day, slot.end);
  return toLocalDateKey(appointment.start_time) === toLocalDateKey(day) && start < slotEnd && end > slotStart;
};

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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  const weekDays = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + index);
        return date;
      }),
    [currentWeekStart]
  );

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[weekDays.length - 1];
    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }, [weekDays]);

  const statusText: Record<string, string> = {
    pending: 'Chờ duyệt',
    confirmed: 'Đã xác nhận',
    cancelled: 'Đã từ chối',
    completed: 'Hoàn tất',

    // phòng trường hợp dữ liệu cũ còn chữ hoa
    PENDING: 'Chờ duyệt',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã từ chối',
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

  function selectSlot(day: Date, slot: PeriodSlot) {
    const start = setSlotTimeOnDate(day, slot.start);
    const end = setSlotTimeOnDate(day, slot.end);

    setForm((prev) => ({
      ...prev,
      title: prev.title || 'Tư vấn học tập',
      start_time: toDateTimeLocalValue(start),
      end_time: toDateTimeLocalValue(end),
    }));
    setErrorMsg('');
    setSuccessMsg('');
  }

  function isSelectedSlot(day: Date, slot: PeriodSlot) {
    const start = setSlotTimeOnDate(day, slot.start);
    const end = setSlotTimeOnDate(day, slot.end);
    return form.start_time === toDateTimeLocalValue(start) && form.end_time === toDateTimeLocalValue(end);
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

      await apiClient.post('/student/appointments', {
        title: form.title.trim(),
        description: form.description.trim(),
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

      <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-bold text-blue-900">Chọn tiết đặt lịch</h3>
            <p className="text-sm text-slate-500">
              Chọn 1 ô theo ma trận 10 tiết/ngày, từ Thứ 2 đến Thứ 7. Thời gian sẽ tự điền vào form bên dưới.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCurrentWeekStart((prev) => {
                  const next = new Date(prev);
                  next.setDate(prev.getDate() - 7);
                  return next;
                })
              }
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"
              title="Tuần trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-48 text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700">
              {weekRangeLabel}
            </div>
            <button
              onClick={() =>
                setCurrentWeekStart((prev) => {
                  const next = new Date(prev);
                  next.setDate(prev.getDate() + 7);
                  return next;
                })
              }
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500"
              title="Tuần sau"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50">
          <div
            className="grid min-w-[1120px] bg-white"
            style={{
              gridTemplateColumns: '132px repeat(6, minmax(155px, 1fr))',
              gridTemplateRows: `56px repeat(${periodSlots.length}, 92px)`,
            }}
          >
            <div
              className="sticky left-0 z-30 flex items-center justify-center border-r border-b border-slate-200 bg-slate-100 text-sm font-black text-slate-700"
              style={{ gridColumn: 1, gridRow: 1 }}
            >
              Thứ / Tiết
            </div>

            {weekDays.map((day, dayIndex) => {
              const dateKey = toLocalDateKey(day);
              const isToday = dateKey === toDateInputValue(new Date());

              return (
                <div
                  key={dateKey}
                  className={`z-20 flex flex-col items-center justify-center border-b border-r border-slate-200 px-2 text-center ${
                    isToday ? 'bg-blue-50' : 'bg-white'
                  }`}
                  style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
                >
                  <span className="text-xs font-black uppercase text-slate-500">
                    {day.toLocaleDateString('vi-VN', { weekday: 'long' })}
                  </span>
                  <span className={`text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-slate-400'}`}>
                    {day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {periodSlots.map((slot, slotIndex) => (
              <div
                key={slot.label}
                className="sticky left-0 z-20 flex flex-col items-center justify-center border-r border-b border-slate-200 bg-slate-50 px-2 text-center"
                style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
              >
                <span className="text-sm font-black text-slate-700">{slot.label}</span>
                <span className="text-xs font-semibold text-slate-500">
                  ({slot.start} - {slot.end})
                </span>
              </div>
            ))}

            {weekDays.flatMap((day, dayIndex) =>
              periodSlots.map((slot, slotIndex) => {
                const selected = isSelectedSlot(day, slot);
                const slotAppointments = appointments.filter((item) => appointmentOverlapsSlot(item, day, slot));

                return (
                  <button
                    type="button"
                    key={`${toLocalDateKey(day)}-${slot.label}`}
                    onClick={() => selectSlot(day, slot)}
                    className={`border-r border-b border-slate-200 p-2 text-left transition-colors ${
                      selected
                        ? 'bg-blue-50 ring-2 ring-inset ring-blue-500'
                        : 'bg-white hover:bg-blue-50/60'
                    }`}
                    style={{ gridColumn: dayIndex + 2, gridRow: slotIndex + 2 }}
                  >
                    {selected && (
                      <div className="mb-1 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                        Đang chọn
                      </div>
                    )}

                    {slotAppointments.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="mb-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[11px]"
                      >
                        <p className="truncate font-bold text-slate-700">{item.title}</p>
                        <p className="truncate text-slate-400">
                          {statusText[item.status] || item.status}
                        </p>
                      </div>
                    ))}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

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
              Nội dung này sẽ được gửi cho cố vấn cùng yêu cầu đặt lịch.
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
