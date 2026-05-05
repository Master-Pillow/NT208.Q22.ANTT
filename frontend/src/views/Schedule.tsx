import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Video, Users, Edit, MoreHorizontal, CalendarPlus, CalendarX, PenLine, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../lib/api';

// --- TYPES ---
interface Appointment {
  id: number;
  student_id: number | null;
  student_name?: string;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  type: string;
  status: string;
  note?: string;
}

export const Schedule = () => {
  const [scheduleView, setScheduleView] = useState<'day' | 'week' | 'month'>('week');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, dateStr?: string, targetAppt?: Appointment} | null>(null);
  
  // States cho Dữ liệu
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // States cho Modal Thêm Lịch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '08:00',
    endTime: '09:00',
    type: 'MEETING',
    location: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Lấy dữ liệu từ API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/appointments');
      setAppointments(data);
    } catch (error) {
      console.error("Lỗi khi tải lịch hẹn:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    
    // Tắt context menu khi click ra ngoài
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // --- XỬ LÝ SỰ KIỆN ---
  const handleContextMenu = (e: React.MouseEvent, dateStr?: string, appt?: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, dateStr, targetAppt: appt });
  };

  const handleOpenModal = (dateStr?: string) => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: dateStr || today }));
    setIsModalOpen(true);
    setContextMenu(null);
  };

  const handleDeleteAppt = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) return;
    try {
      await apiClient.delete(`/appointments/${id}`);
      fetchAppointments(); // Reload lại data
    } catch (error) {
      console.error("Lỗi xóa lịch hẹn:", error);
      alert('Không thể hủy lịch hẹn.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Ghép ngày và giờ thành chuẩn ISO
      const startISO = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endISO = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      await apiClient.post('/appointments', {
        title: formData.title,
        location: formData.location,
        start_time: startISO,
        end_time: endISO,
        type: formData.type
      });
      
      setIsModalOpen(false);
      setFormData({ title: '', date: '', startTime: '08:00', endTime: '09:00', type: 'MEETING', location: '' });
      fetchAppointments();
    } catch (error) {
      console.error("Lỗi tạo lịch hẹn:", error);
      alert('Có lỗi xảy ra khi tạo lịch.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- HELPER RENDERING ---
  const renderWeekView = () => {
    // Tạo mảng 6 ngày của tuần hiện tại (Thứ 2 -> Thứ 7) cho mục đích demo
    // Trong thực tế bạn sẽ dùng date-fns để tính toán chính xác ngày hiện tại
    const currentWeekDates = Array.from({length: 6}).map((_, i) => {
      const d = new Date();
      const currentDay = d.getDay(); // 0 là Chủ nhật
      const diff = d.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + i; // Lùi về thứ 2
      d.setDate(diff);
      return d;
    });

    const daysLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-4 overflow-x-auto pb-4 animate-in fade-in duration-500 min-h-[400px]">
        {/* Time Column */}
        <div className="pt-16 space-y-16 flex flex-col flex-shrink-0 min-w-[80px]">
          {['07:30', '09:15', '12:30', '14:15', '16:00'].map(time => (
            <div key={time} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{time}</div>
          ))}
        </div>

        {/* Days Columns */}
        {currentWeekDates.map((dateObj, colIndex) => {
          const dateStr = dateObj.toISOString().split('T')[0]; // "YYYY-MM-DD"
          const dayAppointments = appointments.filter(a => a.start_time.startsWith(dateStr));

          return (
            <div 
              key={colIndex} 
              className="space-y-4 min-w-[150px] flex flex-col border-l border-slate-50/50 pl-2"
              onContextMenu={(e) => handleContextMenu(e, dateStr)}
            >
              <div className="text-center pb-4 border-b-2 border-transparent relative">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{daysLabel[colIndex]}</span>
                <span className={cn("text-3xl font-serif font-black text-slate-800")}>{dateObj.getDate()}</span>
              </div>
              
              {loading ? (
                <div className="flex justify-center pt-10 opacity-50"><Loader2 className="w-5 h-5 animate-spin text-slate-400"/></div>
              ) : dayAppointments.length === 0 ? (
                <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-xs text-slate-400 font-medium" onClick={() => handleOpenModal(dateStr)}>
                  + Trống
                </div>
              ) : (
                dayAppointments.map((appt) => {
                  const startTimeStr = new Date(appt.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                  const endTimeStr = new Date(appt.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                  const isClass = appt.type === 'CLASS';

                  return (
                    <div 
                      key={appt.id} 
                      onContextMenu={(e) => handleContextMenu(e, dateStr, appt)}
                      className="group cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden"
                    >
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isClass ? 'bg-primary' : 'bg-orange-400')}></div>
                      <div className="flex justify-between items-start mb-2 pl-1.5">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", isClass ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600')}>
                          {appt.type}
                        </span>
                        <MoreHorizontal size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1 leading-snug pl-1.5">{appt.title}</h4>
                      
                      {appt.student_name && (
                        <p className="text-[11px] font-medium text-slate-500 pl-1.5 mb-1 truncate">👤 {appt.student_name}</p>
                      )}
                      
                      {appt.location && (
                        <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 pl-1.5 mb-2">
                          <MapPin size={10} className="text-primary/70" /> {appt.location}
                        </p>
                      )}
                      <div className="text-[10px] font-semibold text-slate-400 pl-1.5 bg-slate-50 inline-block px-1.5 py-0.5 rounded">
                        {startTimeStr} - {endTimeStr}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="font-serif text-4xl font-black text-on-surface mb-2">My Schedule</h2>
          <p className="text-secondary font-medium flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 flex-shrink-0" />
            October 2026
          </p>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl shadow-sm border border-slate-100/50">
          <button onClick={() => setScheduleView('week')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer", scheduleView === 'week' ? 'bg-white shadow-sm text-primary' : 'text-slate-500')}>Week</button>
          <button onClick={() => setScheduleView('month')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer", scheduleView === 'month' ? 'bg-white shadow-sm text-primary' : 'text-slate-500')}>Month</button>
        </div>
      </div>

      {scheduleView === 'week' && renderWeekView()}
      {scheduleView === 'month' && <div className="p-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">Tính năng Calendar Tháng đang được phát triển...</div>}

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Thêm Lịch Hẹn Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tiêu đề</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Họp lớp KHMT 2023.2"/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loại</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none">
                    <option value="MEETING">Họp/Tư vấn</option>
                    <option value="CLASS">Giảng dạy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Từ giờ</label>
                  <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Đến giờ</label>
                  <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Địa điểm</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="VD: Phòng B5.06"/>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Hủy</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />} Lưu Lịch Hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONTEXT MENU --- */}
      {contextMenu && (
        <div 
          className="fixed z-[90] bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[200px] overflow-hidden"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 220) }}
        >
          {/* Nếu click vào khoảng trống (không có targetAppt) */}
          {!contextMenu.targetAppt ? (
            <button onClick={() => handleOpenModal(contextMenu.dateStr)} className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer">
              <CalendarPlus className="w-4 h-4 text-primary" /> Đặt lịch (Book)
            </button>
          ) : (
            /* Nếu click vào 1 lịch hẹn đã có */
            <>
              <button className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer relative">
                <PenLine className="w-4 h-4 text-orange-600" /> Sửa thông tin
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              <button onClick={() => handleDeleteAppt(contextMenu.targetAppt!.id)} className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors cursor-pointer">
                <CalendarX className="w-4 h-4" /> Hủy lịch (Cancel)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};