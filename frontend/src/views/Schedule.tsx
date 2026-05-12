import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  PenLine,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../lib/api';

interface Appointment {
  id: number;
  student_id: number | null;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string;
  type: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | string;
  note?: string | null;
  student_name?: string | null;
  student_mssv?: string | null;
}

const appointmentTypeLabel: Record<string, string> = {
  MEETING: 'Gặp trực tiếp',
  ONLINE: 'Online',
  PHONE: 'Điện thoại',
  FOLLOW_UP: 'Theo dõi sau tư vấn',
};

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

const toLocalDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return toDateInputValue(date);
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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

const getOverlappedSlotIndexes = (appointment: Appointment, day: Date) => {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  return periodSlots
    .map((slot, index) => {
      const slotStart = setSlotTimeOnDate(day, slot.start);
      const slotEnd = setSlotTimeOnDate(day, slot.end);
      return start < slotEnd && end > slotStart ? index : -1;
    })
    .filter((index) => index >= 0);
};

export const Schedule = () => {
  const [scheduleView, setScheduleView] = useState<'week' | 'month'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApptId, setEditingApptId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: toDateInputValue(new Date()),
    startTime: '08:00',
    endTime: '09:00',
    type: 'MEETING',
    location: '',
    note: '',
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setErrorMsg('');
      const [confirmedRes, pendingRes] = await Promise.all([
        apiClient.get('/appointments?status=confirmed'),
        apiClient.get('/appointments/pending'),
      ]);

      setAppointments(Array.isArray(confirmedRes.data) ? confirmedRes.data : []);
      setPendingAppointments(Array.isArray(pendingRes.data) ? pendingRes.data : []);
    } catch (error: any) {
      console.error('Lỗi khi tải lịch hẹn:', error);
      setErrorMsg(error.response?.data?.message || 'Không thể tải lịch hẹn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();

    const refreshHandler = () => fetchAppointments();
    window.addEventListener('appointments:changed', refreshHandler);
    return () => window.removeEventListener('appointments:changed', refreshHandler);
  }, [fetchAppointments]);

  const sortedConfirmedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
    [appointments]
  );

  const upcomingConfirmedAppointments = useMemo(
    () => sortedConfirmedAppointments.filter((item) => new Date(item.end_time) >= new Date()),
    [sortedConfirmedAppointments]
  );

  const monthLabel = currentMonth.toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    return {
      emptyDays: Array.from({ length: mondayOffset }),
      days: Array.from({ length: daysInMonth }, (_, idx) => new Date(year, month, idx + 1)),
    };
  }, [currentMonth]);

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

  const handleOpenModal = (date?: Date, slot?: PeriodSlot) => {
    const selectedDate = date || new Date();
    setEditingApptId(null);
    setFormData({
      title: '',
      date: toDateInputValue(selectedDate),
      startTime: slot?.start || '07:30',
      endTime: slot?.end || '08:15',
      type: 'MEETING',
      location: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);

    setEditingApptId(appointment.id);
    setFormData({
      title: appointment.title,
      date: toDateInputValue(startDate),
      startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(
        startDate.getMinutes()
      ).padStart(2, '0')}`,
      endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(
        endDate.getMinutes()
      ).padStart(2, '0')}`,
      type: appointment.type || 'MEETING',
      location: appointment.location || '',
      note: appointment.note || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteAppt = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch này?')) return;

    try {
      await apiClient.delete(`/appointments/${id}`);
      window.dispatchEvent(new Event('appointments:changed'));
      await fetchAppointments();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể hủy lịch.');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'confirmed' | 'cancelled') => {
    try {
      setActionLoadingId(id);
      await apiClient.patch(`/appointments/${id}/status`, { status });
      window.dispatchEvent(new Event('appointments:changed'));
      await fetchAppointments();
    } catch (error: any) {
      console.error('Không thể cập nhật trạng thái lịch:', error);
      alert(error.response?.data?.message || 'Không thể cập nhật trạng thái lịch.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(`${formData.date}T${formData.startTime}:00`);
    const end = new Date(`${formData.date}T${formData.endTime}:00`);

    if (end <= start) {
      alert('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        location: formData.location.trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        type: formData.type,
        note: formData.note.trim() || null,
      };

      if (editingApptId) {
        await apiClient.patch(`/appointments/${editingApptId}`, payload);
      } else {
        await apiClient.post('/appointments', payload);
      }

      setIsModalOpen(false);
      setEditingApptId(null);
      window.dispatchEvent(new Event('appointments:changed'));
      await fetchAppointments();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi lưu lịch.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAppointmentCard = (appointment: Appointment, compact = false) => (
    <div
      key={appointment.id}
      className={cn(
        'rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all',
        compact ? 'p-4 border-blue-100' : 'p-5 border-slate-100'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-bold text-slate-900 truncate">{appointment.title}</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
              Đã xác nhận
            </span>
          </div>

          <p className="text-sm text-slate-500">
            {appointment.student_name
              ? `${appointment.student_name}${appointment.student_mssv ? ` · ${appointment.student_mssv}` : ''}`
              : 'Lịch do cố vấn tạo'}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700">
              <Clock className="w-3.5 h-3.5" />
              {formatDateTime(appointment.start_time)} - {formatTime(appointment.end_time)}
            </span>

            {appointment.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {appointment.location}
              </span>
            )}
          </div>

          {appointment.note && (
            <p className="text-sm text-slate-500 mt-3 line-clamp-2">{appointment.note}</p>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => handleEditAppointment(appointment)}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
            title="Sửa lịch"
          >
            <PenLine className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteAppt(appointment.id)}
            className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            title="Hủy lịch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPendingRequests = () => (
    <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl font-bold text-blue-900">Lịch tư vấn chờ duyệt</h3>
          <p className="text-sm text-slate-500">
            Sinh viên gửi yêu cầu đặt lịch sẽ hiện ở đây và trên biểu tượng chuông.
          </p>
        </div>

        <button
          onClick={fetchAppointments}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải lịch hẹn...
        </div>
      ) : pendingAppointments.length === 0 ? (
        <p className="text-sm text-slate-400">Không có lịch nào đang chờ duyệt.</p>
      ) : (
        <div className="space-y-3">
          {pendingAppointments.map((appt) => (
            <div
              key={appt.id}
              className="p-4 rounded-2xl border border-orange-100 bg-orange-50/40 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-900">{appt.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 uppercase">
                    Chờ duyệt
                  </span>
                </div>

                <p className="text-sm text-slate-500">
                  Sinh viên: {appt.student_name || 'Chưa có tên'}
                  {appt.student_mssv ? ` · ${appt.student_mssv}` : ''}
                </p>

                {appt.note && (
                  <p className="text-sm text-slate-500 mt-1">Nội dung: {appt.note}</p>
                )}

                <p className="text-sm font-semibold text-blue-700 mt-1">
                  {formatDateTime(appt.start_time)} - {formatTime(appt.end_time)}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                  disabled={actionLoadingId === appt.id}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2"
                >
                  {actionLoadingId === appt.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Chấp nhận
                </button>

                <button
                  onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                  disabled={actionLoadingId === appt.id}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 border border-red-100 text-sm font-bold inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const renderConfirmedList = () => (
    <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl font-bold text-blue-900">Lịch tư vấn đã xác nhận</h3>
          <p className="text-sm text-slate-500">
            Sau khi cố vấn chấp nhận, lịch hẹn sẽ tự động chuyển xuống danh sách này.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
        >
          <CalendarPlus className="w-4 h-4" />
          Tạo lịch mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải lịch đã xác nhận...
        </div>
      ) : upcomingConfirmedAppointments.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có lịch tư vấn nào đã được xác nhận.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {upcomingConfirmedAppointments.slice(0, 6).map((appt) => renderAppointmentCard(appt, true))}
        </div>
      )}
    </section>
  );

  const renderMonthView = () => (
    <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-serif font-black text-2xl sm:text-3xl text-slate-800 capitalize">
          {monthLabel}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
          <div
            key={day}
            className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-4">
        {monthDays.emptyDays.map((_, index) => (
          <div
            key={`empty-${index}`}
            className="h-24 sm:h-32 rounded-2xl bg-slate-50/50 border border-transparent"
          />
        ))}

        {monthDays.days.map((day) => {
          const dateKey = toLocalDateKey(day);
          const dayEvents = sortedConfirmedAppointments.filter(
            (appt) => toLocalDateKey(appt.start_time) === dateKey
          );
          const isToday = dateKey === toDateInputValue(new Date());

          return (
            <button
              type="button"
              key={dateKey}
              onClick={() => handleOpenModal(day)}
              className={cn(
                'h-24 sm:h-32 rounded-xl sm:rounded-2xl border p-2 flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden text-left',
                isToday
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-100 hover:border-primary/30 bg-white'
              )}
            >
              <span
                className={cn(
                  'text-xs sm:text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center mb-1 shrink-0',
                  isToday ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                )}
              >
                {day.getDate()}
              </span>

              <div className="mt-1 space-y-1.5 overflow-y-auto flex-1 pb-1 w-full">
                {dayEvents.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAppointment(appt);
                    }}
                    className="text-[9px] px-1.5 py-1 rounded-md font-bold truncate bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    title={appt.title}
                  >
                    {formatTime(appt.start_time)} · {appt.title}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderWeekView = () => (
    <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xl font-bold text-blue-900">Thời khóa biểu tư vấn tuần</h3>
          <p className="text-sm text-slate-500">
            Hiển thị 10 tiết/ngày, 6 ngày từ Thứ 2 đến Thứ 7. Bấm vào ô trống để tạo lịch đúng tiết.
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
          className="relative grid min-w-[1120px] bg-white"
          style={{
            gridTemplateColumns: '132px repeat(6, minmax(155px, 1fr))',
            gridTemplateRows: `56px repeat(${periodSlots.length}, 88px)`,
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
                className={cn(
                  'z-20 flex flex-col items-center justify-center border-b border-r border-slate-200 bg-white px-2 text-center',
                  isToday && 'bg-blue-50'
                )}
                style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
              >
                <span className="text-xs font-black uppercase text-slate-500">
                  {day.toLocaleDateString('vi-VN', { weekday: 'long' })}
                </span>
                <span className={cn('text-xs font-semibold text-slate-400', isToday && 'text-blue-700')}>
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
            periodSlots.map((slot, slotIndex) => (
              <button
                type="button"
                key={`${toLocalDateKey(day)}-${slot.label}`}
                onClick={() => handleOpenModal(day, slot)}
                className="border-r border-b border-slate-200 bg-white hover:bg-blue-50/60 transition-colors"
                style={{ gridColumn: dayIndex + 2, gridRow: slotIndex + 2 }}
                title={`Tạo lịch ${slot.label} ngày ${toLocalDateKey(day)}`}
              />
            ))
          )}

          {weekDays.flatMap((day, dayIndex) => {
            const dateKey = toLocalDateKey(day);
            return sortedConfirmedAppointments
              .filter((appt) => toLocalDateKey(appt.start_time) === dateKey)
              .map((appt) => {
                const overlappedIndexes = getOverlappedSlotIndexes(appt, day);
                if (overlappedIndexes.length === 0) return null;

                const firstSlot = overlappedIndexes[0];
                const lastSlot = overlappedIndexes[overlappedIndexes.length - 1];

                return (
                  <button
                    type="button"
                    key={`${dateKey}-${appt.id}`}
                    onClick={() => handleEditAppointment(appt)}
                    className="z-10 m-2 overflow-hidden rounded-xl border border-blue-100 border-l-4 border-l-blue-500 bg-white/95 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      gridColumn: dayIndex + 2,
                      gridRow: `${firstSlot + 2} / ${lastSlot + 3}`,
                    }}
                    title="Bấm để sửa lịch"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                      {appointmentTypeLabel[appt.type] || appt.type}
                    </p>
                    <h4 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-slate-900">
                      {appt.title}
                    </h4>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                    </p>
                    {appt.student_name && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {appt.student_name}
                        {appt.student_mssv ? ` · ${appt.student_mssv}` : ''}
                      </p>
                    )}
                    {appt.location && (
                      <p className="mt-1 truncate text-[11px] text-slate-400">{appt.location}</p>
                    )}
                  </button>
                );
              });
          })}
        </div>
      </div>
    </section>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pt-4 pb-12 max-w-7xl mx-auto xl:mx-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
            Lịch tư vấn của cố vấn
          </h2>
          <p className="text-primary font-medium flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 flex-shrink-0" />
            Quản lý yêu cầu đặt lịch, xác nhận lịch hẹn và theo dõi lịch tư vấn.
          </p>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setScheduleView('week')}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
              scheduleView === 'week'
                ? 'bg-white shadow text-primary'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            Tuần
          </button>
          <button
            onClick={() => setScheduleView('month')}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
              scheduleView === 'month'
                ? 'bg-white shadow text-primary'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            Tháng
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Chờ duyệt
          </p>
          <p className="text-3xl font-black text-orange-600">{pendingAppointments.length}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Đã xác nhận
          </p>
          <p className="text-3xl font-black text-emerald-600">{appointments.length}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
            Sinh viên có lịch
          </p>
          <p className="text-3xl font-black text-blue-700">
            {new Set(appointments.map((item) => item.student_id).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {renderPendingRequests()}
      {renderConfirmedList()}
      {scheduleView === 'week' ? renderWeekView() : renderMonthView()}

      <div className="mt-16 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Users className="w-64 h-64 text-primary" />
          </div>
          <h3 className="text-xl font-sans font-bold text-blue-900 mb-6 relative z-10">
            Luồng xử lý lịch tư vấn
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {[
              { title: '1. Sinh viên gửi yêu cầu', text: 'Yêu cầu được lưu với trạng thái chờ duyệt.' },
              { title: '2. Cố vấn duyệt trên chuông', text: 'Chấp nhận hoặc từ chối ngay từ dropdown thông báo.' },
              { title: '3. Lịch đã duyệt hiển thị', text: 'Lịch xác nhận xuất hiện trong danh sách và lịch tuần/tháng.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="font-bold text-slate-800 text-sm mb-1">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingApptId ? 'Sửa lịch tư vấn' : 'Thêm lịch tư vấn'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Tiêu đề
                </label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Ví dụ: Tư vấn kế hoạch học tập"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Hình thức
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="MEETING">Gặp trực tiếp</option>
                    <option value="ONLINE">Online</option>
                    <option value="PHONE">Điện thoại</option>
                    <option value="FOLLOW_UP">Theo dõi sau tư vấn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Ngày
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Từ giờ
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Đến giờ
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Địa điểm
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Phòng A.101 hoặc Google Meet"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-h-24"
                  placeholder="Nội dung tư vấn hoặc lưu ý cho lịch hẹn"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Lưu lịch hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
