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
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(currentUser?.bio || '');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // Default to active for current user profile
  const isActive = true;

  const role = String(currentUser?.role || '').toUpperCase();
  const displayName = currentUser?.full_name || currentUser?.email || 'Người dùng';
  const avatarUrl = currentUser?.avatar_url ? `${API_BASE_URL}${currentUser.avatar_url}` : null;
  const coverUrl = currentUser?.cover_url ? `${API_BASE_URL}${currentUser.cover_url}` : null;

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCoverClick = () => {
    if (isEditing && coverInputRef.current) {
      coverInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(previewUrl);
      } else {
        setCoverFile(file);
        setCoverPreview(previewUrl);
      }
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
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const res = await apiClient.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.user) {
        login(res.data.user);
        setIsEditing(false);
        setAvatarFile(null);
        setCoverFile(null);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setAvatarPreview(null);
        setCoverPreview(null);
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
    setCoverFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setAvatarPreview(null);
    setCoverPreview(null);
  };

  const displayAvatar = avatarPreview || avatarUrl;
  const displayCover = coverPreview || coverUrl;

  return (
    <PageLayout title="Hồ sơ tài khoản" breadcrumb={[roleLabel[role] || 'USER', 'Hồ sơ']}>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        {/* Cover & Top Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative group pb-10">
          
          {/* Action Buttons */}
          <div className="absolute top-6 right-6 z-20 flex gap-3">
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
          <div 
            className={`h-64 w-full bg-gradient-to-br from-blue-700 via-sky-500 to-cyan-400 bg-[length:200%_200%] animate-gradient-x relative ${isEditing ? 'cursor-pointer group/cover' : ''}`}
            onClick={handleCoverClick}
          >
            {displayCover && (
              <img src={displayCover} alt="Cover" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div>

            {isEditing && (
              <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                <Camera className="w-10 h-10 text-white mb-2" />
                <span className="text-sm font-bold text-white">Đổi ảnh bìa</span>
              </div>
            )}
            <input 
              type="file" 
              ref={coverInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileChange(e, 'cover')} 
            />
          </div>

          {/* User Info completely in the white box */}
          <div className="px-8 sm:px-12 relative z-10 flex flex-col items-start">
            
            {/* Avatar - Negative margin to pull it up into the cover */}
            <div 
              className={`relative w-36 h-36 shrink-0 rounded-full border-[6px] border-white shadow-2xl flex items-center justify-center text-5xl font-black bg-gradient-to-br from-blue-700 to-sky-500 text-white overflow-hidden -mt-16 mb-4 ${isEditing ? 'cursor-pointer group/avatar' : ''}`}
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
                onChange={(e) => handleFileChange(e, 'avatar')} 
              />
            </div>

            {/* Title & Badge */}
            <div className="w-full text-left">
              <div className="flex flex-row items-center gap-4 mb-2">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {displayName}
                </h2>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border w-fit shadow-sm ${isActive ? 'bg-blue-50 text-blue-600 border-blue-200/50' : 'bg-slate-50 text-slate-600 border-slate-200/50'}`}>
                  {isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  )}
                  {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                </div>
              </div>
              <p className="text-base font-bold text-blue-600 uppercase tracking-widest">
                {roleLabel[role] || role}
              </p>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Quick Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] transition-shadow duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                <BadgeInfo className="w-4 h-4" /> Thông tin chung
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Email liên hệ</p>
                    <p className="font-semibold text-slate-800 break-all text-[15px]">{currentUser?.email || 'Chưa cập nhật'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-purple-100 transition-all duration-300">
                    <Fingerprint className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">ID Hệ thống</p>
                    <p className="font-semibold text-slate-800 text-[15px]">#{currentUser?.id || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-orange-100 transition-all duration-300">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Quyền hạn</p>
                    <p className="font-semibold text-slate-800 text-[15px]">{roleLabel[role] || role}</p>
                  </div>
                </div>

                {currentUser?.student_id && (
                  <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mã sinh viên</p>
                      <p className="font-semibold text-slate-800 text-[15px]">{currentUser.student_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Activities */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] transition-shadow duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> Về bản thân
                </h3>
              </div>
              
              {isEditing ? (
                <div className="relative animate-in fade-in zoom-in-95 duration-200">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết một vài dòng giới thiệu về bạn, sở thích, kỹ năng..."
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all min-h-[180px] resize-y text-[15px] leading-relaxed shadow-inner"
                  />
                  <div className="absolute bottom-4 right-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {bio.length} ký tự
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100/80 transition-colors">
                  {currentUser?.bio ? (
                    <p className="text-slate-700 whitespace-pre-wrap leading-loose text-[15px]">
                      {currentUser.bio}
                    </p>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit2 className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 text-[15px] font-medium mb-1">Chưa có thông tin giới thiệu.</p>
                      <p className="text-slate-400 text-sm mb-6">Hãy thêm một vài dòng về bản thân để mọi người hiểu bạn hơn nhé.</p>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-full hover:bg-blue-100 transition-colors cursor-pointer ring-1 ring-blue-200/50"
                      >
                        Thêm giới thiệu
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional placeholder sections for modern look */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-8 opacity-80 hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Hoạt động gần đây
              </h3>
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-[15px] font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
