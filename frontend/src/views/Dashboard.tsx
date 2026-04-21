import React, { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { AISupportWidget } from '../components/AISupportWidget';
import { supabase } from '../lib/supabase'; // Cổng kết nối Database

export const Dashboard = () => {
  // State lưu dữ liệu sinh viên từ DB
  const [riskStudents, setRiskStudents] = useState<any[]>([]);

  // Lấy dữ liệu từ Supabase khi mở trang
  useEffect(() => {
    async function fetchRiskStudents() {
      const { data } = await supabase
        .from('students')
        .select('*')
        .limit(3); // Lấy 3 sinh viên làm ví dụ cho bảng Red Flags
      
      if (data) setRiskStudents(data);
    }
    fetchRiskStudents();
  }, []);

  // Dữ liệu cho biểu đồ (giữ nguyên đồ họa đẹp)
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
        
        {/* BẢNG RED FLAGS (ĐÃ KẾT NỐI DATABASE) */}
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
                {riskStudents.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading Database...</td></tr>
                ) : (
                  riskStudents.map((s, i) => {
                    // Trích xuất 2 chữ cái đầu của tên (Ví dụ: Nguyễn Văn A -> NA)
                    const names = s.full_name.split(' ');
                    const initials = names.length > 1 ? `${names[0][0]}${names[names.length-1][0]}` : names[0][0];
                    
                    // Thêm dữ liệu giả lập (mock) cho màu sắc và chỉ số rủi ro để UI vẫn đẹp như cũ
                    const drops = ['-0.85', '-0.42', '-1.20'];
                    const debts = ['12 CR', '4 CR', '18 CR'];
                    const colors = ['error', 'orange', 'error'];
                    const bgs = ['bg-blue-50', 'bg-slate-50', 'bg-blue-50'];
                    const texts = ['text-blue-600', 'text-slate-600', 'text-blue-600'];

                    return (
                      <tr key={s.id} className="group hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                        <td className="py-4 font-semibold text-on-surface flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${bgs[i%3]} flex items-center justify-center ${texts[i%3]} font-bold text-xs shadow-sm uppercase`}>
                            {initials}
                          </div>
                          {s.full_name}
                        </td>
                        <td className="py-4 text-slate-500 font-mono text-xs">{s.mssv}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2 py-1 ${colors[i%3] === 'error' ? 'bg-error-container/50 text-error' : 'bg-orange-100/50 text-orange-700'} rounded-full text-[10px] font-bold`}>
                            {drops[i%3]} <TrendingDown className="w-3 h-3 ml-1" />
                          </span>
                        </td>
                        <td className={`py-4 text-right font-mono ${colors[i%3] === 'error' ? 'text-error' : 'text-orange-600'} font-bold`}>
                          {debts[i%3]}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* BIỂU ĐỒ TRÒN (PIE CHART) */}
        <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-headline font-bold text-blue-900">Performance Distribution</h3>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mt-1">Class: Advanced Rhetoric - Fall 2026</p>
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

        {/* MÔN HỌC ĐIỂM LIỆT (KILLER SUBJECTS) */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
          <div className="mb-10">
            <h3 className="text-xl font-headline font-bold text-blue-900">Killer Subjects</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">High Failure Rate Analysis (Current Term)</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {[
              { name: 'Advanced Calculus II', value: 42, color: 'bg-error', code: 'MATH402', text: 'text-error' },
              { name: 'Organic Chemistry', value: 38, color: 'bg-error', code: 'CHEM301', text: 'text-error' },
              { name: 'Quantum Physics', value: 29, color: 'bg-orange-500', code: 'PHYS410', text: 'text-orange-500' },
              { name: 'Microeconomics', value: 24, color: 'bg-orange-500', code: 'ECON202', text: 'text-orange-500' },
              { name: 'Data Structures', value: 18, color: 'bg-blue-500', code: 'CS201', text: 'text-blue-500' },
            ].map((sub, i) => (
              <div key={i} className="space-y-3 cursor-pointer group">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">{sub.name}</p>
                  <span className={`text-xs font-mono font-bold ${sub.text}`}>{sub.value}%</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full ${sub.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${sub.value}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Code: {sub.code}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      {/* Widget AI */}
      <AISupportWidget />
    </div>
  );
};