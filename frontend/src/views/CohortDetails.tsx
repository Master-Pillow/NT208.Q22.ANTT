import React, { useEffect, useState } from 'react';
<<<<<<< Updated upstream
import { Download, Plus, Verified, Filter, ArrowUpDown, Mail, MoreHorizontal } from 'lucide-react';
import apiClient from '../lib/api'; // Sử dụng apiClient thay vì supabase

export const CohortDetails: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
=======
import { Download, Plus, AlertCircle, ArrowLeft, GraduationCap, Users, Loader2 } from 'lucide-react';

interface Student {
  id:         number;
  full_name:  string;
  mssv:       string;
  gpa:        number;
  fail_count: number;
}

interface ClassInfo {
  code:          string;
  name:          string;
  cohort:        string;
  program:       string;
  advisor_name:  string;
  advisor_email: string;
}

interface Props {
  classCode?:        string | null;
  onNavigate?:       (view: string) => void;
  onSelectStudent?:  (studentId: string) => void;
}

const gpaColor = (g: number) =>
    g >= 3.5 ? 'text-emerald-600' : g >= 2.5 ? 'text-blue-600' : g >= 2.0 ? 'text-amber-600' : 'text-red-600';

const gpaBarColor = (g: number) =>
    g >= 2.0 ? 'bg-primary' : 'bg-red-500';

const isAtRisk = (s: Student) => s.gpa < 2.0 || s.fail_count > 0;

export const CohortDetails: React.FC<Props> = ({ classCode, onNavigate, onSelectStudent }) => {
  const [classInfo, setClassInfo]   = useState<ClassInfo | null>(null);
  const [students, setStudents]     = useState<Student[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
>>>>>>> Stashed changes

  // Gọi Database thông qua Backend Node.js khi màn hình vừa render
  useEffect(() => {
<<<<<<< Updated upstream
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
=======
    if (!classCode) return;
    setLoading(true); setError(''); setClassInfo(null); setStudents([]);
    fetch(`http://localhost:4000/classes/${classCode}`)
        .then(r => r.json())
        .then(data => {
          if (data.message) throw new Error(data.message);
          setClassInfo(data.classInfo);
          setStudents(data.students ?? []);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
  }, [classCode]);

  // Chưa chọn lớp nào
  if (!classCode) return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-slate-400">
        <Users className="w-16 h-16 opacity-30" />
        <p className="font-semibold">Chọn một lớp để xem chi tiết</p>
        <p className="text-sm">Dùng thanh tìm kiếm hoặc chọn từ danh sách lớp</p>
      </div>
  );

  if (loading) return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" /><span>Đang tải dữ liệu lớp...</span>
      </div>
  );

  if (error) return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-red-400">
        <AlertCircle className="w-10 h-10" /><p className="font-semibold">{error}</p>
      </div>
  );
>>>>>>> Stashed changes

  return (
<<<<<<< Updated upstream
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
=======
      <div className="space-y-10 animate-in fade-in duration-500 pt-2 pb-12 max-w-7xl mx-auto xl:mx-0">

        {/* Back + Header */}
        <section>
          <button
              onClick={() => onNavigate?.('profiles')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {classInfo?.program ?? 'Lớp học'}
              </span>
              </div>
              <h2 className="font-headline text-4xl sm:text-5xl font-black text-on-surface tracking-tight mb-2">
                {classInfo?.code ?? classCode}
              </h2>
              {classInfo?.name && (
                  <p className="text-on-surface-variant font-medium text-lg max-w-2xl">{classInfo.name}</p>
              )}
              {classInfo?.advisor_name && (
                  <p className="text-sm text-slate-500 mt-1">
                    Cố vấn: <span className="font-semibold text-slate-700">{classInfo.advisor_name}</span>
                    {' · '}<span className="text-slate-400">{classInfo.advisor_email}</span>
                  </p>
              )}

              {/* Stat badges */}
              <div className="flex items-center gap-3 mt-4">
              <span className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700">
                {onTrackCount} On Track
              </span>
                {atRiskCount > 0 && (
                    <span className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-red-100 text-red-700">
                  {atRiskCount} At Risk
                </span>
                )}
                <span className="text-xs font-semibold text-slate-400">
                {students.length} sinh viên
              </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="flex items-center px-6 py-3 bg-white rounded-full text-slate-700 font-bold text-sm shadow-sm hover:shadow-md transition-all border border-slate-200">
                <Download className="w-4 h-4 mr-2" /> Export
              </button>
              <button className="flex items-center px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" /> Add Note
              </button>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
              <tr className="bg-slate-50 border-b border-slate-100/80">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Họ và tên</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">MSSV</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">GPA</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Môn rớt</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Trạng thái</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Hồ sơ</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                      Lớp học này chưa có sinh viên.
>>>>>>> Stashed changes
                    </td>
                  </tr>
              ) : students.map((student) => {
                const risk = isAtRisk(student);
                return (
                    <tr
                        key={student.id}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => onSelectStudent?.(String(student.id))}
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm shadow-sm ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                            {student.full_name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                              {student.full_name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{student.mssv}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 font-mono tracking-tight">
                        {student.mssv}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-10 shrink-0 ${gpaColor(student.gpa)}`}>
                          {Number(student.gpa).toFixed(2)}
                        </span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${gpaBarColor(student.gpa)}`}
                                style={{ width: `${Math.min((student.gpa / 4) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {student.fail_count > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600">
                          {student.fail_count} môn
                        </span>
                        ) : (
                            <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                      <span className={`px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
                          risk ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {risk ? 'At Risk' : 'On Track'}
                      </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelectStudent?.(String(student.id)); }}
                            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <GraduationCap className="w-3.5 h-3.5" /> Xem hồ sơ
                        </button>
                      </td>
                    </tr>
                );
<<<<<<< Updated upstream
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
=======
              })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
>>>>>>> Stashed changes
  );
};