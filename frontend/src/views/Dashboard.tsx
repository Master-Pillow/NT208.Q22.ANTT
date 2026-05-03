import React, { useEffect, useState } from 'react';
import { TrendingDown, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { AISupportWidget } from '../components/AISupportWidget';
import apiClient from '../lib/api';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface PerformanceBucket {
  name:  string;
  value: number;
  color: string;
  raw:   number;
}

interface KillerSubject {
  code:      string;
  name:      string;
  failRate:  number;
  failCount: number;
  total:     number;
  color:     string;
  text:      string;
}

interface DashboardStats {
  performanceDistribution: PerformanceBucket[];
  killerSubjects:          KillerSubject[];
  avgGpa:                  number;
  totalStudents:           number;
}

interface RiskStudent {
  id:          number;
  full_name:   string;
  mssv:        string;
  current_gpa: number;
  credit_debt: number;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const [riskStudents,      setRiskStudents]      = useState<RiskStudent[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [studentsError,     setStudentsError]     = useState('');

  const [stats,          setStats]          = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError,     setStatsError]     = useState('');

  // ─────────────────────────────────────────────────────────────
  // Fetch 1: At-risk students
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRiskStudents() {
      try {
        setIsLoadingStudents(true);
        setStudentsError('');

        const { data } = await apiClient.get('/advisor/students');

        if (data && Array.isArray(data)) {
          // Ép kiểu về number trước khi sort
          const mapped = [...data].map((s: any) => ({
            ...s,
            current_gpa: Number(s.current_gpa),
            credit_debt: Number(s.credit_debt),
          }));
          const sorted = mapped.sort((a: RiskStudent, b: RiskStudent) => {
            if (b.credit_debt !== a.credit_debt) return b.credit_debt - a.credit_debt;
            return a.current_gpa - b.current_gpa;
          });
          setRiskStudents(sorted.slice(0, 3));
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching risk students:', err);
        setStudentsError('Không thể tải danh sách sinh viên rủi ro.');
      } finally {
        setIsLoadingStudents(false);
      }
    }

    fetchRiskStudents();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Fetch 2: Aggregated stats
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setIsLoadingStats(true);
        setStatsError('');

        const { data } = await apiClient.get('/advisor/dashboard/stats');
        setStats(data);
      } catch (err) {
        console.error('[Dashboard] Error fetching stats:', err);
        setStatsError('Không thể tải thống kê dashboard.');
      } finally {
        setIsLoadingStats(false);
      }
    }

    fetchDashboardStats();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────
  const getGpaDropDisplay = (gpa: number) => {
    const drop = (4.0 - Number(gpa)).toFixed(2);
    return `-${drop}`;
  };

  const isErrorRow = (i: number) => i % 2 === 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div className="mb-10">
        <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">
          Academic Overview
        </h2>
        <p className="text-on-surface-variant font-medium">
          Curating the student journey with precision and care at University of Information Technology.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">

        {/* RED FLAGS TABLE */}
        <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-headline font-bold text-blue-900">Red Flags</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">At-Risk Student Monitoring</p>
            </div>
            <button className="text-primary text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity cursor-pointer">
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
                {isLoadingStudents ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Đang đồng bộ dữ liệu từ Server...
                    </td>
                  </tr>
                ) : studentsError ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      <span className="inline-flex items-center gap-2 text-red-500 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        {studentsError}
                      </span>
                    </td>
                  </tr>
                ) : riskStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Không có sinh viên rủi ro nào.
                    </td>
                  </tr>
                ) : (
                  riskStudents.map((s, i) => {
                    const nameParts = (s.full_name || 'Anonymous').split(' ');
                    const initials = nameParts.length > 1
                      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                      : nameParts[0][0];
                    const isErr = isErrorRow(i);

                    return (
                      <tr
                        key={s.id}
                        className="group hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                      >
                        <td className="py-4 font-semibold text-on-surface flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${isErr ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'} flex items-center justify-center font-bold text-xs shadow-sm uppercase`}
                          >
                            {initials}
                          </div>
                          {s.full_name}
                        </td>
                        <td className="py-4 text-slate-500 font-mono text-xs">{s.mssv}</td>
                        <td className="py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 ${isErr ? 'bg-error-container/50 text-error' : 'bg-orange-100/50 text-orange-700'} rounded-full text-[10px] font-bold`}
                          >
                            {getGpaDropDisplay(s.current_gpa)}
                            <TrendingDown className="w-3 h-3 ml-1" />
                          </span>
                        </td>
                        <td
                          className={`py-4 text-right font-mono ${isErr ? 'text-error' : 'text-orange-600'} font-bold`}
                        >
                          {s.credit_debt > 0 ? `${s.credit_debt} CR` : '—'}
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
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.1em] mt-1">
              Học kỳ: Fall 2026 - UIT
            </p>
          </div>

          <div className="flex flex-col items-center justify-center flex-1">
            {isLoadingStats ? (
              <div className="flex items-center gap-3 text-slate-400 py-12">
                <span className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                <span className="text-sm font-medium">Đang tải biểu đồ...</span>
              </div>
            ) : statsError ? (
              <div className="flex items-center gap-2 text-red-400 text-xs font-semibold py-12">
                <AlertCircle className="w-4 h-4" />
                {statsError}
              </div>
            ) : stats ? (
              <>
                <div className="relative w-48 h-48 mb-8">
                  <PieChart width={192} height={192}>
                    <Pie
                      data={stats.performanceDistribution}
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.performanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-blue-900 font-serif">
                      {Number(stats.avgGpa).toFixed(2)}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">
                      Avg GPA
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4">
                  {stats.performanceDistribution.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span
                        className="w-2 h-2 rounded-full shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                          {item.name}
                        </p>
                        <p className="text-sm font-bold text-on-surface">{item.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* KILLER SUBJECTS */}
        <section className="col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100">
          <div className="mb-10">
            <h3 className="text-xl font-headline font-bold text-blue-900">Killer Subjects</h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              High Failure Rate Analysis (Current Term)
            </p>
          </div>

          {isLoadingStats ? (
            <div className="flex items-center gap-3 text-slate-400 py-4">
              <span className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
              <span className="text-sm font-medium">Đang phân tích dữ liệu...</span>
            </div>
          ) : statsError ? (
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold py-4">
              <AlertCircle className="w-4 h-4" />
              {statsError}
            </div>
          ) : stats?.killerSubjects && stats.killerSubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {stats.killerSubjects.map((sub, i) => (
                <div key={i} className="space-y-3 cursor-pointer group">
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">
                      {sub.name}
                    </p>
                    <span className={`text-xs font-mono font-bold ${sub.text}`}>
                      {sub.failRate}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full ${sub.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.min(sub.failRate, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                    Mã môn: {sub.code}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Chưa có dữ liệu môn học rủi ro.</p>
          )}
        </section>

      </div>

      {/* AI Support Widget */}
      <AISupportWidget />
    </div>
  );
};