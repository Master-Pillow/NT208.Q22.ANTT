import React from 'react';
import { Download, Plus, Filter, ArrowUpDown, Mail, MoreHorizontal, ArrowLeft, Network } from 'lucide-react';

export const ClassList: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pt-8 pb-12 max-w-7xl mx-auto xl:mx-0">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button 
            onClick={() => onNavigate && onNavigate('profiles')}
            className="flex items-center text-sm font-semibold text-slate-500 hover:text-primary mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Profiles
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-primary/10 text-primary p-3 rounded-2xl">
              <Network className="w-6 h-6" />
            </div>
            <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Data Structures</h2>
          </div>
          <p className="text-on-surface-variant font-medium text-lg max-w-2xl mt-2">Section 01 • IT001.N11 | Room C.203 | Mon, Thu</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center px-6 py-3 bg-white rounded-full text-primary font-bold text-sm shadow-sm hover:shadow-md transition-all border border-slate-200 cursor-pointer">
            <Download className="w-4 h-4 mr-2" />
            Export List
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 group-hover:text-primary transition-colors">Enrolled</p>
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-5xl font-black text-on-surface">42</p>
            <span className="text-sm font-semibold text-slate-500">/ 60</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 group-hover:text-primary transition-colors">Average Score</p>
          <p className="font-serif text-5xl font-black text-on-surface">8.4<span className="text-lg text-slate-400 font-sans font-medium">/10</span></p>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 group-hover:text-primary transition-colors">At Risk</p>
          <p className="font-serif text-5xl font-black text-error">3</p>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 relative overflow-hidden group">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 group-hover:text-primary transition-colors">Lecturer</p>
          <p className="text-xl font-bold text-on-surface mt-2">Dr. Alan Turing</p>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_50px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container/50 bg-slate-50/50">
          <h3 className="font-headline text-2xl font-bold text-slate-900 border-l-4 border-primary pl-4">Class Roster</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search students..." 
                className="w-full md:w-64 bg-white border border-slate-200 rounded-full pl-5 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              />
            </div>
            <button className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100/80 cursor-pointer hover:bg-slate-50 group">
                  <div className="flex items-center">Student <ArrowUpDown className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100/80">ID Number</th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100/80 cursor-pointer hover:bg-slate-50 group">
                  <div className="flex items-center">Midterm <ArrowUpDown className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                </th>
                <th className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100/80 text-center">Status</th>
                <th className="px-8 py-5 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100/80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'Hoang Phuc Nguyen', email: 'phuc.nh23@uit.edu.vn', id: '23520104', score: '9.5', status: 'Excellent', bg: 'bg-green-100', text: 'text-green-700', img: 12 },
                { name: 'Thanh Hang Le', email: 'hang.lt23@uit.edu.vn', id: '23520082', score: '8.0', status: 'Good', bg: 'bg-blue-100', text: 'text-blue-700', img: 5 },
                { name: 'Minh Quan Tran', email: 'quan.tm23@uit.edu.vn', id: '23520115', score: '4.5', status: 'At Risk', bg: 'bg-red-100', text: 'text-red-700', img: 33 },
                { name: 'Bao Ngoc Pham', email: 'ngoc.pb23@uit.edu.vn', id: '23520140', score: '8.5', status: 'Good', bg: 'bg-blue-100', text: 'text-blue-700', img: 21 },
                { name: 'Marcus Miller', email: 'marcus.m23@uit.edu.vn', id: '23520102', score: '7.0', status: 'Average', bg: 'bg-slate-100', text: 'text-slate-700', img: 68 },
              ].map((student, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shadow-sm ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                        <img src={`https://i.pravatar.cc/100?img=${student.img}`} alt={student.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold tracking-wide">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-600 font-mono tracking-tight">{student.id}</td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-slate-900">{student.score}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${student.bg} ${student.text}`}>{student.status}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => onNavigate && onNavigate('messages')}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center shadow-sm cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        Message
                      </button>
                      <button className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="p-6 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 tracking-wide">Showing 1-5 of 42 students</p>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-white border border-slate-200 text-primary shadow-sm">1</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">2</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">3</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">...</button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">9</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
