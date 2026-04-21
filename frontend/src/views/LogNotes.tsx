import React from 'react';
import { Search, Plus, Filter, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export const LogNotes = () => {
  const notes = [
    {
      id: 1,
      studentName: 'Elena Jenkins',
      studentId: '#2948-AD',
      date: 'Oct 24, 2026',
      type: 'Meeting',
      content: 'Discussed recent drop in Advanced Calculus grade. Elena cited personal reasons and requested a tutor. Assigned peer tutor and scheduled follow-up for next week.',
      priority: 'high',
      author: 'Dr. Aris Thorne'
    },
    {
      id: 2,
      studentName: 'Marcus Miller',
      studentId: '#3102-BC',
      date: 'Oct 22, 2026',
      type: 'Academic Warning',
      content: 'Sent official warning regarding consecutive absences in Data Structures. Student has not responded to email.',
      priority: 'medium',
      author: 'Dr. Aris Thorne'
    },
    {
      id: 3,
      studentName: 'Sarah Tish',
      studentId: '#1185-FX',
      date: 'Oct 18, 2026',
      type: 'Milestone',
      content: 'Successfully completed all degree requirements with honors. Cleared for graduation ceremony.',
      priority: 'low',
      author: 'Dr. Aris Thorne'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto xl:mx-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">Log Notes</h2>
          <p className="text-on-surface-variant font-medium">Record and track advising interactions and student updates.</p>
        </div>
        
        <button className="flex-shrink-0 bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-full font-semibold text-sm shadow-sm transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Note
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_rgba(0,74,198,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-surface-container/50 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search notes, student names..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="divide-y divide-surface-container/50">
          {notes.map((note) => (
            <div key={note.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {note.studentName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{note.studentName}</h3>
                    <span className="text-xs text-slate-500 font-mono">{note.studentId}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {note.date}
                    </span>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600">
                      {note.type}
                    </span>
                  </div>
                  <button className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="pl-13">
                <p className="text-slate-700 text-sm leading-relaxed mb-3">
                  {note.content}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Author: {note.author}
                  </p>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    note.priority === 'high' ? "bg-error/10 text-error" : 
                    note.priority === 'medium' ? "bg-orange-500/10 text-orange-600" :
                    "bg-green-500/10 text-green-600"
                  )}>
                    {note.priority} Priority
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
