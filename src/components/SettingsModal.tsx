import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User,
  Palette,
  Download,
  Upload,
  Check,
  Copy,
  Volume2,
  VolumeX,
  Cloud,
  Briefcase,
  Building,
  Mail,
  Phone,
  Edit3,
  Users,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Camera,
  Trash2,
} from 'lucide-react';
import { BoardStyle, TaskNote, BoardLayout, BackupData } from '../types';
import { getUserProfile, updateUserProfile, getAllUsers } from '../services/userService';
import { registerNewTeammate } from '../services/collaborationService';
import { compressImageFile, PRESET_AVATARS } from '../utils/imageUtils';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  boardStyle: BoardStyle;
  onChangeBoardStyle: (style: BoardStyle) => void;
  layout: BoardLayout;
  muted: boolean;
  onToggleMute: () => void;
  notes: TaskNote[];
  onRestoreBackup: (data: BackupData, mode: 'replace' | 'merge') => boolean;
  onOpenDeviceSync?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userName,
  onUpdateUserName,
  boardStyle,
  onChangeBoardStyle,
  layout,
  muted,
  onToggleMute,
  notes,
  onRestoreBackup,
  onOpenDeviceSync,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'profile' | 'themes' | 'backup'>('export');
  const [tempName, setTempName] = useState(userName);
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [teammatesList, setTeammatesList] = useState<Record<string, any>>({});
  const [editingTeammateId, setEditingTeammateId] = useState<string | null>(null);
  const [editingTeammateRole, setEditingTeammateRole] = useState('');

  const [copied, setCopied] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [pasteJsonOpen, setPasteJsonOpen] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [previewJsonOpen, setPreviewJsonOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userName) {
      setTempName(userName);
      const profile = getUserProfile(userName);
      if (profile) {
        setDesignation(profile.designation || '');
        setDepartment(profile.department || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setAvatarUrl(profile.avatarUrl || '');
      }
      setTeammatesList(getAllUsers());
    }
  }, [isOpen, userName]);

  if (!isOpen) return null;

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      const compressed = await compressImageFile(file, 256);
      setAvatarUrl(compressed);
      setRestoreMessage({ type: 'success', text: 'Profile photo selected! Click Save to apply.' });
    } catch (err: any) {
      setRestoreMessage({ type: 'error', text: err?.message || 'Could not process photo' });
    } finally {
      setIsProcessingPhoto(false);
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = '';
      }
    }
  };

  // Save Full Profile, Photo & Designation
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tempName.trim();
    if (!cleanName) return;

    onUpdateUserName(cleanName);
    updateUserProfile(userName || cleanName, {
      username: cleanName,
      designation: designation.trim() || undefined,
      department: department.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    });
    setTeammatesList(getAllUsers());
    setRestoreMessage({ type: 'success', text: 'Profile, photo, and designation saved successfully!' });
    setTimeout(() => setRestoreMessage(null), 3000);
  };

  const handleUpdateTeammateDesignation = (teammateId: string) => {
    if (!editingTeammateRole.trim()) return;
    updateUserProfile(teammateId, {
      designation: editingTeammateRole.trim(),
    });
    setTeammatesList(getAllUsers());
    setEditingTeammateId(null);
    setEditingTeammateRole('');
    setRestoreMessage({ type: 'success', text: 'Teammate designation updated!' });
    setTimeout(() => setRestoreMessage(null), 3000);
  };

  // Generate Clean Task List Export Payload (JSON)
  const getExportPayload = () => {
    return {
      version: 1,
      appName: 'Pinboard TaskSheet',
      exportDate: new Date().toISOString(),
      userName: tempName.trim() || undefined,
      totalTasks: notes.length,
      summary: {
        total: notes.length,
        routine: notes.filter((n) => n.cadence === 'daily').length,
        weekly: notes.filter((n) => n.cadence === 'weekly').length,
        monthly: notes.filter((n) => n.cadence === 'monthly').length,
        active: notes.filter((n) => !n.completed).length,
        completed: notes.filter((n) => n.completed).length,
      },
      tasks: notes,
      notes: notes, // For seamless restore compatibility
    };
  };

  // Export & Download Task List as JSON File
  const handleExportDataJson = () => {
    try {
      const payload = getExportPayload();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `task-list-export-${dateStr}.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setRestoreMessage({ type: 'success', text: `Tasks exported successfully as ${filename} (${notes.length} tasks)!` });
      setTimeout(() => setRestoreMessage(null), 3500);
    } catch (e: any) {
      setRestoreMessage({ type: 'error', text: 'Failed to create export JSON file.' });
    }
  };

  // Copy Task List JSON to clipboard
  const handleCopyTaskJson = async () => {
    try {
      const payload = getExportPayload();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setRestoreMessage({ type: 'success', text: 'Task list JSON copied to clipboard!' });
      setTimeout(() => setRestoreMessage(null), 3000);
    } catch (e) {
      setRestoreMessage({ type: 'error', text: 'Could not copy to clipboard.' });
    }
  };

  // Generate Backup Data
  const getBackupPayload = (): BackupData => {
    return {
      version: 1,
      exportDate: new Date().toISOString(),
      userName: tempName.trim() || undefined,
      notes,
      preferences: {
        boardStyle,
        layout,
        muted,
      },
    };
  };

  // Download Backup as JSON
  const handleDownloadBackup = () => {
    try {
      const payload = getBackupPayload();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `tasksheet-backup-${dateStr}.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setRestoreMessage({ type: 'success', text: `Backup exported as ${filename}` });
      setTimeout(() => setRestoreMessage(null), 3500);
    } catch (e) {
      setRestoreMessage({ type: 'error', text: 'Failed to create backup file.' });
    }
  };

  // Copy JSON to clipboard
  const handleCopyBackup = async () => {
    try {
      const payload = getBackupPayload();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setRestoreMessage({ type: 'success', text: 'Backup data copied to clipboard!' });
      setTimeout(() => setRestoreMessage(null), 3000);
    } catch (e) {
      setRestoreMessage({ type: 'error', text: 'Could not copy to clipboard.' });
    }
  };

  // Process and validate imported JSON
  const processImportedJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.notes)) {
        throw new Error('Invalid backup format: missing notes collection.');
      }

      const success = onRestoreBackup(parsed, restoreMode);
      if (success) {
        setRestoreMessage({
          type: 'success',
          text: `Restored ${parsed.notes.length} tasks successfully!`,
        });
        setPastedJsonText('');
        setPasteJsonOpen(false);
      } else {
        setRestoreMessage({ type: 'error', text: 'Failed to restore tasks.' });
      }
    } catch (err: any) {
      setRestoreMessage({
        type: 'error',
        text: err.message || 'Invalid JSON backup format.',
      });
    }
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processImportedJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const themes: {
    id: BoardStyle;
    name: string;
    description: string;
    emoji: string;
    previewBg: string;
    textColor: string;
  }[] = [
    {
      id: 'chrome_light',
      name: 'Chrome Light',
      description: 'Clean Google Chrome grey frame, white cards, and Google blue accents',
      emoji: '🌐',
      previewBg: 'bg-[#f1f3f4] border border-[#dadce0]',
      textColor: 'text-[#202124]',
    },
  ];

  const isDark = boardStyle === 'modern_dark' || boardStyle === 'modern_aurora';
  const isAurora = boardStyle === 'modern_aurora';
  const isChrome = boardStyle === 'chrome_light';

  const modalBg = isDark
    ? isAurora
      ? 'bg-[#0e1024] border-purple-900/50 text-purple-100'
      : 'bg-zinc-900 border-zinc-700 text-zinc-100'
    : isChrome
    ? 'bg-white border-[#dadce0] text-[#202124]'
    : 'bg-white border-slate-300 text-slate-800';

  const modalHeader = isDark
    ? isAurora
      ? 'bg-[#080915] border-purple-900/40 text-purple-100'
      : 'bg-zinc-950 border-zinc-800 text-zinc-100'
    : isChrome
    ? 'bg-[#f1f3f4] border-b border-[#dadce0] text-[#202124]'
    : 'bg-[#0f172a] border-slate-800 text-slate-100';

  const tabsNavBg = isDark
    ? isAurora
      ? 'bg-[#090a18] border-purple-900/30'
      : 'bg-zinc-950 border-zinc-800'
    : isChrome
    ? 'bg-[#f8f9fa] border-[#dadce0]'
    : 'bg-slate-50 border-slate-200';

  const panelBg = isDark
    ? isAurora
      ? 'bg-[#131630]/60 border-purple-900/30'
      : 'bg-zinc-950/60 border-zinc-800'
    : isChrome
    ? 'bg-[#f8f9fa] border-[#dadce0]'
    : 'bg-slate-50 border-slate-200';

  const inputClass = isDark
    ? isAurora
      ? 'bg-[#090a18] border-purple-900/50 text-purple-100 focus:border-purple-500'
      : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-zinc-500'
    : isChrome
    ? 'bg-[#f1f3f4] border-[#dadce0] text-[#202124] focus:bg-white focus:border-[#1a73e8]'
    : 'bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:border-slate-600';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 ${modalBg}`}
      >
        {/* Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${modalHeader}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-300 flex items-center justify-center font-bold">
              ⚙️
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Board Settings</h2>
              <p className="text-[11px] opacity-60">Personalization, modern themes & data backup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex items-center border-b px-4 pt-2 gap-1 text-xs overflow-x-auto ${tabsNavBg}`}>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'export'
                ? isDark
                  ? 'border-violet-400 text-violet-300 font-bold'
                  : 'border-[#1a73e8] text-[#1a73e8] font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'profile'
                ? isDark
                  ? 'border-violet-400 text-violet-300 font-bold'
                  : 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'themes'
                ? isDark
                  ? 'border-violet-400 text-violet-300 font-bold'
                  : 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Themes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'backup'
                ? isDark
                  ? 'border-violet-400 text-violet-300 font-bold'
                  : 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Backup & Restore</span>
          </button>

          {onOpenDeviceSync && (
            <button
              type="button"
              onClick={onOpenDeviceSync}
              className="ml-auto pb-2 px-3 font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer text-xs transition-colors shrink-0"
              title="Open Device Sync & Local Storage to pair with other devices"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Device Sync</span>
            </button>
          )}
        </div>

        {/* Status Notification Toast inside modal */}
        {restoreMessage && (
          <div
            className={`mx-5 mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
              restoreMessage.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
            }`}
          >
            {restoreMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="flex-1">{restoreMessage.text}</span>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB: Export Data (Download task list as JSON) */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-3.5 ${panelBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[#1a73e8] flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-[#202124]">Export Data</h3>
                      <p className="text-[11px] text-[#5f6368]">
                        Download your current task list as a JSON file to your device.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shrink-0">
                    JSON Format
                  </span>
                </div>

                {/* Task Breakdown Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-[#dadce0] shadow-2xs">
                    <div className="text-[10px] uppercase font-semibold text-[#5f6368] tracking-wider">Total Tasks</div>
                    <div className="text-base font-bold text-[#202124]">{notes.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#dadce0] shadow-2xs">
                    <div className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider">Active</div>
                    <div className="text-base font-bold text-emerald-700">{notes.filter((n) => !n.completed).length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#dadce0] shadow-2xs">
                    <div className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider">Routine</div>
                    <div className="text-base font-bold text-blue-700">{notes.filter((n) => n.cadence === 'daily').length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#dadce0] shadow-2xs">
                    <div className="text-[10px] uppercase font-semibold text-purple-600 tracking-wider">Completed</div>
                    <div className="text-base font-bold text-purple-700">{notes.filter((n) => n.completed).length}</div>
                  </div>
                </div>

                {/* Export Options & Actions */}
                <div className="pt-2 border-t border-[#dadce0]/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div>
                      <span className="font-semibold text-[#202124]">Export Target:</span>{' '}
                      <span className="font-mono text-[11px] text-[#5f6368]">Current Task List (.json)</span>
                    </div>
                    <div className="text-[11px] text-[#5f6368]">
                      Includes all routine, weekly, and monthly tasks with history
                    </div>
                  </div>

                  {/* Primary Download & Utility Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportDataJson}
                      className="px-4 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                      title="Download your current task list as a JSON file"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JSON File</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyTaskJson}
                      className={`px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Copy task JSON data to clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                      <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewJsonOpen((prev) => !prev)}
                      className={`px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Preview JSON before downloading"
                    >
                      <FileJson className="w-3.5 h-3.5 text-[#1a73e8]" />
                      <span>{previewJsonOpen ? 'Hide Preview' : 'Preview JSON'}</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible JSON Preview */}
                {previewJsonOpen && (
                  <div className="mt-3 p-3 rounded-xl bg-[#202124] text-slate-100 font-mono text-[11px] overflow-auto max-h-56 border border-slate-700 select-text animate-in fade-in duration-150">
                    <pre className="whitespace-pre">
                      {JSON.stringify(getExportPayload(), null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Informational notice */}
              <div className="p-3 rounded-xl bg-[#e8f0fe] border border-[#d2e3fc] text-[11px] text-[#1a73e8] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                <p className="text-[#3c4043] leading-relaxed">
                  Your downloaded JSON file contains the full structured task data (ID, title, cadence, completion status, timestamp history, and dates). You can use this file for data backups or external tools.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: User Profile & Designation */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                {/* Photo Upload & Presets Section */}
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center gap-3.5 ${panelBg}`}>
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-400 dark:border-purple-600 shadow-xs bg-white dark:bg-[#1e1f20] flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={tempName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                          {(tempName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                      title="Upload photo"
                    >
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Upload</span>
                    </button>
                  </div>

                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isProcessingPhoto}
                        onClick={() => profilePhotoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isProcessingPhoto ? 'Optimizing...' : 'Change Photo'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start pt-1">
                      <span className="text-[10px] text-[#5f6368] font-bold">Presets:</span>
                      {PRESET_AVATARS.slice(0, 5).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`w-6 h-6 rounded-md overflow-hidden border transition-transform cursor-pointer hover:scale-110 ${
                            avatarUrl === preset.url ? 'border-purple-600 ring-2 ring-purple-500/30' : 'border-transparent'
                          }`}
                          title={preset.name}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name & Designation row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="user-name-input" className="block text-xs font-bold mb-1 opacity-80 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#1a73e8]" />
                      <span>Your Name / Username *</span>
                    </label>
                    <input
                      id="user-name-input"
                      type="text"
                      required
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="e.g. Sumit, Rahul"
                      maxLength={30}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-80 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                      <span>Designation / Role Title</span>
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Operations Head, Senior Accountant"
                      maxLength={50}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${inputClass}`}
                    />
                  </div>
                </div>

                {/* Department & Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-80 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      <span>Department / Team</span>
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Operations, Accounts, Management"
                      maxLength={40}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-80 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Email Address (Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@company.com"
                      maxLength={60}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 ${inputClass}`}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Profile & Designation</span>
                  </button>
                </div>
              </form>

              {/* Team Members & Designations Directory */}
              <div className={`p-4 rounded-xl border space-y-3 ${panelBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-[#202124] dark:text-white">
                      Registered Teammates & Roles
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    {Object.keys(teammatesList).length} members
                  </span>
                </div>

                <div className="space-y-2">
                  {Object.values(teammatesList).map((member: any) => {
                    const isSelf = member.username?.toLowerCase() === userName.toLowerCase();
                    const isEditing = editingTeammateId === member.userId;

                    return (
                      <div
                        key={member.userId}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#dadce0] dark:border-[#3c4043]">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.username} className="w-full h-full object-cover" />
                            ) : (
                              (member.username || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#202124] dark:text-white">
                                {member.username}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  You
                                </span>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <input
                                  type="text"
                                  value={editingTeammateRole}
                                  onChange={(e) => setEditingTeammateRole(e.target.value)}
                                  placeholder="New designation..."
                                  className="px-2 py-0.5 rounded text-xs border border-purple-400 bg-white dark:bg-[#282a2c] text-[#202124] dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTeammateDesignation(member.userId)}
                                  className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTeammateId(null)}
                                  className="text-xs text-[#5f6368] hover:text-black cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] block">
                                {member.designation || (isSelf ? 'Owner / Admin' : 'Team Member')}
                                {member.department ? ` • ${member.department}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeammateId(member.userId);
                              setEditingTeammateRole(member.designation || '');
                            }}
                            className="p-1 rounded text-[#5f6368] hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/60 cursor-pointer shrink-0 transition-colors"
                            title="Edit this teammate's designation"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* In-App Mobile PWA Installation Tile */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <PWAInstallButton variant="settings" />
              </div>

              {/* Sound toggle quick control */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold opacity-90">Tactile Audio Feedback</span>
                  <p className="text-[11px] opacity-60">Play subtle click, pin, and completion sounds</p>
                </div>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border ${panelBg}`}
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{muted ? 'Sound Muted' : 'Sound Enabled'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Themes & Board Textures */}
          {activeTab === 'themes' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold opacity-90">Select Modern Theme</h3>
                <p className="text-[11px] opacity-60">
                  Choose a modern dark, obsidian glow, aurora nebula, or clean daylight aesthetic.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {themes.map((theme) => {
                  const isSelected = boardStyle === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onChangeBoardStyle(theme.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? isDark
                            ? 'border-violet-500 bg-violet-950/30 shadow-lg ring-2 ring-violet-500/30'
                            : isChrome
                            ? 'border-[#1a73e8] bg-[#e8f0fe] shadow-sm ring-2 ring-[#1a73e8]/20'
                            : 'border-slate-900 bg-slate-50 shadow-md ring-2 ring-slate-900/15'
                          : isDark
                          ? 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                          : isChrome
                          ? 'border-[#dadce0] bg-white hover:bg-[#f1f3f4] hover:border-[#bdc1c6]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{theme.emoji}</span>
                          <span className={`text-xs font-bold ${isDark ? 'text-zinc-100' : isChrome ? 'text-[#202124]' : 'text-slate-900'}`}>{theme.name}</span>
                        </div>
                        {isSelected && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDark
                              ? 'bg-violet-500 text-white'
                              : isChrome
                              ? 'bg-[#1a73e8] text-white'
                              : 'bg-slate-900 text-white'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <p className={`text-[11px] leading-tight ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {theme.description}
                      </p>

                      {/* Mini Preview Chip */}
                      <div className={`w-full h-4 rounded-md mt-1 border ${isDark ? 'border-zinc-700' : 'border-slate-300'} ${theme.previewBg}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Backup & Restore */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Backup / Export Section */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${panelBg}`}>
                <div className="flex items-center gap-2">
                  <Download className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-slate-700'}`} />
                  <span className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>Export & Backup</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Download all {notes.length} current tasks, deadlines, categories, and settings as a clean JSON file.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBackup}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {copied ? <Check className={`w-3.5 h-3.5 ${isDark ? 'text-violet-400' : 'text-slate-800'}`} /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>
              </div>

              {/* Restore / Import Section */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${panelBg}`}>
                <div className="flex items-center gap-2">
                  <Upload className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-slate-700'}`} />
                  <span className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>Restore from Backup</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Load tasks from a previously saved JSON backup.
                </p>

                {/* Mode Selector: Replace vs Merge */}
                <div className={`flex items-center gap-3 text-xs p-2 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'}`}>
                  <span className="text-[11px] opacity-60 font-medium ml-1">Restore mode:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="accent-violet-500 text-xs"
                    />
                    <span>Replace all</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="accent-violet-500 text-xs"
                    />
                    <span>Merge notes</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Upload .JSON File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPasteJsonOpen(!pasteJsonOpen)}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer border shadow-2xs ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {pasteJsonOpen ? 'Hide Paste Box' : 'Paste Raw JSON'}
                  </button>
                </div>

                {/* Optional Raw JSON text paste */}
                {pasteJsonOpen && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <textarea
                      value={pastedJsonText}
                      onChange={(e) => setPastedJsonText(e.target.value)}
                      placeholder='Paste JSON content here (e.g. {"version": 1, "notes": [...]})'
                      rows={4}
                      className={`w-full p-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none ${inputClass}`}
                    />
                    <button
                      type="button"
                      disabled={!pastedJsonText.trim()}
                      onClick={() => processImportedJson(pastedJsonText)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Process & Restore
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
          <span className="text-[11px] text-slate-500">
            {notes.length} tasks currently on board
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
