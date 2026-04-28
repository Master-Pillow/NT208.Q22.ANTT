import React, { useEffect, useState } from 'react';
import { Download, Filter, ArrowUpDown, Mail, MoreHorizontal, ArrowLeft, Network } from 'lucide-react';
import apiClient from '../lib/api';

export const ClassList: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassList() {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        const { data } = await apiClient.get(`/advisor/students?advisorId=${user.id}`);
        setStudents(data);
      } catch (error) {
        console.error("Lỗi lấy danh sách sinh viên:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchClassList();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button onClick={() => onNavigate && onNavigate('profiles')} className="flex items-center text-sm font-semibold text-slate-500 hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-primary/10 text-primary p-3 rounded-2xl"><Network className="w-6 h-6" /></div>
            <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Danh sách Sinh viên</h2>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">Họ và Tên</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">MSSV</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-center">Lớp</th>
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={4} className="text-center py-8">Đang tải dữ liệu...</td></tr>
              ) : students.length === 0 ? (
                 <tr><td colSpan={4} className="text-center py-8">Chưa có dữ liệu sinh viên.</td></tr>
              ) : (
                students.map((student, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200">
                          <img src={`https://i.pravatar.cc/100?img=${student.id % 70}`} alt={student.full_name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.full_name}</p>
                          <p className="text-[11px] text-slate-500">{student.mssv}@uit.edu.vn</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-600 font-mono">{student.mssv}</td>
                    <td className="px-6 py-5 text-center text-sm font-bold text-primary">{student.class_code}</td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => onNavigate && onNavigate('messages')} className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center shadow-sm ml-auto">
                        <Mail className="w-3.5 h-3.5 mr-1.5" /> Nhắn tin
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};