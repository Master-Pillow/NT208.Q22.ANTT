import React, { useEffect, useState } from 'react';
import { 
  Mail, MapPin, Phone, GraduationCap, Award, 
  BookOpen, Fingerprint, Calendar, Users, Building, ShieldCheck 
} from 'lucide-react';
import { cn } from '../lib/utils';

export const AdvisorProfile = () => {
  // State lưu thông tin cố vấn thực tế từ hệ thống
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Lấy thông tin user đã đăng nhập từ LocalStorage
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-5xl mx-auto">
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden relative">
        <div className="h-40 bg-gradient-to-r from-primary to-primary-container relative">
           <div className="absolute inset-0 bg-white/10 mix-blend-overlay">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
           </div>
        </div>
        
        <div className="px-8 sm:px-12 pb-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8 -mt-20 mb-6">
            <div className="relative inline-block">
              <img 
                src={`https://i.pravatar.cc/150?u=${user?.email || 'default'}`} 
                alt="Profile" 
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white object-cover shadow-xl bg-white"
              />
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            
            <div className="flex-1 pb-2">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black font-headline text-slate-900 tracking-tight leading-tight">
                    {user?.role === 'ADVISOR' ? 'Cố vấn Học vụ' : 'Quản trị viên'}
                  </h1>
                  <p className="text-lg text-primary font-bold mt-1">
                    {user?.email?.split('@')[0].toUpperCase() || 'TS. Aris Thorne'}
                  </p>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    Đại học Công nghệ Thông tin - UIT
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm">
                    <Mail className="w-4 h-4" />
                    Gửi Email
                  </button>
                  <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
                    <Calendar className="w-4 h-4" />
                    Lịch hẹn
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-x-8 gap-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
              {user?.email || 'loading@uit.edu.vn'}
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
              (+84) 28 3724 4260
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4" /></div>
              Khu phố 6, P. Linh Trung, Tp. Thủ Đức
            </div>
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Fingerprint className="w-4 h-4" /></div>
              Hệ thống ID: {user?.id || 'ADV-2026-XXXX'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Qualifications */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Thông tin Học thuật
            </h3>
            
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <GraduationCap className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Tiến sĩ Khoa học Máy tính</h4>
                  <p className="text-[13px] text-slate-500 mt-0.5">Đại học Stanford, 2012</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Award className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Cố vấn học vụ chuyên nghiệp</h4>
                  <p className="text-[13px] text-slate-500 mt-0.5">NACADA Global, 2018</p>
                </div>
              </div>
            </div>
            
            <hr className="my-6 border-slate-100" />
            
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ngôn ngữ</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Tiếng Việt</span>
                <span className="text-slate-500">Bản ngữ</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Tiếng Anh</span>
                <span className="text-slate-500">IELTS 8.5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Biography & Portfolio */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Tiểu sử chuyên môn</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Với hơn 14 năm kinh nghiệm trong giáo dục đại học và phát triển chương trình giảng dạy. Chuyên sâu về Kỹ thuật Phần mềm và Cấu trúc dữ liệu nâng cao, TS. Aris Thorne tận tâm thu hẹp khoảng cách giữa lý thuyết học thuật và thực hành công nghiệp. Với tư cách là Cố vấn học vụ cấp cao tại UIT, cô tập trung vào việc hướng dẫn sinh viên vượt qua các lộ trình học tập khắt khe và xây dựng môi trường học tập cộng tác.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-end mb-6">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Học phần phụ trách
              </h3>
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">Học kỳ hiện tại</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { code: 'IT001', name: 'Cấu trúc dữ liệu', term: 'Thu 2026', students: 124, type: 'Cốt lõi' },
                { code: 'SE302', name: 'Kiến trúc Phần mềm', term: 'Thu 2026', students: 85, type: 'Cốt lõi' },
              ].map((cls, idx) => (
                <div key={idx} className="border border-slate-100 rounded-2xl p-5 hover:border-primary/30 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase tracking-widest">{cls.code}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest", cls.type === 'Cốt lõi' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600')}>{cls.type}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">{cls.name}</h4>
                  <div className="flex justify-between items-center mt-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {cls.term}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {cls.students} SV</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};