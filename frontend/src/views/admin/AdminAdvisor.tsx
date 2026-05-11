import React, { useEffect, useState } from 'react';
import { Plus, Search, Loader2, AlertCircle, X } from 'lucide-react';
import apiClient from '../../lib/api';

export const AdminAdvisors = () => {
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });

  const fetchAdvisors = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/advisors');
      setAdvisors(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải danh sách cố vấn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await apiClient.post('/admin/advisors', formData);
      setShowModal(false);
      setFormData({ email: '', password: '', full_name: '' });
      fetchAdvisors(); // Reload list
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi khi tạo cố vấn mới.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface mb-2">Danh sách Cố vấn</h2>
          <p className="text-slate-500 font-medium">Quản lý tài khoản và theo dõi hiệu suất đội ngũ cố vấn học vụ.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="w-5 h-5" /> Thêm Cố vấn
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl"><AlertCircle /> {error}</div>
      ) : (
        <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400">Họ tên Cố vấn</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400">Email</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 text-center">Số Lớp</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 text-center">Số SV</th>
                  <th className="px-6 py-5 text-[10px] uppercase font-bold text-slate-400 text-center">GPA TB</th>
                  <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advisors.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 flex items-center gap-4">
                      <img src={`https://i.pravatar.cc/100?u=${adv.email}`} alt="avatar" className="w-10 h-10 rounded-full shadow-sm" />
                      <span className="font-bold text-slate-800">{adv.full_name}</span>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-500">{adv.email}</td>
                    <td className="px-6 py-5 text-center font-bold text-slate-700">{Number(adv.class_count)}</td>
                    <td className="px-6 py-5 text-center font-bold text-slate-700">{Number(adv.student_count)}</td>
                    <td className="px-6 py-5 text-center font-black text-primary">{Number(adv.avg_gpa).toFixed(2)}</td>
                    <td className="px-8 py-5 text-right">
                      <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">Chi tiết</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Thêm Cố Vấn */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-headline font-black text-slate-800">Thêm Cố vấn mới</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Họ và Tên</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="VD: TS. Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Email UIT</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="email@uit.edu.vn" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Mật khẩu</label>
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Nhập mật khẩu" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors">Hủy</button>
                <button type="submit" disabled={creating} className="flex-1 py-3.5 font-bold bg-primary text-white rounded-2xl shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />} Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};