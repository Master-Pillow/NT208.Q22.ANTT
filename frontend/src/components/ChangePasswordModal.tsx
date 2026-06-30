import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import apiClient from '../lib/api';

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
}: PasswordFieldProps) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700 block">{label}</label>
    <div className="relative group">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
        {icon}
      </span>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

  if (!open) return null;

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
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
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
              placeholder="Nhập mật khẩu hiện tại"
              icon={<Lock className="w-5 h-5" />}
              autoComplete="current-password"
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
