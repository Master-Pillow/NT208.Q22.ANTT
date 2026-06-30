import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import apiClient from '../lib/api';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [loginMode, setLoginMode] = useState<'ACCOUNT' | 'DAA'>('ACCOUNT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mssv, setMssv] = useState('');
  const [daaCookie, setDaaCookie] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCookie, setShowCookie] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Chống bot: sau 3 lần đăng nhập sai (chế độ tài khoản email/mật khẩu), bắt
  // người dùng giải một phép tính đơn giản trước khi gửi tiếp.
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captcha, setCaptcha] = useState(() => ({
    a: Math.floor(Math.random() * 9) + 1,
    b: Math.floor(Math.random() * 9) + 1,
  }));
  const [captchaInput, setCaptchaInput] = useState('');

  const captchaRequired = loginMode === 'ACCOUNT' && failedAttempts >= 3;

  const regenerateCaptcha = () => {
    setCaptcha({
      a: Math.floor(Math.random() * 9) + 1,
      b: Math.floor(Math.random() * 9) + 1,
    });
    setCaptchaInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // không reload trang — chỉ báo lỗi tại chỗ để nhập lại

    // Bắt buộc giải captcha trước khi gọi API (sau 3 lần sai).
    if (captchaRequired && Number(captchaInput.trim()) !== captcha.a + captcha.b) {
      setErrorMsg('Mã xác minh chưa đúng. Vui lòng nhập lại kết quả phép tính.');
      regenerateCaptcha();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setNoticeMsg('');

    try {
      const response =
        loginMode === 'DAA'
          ? await apiClient.post('/auth/daa-login', {
              mssv: mssv.trim(),
              cookie: daaCookie.trim(),
            })
          : await apiClient.post('/auth/login', {
              email,
              password,
            });

      const { token, user } = response.data;

      if (!token) {
        throw new Error('Backend chưa trả về token đăng nhập.');
      }

      if (!user) {
        throw new Error('Backend chưa trả về thông tin user. Kiểm tra response /auth/login.');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setFailedAttempts(0);
      onLogin(user);
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          'Lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại!'
      );
      // Đếm số lần sai cho chế độ đăng nhập tài khoản; chạm mốc 3 thì hiện captcha.
      if (loginMode === 'ACCOUNT') {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= 3) regenerateCaptcha();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quên mật khẩu: gửi email chứa link đặt lại tới chính địa chỉ email đã nhập ở ô trên.
  const handleForgotPassword = async () => {
    setErrorMsg('');
    setNoticeMsg('');

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email UIT ở ô phía trên, rồi bấm "Quên mật khẩu?".');
      return;
    }

    setForgotLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: targetEmail,
      });
      setNoticeMsg(
        response.data?.message ||
          'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.'
      );
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          'Không gửi được email đặt lại mật khẩu. Vui lòng thử lại sau.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      <div className="w-full max-w-[1000px] bg-white rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.04)] sm:shadow-[0_40px_80px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col md:flex-row overflow-hidden min-h-[600px] animate-in fade-in zoom-in-95 duration-700">
        {/* Left Side - Brand & Features */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#login-grid)" />
            </svg>
          </div>

          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-lg">
                U
              </div>
              <span className="font-sans font-black text-xl tracking-normal">
                Trung tâm tư vấn UIT
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-sans font-black leading-tight mb-6">
              Tạo điều kiện cho sự{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                thành công của sinh viên
              </span>
              .
            </h1>

            <p className="text-slate-300 text-lg leading-relaxed max-w-sm">
              Nền tảng tư vấn học thuật thống nhất. Theo dõi lớp sinh hoạt, quản lý lịch
              và hỗ trợ sinh viên một cách liền mạch.
            </p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Users className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-bold text-white">Hồ sơ thông minh</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Truy cập nhanh dữ liệu phân tích sinh viên.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                <BookOpen className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-bold text-white">Quản lý lớp sinh hoạt</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Theo dõi tiến độ tốt nghiệp dễ dàng.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-7/12 lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-lg font-bold shadow-sm">
              U
            </div>
            <span className="font-sans font-black text-xl tracking-normal text-slate-900">
              Trung tâm tư vấn UIT
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 font-sans mb-3">
              Chào mừng trở lại
            </h2>
            <p className="text-slate-500 font-medium">
              Vui lòng đăng nhập để truy cập hệ thống tư vấn học tập.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2 animate-in fade-in zoom-in-95">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {noticeMsg && (
            <div className="mb-6 p-3 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 flex items-start gap-2 animate-in fade-in zoom-in-95">
              <Mail className="w-5 h-5 shrink-0 mt-0.5" />
              {noticeMsg}
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode('ACCOUNT');
                setErrorMsg('');
                setNoticeMsg('');
              }}
              className={`min-h-10 rounded-md px-3 text-sm font-bold transition-colors ${
                loginMode === 'ACCOUNT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tài khoản
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('DAA');
                setErrorMsg('');
                setNoticeMsg('');
              }}
              className={`min-h-10 rounded-md px-3 text-sm font-bold transition-colors ${
                loginMode === 'DAA'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tài khoản sinh viên
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMode === 'ACCOUNT' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">
                    Địa chỉ email UIT
                  </label>

                  <div className="relative group">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="name@uit.edu.vn"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700 block">
                      Mật khẩu
                    </label>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="text-sm font-bold text-primary hover:text-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {forgotLoading ? 'Đang gửi...' : 'Quên mật khẩu?'}
                    </button>
                  </div>

                  <div className="relative group">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-12 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all tracking-normal"
                      placeholder="Nhập mật khẩu..."
                      required
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

                {captchaRequired && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-bold text-slate-700 block">
                      Xác minh bạn không phải robot
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700 select-none whitespace-nowrap">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        {captcha.a} + {captcha.b} = ?
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 min-w-0 bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 px-4 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Nhập kết quả"
                        required
                      />
                      <button
                        type="button"
                        onClick={regenerateCaptcha}
                        title="Đổi phép tính khác"
                        aria-label="Đổi phép tính khác"
                        className="shrink-0 p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-amber-600 font-medium">
                      Bạn đã nhập sai {failedAttempts} lần. Vui lòng giải phép tính trên để tiếp tục.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">
                    Mã số sinh viên
                  </label>
                  <div className="relative group">
                    <UserRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={mssv}
                      onChange={(event) => setMssv(event.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Nhập mã số sinh viên của bạn ở đây"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block">
                    Cookie phiên DAA
                  </label>
                  <div className="relative group">
                    <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                    <input
                      type={showCookie ? 'text' : 'password'}
                      value={daaCookie}
                      onChange={(event) => setDaaCookie(event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-12 font-mono text-sm text-slate-900 focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Cookie có dạng _gid=GA1.3.1527703366.1782707143; _gat_gtag_UA_32419117_1=1; _ga_YVG75F27S1=GS2.1.s1782707143$o1$g0$t1782707143$j60$l0$h0; _ga=GA1.1.837617349.1782707143; SSESS91d146efc1199e94140be605b03688ff=w7lQbz_jeF0d9TipcB20R0ajB26OQ4MghS7hHiIo9B0"
                      autoComplete="off"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCookie((prev) => !prev)}
                      aria-label={showCookie ? 'Ẩn cookie' : 'Hiện cookie'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                    >
                      {showCookie ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-500">
                    <p className="mb-2 font-bold text-slate-700">
                      Cách lấy Cookie từ{' '}
                      <a
                        href="https://daa.uit.edu.vn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-primary hover:underline"
                      >
                        daa.uit.edu.vn
                      </a>
                    </p>
                    <ol className="list-decimal space-y-1 pl-4 font-medium">
                      <li>
                        Mở{' '}
                        <a
                          href="https://daa.uit.edu.vn"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-primary hover:underline"
                        >
                          https://daa.uit.edu.vn
                        </a>{' '}
                        và đăng nhập bằng tài khoản sinh viên của bạn.
                      </li>
                      <li>
                        Nhấn <span className="font-mono font-bold">F12</span> (hoặc chuột phải
                        → <span className="font-semibold">Inspect</span>) để mở Developer Tools.
                      </li>
                      <li>
                        Chọn tab <span className="font-semibold">Network</span>, rồi nhấn{' '}
                        <span className="font-mono font-bold">F5</span> để tải lại trang.
                      </li>
                      <li>
                        Bấm vào request đầu tiên (tên miền{' '}
                        <span className="font-mono">daa.uit.edu.vn</span>), kéo xuống mục{' '}
                        <span className="font-semibold">Request Headers → Cookie</span>.
                      </li>
                      <li>
                        Sao chép toàn bộ giá trị Cookie và dán vào ô phía trên.
                      </li>
                    </ol>
                    <p className="mt-2 text-[11px] italic text-slate-400">
                      Cookie chỉ được dùng để xác minh phiên DAA và không được lưu.
                    </p>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-4 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {loginMode === 'DAA' ? 'Đăng nhập bằng DAA' : 'Đăng nhập'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 flex items-start gap-3 bg-slate-50 p-4 rounded-2xl">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />

            <div>
              <p className="text-xs font-bold text-slate-700">
                Cổng đăng nhập đại học an toàn
              </p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Kết nối này đã được mã hóa. Chỉ người dùng được cấp quyền mới có thể
                truy cập. Địa chỉ IP và các lần đăng nhập được hệ thống CNTT UIT giám sát.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
