import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Video, Users, Edit, MoreHorizontal, CalendarPlus, CalendarX, PenLine, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../lib/api';

// --- TYPES ---
interface Appointment {
  id: number;
  student_id: number | null;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  type: string;
}

export const Schedule = () => {
  const [scheduleView, setScheduleView] = useState<'week' | 'month'>('week');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, dateStr?: string, targetAppt?: Appointment} | null>(null);
  
  // Dữ liệu API
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Thêm/Sửa Lịch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApptId, setEditingApptId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', date: '', startTime: '08:00', endTime: '09:00', type: 'MEETING', location: '' });
  const [submitting, setSubmitting] = useState(false);

  // Mặc định hiển thị tháng 10/2026
  const currentYear = 2026;
  const currentMonth = 9; // 9 = October

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
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, dateStr?: string, appt?: Appointment) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, dateStr, targetAppt: appt });
  };

  // Mở modal ĐẶT LỊCH MỚI
  const handleOpenModal = (dateStr?: string) => {
    const defaultDate = dateStr || `${currentYear}-10-23`;
    setFormData({ title: '', date: defaultDate, startTime: '08:00', endTime: '09:00', type: 'MEETING', location: '' });
    setEditingApptId(null);
    setIsModalOpen(true);
    setContextMenu(null);
  };

  // Mở modal SỬA LỊCH CŨ
  const handleEditClick = () => {
    if (!contextMenu?.targetAppt) return;
    const appt = contextMenu.targetAppt;

    const startDate = new Date(appt.start_time);
    const endDate = new Date(appt.end_time);

    const dateStr = startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0');
    const startStr = String(startDate.getHours()).padStart(2, '0') + ':' + String(startDate.getMinutes()).padStart(2, '0');
    const endStr = String(endDate.getHours()).padStart(2, '0') + ':' + String(endDate.getMinutes()).padStart(2, '0');

    setFormData({
      title: appt.title,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      type: appt.type,
      location: appt.location || ''
    });

    setEditingApptId(appt.id);
    setIsModalOpen(true);
    setContextMenu(null);
  };

  const handleDeleteAppt = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch này?')) return;
    try {
      await apiClient.delete(`/appointments/${id}`);
      fetchAppointments();
    } catch (error) {
      alert('Không thể hủy lịch.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const startISO = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endISO = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();
      
      const payload = {
        title: formData.title, 
        location: formData.location, 
        start_time: startISO, 
        end_time: endISO, 
        type: formData.type
      };

      if (editingApptId) {
        await apiClient.patch(`/appointments/${editingApptId}`, payload);
      } else {
        await apiClient.post('/appointments', payload);
      }

      setIsModalOpen(false);
      setEditingApptId(null);
      fetchAppointments();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu lịch.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- LỊCH THÁNG (ĐÃ FIX HIỂN THỊ TỪNG SỰ KIỆN) ---
  const renderMonthView = () => {
    const daysLabel = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const emptyDays = Array.from({length: 3}); 
    const calendarDays = Array.from({length: 31}, (_, i) => i + 1);

    return (
      <div className="bg-white rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 p-6 sm:p-10 mb-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8">
            <h3 className="font-serif font-black text-3xl text-slate-800">Tháng 10 năm 2026</h3>
            <div className="flex gap-2">
                <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500"><ChevronLeft className="w-5 h-5"/></button>
                <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500"><ChevronRight className="w-5 h-5"/></button>
            </div>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
          {daysLabel.map(d => <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {emptyDays.map((_, i) => <div key={`empty-${i}`} className="h-24 sm:h-32 rounded-2xl bg-slate-50/50 border border-transparent"></div>)}
          
          {calendarDays.map((date) => {
             const dateStr = `${currentYear}-10-${String(date).padStart(2, '0')}`;
             const dayEvents = appointments.filter(a => a.start_time.startsWith(dateStr));
             const isToday = date === 23; 

             return (
               <div 
                 key={date} 
                 // Click vào khoảng trống của ngày để tạo lịch mới
                 onContextMenu={(e) => handleContextMenu(e, dateStr)} 
                 className={cn(
                   "h-24 sm:h-32 rounded-xl sm:rounded-2xl border p-2 flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden", 
                   isToday ? "border-primary bg-primary/5" : "border-slate-100 hover:border-primary/30 bg-white"
                 )}
               >
                 <span className={cn("text-xs sm:text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center mb-1 shrink-0", isToday ? "bg-primary text-white shadow-sm" : "text-slate-600")}>{date}</span>
                 
                 {/* Hiển thị chi tiết TỪNG LỊCH HẸN thành thanh nhỏ */}
                 <div className="mt-1 space-y-1.5 overflow-y-auto flex-1 pb-1">
                    {dayEvents.map(appt => {
                      const isClass = appt.type === 'CLASS' || appt.type === 'ADMIN';
                      return (
                        <div
                          key={appt.id}
                          // Click vào sự kiện để Sửa/Hủy
                          onContextMenu={(e) => handleContextMenu(e, dateStr, appt)}
                          className={cn(
                            "text-[9px] px-1.5 py-1 rounded-md font-bold truncate cursor-pointer transition-colors",
                            isClass ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                          )}
                          title={appt.title}
                        >
                          {appt.title}
                        </div>
                      )
                    })}
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    );
  };

  // --- LỊCH TUẦN ---
  const renderWeekView = () => {
    const weekDays = [
      { day: 'THỨ 2', date: 23, fullDate: '2026-10-23' },
      { day: 'THỨ 3', date: 24, fullDate: '2026-10-24' },
      { day: 'THỨ 4', date: 25, fullDate: '2026-10-25' },
      { day: 'THỨ 5', date: 26, fullDate: '2026-10-26' },
      { day: 'THỨ 6', date: 27, fullDate: '2026-10-27' },
      { day: 'THỨ 7', date: 28, fullDate: '2026-10-28', isWeekend: true }
    ];

    return (
      <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-4 overflow-x-auto pb-4 animate-in fade-in duration-500">
        <div className="pt-20 space-y-16 flex flex-col flex-shrink-0 min-w-[80px]">
          {['07:30', '09:15', '12:30', '14:15', '16:00'].map(time => (
            <div key={time} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{time}</div>
          ))}
        </div>

        {weekDays.map((col, i) => {
          const dayAppointments = appointments.filter(a => a.start_time.startsWith(col.fullDate));

          return (
            <div key={i} className="space-y-5 min-w-[170px] flex flex-col" onContextMenu={(e) => handleContextMenu(e, col.fullDate)}>
              <div className="text-center pb-4 border-b-2 border-transparent relative">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{col.day}</span>
                <span className={cn("text-3xl font-serif font-black", col.date === 26 ? 'text-primary' : 'text-slate-800')}>{col.date}</span>
                {col.date === 26 && <div className="absolute bottom-[-2px] left-1/4 right-1/4 h-1 bg-primary rounded-full"></div>}
              </div>

              {col.isWeekend ? (
                <div className="bg-slate-50 border border-slate-200/50 h-[400px] rounded-3xl flex items-center justify-center text-center p-6 opacity-70">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Ngày nghỉ<br/>của khoa</span>
                </div>
              ) : loading ? (
                 <div className="flex justify-center pt-10"><Loader2 className="w-5 h-5 animate-spin text-slate-300"/></div>
              ) : dayAppointments.length === 0 ? (
                 <div onClick={() => handleOpenModal(col.fullDate)} className="h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-xs text-slate-400 font-medium hover:bg-slate-100">
                    + Đặt lịch trống
                 </div>
              ) : (
                dayAppointments.map((appt) => {
                  const startTimeStr = new Date(appt.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                  const endTimeStr = new Date(appt.end_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                  
                  if (appt.type === 'CONSULT' || appt.type === 'MEETING') {
                    return (
                      <div key={appt.id} onContextMenu={(e) => handleContextMenu(e, col.fullDate, appt)} className="bg-blue-50/50 p-5 rounded-2xl border border-dashed border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors">
                        <p className="text-[9px] font-bold text-blue-700 uppercase mb-1.5 tracking-wider">{appt.type === 'CONSULT' ? 'TƯ VẤN' : 'HỌP NHÓM'}</p>
                        <h4 className="text-sm font-bold text-blue-900 leading-tight mb-2">{appt.title}</h4>
                        <div className="text-[11px] font-semibold text-blue-600/70">{startTimeStr} - {endTimeStr}</div>
                      </div>
                    );
                  }

                  const isClass = appt.type === 'CLASS';
                  return (
                    <div key={appt.id} onContextMenu={(e) => handleContextMenu(e, col.fullDate, appt)} className="group cursor-pointer bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden">
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isClass ? 'bg-primary' : 'bg-indigo-500')}></div>
                      
                      <div className="flex justify-between items-start mb-3 pl-2">
                        <span className={cn("text-[9px] font-bold px-2 py-1 rounded bg-slate-100 uppercase tracking-widest", isClass ? 'text-primary' : 'text-indigo-600')}>{appt.type}</span>
                        <MoreHorizontal size={14} className="text-slate-300" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-2 leading-snug pl-2">{appt.title}</h4>
                      
                      {appt.location && (
                        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3 pl-2">
                          <MapPin size={12} className={isClass ? "text-primary/70" : "text-indigo-500/70"} /> {appt.location}
                        </p>
                      )}
                      <div className="text-[11px] font-medium text-slate-400 pl-2">{startTimeStr} - {endTimeStr}</div>
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
    <div className="space-y-8 animate-in fade-in duration-500 pt-4 pb-12 max-w-7xl mx-auto xl:mx-0">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h2 className="text-4xl font-sans font-black text-on-surface tracking-normal mb-2">
            Lịch cố vấn trong tuần
          </h2>
          <p className="text-primary font-medium flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 flex-shrink-0" /> Tháng 10 năm 2026
          </p>
        </div>
        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setScheduleView('week')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", scheduleView === 'week' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-800')}>Week</button>
          <button onClick={() => setScheduleView('month')} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", scheduleView === 'month' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-800')}>Month</button>
        </div>
      </div>

      {scheduleView === 'week' ? renderWeekView() : renderMonthView()}

      {/* FOOTER SUMMARY */}
      <div className="mt-16 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Users className="w-64 h-64 text-primary" />
          </div>
          <h3 className="text-xl font-sans font-bold text-blue-900 mb-8 relative z-10">
            Tổng quan lịch cố vấn
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Tổng giờ lớp</p>
              <p className="text-3xl font-black font-serif text-primary">14 <span className="text-sm font-medium text-slate-500 font-sans ml-1">giờ/tuần</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Buổi tư vấn</p>
              <p className="text-3xl font-black font-serif text-secondary">08 <span className="text-sm font-medium text-slate-500 font-sans ml-1">đã đặt</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Mức sử dụng phòng</p>
              <p className="text-3xl font-black font-serif text-green-600">82% <span className="text-sm font-medium text-slate-500 font-sans ml-1">hiệu suất</span></p>
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-96 bg-gradient-to-br from-primary to-primary-container p-10 rounded-[2.5rem] text-white shadow-xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-sans font-bold text-white mb-3">
              Ưu tiên tiếp theo
            </h3>
            <p className="text-primary-fixed text-sm opacity-90 leading-relaxed font-medium">Rà soát lộ trình tốt nghiệp của lớp 2023.2 trước cuộc họp thứ Ba.</p>
          </div>
          <button className="w-full mt-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 relative z-10">
            <Edit className="w-4 h-4" />
            Chuẩn bị tư vấn
          </button>
        </div>
      </div>

      {/* MODAL THÊM / SỬA LỊCH */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingApptId ? 'Sửa Thông Tin Lịch' : 'Thêm Lịch Mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tiêu đề</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loại</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none">
                    <option value="CLASS">Giảng dạy (Class)</option>
                    <option value="CONSULT">Tư vấn (Consult)</option>
                    <option value="MEETING">Họp nhóm (Meeting)</option>
                    <option value="ADMIN">Hành chính (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Từ giờ</label>
                  <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Đến giờ</label>
                  <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Địa điểm</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Hủy</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl flex items-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />} Lưu Lịch Hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div className="fixed z-[90] bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[200px]" style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 220) }}>
          {!contextMenu.targetAppt ? (
            <button onClick={() => handleOpenModal(contextMenu.dateStr)} className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-slate-50 text-slate-700">
              <CalendarPlus className="w-4 h-4 text-primary" /> Đặt lịch (Book)
            </button>
          ) : (
            <>
              <button onClick={handleEditClick} className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-slate-50 text-slate-700">
                <PenLine className="w-4 h-4 text-orange-600" /> Sửa thông tin
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              <button onClick={() => handleDeleteAppt(contextMenu.targetAppt!.id)} className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-red-50 text-red-600">
                <CalendarX className="w-4 h-4" /> Hủy lịch (Cancel)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};