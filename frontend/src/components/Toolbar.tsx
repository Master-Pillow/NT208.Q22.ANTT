import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, MessageSquare, Calendar, Check, X, User, UserCog, LogOut, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface ToolbarProps {
  setCurrentView?: (view: string) => void;
  onLogout?: () => void;
}

export const Toolbar = ({ setCurrentView, onLogout }: ToolbarProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const notifications = [
    {
      id: 1,
      type: 'request',
      title: 'Room Booking Request',
      message: 'Minh Quan Tran requested to book C.203 for group study.',
      time: '10 min ago',
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 2,
      type: 'message',
      title: 'New Message',
      message: 'Hoang Phuc Nguyen sent you a message regarding the assignment.',
      time: '1 hour ago',
      icon: MessageSquare,
      color: 'bg-green-100 text-green-600'
    }
  ];

  return (
    <header className="fixed top-0 left-72 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] px-8 py-4 flex justify-between items-center mr-4 mt-4 rounded-3xl border border-slate-100 gap-4">
      {/* Title */}
      <div className="font-headline text-lg xl:text-xl font-black text-slate-900 dark:text-white tracking-tight shrink-0 truncate">
        <span className="hidden md:block">University of Information Technology</span>
        <span className="block md:hidden">UIT</span>
      </div>
      
      {/* Search */}
      <div className="relative group hidden md:block flex-1 max-w-md mx-auto">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Search profiles or classes..." 
          className="bg-slate-100/80 dark:bg-slate-800 border-2 border-transparent rounded-full pl-11 pr-6 py-2 w-full text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all outline-none text-slate-700 placeholder:text-slate-400 font-medium"
        />
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Notifications</h3>
                <span className="text-[10px] bg-error text-white px-2 py-0.5 rounded-full font-bold">2 New</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer group">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", notif.color)}>
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
                          <button className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">Approve</button>
                          <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer">Decline</button>
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
                <button className="text-xs font-bold text-primary hover:opacity-80 transition-opacity">View All Notifications</button>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700" ref={settingsRef}>
          <div className="text-right hidden xl:block">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Dr. Aris Thorne</p>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Senior Academic Advisor</p>
          </div>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGPsoi6jtLoIOFqL61CHW3yEocR4W4i5PKkgw7SNXR_l1VLx0I4zWCL1FjhkUdJKr5puu4URCMvS16HZCbuVSnA-dyEl7sCaMiyKa1DWYQ7vm9SfRWlQVhZnE-NmA-4MatocjVq-Q4RpQtaRa6-T3LPItIqI_jDZJxpH2Jywz4pjFPQra3dtez7-P6eXYPpUlxbpF6-4ecTV8DViDRbB7oPkRfaVqn7Hm9zTXD32jXACIXpwFlWv6TjF9SRqPeE7EPdhNzhK3BH60" 
            alt="Advisor Profile" 
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-fixed shrink-0 cursor-pointer"
          />
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer ml-1"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Settings Dropdown Menu */}
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
                  <User className="w-4 h-4 ml-1" /> View Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary rounded-2xl transition-colors cursor-pointer">
                  <UserCog className="w-4 h-4 ml-1" /> Edit Account Info
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary rounded-2xl transition-colors cursor-pointer">
                  <Shield className="w-4 h-4 ml-1" /> Privacy & Security
                </button>
              </div>
              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button 
                  onClick={() => onLogout?.()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 ml-1" /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
