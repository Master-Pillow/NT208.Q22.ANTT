import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import apiClient from '../lib/api';

type TokenState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = (searchParams.get('token') || '').trim();

  const [tokenState, setTokenState] = useState<TokenState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  // Kiểm tra token còn hợp lệ ngay khi mở trang để báo sớm cho người dùng.
  useEffect(() => {
    let active = true;

    if (!token) {
      setTokenState('invalid');
      return;
    }

    apiClient
      .get('/auth/reset-password/validate', { params: { token } })
      .then((res) => {
        if (!active) return;
        setTokenState(res.data?.valid ? 'valid' : 'invalid');
      })
      .catch(() => {
        if (active) setTokenState('invalid');
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setDone(true);
      // Tự động quay về trang đăng nhập sau vài giây.
      setTimeout(() => navigate('/login', { replace: true }), 3500);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'Không đặt lại được mật khẩu. Liên kết có thể đã hết hạn — vui lòng yêu cầu lại.';
      setErrorMsg(message);
      // Token hỏng/hết hạn giữa chừng → chuyển sang trạng thái invalid.
      if (error.response?.status === 400) setTokenState('invalid');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.05)] border border-slate-100 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-sm">
            U
          </div>
          <span className="font-sans font-black text-lg tracking-normal text-slate-900">
            Trung tâm tư vấn UIT
          </span>
        </div>

        {tokenState === 'checking' && (
          <div className="flex flex-col items-center text-center py-10 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="font-medium">Đang kiểm tra liên kết đặt lại mật khẩu...</p>
          </div>
        )}

        {tokenState === 'invalid' && !done && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <ShieldX className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-sans mb-2">
              Liên kết không hợp lệ
            </h2>
            <p className="text-slate-500 font-medium mb-6">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng quay lại
              trang đăng nhập và yêu cầu gửi lại email.
            </p>
            <Link
              to="/login"
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-3.5 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Quay lại đăng nhập
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {done && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-sans mb-2">
              Đã đổi mật khẩu
            </h2>
            <p className="text-slate-500 font-medium mb-6">
              Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
              Đang chuyển về trang đăng nhập...
            </p>
            <Link
              to="/login"
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-3.5 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Đăng nhập ngay
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {tokenState === 'valid' && !done && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 font-sans mb-2">
                Đặt lại mật khẩu
              </h2>
              <p className="text-slate-500 font-medium">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2 animate-in fade-in zoom-in-95">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">
                  Mật khẩu mới
                </label>
                <div className="relative group">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-12 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="Ít nhất 6 ký tự"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">
                  Xác nhận mật khẩu
                </label>
                <div className="relative group">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Đặt lại mật khẩu
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="text-sm font-bold text-slate-500 hover:text-primary transition-colors"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
