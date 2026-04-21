import React, { useEffect, useState } from 'react';
import { Download, Plus, Verified, Filter, ArrowUpDown, Mail, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Import supabase client

export const CohortDetails: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  // State lưu dữ liệu thật
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gọi Database khi màn hình vừa render
  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .like('mssv', 'FAKE%') // Lấy sinh viên test
        .limit(10); // Lấy 10 người cho nhẹ giao diện

      if (data) {
        setDbStudents(data);
      }
      setLoading(false);
    }
    fetchStudents();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">
      {/* ... Giữ nguyên phần Header và 4 ô Thống kê (Section 1 & 2) ở đây ... */}
      
      <section className="bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100/80">
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Name</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student ID</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">GPA (Mock)</th>
              <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Đang tải dữ liệu từ Supabase...</td></tr>
            ) : (
              dbStudents.map((student, i) => {
                // Tạo data UI giả định dựa trên sinh viên thật
                const fakeGpa = (Math.random() * (4.0 - 2.0) + 2.0).toFixed(2);
                const isAtRisk = parseFloat(fakeGpa) < 2.5;

                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-200 shadow-sm ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                          {/* Lấy ảnh ngẫu nhiên theo ID để UI sinh động */}
                          <img src={`https://i.pravatar.cc/100?img=${(student.id % 70) + 1}`} alt={student.full_name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.full_name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold tracking-wide">{student.mssv}@uit.edu.vn</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-600 font-mono tracking-tight">{student.mssv}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-slate-900 w-8">{fakeGpa}</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${isAtRisk ? 'bg-error' : 'bg-primary'} rounded-full`} style={{ width: `${(parseFloat(fakeGpa)/4)*100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${isAtRisk ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isAtRisk ? 'At Risk' : 'On Track'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          onClick={() => onNavigate && onNavigate('messages')}
                          className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center shadow-sm cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 mr-1.5" /> Message
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};