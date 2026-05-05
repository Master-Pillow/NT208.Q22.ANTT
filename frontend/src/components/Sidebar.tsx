import React from 'react';
import { LayoutDashboard, Users, FileText, Calendar, HelpCircle, LogOut, GraduationCap, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { id: 'profiles', label: 'Hồ sơ sinh viên', icon: Users },
    { id: 'messages', label: 'Tin nhắn', icon: MessageSquare },
    { id: 'notes', label: 'Ghi chú tư vấn', icon: FileText },
    { id: 'schedule', label: 'Lịch tư vấn', icon: Calendar },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 m-4 rounded-3xl bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-lg flex flex-col p-6 space-y-8 z-40 border border-slate-200">
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
          <GraduationCap className="w-8 h-8 text-blue-800 dark:text-blue-400" />
        </div>
        <div className="text-center">
          <h1 className="font-headline text-xl font-bold text-blue-800 dark:text-blue-400">COURSE2</h1>
          <p className="text-xs opacity-60 uppercase tracking-widest font-semibold">Cố vấn học vụ</p>
        </div>
      </div>

      <nav className="flex flex-col gap-2 flex-grow">
        {navItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'profiles' && currentView === 'cohort');
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-transform duration-200 text-left",
                isActive 
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-bold shadow-sm border border-slate-100" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 font-medium"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <button className="bg-gradient-to-br from-primary to-primary-container text-white py-3 px-4 rounded-full font-semibold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform">
          Tạo kế hoạch học tập
        </button>
        <button className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl text-sm transition-colors">
          <HelpCircle className="w-5 h-5" />
          <span>Trung tâm trợ giúp</span>
        </button>
      </div>
    </aside>
  );
};
