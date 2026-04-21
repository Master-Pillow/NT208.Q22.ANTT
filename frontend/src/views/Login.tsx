import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, BookOpen, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: () => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('aris.thorne@uit.edu.vn');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      <div className="w-full max-w-[1000px] bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.04)] sm:shadow-[0_40px_80px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col md:flex-row overflow-hidden min-h-[600px] animate-in fade-in zoom-in-95 duration-700">
        
        {/* Left Side - Brand & Features (Hidden on mobile) */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#login-grid)" />
            </svg>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-lg">U</div>
              <span className="font-headline font-black text-xl tracking-tight">UIT AdvisorHub</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-serif font-black leading-tight mb-6">
              Empower student <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">success</span>.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-sm">
              The unified academic advising platform. Track cohorts, manage schedules, and guide students seamlessly.
            </p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Smart Profiling</p>
                <p className="text-xs opacity-80 mt-0.5">Instant access to student analytics.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Cohort Management</p>
                <p className="text-xs opacity-80 mt-0.5">Track graduation progress effortlessly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-lg font-bold shadow-sm">U</div>
            <span className="font-headline font-black text-xl tracking-tight text-slate-900">UIT AdvisorHub</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 font-headline mb-3">Welcome back</h2>
            <p className="text-slate-500 font-medium">Please sign in to access your advisor dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Edu Email Address</label>
              <div className="relative group">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="name@uit.edu.vn"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700 block">Password</label>
                <a href="#" className="text-sm font-bold text-primary hover:text-primary-container transition-colors">Forgot password?</a>
              </div>
              <div className="relative group">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all tracking-widest"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed group mr-auto cursor-pointer"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 flex items-start gap-3 bg-slate-50 p-4 rounded-2xl">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-700">Secure University Gateway</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">This connection is encrypted. Authorized personnel only. Your IP and login attempts are monitored by UIT IT services.</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
