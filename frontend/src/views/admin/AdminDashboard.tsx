import React, { useEffect, useState } from 'react';
import { Users, BookOpen, AlertTriangle, GraduationCap, AlertCircle, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../../lib/api';
import { AdminAnalytics } from './AdminAnalytics';

const COLORS = ['#004ac6', '#2563eb', '#93c5fd', '#ba1a1a'];

export const AdminDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/admin/overview');
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải dữ liệu tổng quan.');
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-primary gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-bold">Đang tải dữ liệu tổng quan...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 text-red-600 bg-red-50 p-6 rounded-2xl border border-red-100">
        <AlertCircle className="w-6 h-6" />
        <span className="font-bold">{error}</span>
      </div>
    );
  }

  const pieData = data?.gpaDistribution ? [
    { name: 'Xuất sắc', value: Number(data.gpaDistribution.excellent || 0) },
    { name: 'Khá/Giỏi', value: Number(data.gpaDistribution.good || 0) },
    { name: 'Trung bình', value: Number(data.gpaDistribution.average || 0) },
    { name: 'Nguy cơ', value: Number(data.gpaDistribution.poor || 0) },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div>
        <h2 className="text-4xl font-headline font-black text-on-surface mb-2">Tổng quan Hệ thống</h2>
        <p className="text-slate-500 font-medium">Bảng điều khiển dành cho Ban Quản trị Đại học Công nghệ Thông tin.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tổng Cố vấn', value: data?.totalAdvisors, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Tổng Lớp', value: data?.totalClasses, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Tổng Sinh viên', value: data?.totalStudents, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'SV Nguy cơ (At-risk)', value: data?.atRiskStudents, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((card, idx) => (
          <div key={idx} className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${card.bg} ${card.color}`}>
              <card.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{card.value || 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GPA Chart */}
        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 lg:col-span-1">
          <h3 className="text-xl font-headline font-bold text-slate-800 mb-6">Phân bố GPA Toàn trường</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                {item.name}: {item.value}
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 At-Risk Advisors */}
        <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 lg:col-span-2 flex flex-col">
          <h3 className="text-xl font-headline font-bold text-slate-800 mb-6">Cố vấn Cần Lưu ý (GPA Sinh viên thấp nhất)</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="pb-4">Họ tên Cố vấn</th>
                  <th className="pb-4 text-center">Số Lớp</th>
                  <th className="pb-4 text-center">GPA TB</th>
                  <th className="pb-4 text-right">SV Nguy cơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.topAtRiskAdvisors || []).map((adv: any) => (
                  <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                        {adv.full_name.charAt(0)}
                      </div>
                      <div>
                        <p>{adv.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{adv.email}</p>
                      </div>
                    </td>
                    <td className="py-4 text-center font-semibold text-slate-600">{Number(adv.class_count)}</td>
                    <td className="py-4 text-center font-bold text-red-500">{Number(adv.avg_gpa).toFixed(2)}</td>
                    <td className="py-4 text-right">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {Number(adv.at_risk_count)} SV
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Phân tích chuyên sâu: toàn trường (T1–T4) + theo khoá (K1–K4) + AI */}
      <AdminAnalytics />
    </div>
  );
};