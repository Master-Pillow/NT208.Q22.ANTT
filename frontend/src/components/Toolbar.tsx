import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Bell,
  Settings,
  Calendar,
  Check,
  X,
  User,
  UserCog,
  LogOut,
  Shield,
  Loader2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../lib/api';

interface SearchItem {
  id: number | null;
  code: string;
  name: string;
  type: 'student' | 'class';
}

interface CurrentUser {
  id?: number;
  email?: string;
  full_name?: string;
  role?: string;
  student_id?: number | null;
  avatar_url?: string;
  bio?: string;
}

interface AppointmentRequest {
  id: number;
  title: string;
  note?: string | null;
  start_time: string;
  end_time: string;
  status: string;
  student_name?: string | null;
  student_mssv?: string | null;
}

interface ToolbarProps {
  currentUser?: CurrentUser | null;
  setCurrentView?: (view: string) => void;
  onLogout?: () => void;
  onSearchSelect?: (item: SearchItem) => void;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const Toolbar = ({
  currentUser,
  setCurrentView,
  onLogout,
  onSearchSelect,
}: ToolbarProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [appointmentRequests, setAppointmentRequests] = useState<AppointmentRequest[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const displayName = currentUser?.full_name || currentUser?.email || 'Người dùng';
  const normalizedRole = String(currentUser?.role || '').trim().toUpperCase();
  const isAdvisor = normalizedRole === 'ADVISOR' || normalizedRole === 'ADMIN';

  const roleLabel =
    normalizedRole === 'STUDENT'
      ? 'Sinh viên'
      : normalizedRole === 'ADMIN'
        ? 'Quản trị viên'
        : 'Cố vấn học vụ';

  const avatarSeed = encodeURIComponent(currentUser?.email || displayName);
  const pendingCount = appointmentRequests.length;

  const loadAppointmentRequests = useCallback(async () => {
    if (!isAdvisor) {
      setAppointmentRequests([]);
      return;
    }

    try {
      setLoadingNotifications(true);
      setNotificationError('');
      const { data } = await apiClient.get('/appointments/pending');
      setAppointmentRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[Toolbar/loadAppointmentRequests]', err);
      setNotificationError(
        err.response?.data?.message || 'Không thể tải yêu cầu đặt lịch.'
      );
    } finally {
      setLoadingNotifications(false);
    }
  }, [isAdvisor]);

  useEffect(() => {
    loadAppointmentRequests();

    if (!isAdvisor) return;

    const intervalId = window.setInterval(loadAppointmentRequests, 20000);
    const refreshHandler = () => loadAppointmentRequests();
    window.addEventListener('appointments:changed', refreshHandler);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('appointments:changed', refreshHandler);
    };
  }, [isAdvisor, loadAppointmentRequests]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };

    if (showSettings) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      setIsSearching(true);

      try {
        const { data } = await apiClient.get(
          `/api/search?q=${encodeURIComponent(searchQuery)}`
        );

        setSearchResults(Array.isArray(data) ? data : []);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSelect = (item: SearchItem) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    onSearchSelect?.(item);
  };

  const handleAppointmentDecision = async (
    appointmentId: number,
    status: 'confirmed' | 'cancelled'
  ) => {
    try {
      setActionLoadingId(appointmentId);
      await apiClient.patch(`/appointments/${appointmentId}/status`, { status });
      setAppointmentRequests((prev) => prev.filter((item) => item.id !== appointmentId));
      window.dispatchEvent(new Event('appointments:changed'));

      if (status === 'confirmed') {
        setCurrentView?.('schedule');
      }
    } catch (err: any) {
      console.error('[Toolbar/appointmentDecision]', err);
      setNotificationError(
        err.response?.data?.message || 'Không thể cập nhật lịch hẹn.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <header className="fixed top-0 left-16 right-0 lg:left-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] px-4 sm:px-8 py-4 flex justify-between items-center mr-4 mt-4 rounded-3xl border border-slate-100 gap-4">
      <div className="font-headline text-lg xl:text-xl font-black text-slate-900 dark:text-white tracking-tight shrink-0 truncate">
        <span className="hidden md:block">Trường Đại học Công nghệ Thông tin</span>
        <span className="block md:hidden">UIT</span>
      </div>

      <div className="relative group hidden md:block flex-1 max-w-md mx-auto" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchDropdown(true);
            }}
            placeholder="Tìm sinh viên hoặc lớp học..."
            className="w-full bg-blue-50 text-slate-900 placeholder:text-slate-400 rounded-full pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
          />

          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
          )}
        </div>

        {showSearchDropdown && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-2">
            {searchResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">
                Không tìm thấy kết quả nào
              </div>
            ) : (
              <>
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {searchResults.length} kết quả
                </div>

                {searchResults.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.id || item.code}-${idx}`}
                    onClick={() => handleSelect(item)}
                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        item.type === 'student'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {item.type === 'student' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {item.type === 'student' ? 'Sinh viên' : 'Lớp'} · {item.code}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.type === 'student'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      {item.type === 'student' ? 'SV' : 'LỚP'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-[28rem] bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">Thông báo</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Yêu cầu đặt lịch từ sinh viên
                  </p>
                </div>
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {pendingCount} mới
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="p-6 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải yêu cầu đặt lịch...
                  </div>
                ) : notificationError ? (
                  <div className="p-4 text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{notificationError}</span>
                  </div>
                ) : pendingCount === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold">Không có lịch nào chờ duyệt.</p>
                  </div>
                ) : (
                  appointmentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-4 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {request.title}
                          </h4>
                          <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full font-bold shrink-0">
                            Chờ duyệt
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          {request.student_name || 'Sinh viên'}
                          {request.student_mssv ? ` · ${request.student_mssv}` : ''}
                        </p>

                        <p className="text-xs font-semibold text-blue-700 mt-1">
                          {formatDateTime(request.start_time)} - {formatDateTime(request.end_time)}
                        </p>

                        {request.note && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                            {request.note}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() => handleAppointmentDecision(request.id, 'confirmed')}
                            disabled={actionLoadingId === request.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                          >
                            {actionLoadingId === request.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Chấp nhận
                          </button>
                          <button
                            onClick={() => handleAppointmentDecision(request.id, 'cancelled')}
                            disabled={actionLoadingId === request.id}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 border border-red-100 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => {
                    setCurrentView?.('schedule');
                    setShowNotifications(false);
                  }}
                  className="text-xs font-bold text-primary hover:opacity-80"
                >
                  Mở lịch tư vấn của cố vấn
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative flex items-center gap-3 pl-4 border-l border-slate-200"
          ref={settingsRef}
        >
          <div className="text-right hidden xl:block">
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {displayName}
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {roleLabel}
            </p>
          </div>

          <img
            src={currentUser?.avatar_url ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${currentUser.avatar_url}` : `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`}
            alt={displayName}
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-fixed shrink-0 cursor-pointer"
          />

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer ml-1"
          >
            <Settings className="w-5 h-5" />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
              <div className="p-2">
                <button
                  onClick={() => {
                    setCurrentView?.('profile');
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary rounded-2xl transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 ml-1" />
                  Xem hồ sơ
                </button>

                
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => onLogout?.()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 ml-1" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
