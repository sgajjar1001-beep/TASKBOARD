import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Briefcase,
  Building,
  Mail,
  Phone,
  Smile,
  CheckCircle2,
  Save,
  Palette,
  Camera,
  Upload,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  getUserProfile,
  updateUserProfile,
  UserAccount,
} from '../services/userService';
import { compressImageFile, PRESET_AVATARS } from '../utils/imageUtils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onProfileUpdated?: (updated: UserAccount) => void;
  targetUserName?: string;
}

const AVATAR_COLOR_CHOICES = [
  { id: 'bg-blue-600', name: 'Blue' },
  { id: 'bg-emerald-600', name: 'Green' },
  { id: 'bg-purple-600', name: 'Purple' },
  { id: 'bg-amber-600', name: 'Amber' },
  { id: 'bg-rose-600', name: 'Rose' },
  { id: 'bg-indigo-600', name: 'Indigo' },
  { id: 'bg-cyan-600', name: 'Cyan' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userName,
  onProfileUpdated,
  targetUserName,
}) => {
  const activeName = targetUserName || userName;

  const [displayName, setDisplayName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [avatarColor, setAvatarColor] = useState('bg-blue-600');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeName) {
      const profile = getUserProfile(activeName);
      if (profile) {
        setDisplayName(profile.username || activeName);
        setDesignation(profile.designation || '');
        setDepartment(profile.department || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setStatusMessage(profile.statusMessage || '');
        setAvatarColor(profile.avatarColor || 'bg-blue-600');
        setAvatarUrl(profile.avatarUrl || '');
      } else {
        setDisplayName(activeName);
        setDesignation('');
        setDepartment('');
        setEmail('');
        setPhone('');
        setStatusMessage('');
        setAvatarColor('bg-blue-600');
        setAvatarUrl('');
      }
      setNotice(null);
    }
  }, [isOpen, activeName]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const compressedDataUrl = await compressImageFile(file, 256);
      setAvatarUrl(compressedDataUrl);
      setNotice('Photo selected! Click "Save Profile Changes" to apply.');
    } catch (err: any) {
      console.error('Image compression error:', err);
      setNotice(err?.message || 'Could not process selected image.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectPresetAvatar = (url: string) => {
    setAvatarUrl(url);
    setNotice('Preset photo selected! Click "Save Profile Changes" to apply.');
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    setNotice('Profile photo removed. Your initials will be displayed.');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    const res = updateUserProfile(activeName, {
      username: displayName.trim(),
      designation: designation.trim() || undefined,
      department: department.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      statusMessage: statusMessage.trim() || undefined,
      avatarColor,
      avatarUrl: avatarUrl.trim() || undefined,
    });

    setIsSaving(false);
    if (res.success && res.user) {
      setNotice('Profile, photo, and designation updated successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(res.user);
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      setNotice(res.error || 'Could not update profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#f8f9fa] dark:bg-[#161718] border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-[#dadce0] dark:border-[#3c4043]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full ${avatarColor} text-white flex items-center justify-center font-bold text-base`}>
                  {(displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#202124] dark:text-white leading-tight">
                Edit Profile & Photo
              </h3>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                Set profile picture, designation, department, and contact details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#e8eaed] dark:hover:bg-[#282a2c] text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notice */}
        {notice && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* PHOTO UPLOAD & PRESET AVATARS SECTION */}
          <div className="p-3.5 rounded-2xl bg-[#f8f9fa] dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3c4043] dark:text-[#e8eaed] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#1a73e8]" />
                <span>Profile Photo / Avatar</span>
              </span>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Preview Circle */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-purple-400 dark:border-purple-600 shadow-md bg-white dark:bg-[#1e1f20] flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${avatarColor} text-white flex items-center justify-center font-bold text-2xl`}>
                      {(displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Quick overlay change button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                  title="Upload from device"
                >
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Upload Action & Presets */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingImage ? 'Optimizing...' : 'Upload from Device'}</span>
                  </button>

                  <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                    PNG, JPG, or WEBP (auto-scaled)
                  </span>
                </div>

                {/* Preset Avatars Row */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5f6368] dark:text-[#9aa0a6] block mb-1">
                    Or Choose a Preset Portrait:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                    {PRESET_AVATARS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPresetAvatar(preset.url)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-transform cursor-pointer hover:scale-110 ${
                          avatarUrl === preset.url
                            ? 'border-purple-600 ring-2 ring-purple-500/30 scale-105'
                            : 'border-transparent hover:border-purple-400'
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Name & Designation Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Full Name / Username *</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sumit, Rahul, Priya"
                className="w-full px-3 py-2 bg-[#f1f3f4] dark:bg-[#252628] hover:bg-[#e8eaed] dark:hover:bg-[#2d2e30] focus:bg-white dark:focus:bg-[#1e1f20] border border-transparent focus:border-[#1a73e8] rounded-xl text-xs sm:text-sm text-[#202124] dark:text-white focus:outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                <span>Designation / Role Title</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Operations Manager, Accountant, Lead"
                className="w-full px-3 py-2 bg-[#f1f3f4] dark:bg-[#252628] hover:bg-[#e8eaed] dark:hover:bg-[#2d2e30] focus:bg-white dark:focus:bg-[#1e1f20] border border-transparent focus:border-purple-600 rounded-xl text-xs sm:text-sm text-[#202124] dark:text-white focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Department & Status Message */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Department / Team</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Finance, Operations, IT"
                className="w-full px-3 py-2 bg-[#f1f3f4] dark:bg-[#252628] hover:bg-[#e8eaed] dark:hover:bg-[#2d2e30] focus:bg-white dark:focus:bg-[#1e1f20] border border-transparent focus:border-[#1a73e8] rounded-xl text-xs sm:text-sm text-[#202124] dark:text-white focus:outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-amber-500" />
                <span>Status Note / Bio</span>
              </label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g. Available for priority reviews"
                className="w-full px-3 py-2 bg-[#f1f3f4] dark:bg-[#252628] hover:bg-[#e8eaed] dark:hover:bg-[#2d2e30] focus:bg-white dark:focus:bg-[#1e1f20] border border-transparent focus:border-amber-500 rounded-xl text-xs sm:text-sm text-[#202124] dark:text-white focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Email & Phone Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>Email Address (Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sumit@company.com"
                className="w-full px-3 py-2 bg-[#f1f3f4] dark:bg-[#252628] hover:bg-[#e8eaed] dark:hover:bg-[#2d2e30] focus:bg-white dark:focus:bg-[#1e1f20] border border-transparent focus:border-[#1a73e8] rounded-xl text-xs sm:text-sm text-[#202124] dark:text-white focus:outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Phone / Extension (Optional)</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-[#f1f3f4] dark:bg-[#252628] hover:bg-[#e8eaed] dark:hover:bg-[#2d2e30] focus:bg-white dark:focus:bg-[#1e1f20] border border-transparent focus:border-emerald-600 rounded-xl text-xs sm:text-sm text-[#202124] dark:text-white focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Avatar Theme Color (Used as background or fallback initial) */}
          <div>
            <label className="block text-xs font-bold text-[#3c4043] dark:text-[#bdc1c6] mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              <span>Fallback Avatar Theme Color</span>
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLOR_CHOICES.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setAvatarColor(col.id)}
                  className={`w-7 h-7 rounded-full ${col.id} transition-all cursor-pointer flex items-center justify-center text-white ${
                    avatarColor === col.id ? 'ring-2 ring-offset-2 ring-[#1a73e8] scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={col.name}
                >
                  {avatarColor === col.id && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#dadce0] dark:border-[#3c4043]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !displayName.trim()}
              className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
