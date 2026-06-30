import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import apiClient from '../lib/api';

// Sinh mã captcha 5 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/I/L...).
const CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateCaptcha = () => {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return code;
};

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  icon: React.ReactNode;
  autoComplete: string;
  name?: string;
  // Bắt buộc gõ tay: chặn trình duyệt/password manager tự động điền.
  manualOnly?: boolean;
}

const PasswordField = ({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  icon,
  autoComplete,
  name,
  manualOnly = false,
}: PasswordFieldProps) => {
  // Mẹo chặn auto-fill: để ô ở chế độ readOnly ngay khi render (trình duyệt không
  // tự điền vào ô readOnly), chỉ mở khoá khi người dùng thật sự bấm/focus vào ô →
  // buộc phải tự gõ mật khẩu cũ, người khác mượn máy không thể đổi nếu không biết.
  const [locked, setLocked] = useState(manualOnly);

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 block">{label}</label>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </span>
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={locked}
          onFocus={() => manualOnly && setLocked(false)}
          className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-12 text-slate-900 font-medium focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary transition-colors cursor-pointer"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');

  // Mỗi lần mở hộp thoại: xoá sạch các ô (tránh giá trị cũ còn sót) + làm mới captcha.
  useEffect(() => {
    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
    }
  }, [open]);

  if (!open) return null;

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  };

  const resetState = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMsg('');
    setDone(false);
    setIsLoading(false);
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  };

  const handleClose = () => {
    if (isLoading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword === oldPassword) {
      setErrorMsg('Mật khẩu mới phải khác mật khẩu cũ.');
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captcha) {
      setErrorMsg('Mã xác nhận (captcha) không đúng.');
      refreshCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/change-password', { oldPassword, newPassword });
      setDone(true);
    } catch (error: any) {
      setErrorMsg(
        error.response?.data?.message ||
          'Không đổi được mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden animate-in zoom-in-95 fade-in duration-300"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 font-sans">Đổi mật khẩu</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Đóng"
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 font-sans mb-2">
              Đổi mật khẩu thành công
            </h3>
            <p className="text-slate-500 font-medium mb-6">
              Mật khẩu của bạn đã được cập nhật. Hãy dùng mật khẩu mới cho lần đăng nhập sau.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-3.5 font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-primary/20 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off" className="px-6 py-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2 animate-in fade-in zoom-in-95">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <PasswordField
              label="Mật khẩu cũ"
              value={oldPassword}
              onChange={setOldPassword}
              show={showOld}
              onToggle={() => setShowOld((prev) => !prev)}
              placeholder="Tự nhập mật khẩu hiện tại"
              icon={<Lock className="w-5 h-5" />}
              autoComplete="off"
              name="current-password-manual"
              manualOnly
            />

            <PasswordField
              label="Mật khẩu mới"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew((prev) => !prev)}
              placeholder="Ít nhất 6 ký tự"
              icon={<KeyRound className="w-5 h-5" />}
              autoComplete="new-password"
            />

            <PasswordField
              label="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((prev) => !prev)}
              placeholder="Nhập lại mật khẩu mới"
              icon={<KeyRound className="w-5 h-5" />}
              autoComplete="new-password"
            />

            {/* Mã xác nhận (captcha) chống bot/đổi mật khẩu tự động */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Mã xác nhận</label>
              <div className="flex items-center gap-3">
                <div
                  className="select-none flex-1 h-12 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 flex items-center justify-center gap-1.5 overflow-hidden relative"
                  aria-label={`Mã captcha: ${captcha.split('').join(' ')}`}
                >
                  {captcha.split('').map((ch, i) => (
                    <span
                      key={i}
                      className="text-xl font-black text-slate-700"
                      style={{
                        fontFamily: 'monospace',
                        transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (5 + i * 2)}deg) translateY(${i % 2 === 0 ? -1 : 2}px)`,
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                  <span className="absolute left-3 right-3 top-1/2 h-px bg-slate-400/50 -rotate-2" />
                </div>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  aria-label="Tạo mã mới"
                  title="Tạo mã mới"
                  className="shrink-0 w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium tracking-widest uppercase focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Nhập mã phía trên"
                  required
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl py-3.5 font-bold text-base transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-2xl py-3.5 font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Đổi mật khẩu'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
