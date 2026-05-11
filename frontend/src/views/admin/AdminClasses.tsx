import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Link2, Trash2 } from 'lucide-react';
import apiClient from '../../lib/api';

export const AdminClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assign Form
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, advRes] = await Promise.all([
        apiClient.get('/admin/classes'),
        apiClient.get('/admin/advisors') // Reuse route to get list of advisors
      ]);
      setClasses(classRes.data);
      setAdvisors(advRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedAdvisor) return alert('Vui lòng chọn Lớp và Cố vấn!');
    try {
      setAssigning(true);
      await apiClient.post('/admin/assign', { advisor_id: selectedAdvisor, class_code: selectedClass });
      setSelectedClass('');
      setSelectedAdvisor('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi phân công lớp.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (advisor_id: number, class_code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ cố vấn khỏi lớp ${class_code}?`)) return;
    try {
      await apiClient.delete('/admin/assign', { data: { advisor_id, class_code } });
      fetchData();
    } catch (err: any) {
      alert('Lỗi khi gỡ phân công.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div>
        <h2 className="text-4xl font-headline font-black text-on-surface mb-2">Phân công Lớp học</h2>
        <p className="text-slate-500 font-medium">Gán Cố vấn học vụ cho từng lớp sinh hoạt tương ứng.</p>
      </div>

      {/* Form Phân Công */}
      <form onSubmit={handleAssign} className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Chọn Lớp Sinh Hoạt</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-primary/50">
            <option value="">-- Chọn mã lớp --</option>
            {classes.map(c => <option key={c.code} value={c.code}>{c.code} (Khóa {c.cohort})</option>)}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Chọn Cố vấn</label>
          <select value={selectedAdvisor} onChange={(e) => setSelectedAdvisor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-primary/50">
            <option value="">-- Chọn giảng viên --</option>
            {advisors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={assigning} className="bg-primary text-white px-8 py-3.5 rounded-2xl font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 w-full md:w-auto justify-center">
          {assigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />} Phân công
        </button>
      </form>

      {/* Bảng Danh sách Lớp */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400">Mã Lớp</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 text-center">Khóa</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 text-center">Sĩ số</th>
                <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400">Cố vấn Phụ trách</th>
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((cls) => (
                <tr key={cls.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-800 text-lg">{cls.code}</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-500">{cls.cohort}</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-500">{Number(cls.student_count || 0)}</td>
                  <td className="px-6 py-5">
                    {cls.advisor_name ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{cls.advisor_name}</span>
                        <span className="text-[10px] text-slate-400">{cls.advisor_email}</span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg inline-block">Chưa có cố vấn</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    {cls.advisor_id && (
                      <button onClick={() => handleRemove(cls.advisor_id, cls.code)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-flex">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};