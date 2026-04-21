import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Video, Users, Edit, MoreHorizontal, CalendarPlus, CalendarX, PenLine, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export const Schedule = () => {
  const [scheduleView, setScheduleView] = useState<'day' | 'week' | 'month'>('week');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, item: any} | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const renderMonthView = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const calendarDays = Array.from({length: 31}, (_, i) => i + 1);

    return (
      <div className="bg-white rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 p-6 sm:p-10 overflow-hidden mb-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8">
            <h3 className="font-serif font-black text-2xl text-on-surface">October 2026</h3>
            <div className="flex gap-2">
                <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"><ChevronLeft className="w-5 h-5"/></button>
                <button className="p-2 border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"><ChevronRight className="w-5 h-5"/></button>
            </div>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
          {days.map(d => <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {Array.from({length: 3}).map((_, i) => <div key={`empty-${i}`} className="h-16 sm:h-28 rounded-2xl bg-slate-50/50 border border-transparent"></div>)}
          {calendarDays.map((date) => {
             const hasClass = date % 3 === 0 || date === 23;
             const hasMeet = date % 5 === 0 || date === 26;
             return (
               <div 
                 key={date} 
                 onContextMenu={(e) => handleContextMenu(e, {date, type: 'day'})} 
                 className={cn(
                   "h-20 sm:h-28 rounded-xl sm:rounded-2xl border p-2 flex flex-col transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5", 
                   date === 23 ? "border-primary bg-primary/5" : "border-slate-100 hover:border-primary/30 bg-white"
                 )}
               >
                 <span className={cn("text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center mb-1", date === 23 ? "bg-primary text-white shadow-sm" : "text-slate-600")}>{date}</span>
                 <div className="mt-auto space-y-1 flex flex-col">
                    {hasClass && <div className="text-[8px] sm:text-[9px] bg-primary-fixed text-on-primary-fixed-variant px-1.5 py-0.5 rounded font-bold truncate">2 Classes</div>}
                    {hasMeet && <div className="text-[8px] sm:text-[9px] bg-secondary-fixed text-on-secondary-fixed-variant px-1.5 py-0.5 rounded font-bold truncate">1 Meeting</div>}
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => (
    <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-4 overflow-x-auto pb-4 animate-in fade-in duration-500">
      {/* Time Column */}
      <div className="pt-16 space-y-16 flex flex-col flex-shrink-0 min-w-[80px]">
        {['07:30', '09:15', '12:30', '14:15', '16:00'].map(time => (
          <div key={time} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{time}</div>
        ))}
      </div>

      {/* Days Columns */}
      {[
        {
          day: 'Mon', date: '23', events: [
            { type: 'class', code: 'CS101', title: 'Data Structures', room: 'C214', time: '07:30 - 09:00', icon: MapPin },
            { type: 'consult', subtitle: 'Office Hours', title: 'Walk-in Advising', time: '14:15 - 15:45' }
          ]
        },
        {
          day: 'Tue', date: '24', events: [
            { type: 'spacer', height: '140px' },
            { type: 'admin', code: 'ADMIN', title: 'KHMT 2023.2 Cohort Meeting', room: 'B5.06', time: '09:15 - 11:30', icon: Users }
          ]
        },
        {
          day: 'Wed', date: '25', events: [
            { type: 'class', code: 'CS204', title: 'Algorithm Design', room: 'Hall A', time: '07:30 - 09:30', icon: MapPin },
            { type: 'spacer', height: '20px' },
            { type: 'reserved' }
          ]
        },
        {
          day: 'Thu', date: '26', events: [
            { type: 'spacer', height: '150px' },
            { type: 'consult', subtitle: 'Faculty Advisory', title: 'Postgrad Review Panel', time: '12:30 - 14:00' },
            { type: 'class', code: 'CS101', title: 'Data Structures', room: 'C214 Lab', time: '14:15 - 16:00' }
          ]
        },
        {
          day: 'Fri', date: '27', events: [
            { type: 'admin', code: 'DEPT', title: 'Curriculum Sync', room: 'Zoom', time: '09:15 - 10:45', icon: Video },
            { type: 'spacer', height: '40px' },
            { type: 'break', title: 'Advising Break' }
          ]
        },
        {
          day: 'Sat', date: '28', events: [
            { type: 'weekend' }
          ]
        }
      ].map((col, i) => (
        <div key={i} className="space-y-5 min-w-[150px]">
          <div className="text-center pb-4 border-b-2 border-transparent relative">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{col.day}</span>
            <span className={cn("text-3xl font-serif font-black", col.day === 'Thu' ? 'text-primary' : 'text-slate-800')}>{col.date}</span>
            {col.day === 'Thu' && <div className="absolute bottom-[-2px] left-1/4 right-1/4 h-1 bg-primary rounded-full"></div>}
          </div>
          
          {col.events.map((ev, j) => {
            if (ev.type === 'spacer') return <div key={j} style={{ height: ev.height }}></div>;
            if (ev.type === 'reserved') return (
              <div key={j} onContextMenu={(e) => handleContextMenu(e, ev)} className="bg-slate-100/80 border border-slate-200/50 border-dashed h-32 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-slate-200/50 transition-colors">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reserved</span>
              </div>
            );
            if (ev.type === 'break') return (
              <div key={j} onContextMenu={(e) => handleContextMenu(e, ev)} className="bg-white p-5 rounded-2xl shadow-sm opacity-60 border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity">
                <h4 className="text-sm font-bold text-slate-500">{ev.title}</h4>
              </div>
            );
            if (ev.type === 'weekend') return (
              <div key={j} className="bg-gradient-to-br from-slate-100 to-slate-200/50 h-[400px] border border-slate-200/50 rounded-3xl flex flex-col items-center justify-center gap-4 text-center p-6 opacity-70">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Departmental<br/>Rest Day</span>
              </div>
            );
            if (ev.type === 'consult') return (
              <div key={j} onContextMenu={(e) => handleContextMenu(e, ev)} className="bg-blue-50/50 p-5 rounded-2xl border border-dashed border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors hover:shadow-sm">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-2 tracking-wider">{ev.subtitle}</p>
                <h4 className="text-sm font-bold text-blue-900 leading-tight mb-3">{ev.title}</h4>
                <div className="text-[11px] font-semibold text-blue-600/70">{ev.time}</div>
              </div>
            );
            
            const isClass = ev.type === 'class';
            const IconComp = ev.icon as React.ElementType;
            return (
              <div 
                key={j} 
                onContextMenu={(e) => handleContextMenu(e, ev)}
                className={cn("group cursor-pointer bg-white p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_20px_40px_rgba(0,74,198,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden")}
              >
                {/* Color accent line */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isClass ? 'bg-primary' : 'bg-secondary')}></div>
                
                {ev.code && (
                  <div className="flex justify-between items-start mb-3 pl-1">
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider", isClass ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-secondary-fixed text-on-secondary-fixed-variant')}>{ev.code}</span>
                    <MoreHorizontal size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                )}
                <h4 className="text-sm font-bold text-on-surface mb-2 leading-snug pl-1 pt-1">{ev.title}</h4>
                {ev.room && (
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-3 pl-1">
                    {IconComp ? <IconComp size={12} className={isClass ? "text-primary/70" : "text-secondary/70"} /> : <MapPin size={12} className="text-primary/70" />}
                    {ev.room}
                  </p>
                )}
                <div className="text-[11px] font-medium text-slate-400 pl-1">{ev.time}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="font-serif text-4xl font-black text-on-surface mb-2">Weekly Advisor Schedule</h2>
          <p className="text-secondary font-medium flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 flex-shrink-0" />
            October 2026
          </p>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl shadow-sm border border-slate-100/50">
          <button 
            onClick={() => setScheduleView('day')}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer", scheduleView === 'day' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800')}
          >
            Day
          </button>
          <button 
            onClick={() => setScheduleView('week')}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer", scheduleView === 'week' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800')}
          >
            Week
          </button>
          <button 
            onClick={() => setScheduleView('month')}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer", scheduleView === 'month' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800')}
          >
            Month
          </button>
        </div>
      </div>

      {scheduleView === 'month' ? renderMonthView() : renderWeekView()}

      {/* Analytics Footer Section */}
      <div className="mt-16 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Users className="w-64 h-64 text-primary" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-on-surface mb-8 relative z-10">Advisor Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Total Classes</p>
              <p className="text-3xl font-black font-serif text-primary">14 <span className="text-sm font-medium text-slate-500 font-sans ml-1">hours/week</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Consultations</p>
              <p className="text-3xl font-black font-serif text-secondary">08 <span className="text-sm font-medium text-slate-500 font-sans ml-1">booked</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Room Occupancy</p>
              <p className="text-3xl font-black font-serif text-green-600">82% <span className="text-sm font-medium text-slate-500 font-sans ml-1">efficiency</span></p>
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-96 bg-gradient-to-br from-primary to-primary-container p-10 rounded-[2.5rem] text-white shadow-xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700"></div>
          <div className="relative z-10">
            <h4 className="font-serif text-2xl font-bold mb-3">Next Priority</h4>
            <p className="text-primary-fixed text-sm opacity-90 leading-relaxed font-medium">Review degree paths for Cohort 2023.2 before Tuesday meeting.</p>
          </div>
          <button className="w-full mt-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 relative z-10">
            <Edit className="w-4 h-4" />
            Prepare Brief
          </button>
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-slate-100 py-2 min-w-[200px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 220) }}
        >
          <button className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer">
            <CalendarPlus className="w-4 h-4 text-primary" />
            Đặt lịch (Book)
          </button>
          <button className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer relative">
            <PenLine className="w-4 h-4 text-orange-600" />
            Note trực tiếp
            <span className="absolute right-4 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
          </button>
          <div className="h-px bg-slate-100 my-1 mx-2"></div>
          <button className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors cursor-pointer">
            <CalendarX className="w-4 h-4" />
            Hủy lịch (Cancel)
          </button>
        </div>
      )}
    </div>
  );
};

