import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../auth/AuthContext';

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
  const [open, setOpen] = useState(false);

  const navItems = role === 'ADMIN' ? adminItems : role === 'STUDENT' ? studentItems : advisorItems;
  const subtitle = role === 'ADMIN' ? 'Quản trị viên' : role === 'STUDENT' ? 'Sinh viên' : 'Cố vấn học vụ';

  const aside = (
    <aside className="h-full w-64 bg-gradient-to-b from-[#004ac6]/95 via-[#2563eb]/95 to-[#0058be]/95 backdrop-blur-lg flex flex-col p-6 space-y-8 border border-blue-500/30 lg:rounded-3xl shadow-xl shadow-blue-900/10">
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shadow-sm backdrop-blur-md">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>

        <div className="text-center">
          <h1 className="font-sans text-xl font-bold text-white">
            COURSE2
          </h1>
          <p className="text-xs text-blue-100 uppercase tracking-wider font-semibold">
            {subtitle}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-2 flex-grow overflow-y-auto">
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
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl hover:translate-x-1 transition-all duration-200 text-left',
                isActive
                  ? 'bg-white text-blue-700 font-bold shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white font-medium'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <button className="bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-full font-bold text-sm shadow-sm backdrop-blur-md transition-colors border border-white/20 cursor-pointer">
          {role === 'STUDENT' ? 'Đặt lịch tư vấn' : role === 'ADMIN' ? 'Báo cáo hệ thống' : 'Tạo kế hoạch học tập'}
        </button>

        <button className="flex items-center gap-3 px-4 py-2 text-blue-100 hover:bg-white/10 hover:text-white rounded-xl text-sm transition-colors cursor-pointer">
          <HelpCircle className="w-5 h-5" />
          <span>Trung tâm trợ giúp</span>
        </button>
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
