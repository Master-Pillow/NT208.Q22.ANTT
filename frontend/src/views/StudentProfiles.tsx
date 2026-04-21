import React from 'react';
import { Network, FileJson, Calculator, GraduationCap, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const StudentProfiles: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="space-y-12 animate-in fade-in duration-500 pt-8 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-12 gap-6">
        <div>
          <h1 className="font-headline text-4xl text-on-surface font-black mb-2">Student Profiles</h1>
          <p className="text-on-surface-variant max-w-lg font-medium">Manage your active teaching load and long-term cohort advising tracks in a centralized academic environment.</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-2xl shadow-sm border border-slate-100/50">
          <span className="text-xs font-bold uppercase tracking-wider pl-3 text-on-surface-variant">Active Term:</span>
          <div className="flex bg-surface-container-lowest rounded-xl shadow-sm p-1">
            <button className="px-5 py-2 text-sm font-bold text-primary bg-primary/5 rounded-lg">Fall 2026</button>
            <button className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-on-surface cursor-pointer rounded-lg transition-colors">Spring 2026</button>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-1.5 bg-primary rounded-full"></div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Subject Classes</h2>
          <span className="px-3 py-1 bg-primary-fixed block text-on-primary-fixed-variant text-[10px] tracking-wider uppercase font-bold rounded-full">Current Term</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: 'Data Structures', code: 'IT001.N11', icon: Network, cap: 42, max: 60, pct: 70, room: 'C.203', time: 'Mon, Thu' },
            { title: 'Algorithm Design', code: 'IT003.N22', icon: FileJson, cap: 58, max: 60, pct: 96, room: 'B.101', time: 'Wed, Fri' },
            { title: 'Discrete Maths', code: 'MA006.N11', icon: Calculator, cap: 30, max: 60, pct: 50, room: 'A.404', time: 'Tue, Sat' },
          ].map((cls, i) => (
            <div key={i} className="group bg-surface-container-lowest p-6 rounded-2xl shadow-[0_20px_40px_rgba(0,74,198,0.04)] hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-1">{cls.title}</h3>
                  <p className="text-xs font-semibold text-slate-400 tracking-wider">Section 0{i+1} • {cls.code}</p>
                </div>
                <div className="bg-secondary-fixed text-on-secondary-fixed-variant p-2.5 rounded-xl shadow-sm">
                  <cls.icon className="w-5 h-5" />
                </div>
              </div>
              
              <div className="space-y-4 mb-8 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Capacity</span>
                  <span className="font-bold text-on-surface">{cls.cap}/{cls.max} Students</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-container transition-all ease-out duration-1000" style={{ width: `${cls.pct}%` }}></div>
                </div>
                <div className="flex items-center gap-4 text-xs tracking-wide text-slate-500 font-semibold pt-2">
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Room {cls.room}</span>
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> {cls.time}</span>
                </div>
              </div>
              
              <button 
                onClick={() => onNavigate('classlist')}
                className="w-full py-3.5 rounded-full border border-slate-200 text-primary font-bold text-sm hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
              >
                View Class List
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-8 w-1.5 bg-secondary-container rounded-full"></div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Administrative Class</h2>
          <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] tracking-wider uppercase font-bold rounded-full">Primary Advising Cohort</span>
        </div>
        
        <div 
          onClick={() => onNavigate('cohort')}
          className="bg-surface-container-lowest p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,74,198,0.06)] flex flex-col md:flex-row gap-10 relative overflow-hidden group border border-slate-100 cursor-pointer"
        >
          <div className="absolute -top-12 -right-12 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-700 pointer-events-none text-primary">
            <GraduationCap className="w-80 h-80" />
          </div>
          
          <div className="flex-grow z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-sm"></span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Active Assignment</span>
            </div>
            
            <div className="mb-10">
              <h3 className="font-headline text-4xl sm:text-5xl font-black text-on-surface mb-3">KHMT 2023.2</h3>
              <p className="text-xl text-slate-500 font-medium">Department: Computer Science</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              <div className="bg-surface p-6 rounded-2xl border border-slate-100/50 shadow-sm transition-all group-hover:bg-white group-hover:border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Students</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black font-serif text-primary">70</p>
                  <p className="text-sm font-semibold text-slate-500">/ 70 Enrolled</p>
                </div>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-slate-100/50 shadow-sm transition-all group-hover:bg-white group-hover:border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Expected Graduation</p>
                <p className="text-5xl font-black font-serif text-on-surface">2027</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[10, 11, 12].map(imgId => (
                    <img key={imgId} src={`https://i.pravatar.cc/100?img=${imgId}`} alt="Student" className="w-12 h-12 rounded-full border-4 border-white shadow-sm object-cover" />
                  ))}
                  <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 shadow-sm">+67</div>
                </div>
                <p className="text-sm font-semibold text-slate-500 tracking-wide">Students in this cohort</p>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onNavigate('cohort'); }}
                className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-105 transition-all group/btn cursor-pointer"
              >
                Access Advisor Panel 
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
