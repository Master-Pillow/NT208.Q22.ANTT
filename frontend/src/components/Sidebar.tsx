import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  HelpCircle,
  GraduationCap,
  MessageSquare,
  BookOpen,
  Bot,
  Award, // Thêm icon cho Đánh giá
  Bell,  // Thêm icon cho Thông báo
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  role?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  role,
}) => {
  // 1. MẢNG MENU CHO TỪNG ROLE
  const adminItems = [
    { id: 'adminDashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'adminAdvisors', label: 'Quản lý Cố vấn', icon: Users },
    { id: 'adminClasses', label: 'Phân công lớp', icon: BookOpen },
    { id: 'adminEvaluations', label: 'Đánh giá', icon: Award },
    { id: 'adminNotifications', label: 'Thông báo', icon: Bell },
  ];

  const advisorItems = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { id: 'profiles', label: 'Hồ sơ sinh viên', icon: Users },
    { id: 'messages', label: 'Tin nhắn', icon: MessageSquare },
    { id: 'notes', label: 'Ghi chú tư vấn', icon: FileText },
    { id: 'schedule', label: 'Lịch tư vấn', icon: Calendar },
  ];

  adminItems.splice(3, 0, { id: 'ai', label: 'AI học vụ', icon: Bot });
  advisorItems.splice(4, 0, { id: 'ai', label: 'AI học vụ', icon: Bot });

  const studentItems = [
    { id: 'studentDashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'studentAcademic', label: 'Kết quả học tập', icon: BookOpen },
    { id: 'studentMessages', label: 'Tin nhắn cố vấn', icon: MessageSquare },
    { id: 'studentAppointments', label: 'Lịch tư vấn', icon: Calendar },
  ];

  // Chuẩn hóa role để tránh lỗi khoảng trắng hay in hoa/thường
  const normalizedRole = String(role || '').trim().toUpperCase();

  // 2. LOGIC CHỌN MENU VÀ SUBTITLE
  let navItems = advisorItems; // Mặc định là cố vấn
  let subtitle = 'Cố vấn học vụ';

  if (normalizedRole === 'ADMIN') {
    navItems = adminItems;
    subtitle = 'Quản trị viên';
  } else if (normalizedRole === 'STUDENT') {
    navItems = studentItems;
    subtitle = 'Sinh viên';
  }

  const isItemActive = (itemId: string) => {
    if (currentView === itemId) return true;

    if (itemId === 'profiles' && currentView === 'cohort') return true;
    if (itemId === 'profiles' && currentView === 'studentDetail') return true;
    // Thêm active cho Admin Classes nếu ở trang chi tiết
    if (itemId === 'adminAdvisors' && currentView === 'adminAdvisorDetail') return true;

    return false;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 m-4 rounded-3xl bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-lg flex flex-col p-6 space-y-8 z-40 border border-slate-200">
      {/* HEADER LOGO */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
          <GraduationCap className="w-8 h-8 text-blue-800 dark:text-blue-400" />
        </div>

        <div className="text-center">
          <h1 className="font-sans text-xl font-bold text-blue-800 dark:text-blue-400">
            COURSE2
          </h1>
          <p className="text-xs opacity-60 uppercase tracking-normal font-semibold">
            {subtitle}
          </p>
        </div>
      </div>

      {/* RENDER LIST MENU */}
      <nav className="flex flex-col gap-2 flex-grow overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.id);

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-transform duration-200 text-left',
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-bold shadow-sm border border-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 font-medium'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* FOOTER ACTIONS */}
      <div className="mt-auto flex flex-col gap-4">
        {normalizedRole === 'STUDENT' ? (
          <button
            onClick={() => setCurrentView('studentAppointments')}
            className="bg-gradient-to-br from-primary to-primary-container text-white py-3 px-4 rounded-full font-semibold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            Đặt lịch tư vấn
          </button>
        ) : normalizedRole === 'ADMIN' ? (
          <button className="bg-gradient-to-br from-slate-700 to-slate-900 text-white py-3 px-4 rounded-full font-semibold text-sm shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">
            Báo cáo hệ thống
          </button>
        ) : (
          <button className="bg-gradient-to-br from-primary to-primary-container text-white py-3 px-4 rounded-full font-semibold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform">
            Tạo kế hoạch học tập
          </button>
        )}

        <button className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl text-sm transition-colors">
          <HelpCircle className="w-5 h-5" />
          <span>Trung tâm trợ giúp</span>
        </button>
      </div>
    </aside>
  );
};
