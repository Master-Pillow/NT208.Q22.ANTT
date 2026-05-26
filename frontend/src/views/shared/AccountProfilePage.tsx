import React, { useState, useRef } from 'react';
import { Mail, Shield, User, Fingerprint, Camera, Edit2, Save, X, CalendarDays, CheckCircle2, BadgeInfo } from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAuth } from '../../auth/AuthContext';
import apiClient from '../../lib/api';

const roleLabel: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  ADVISOR: 'Cố vấn học vụ',
  STUDENT: 'Sinh viên',
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AccountProfilePage() {
  const { currentUser, login } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const role = String(currentUser?.role || '').toUpperCase();
  const displayName = currentUser?.full_name || currentUser?.email || 'Người dùng';
  const avatarUrl = currentUser?.avatar_url ? `${API_BASE_URL}${currentUser.avatar_url}` : null;

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('bio', bio);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await apiClient.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.user) {
        login(res.data.user);
        setIsEditing(false);
        setAvatarFile(null);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
    } catch (err) {
      console.error("Failed to save profile", err);
      alert("Đã xảy ra lỗi khi lưu hồ sơ.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setBio(currentUser?.bio || '');
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
  };

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <PageLayout title="Hồ sơ tài khoản" breadcrumb={[roleLabel[role] || 'USER', 'Hồ sơ']}>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        {/* Cover & Top Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative group">
          
          {/* Action Buttons */}
          <div className="absolute top-6 right-6 z-10 flex gap-3">
             {!isEditing ? (
               <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all backdrop-blur-md font-bold text-sm shadow-sm ring-1 ring-white/30 hover:scale-105 cursor-pointer">
                 <Edit2 className="w-4 h-4" /> Cập nhật
               </button>
             ) : (
               <>
                 <button onClick={handleCancel} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900/40 hover:bg-slate-900/60 text-white rounded-full transition-all backdrop-blur-md font-bold text-sm disabled:opacity-50 ring-1 ring-white/10 hover:scale-105 cursor-pointer">
                   <X className="w-4 h-4" /> Hủy
                 </button>
                 <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-full transition-all backdrop-blur-md font-bold text-sm disabled:opacity-50 shadow-lg hover:shadow-emerald-500/30 hover:scale-105 cursor-pointer">
                   {isSaving ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Đang lưu...</span> : <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Lưu thay đổi</span>}
                 </button>
               </>
             )}
          </div>

          {/* Cover Photo */}
          <div className="h-64 w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-[length:200%_200%] animate-gradient-x relative">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div>
          </div>

          <div className="px-8 sm:px-12 pb-10 -mt-24 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
              
              {/* Avatar */}
              <div 
                className={`relative w-40 h-40 shrink-0 rounded-full border-[6px] border-white dark:border-slate-900 shadow-2xl flex items-center justify-center text-5xl font-black bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden ${isEditing ? 'cursor-pointer group/avatar' : ''}`}
                onClick={handleAvatarClick}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Avatar" className={`w-full h-full object-cover transition-transform duration-500 ${isEditing ? 'group-hover/avatar:scale-110' : ''}`} />
                ) : (
                  displayName.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
                )}

                {isEditing && (
                  <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 backdrop-blur-sm">
                    <Camera className="w-8 h-8 text-white mb-2" />
                    <span className="text-xs font-bold text-white">Đổi ảnh</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>

              {/* Title & Badge */}
              <div className="pb-4 text-center md:text-left flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {displayName}
                  </h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold border border-emerald-200/50 dark:border-emerald-500/20 w-fit mx-auto md:mx-0 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Đang hoạt động
                  </div>
                </div>
                <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  {roleLabel[role] || role}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Quick Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] transition-shadow duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8 flex items-center gap-2">
                <BadgeInfo className="w-4 h-4" /> Thông tin chung
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Email liên hệ</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 break-all text-[15px]">{currentUser?.email || 'Chưa cập nhật'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-purple-100 transition-all duration-300">
                    <Fingerprint className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">ID Hệ thống</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">#{currentUser?.id || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-orange-100 transition-all duration-300">
                    <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Quyền hạn</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">{roleLabel[role] || role}</p>
                  </div>
                </div>

                {currentUser?.student_id && (
                  <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Mã sinh viên</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-[15px]">{currentUser.student_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Activities */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] transition-shadow duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <User className="w-4 h-4" /> Về bản thân
                </h3>
              </div>
              
              {isEditing ? (
                <div className="relative animate-in fade-in zoom-in-95 duration-200">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết một vài dòng giới thiệu về bạn, sở thích, kỹ năng..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all min-h-[180px] resize-y text-[15px] leading-relaxed shadow-inner"
                  />
                  <div className="absolute bottom-4 right-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {bio.length} ký tự
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100/80 dark:border-slate-800/80 transition-colors">
                  {currentUser?.bio ? (
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-loose text-[15px]">
                      {currentUser.bio}
                    </p>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[15px] font-medium mb-1">Chưa có thông tin giới thiệu.</p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Hãy thêm một vài dòng về bản thân để mọi người hiểu bạn hơn nhé.</p>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer ring-1 ring-indigo-200/50 dark:ring-indigo-500/30"
                      >
                        Thêm giới thiệu
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional placeholder sections for modern look */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 opacity-80 hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Hoạt động gần đây
              </h3>
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 text-[15px] font-medium bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <CalendarDays className="w-12 h-12 mb-4 opacity-20" />
                Chưa có hoạt động nào được ghi nhận gần đây.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}