import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  HelpCircle,
  Mail,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PhoneCall,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../auth/AuthContext';
import { preloadRoute } from '../routes/preload';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  match?: string;
}

const adminItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Sinh viên', icon: GraduationCap },
  { to: '/admin/classes', label: 'Lớp học', icon: BookOpen },
  { to: '/admin/advisors', label: 'Cố vấn', icon: Users },
  { to: '/admin/courses', label: 'Môn học', icon: FileText },
  { to: '/admin/ai', label: 'AI học vụ', icon: Sparkles, match: '/admin/ai' },
  { to: '/admin/faq', label: 'AI Chatbox UIT', icon: Sparkles },
];

const advisorItems: NavItem[] = [
  { to: '/advisor/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/advisor/students', label: 'Sinh viên lớp mình', icon: Users, match: '/advisor/students' },
  { to: '/advisor/appointments', label: 'Lịch hẹn', icon: Calendar },
  { to: '/advisor/messages', label: 'Tin nhắn', icon: MessageSquare },
  { to: '/advisor/ai/anomaly', label: 'AI: Cảnh báo', icon: AlertTriangle },
  { to: '/advisor/ai/brief', label: 'AI: Brief lớp mình', icon: Sparkles },
  { to: '/advisor/faq', label: 'AI Chatbox UIT', icon: Sparkles },
];

const studentItems: NavItem[] = [
  { to: '/student/profile', label: 'Hồ sơ học tập', icon: LayoutDashboard },
  { to: '/student/grades', label: 'Xem điểm', icon: BookOpen },
  { to: '/student/appointments', label: 'Lịch hẹn', icon: Calendar },
  { to: '/student/messages', label: 'Tin nhắn', icon: MessageSquare },
  { to: '/student/notifications', label: 'Thông báo', icon: Bell },
  { to: '/student/faq', label: 'AI Chatbox UIT', icon: Sparkles },
];

export const Sidebar: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const navItems = role === 'ADMIN' ? adminItems : role === 'STUDENT' ? studentItems : advisorItems;
  const subtitle = role === 'ADMIN' ? 'Quản trị viên' : role === 'STUDENT' ? 'Sinh viên' : 'Cố vấn học vụ';
  const primaryActionLabel = role === 'STUDENT' ? 'Đặt lịch tư vấn' : role === 'ADMIN' ? 'Báo cáo hệ thống' : 'Tạo kế hoạch học tập';

  const handlePrimaryAction = () => {
    if (role === 'STUDENT') navigate('/student/appointments');
    else if (role === 'ADMIN') navigate('/admin/ai/brief');
    else navigate('/advisor/ai/brief');
    setOpen(false);
  };

  const aside = (
    <aside className="h-full w-64 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-lg flex flex-col p-6 space-y-8 border border-slate-200 lg:rounded-3xl">
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

      <nav className="flex flex-col gap-2 flex-grow overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const activePath = item.match || item.to;
          const isActive =
            location.pathname === item.to ||
            (item.match ? location.pathname.startsWith(activePath) : false);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => preloadRoute(item.to)}
              onFocus={() => preloadRoute(item.to)}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-transform duration-200 text-left min-w-0',
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-bold shadow-sm border border-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 font-medium'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          onClick={handlePrimaryAction}
          className="bg-gradient-to-br from-primary to-primary-container text-white py-3 px-4 rounded-full font-semibold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          {primaryActionLabel}
        </button>

        <button
          type="button"
          onClick={() => setShowHelp((value) => !value)}
          className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl text-sm transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Trung tâm trợ giúp</span>
        </button>

        {showHelp && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              UIT hỗ trợ cố vấn, sinh viên và quản trị viên theo dõi học vụ trên cùng một hệ thống.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <PhoneCall className="h-3.5 w-3.5 text-blue-500" />
              <span>Tổng đài admin: 028 7300 2288</span>
            </div>
            <a href="mailto:admin@uit.edu.vn" className="mt-1 flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400">
              <Mail className="h-3.5 w-3.5" />
              admin@uit.edu.vn
            </a>
            {role === 'ADVISOR' && (
              <p className="mt-2 text-slate-400">
                Cố vấn có thể gửi yêu cầu hỗ trợ dữ liệu lớp, phân quyền hoặc lịch tư vấn cho admin qua kênh này.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
        aria-label="Mở menu"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="fixed left-0 top-0 z-40 hidden h-screen p-4 lg:block">{aside}</div>

      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full p-4 pt-16" onClick={(event) => event.stopPropagation()}>
            {aside}
          </div>
        </div>
      )}
    </>
  );
};
