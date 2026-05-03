import React, { useEffect, useState } from 'react';
import { Network, FileJson, Calculator, GraduationCap, ArrowRight } from 'lucide-react';
import apiClient from '../lib/api';

interface Props {
  onNavigate: (view: string) => void;
}

export const StudentProfiles: React.FC<Props> = ({ onNavigate }) => {
  const [adminClasses, setAdminClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const { data } = await apiClient.get('/advisor/students');
        
        // Thuật toán: Nhóm sinh viên theo mã lớp (class_code)
        const classMap = new Map();
        data.forEach((student: any) => {
          if (!classMap.has(student.class_code)) {
            classMap.set(student.class_code, {
              code: student.class_code,
              cohort: student.cohort || '2023',
              studentCount: 0
            });
          }
          classMap.get(student.class_code).studentCount += 1;
        });

        setAdminClasses(Array.from(classMap.values()));
      } catch (error) {
        console.error("Lỗi lấy danh sách lớp:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pt-8 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-12 gap-6">
        <div>
          <h1 className="font-headline text-4xl text-on-surface font-black mb-2">Quản lý Lớp học</h1>
          <p className="text-on-surface-variant max-w-lg font-medium">Theo dõi các lớp sinh viên và tiến độ học tập do bạn phụ trách.</p>
        </div>
      </div>

      {/* Subject Classes - Mock Data */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-1.5 bg-primary rounded-full"></div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Lớp môn học (Đang giảng dạy)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: 'Cấu trúc dữ liệu', code: 'IT001.N11', icon: Network, cap: 42, max: 60, pct: 70 },
            { title: 'Mạng máy tính', code: 'NT101.N22', icon: FileJson, cap: 58, max: 60, pct: 96 }
          ].map((cls, i) => (
            <div key={i} className="group bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-1">{cls.title}</h3>
                  <p className="text-xs font-semibold text-slate-400">{cls.code}</p>
                </div>
              </div>
              <button onClick={() => onNavigate('classlist')} className="w-full py-3.5 rounded-full border border-slate-200 text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all">Xem danh sách</button>
            </div>
          ))}
        </div>
      </section>

      {/* Administrative Classes - REAL DATA FROM API */}
      <section className="pt-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-1.5 bg-secondary-container rounded-full"></div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Lớp sinh hoạt (Cố vấn học vụ)</h2>
        </div>
        
        {loading ? <p>Đang tải dữ liệu lớp...</p> : adminClasses.length === 0 ? <p>Bạn chưa được phân công lớp nào.</p> : (
          adminClasses.map((cls, idx) => (
            <div key={idx} onClick={() => onNavigate('cohort')} className="bg-surface-container-lowest p-10 rounded-3xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all mb-8 relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 p-12 opacity-[0.02] text-primary pointer-events-none"><GraduationCap className="w-80 h-80" /></div>
              
              <div className="relative z-10">
                <div className="mb-10">
                  <h3 className="font-headline text-4xl sm:text-5xl font-black text-on-surface mb-3">{cls.code}</h3>
                  <p className="text-xl text-slate-500 font-medium">Khóa: {cls.cohort}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                  <div className="bg-surface p-6 rounded-2xl border border-slate-100/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sĩ số</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black font-serif text-primary">{cls.studentCount}</p>
                      <p className="text-sm font-semibold text-slate-500">Sinh viên</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-8 border-t border-slate-100">
                  <button onClick={(e) => { e.stopPropagation(); onNavigate('cohort'); }} className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-all">
                    Quản lý lớp này <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};