import React, { useEffect, useState } from 'react';
import { TrendingDown, Mail } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { AISupportWidget } from '../components/AISupportWidget';
import apiClient from '../lib/api';

interface AtRiskStudent {
  id: number;
  full_name: string;
  mssv: string;
  class_code: string;
  current_gpa: number;
  credit_debt: number;
}

interface KillerSubject {
  code: string;
  name: string;
  failRate: number;
  color: string;
  text: string;
}

interface PieEntry {
  name: string;
  value: number;
  color: string;
}

interface DashboardProps {
  onNavigate?: (view: string) => void;
  onMessageStudent?: (student: { id: number; name: string; mssv: string }) => void;
}

const FALLBACK_CHART: PieEntry[] = [
  { name: 'Excellent', value: 45, color: '#004ac6' },
  { name: 'Good',      value: 30, color: '#2563eb' },
  { name: 'Average',   value: 15, color: '#93c5fd' },
  { name: 'Poor',      value: 10, color: '#ba1a1a' },
];

const FALLBACK_KILLERS = [
  { name: 'Cấu trúc dữ liệu và Giải thuật', failRate: 42, color: 'bg-error',      code: 'IT003', text: 'text-error'       },
  { name: 'Mạng máy tính',                   failRate: 38, color: 'bg-error',      code: 'NT101', text: 'text-error'       },
  { name: 'Xác suất thống kê',               failRate: 29, color: 'bg-orange-500', code: 'MA003', text: 'text-orange-500'  },
  { name: 'Toán rời rạc',                    failRate: 24, color: 'bg-orange-500', code: 'MA006', text: 'text-orange-500'  },
  { name: 'Lập trình hướng đối tượng',       failRate: 18, color: 'bg-blue-500',   code: 'IT002', text: 'text-blue-500'   },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onMessageStudent }) => {
  const [riskStudents, setRiskStudents]   = useState<AtRiskStudent[]>([]);
  const [chartData, setChartData]         = useState<PieEntry[]>(FALLBACK_CHART);
  const [killerSubjects, setKillerSubjects] = useState<any[]>(FALLBACK_KILLERS);
  const [avgGpa, setAvgGpa]               = useState<number>(0);
  const [isLoading, setIsLoading]         = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        // Gọi song song 2 API
        const [studentsRes, statsRes] = await Promise.all([
          apiClient.get(`/advisor/students?advisorId=${user.id}`),
          apiClient.get(`/advisor/dashboard/stats?advisorId=${user.id}`),
        ]);

        // Lọc at-risk: GPA < 2.0 hoặc có nợ tín chỉ
        const allStudents: AtRiskStudent[] = studentsRes.data ?? [];
        const atRisk = allStudents
            .filter((s) => Number(s.current_gpa) < 2.0 || Number(s.credit_debt) > 0)
            .sort((a, b) => Number(a.current_gpa) - Number(b.current_gpa))
            .slice(0, 5);
        setRiskStudents(atRisk);

        // Stats từ /advisor/dashboard/stats
        const stats = statsRes.data;
        if (stats?.performanceDistribution?.length) setChartData(stats.performanceDistribution);
        if (stats?.killerSubjects?.length)          setKillerSubjects(stats.killerSubjects);
        if (stats?.avgGpa)                          setAvgGpa(stats.avgGpa);
      } catch (error) {
        console.error('Lỗi Dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleMessageClick = (s: AtRiskStudent) => {
    onMessageStudent?.({ id: s.id, name: s.full_name, mssv: s.mssv });
    onNavigate?.('messages');
  };

  return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
        <div className="mb-10">
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">Academic Overview</h2>
          <p className="text-on-surface-variant font-medium">Curating the student journey with precision and care at University of Information Technology.</p>
        </div>

        <div className="grid grid-cols-12 gap-8">

          {/* RED FLAGS */}
          <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-headline font-bold text-blue-900">Red Flags</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">At-Risk Student Monitoring</p>
              </div>
              <button
                  onClick={() => onNavigate?.('profiles')}
                  className="text-primary text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-surface-container/50">
                  <th className="pb-4 font-semibold">Student Name</th>
                  <th className="pb-4 font-semibold">MSSV</th>
                  <th className="pb-4 font-semibold">GPA</th>
                  <th className="pb-4 font-semibold text-center">Nợ tín chỉ</th>
                  <th className="pb-4 font-semibold text-right">Thao tác</th>
                </tr>
                </thead>
                <tbody className="text-sm">
                {isLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">Đang đồng bộ dữ liệu...</td></tr>
                ) : riskStudents.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">Không có sinh viên nguy cơ. 🎉</td></tr>
                ) : (
                    riskStudents.map((s) => {
                      const nameParts = (s.full_name || 'Anonymous').split(' ');
                      const initials = nameParts.length > 1
                          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                          : nameParts[0][0];
                      const gpa  = Number(s.current_gpa);
                      const debt = Number(s.credit_debt);
                      const isCritical = gpa < 1.5 || debt >= 12;

                      return (
                          <tr key={s.id} className="group hover:bg-surface-container-low/50 transition-colors">
                            <td className="py-4 font-semibold text-on-surface">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm uppercase ${
                                    isCritical ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                }`}>
                                  {initials}
                                </div>
                                {s.full_name}
                              </div>
                            </td>
                            <td className="py-4 text-slate-500 font-mono text-xs">{s.mssv}</td>
                            <td className="py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                              isCritical ? 'bg-error-container/50 text-error' : 'bg-orange-100/50 text-orange-700'
                          }`}>
                            {gpa.toFixed(2)} <TrendingDown className="w-3 h-3" />
                          </span>
                            </td>
                            <td className="py-4 text-center">
                              {debt > 0
                                  ? <span className={`font-mono font-bold text-sm ${isCritical ? 'text-error' : 'text-orange-600'}`}>{debt} CR</span>
                                  : <span className="text-slate-300 text-xs">—</span>
                              }
                            </td>
                            <td className="py-4 text-right">
                              <button
                                  onClick={() => handleMessageClick(s)}
                                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all inline-flex items-center gap-1 ml-auto"
                              >
                                <Mail className="w-3 h-3" /> Nhắn tin
                              </button>
                            </td>
                          </tr>
                      );
                    })
                )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PIE CHART */}
          <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-headline font-bold text-blue-900">Performance Distribution</h3>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mt-1">Học kỳ: Fall 2026 - UIT</p>
            </div>
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="relative w-48 h-48 mb-8">
                <PieChart width={192} height={192}>
                  <Pie data={chartData} innerRadius={70} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-blue-900 font-serif">
                  {avgGpa > 0 ? avgGpa.toFixed(2) : '—'}
                </span>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Avg GPA</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4">
                {chartData.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{item.name}</p>
                        <p className="text-sm font-bold text-on-surface">{item.value}%</p>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* KILLER SUBJECTS */}
          <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
            <div className="mb-10">
              <h3 className="text-xl font-headline font-bold text-blue-900">Killer Subjects</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">High Failure Rate Analysis (Current Term)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {killerSubjects.map((sub, i) => (
                  <div key={i} className="space-y-3 cursor-pointer group">
                    <div className="flex justify-between items-end">
                      <p className="text-sm font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">{sub.name}</p>
                      <span className={`text-xs font-mono font-bold ${sub.text}`}>{sub.failRate}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${sub.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${sub.failRate}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Mã môn: {sub.code}</p>
                  </div>
              ))}
            </div>
          </section>
        </div>

        <AISupportWidget />
      </div>
  );
};