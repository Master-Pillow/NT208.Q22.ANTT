import React, { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { AISupportWidget } from '../components/AISupportWidget';
import apiClient from '../lib/api'; // Sử dụng trung tâm API đã cấu hình

export const Dashboard = () => {
  // State lưu dữ liệu sinh viên lấy từ Backend Node.js
  const [riskStudents, setRiskStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lấy dữ liệu từ Backend khi mở trang
  useEffect(() => {
    async function fetchRiskStudents() {
      try {
        setIsLoading(true);
        
        // 1. Lấy thông tin cố vấn từ LocalStorage
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        // 2. Gọi API lấy danh sách sinh viên thuộc quyền quản lý của cố vấn này
        // Backend sẽ lấy dữ liệu từ Postgres (Supabase) và trả về thông qua Node.js
        const { data } = await apiClient.get(`/advisor/students?advisorId=${user.id}`);
        
        // 3. Cập nhật state (Lấy 3 bạn đầu tiên để hiển thị ở mục Red Flags)
        if (data) {
          setRiskStudents(data.slice(0, 3));
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Backend:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRiskStudents();
  }, []);

  // Dữ liệu cho biểu đồ tròn (Vẫn giữ nguyên để UI đẹp)
  const chartData = [
    { name: 'Excellent', value: 45, color: '#004ac6' },
    { name: 'Good', value: 30, color: '#2563eb' },
    { name: 'Average', value: 15, color: '#93c5fd' },
    { name: 'Poor', value: 10, color: '#ba1a1a' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div className="mb-10">
        <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">Academic Overview</h2>
        <p className="text-on-surface-variant font-medium">Curating the student journey with precision and care at University of Information Technology.</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* BẢNG RED FLAGS (ĐÃ CHUYỂN SANG MÓC API BACKEND) */}
        <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold text-blue-900">Red Flags</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">At-Risk Student Monitoring</p>
            </div>
            <button className="text-primary text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity cursor-pointer">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-surface-container/50">
                  <th className="pb-4 font-semibold">Student Name</th>
                  <th className="pb-4 font-semibold">Student ID</th>
                  <th className="pb-4 font-semibold">GPA Drop</th>
                  <th className="pb-4 font-semibold text-right">Credit Debt</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {isLoading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Đang đồng bộ dữ liệu từ Server...</td></tr>
                ) : riskStudents.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Không có dữ liệu rủi ro.</td></tr>
                ) : (
                  riskStudents.map((s, i) => {
                    // Logic tạo Avatar initials
                    const nameParts = (s.full_name || 'Anonymous').split(' ');
                    const initials = nameParts.length > 1 
                      ? `${nameParts[0][0]}${nameParts[nameParts.length-1][0]}` 
                      : nameParts[0][0];
                    
                    // Mock data cho các chỉ số chưa có trong API danh sách
                    const drops = ['-0.85', '-0.42', '-1.20'];
                    const debts = ['12 CR', '4 CR', '18 CR'];
                    const isError = i % 2 === 0;

                    return (
                      <tr key={s.id} className="group hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                        <td className="py-4 font-semibold text-on-surface flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${isError ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'} flex items-center justify-center font-bold text-xs shadow-sm uppercase`}>
                            {initials}
                          </div>
                          {s.full_name}
                        </td>
                        <td className="py-4 text-slate-500 font-mono text-xs">{s.mssv}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2 py-1 ${isError ? 'bg-error-container/50 text-error' : 'bg-orange-100/50 text-orange-700'} rounded-full text-[10px] font-bold`}>
                            {drops[i % drops.length]} <TrendingDown className="w-3 h-3 ml-1" />
                          </span>
                        </td>
                        <td className={`py-4 text-right font-mono ${isError ? 'text-error' : 'text-orange-600'} font-bold`}>
                          {debts[i % debts.length]}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* BIỂU ĐỒ TRÒN (PIE CHART) - GIỮ NGUYÊN UI */}
        <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-headline font-bold text-blue-900">Performance Distribution</h3>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mt-1">Học kỳ: Fall 2026 - UIT</p>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="relative w-48 h-48 mb-8">
              <PieChart width={192} height={192}>
                <Pie
                  data={chartData}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-blue-900 font-serif">3.42</span>
                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Avg GPA</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4">
              {chartData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{item.name}</p>
                    <p className="text-sm font-bold text-on-surface">{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MÔN HỌC ĐIỂM LIỆT (KILLER SUBJECTS) - GIỮ NGUYÊN UI */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
          <div className="mb-10">
            <h3 className="text-xl font-headline font-bold text-blue-900">Killer Subjects</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">High Failure Rate Analysis (Current Term)</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {[
              { name: 'Cấu trúc dữ liệu và Giải thuật', value: 42, color: 'bg-error', code: 'IT003', text: 'text-error' },
              { name: 'Mạng máy tính', value: 38, color: 'bg-error', code: 'NT101', text: 'text-error' },
              { name: 'Xác suất thống kê', value: 29, color: 'bg-orange-500', code: 'MA003', text: 'text-orange-500' },
              { name: 'Toán rời rạc', value: 24, color: 'bg-orange-500', code: 'MA006', text: 'text-orange-500' },
              { name: 'Lập trình hướng đối tượng', value: 18, color: 'bg-blue-500', code: 'IT002', text: 'text-blue-500' },
            ].map((sub, i) => (
              <div key={i} className="space-y-3 cursor-pointer group">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">{sub.name}</p>
                  <span className={`text-xs font-mono font-bold ${sub.text}`}>{sub.value}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full ${sub.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${sub.value}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Mã môn: {sub.code}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      {/* Widget AI trợ giúp */}
      <AISupportWidget />
    </div>
  );
};