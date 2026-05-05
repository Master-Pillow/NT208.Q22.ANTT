import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, MessageSquare, Calendar, Check, User, UserCog, LogOut, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { Loader2, Users } from 'lucide-react';
import apiClient from '../lib/api';
interface SearchItem {
  id: number | null;
  code: string;
  name: string;
  type: 'student' | 'class';
}

interface ToolbarProps {
  setCurrentView?: (view: string) => void;
  onLogout?: () => void;
  onSearchSelect?: (item: SearchItem) => void;
}

export const Toolbar = ({ setCurrentView, onLogout, onSearchSelect }: ToolbarProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close settings on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setShowSettings(false);
    };
    if (showSettings) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]); setShowSearchDropdown(false); return;
      }
      setIsSearching(true);
      try {
        const { data } = await apiClient.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
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

  const notifications = [
    { id: 1, type: 'request', title: 'Yêu cầu đặt phòng',
      message: 'Minh Quân Trần yêu cầu đặt phòng C.203 để học nhóm.',
      time: '10 phút trước', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
    { id: 2, type: 'message', title: 'Tin nhắn mới',
      message: 'Hoàng Phúc Nguyễn đã gửi tin nhắn về bài tập.',
      time: '1 giờ trước', icon: MessageSquare, color: 'bg-green-100 text-green-600' },
  ];

  return (
      <header className="fixed top-0 left-72 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] px-8 py-4 flex justify-between items-center mr-4 mt-4 rounded-3xl border border-slate-100 gap-4">

        {/* Title */}
        <div className="font-headline text-lg xl:text-xl font-black text-slate-900 dark:text-white tracking-tight shrink-0 truncate">
          <span className="hidden md:block">Trường Đại học Công nghệ Thông tin</span>
          <span className="block md:hidden">UIT</span>
        </div>

        {/* Search */}
        <div className="relative group hidden md:block flex-1 max-w-md mx-auto" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                placeholder="Tìm sinh viên hoặc lớp học..."
                className="w-full bg-blue-50 text-slate-900 placeholder:text-slate-400 rounded-full pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
            />
            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
          </div>

          {/* Dropdown */}
          {showSearchDropdown && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-2">
                {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">Không tìm thấy kết quả nào</div>
                ) : (
                    <>
                      <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {searchResults.length} kết quả
                      </div>
                      {searchResults.map((item, idx) => (
                          <div
                              key={idx}
                              onClick={() => handleSelect(item)}
                              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                item.type === 'student' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {item.type === 'student' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {item.type === 'student' ? 'Sinh viên' : 'Lớp'} · {item.code}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                item.type === 'student' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                      {item.type === 'student' ? 'SV' : 'LỚP'}
                    </span>
                          </div>
                      ))}
                    </>
                )}
              </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 shrink-0">

          {/* Notifications */}
          <div className="relative">
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white" />
            </button>
            {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">Thông báo</h3>
                    <span className="text-[10px] bg-error text-white px-2 py-0.5 rounded-full font-bold">2 mới</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map(notif => (
                        <div key={notif.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer group">
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', notif.color)}>
                            <notif.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                              <span className="text-[10px] text-slate-500 font-medium">{notif.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{notif.message}</p>
                            {notif.type === 'request' && (
                                <div className="flex gap-2 mt-3">
                                  <button className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold cursor-pointer">Duyệt</button>
                                  <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer">Từ chối</button>
                                </div>
                            )}
                          </div>
                          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 hover:bg-slate-200 rounded text-slate-400 cursor-pointer">
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
                    <button className="text-xs font-bold text-primary hover:opacity-80">Xem tất cả thông báo</button>
                  </div>
                </div>
            )}
          </div>

          {/* Profile / Settings */}
          <div className="relative flex items-center gap-3 pl-4 border-l border-slate-200" ref={settingsRef}>
            <div className="text-right hidden xl:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">TS. Aris Thorne</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cố vấn học vụ cấp cao</p>
            </div>
            <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGPsoi6jtLoIOFqL61CHW3yEocR4W4i5PKkgw7SNXR_l1VLx0I4zWCL1FjhkUdJKr5puu4URCMvS16HZCbuVSnA-dyEl7sCaMiyKa1DWYQ7vm9SfRWlQVhZnE-NmA-4MatocjVq-Q4RpQtaRa6-T3LPItIqI_jDZJxpH2Jywz4pjFPQra3dtez7-P6eXYPpUlxbpF6-4ecTV8DViDRbB7oPkRfaVqn7Hm9zTXD32jXACIXpwFlWv6TjF9SRqPeE7EPdhNzhK3BH60"
                alt="Advisor"
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
                        onClick={() => { setCurrentView?.('profile'); setShowSettings(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary rounded-2xl transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 ml-1" /> Xem hồ sơ
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary rounded-2xl transition-colors cursor-pointer">
                      <UserCog className="w-4 h-4 ml-1" /> Edit Account Info
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary rounded-2xl transition-colors cursor-pointer">
                      <Shield className="w-4 h-4 ml-1" /> Quyền riêng tư & bảo mật
                    </button>
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => onLogout?.()}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 ml-1" /> Đăng xuất
                    </button>
                  </div>
                </div>
            )}
          </div>
        </div>
      </header>
  );
};