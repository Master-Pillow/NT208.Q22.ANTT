import React, { useEffect, useState } from 'react';
import { Download, Plus, AlertCircle } from 'lucide-react';
import apiClient from '../lib/api';

interface Student {
  id:          number;
  full_name:   string;
  mssv:        string;
  class_code:  string;
  cohort:      string;
  current_gpa: number;
  credit_debt: number;
}

const isAtRisk = (student: Student): boolean =>
  Number(student.current_gpa) < 2.5 || Number(student.credit_debt) > 0;

const formatGpa = (gpa: number): string =>
  !isNaN(Number(gpa)) ? Number(gpa).toFixed(2) : '—';

const gpaToPercent = (gpa: number): number =>
  Math.min(Math.round((Number(gpa) / 4.0) * 100), 100);

export const CohortDetails: React.FC<{ onNavigate?: (view: string) => void }> = ({
  onNavigate,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);
        setError('');
        const { data } = await apiClient.get('/advisor/students');
        const mapped = (data ?? []).map((s: any) => ({
          ...s,
          current_gpa: Number(s.current_gpa),
          credit_debt: Number(s.credit_debt),
        }));
        setStudents(mapped);
      } catch (err) {
        console.error('[CohortDetails] Error fetching students:', err);
        setError('Không thể tải danh sách sinh viên. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const atRiskCount  = students.filter(isAtRisk).length;
  const onTrackCount = students.length - atRiskCount;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">

      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Active Cohort</span>
          </div>
          <h2 className="font-headline text-4xl sm:text-5xl font-black text-on-surface tracking-tight mb-2">
            KHMT 2023.2
          </h2>
          <p className="text-on-surface-variant font-medium text-lg max-w-2xl">
            B.S. in Computer Science • Standard Program
          </p>
          {!loading && !error && (
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
                {students.length} Sinh viên tổng
              </span>
            </div>
          )}
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

      {/* Table */}
      <section className="bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100/80">
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Name</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student ID</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">GPA (Live)</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Credit Debt</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                      <span className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm font-medium">Đang tải dữ liệu từ Hệ thống...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-red-500">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold">{error}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && !error && students.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    Lớp học này chưa có sinh viên.
                  </td>
                </tr>
              )}

              {!loading && !error && students.map((student) => {
                const risk = isAtRisk(student);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-200 shadow-sm ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                          <img
                            src={`https://i.pravatar.cc/100?img=${(student.id % 70) + 1}`}
                            alt={student.full_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.full_name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
                            {student.mssv}@uit.edu.vn
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-600 font-mono tracking-tight">
                      {student.mssv}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-slate-900 w-10 shrink-0">
                          {formatGpa(student.current_gpa)}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${risk ? 'bg-error' : 'bg-primary'}`}
                            style={{ width: `${gpaToPercent(student.current_gpa)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {student.credit_debt > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600">
                          {student.credit_debt} CR
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${risk ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {risk ? 'At Risk' : 'On Track'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => onNavigate && onNavigate('messages')}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center shadow-sm cursor-pointer ml-auto"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                        Message
                      </button>
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};