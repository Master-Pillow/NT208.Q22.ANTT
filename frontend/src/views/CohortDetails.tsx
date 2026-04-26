import React, { useEffect, useState } from 'react';
import { Download, Plus, Verified, Filter, ArrowUpDown, Mail, MoreHorizontal } from 'lucide-react';
import apiClient from '../lib/api'; // Sử dụng apiClient thay vì supabase

export const CohortDetails: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gọi Database thông qua Backend Node.js khi màn hình vừa render
  useEffect(() => {
    async function fetchStudents() {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        // Gọi API lấy danh sách sinh viên thực tế
        const { data } = await apiClient.get(`/advisor/students?advisorId=${user.id}`);
        setDbStudents(data);
      } catch (error) {
        console.error("Lỗi lấy danh sách sinh viên:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">
      {/* Các thành phần Header và Thống kê */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Active Cohort</span>
          </div>
          <h2 className="font-headline text-4xl sm:text-5xl font-black text-on-surface tracking-tight mb-2">KHMT 2023.2</h2>
          <p className="text-on-surface-variant font-medium text-lg max-w-2xl">B.S. in Computer Science • Standard Program</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center px-6 py-3 bg-white rounded-full text-slate-700 font-bold text-sm shadow-sm hover:shadow-md transition-all border border-slate-200">
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          <button className="flex items-center px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all">
            <Plus className="w-4 h-4 mr-2" /> Add Note
          </button>
        </div>
      </section>

      {/* Bảng danh sách sinh viên */}
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
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Đang tải dữ liệu từ Hệ thống...</td></tr>
            ) : dbStudents.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Lớp học này chưa có sinh viên.</td></tr>
            ) : (
              dbStudents.map((student) => {
                // Ta vẫn tạo UI giả lập GPA cho đẹp vì API hiện tại chưa trả về GPA gộp chung
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