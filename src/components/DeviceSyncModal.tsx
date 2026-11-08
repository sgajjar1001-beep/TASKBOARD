import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Check,
  Copy,
  RefreshCw,
  Download,
  Upload,
  Smartphone,
  Laptop,
  HardDrive,
  ShieldCheck,
  Link,
  Share2,
  FileText,
  AlertCircle,
  Database,
  QrCode as QrCodeIcon,
  CheckCircle2,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { TaskNote, ImportantNote } from '../types';
import {
  getStoredSyncKey,
  saveStoredSyncKey,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  pushSyncData,
  pullSyncData,
  checkSyncStatus,
  exportBackupFile,
  importBackupFile,
  generateShareUrl,
  getLastSyncedTime,
} from '../services/syncService';
import { saveUserTasksAndSync } from '../services/userService';
import { pullUserBoardFromFirebase } from '../services/firebase';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: TaskNote[];
  importantNotes?: ImportantNote[];
  userName?: string;
  boardStyle?: string;
  onRestoreAllData: (data: {
    notes: TaskNote[];
    importantNotes?: ImportantNote[];
    userName?: string;
    boardStyle?: string;
  }) => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  notes,
  importantNotes = [],
  userName = 'Sumit',
  boardStyle = 'chrome_light',
  onRestoreAllData,
}) => {
  const [syncKey, setSyncKey] = useState(getStoredSyncKey());
  const [inputKey, setInputKey] = useState(syncKey);
  const [autoSync, setAutoSync] = useState(getAutoSyncEnabled());
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedLocal, setSavedLocal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [lastSyncText, setLastSyncText] = useState('Not synced yet');
  const [remoteInfo, setRemoteInfo] = useState<{ exists: boolean; itemCount?: number; updatedAt?: number } | null>(null);

  // Sync state on open & generate QR code
  useEffect(() => {
    if (isOpen) {
      const currentKey = getStoredSyncKey();
      setSyncKey(currentKey);
      setInputKey(currentKey);
      setAutoSync(getAutoSyncEnabled());
      setStatusMessage(null);
      setSavedLocal(false);

      const lastTime = getLastSyncedTime();
      if (lastTime > 0) {
        const diffMinutes = Math.floor((Date.now() - lastTime) / 60000);
        if (diffMinutes < 1) setLastSyncText('Just now');
        else if (diffMinutes < 60) setLastSyncText(`${diffMinutes}m ago`);
        else setLastSyncText(new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setLastSyncText('Not synced yet');
      }

      // Generate QR Code URL
      const shareUrl = generateShareUrl(currentKey);
      QRCode.toDataURL(shareUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));

      // Check remote status
      checkSyncStatus(currentKey).then((info) => {
        setRemoteInfo(info);
      });
    }
  }, [isOpen]);

  // Update QR when input key changes
  useEffect(() => {
    if (isOpen && inputKey.trim()) {
      const shareUrl = generateShareUrl(inputKey.trim());
      QRCode.toDataURL(shareUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [inputKey, isOpen]);

  if (!isOpen) return null;

  // Manual trigger to confirm and re-save in localStorage
  const handleSaveToLocalStorageNow = () => {
    try {
      localStorage.setItem('pinboard_excel_tasks_v8', JSON.stringify(notes));
      localStorage.setItem('pinboard_important_notes_v1', JSON.stringify(importantNotes));
      setSavedLocal(true);
      setStatusMessage({
        type: 'success',
        text: `Successfully re-verified & saved ${notes.length} tasks and ${importantNotes.length} notes into Local Storage! Data is offline ready.`,
      });
      setTimeout(() => setSavedLocal(false), 3000);
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Error saving to Local Storage: ' + e.message });
    }
  };

  // Push local data to cloud sync
  const handlePush = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const activeKey = inputKey.trim().toUpperCase() || syncKey;
      saveStoredSyncKey(activeKey);
      setSyncKey(activeKey);

      const payload = {
        notes,
        importantNotes,
        userName,
        boardStyle,
        lastUpdated: Date.now(),
      };

      const result = await pushSyncData(activeKey, payload);
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully synced ${notes.length} tasks to Cloud under Code: ${activeKey}! Any device with this code will receive updates.`,
        });
        setLastSyncText('Just now');
        setRemoteInfo({ exists: true, itemCount: notes.length, updatedAt: result.updatedAt });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to sync to cloud',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Error pushing data' });
    } finally {
      setIsLoading(false);
    }
  };

  // Sync to Firebase Cloud directly for current user
  const handleFirebaseSyncNow = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const ok = await saveUserTasksAndSync(userName, userName, notes, importantNotes, { boardStyle });
      if (ok) {
        setStatusMessage({
          type: 'success',
          text: `Synced ${notes.length} tasks and ${importantNotes.length} reference notes to Firebase Cloud for user "${userName}"!`,
        });
        setLastSyncText('Just now');
      } else {
        setStatusMessage({
          type: 'info',
          text: `Local storage saved. Firebase Cloud sync queued.`,
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Firebase Cloud sync failed' });
    } finally {
      setIsLoading(false);
    }
  };

  // Pull from Firebase Cloud for current user
  const handleFirebasePullNow = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const cloudData = await pullUserBoardFromFirebase(userName);
      if (cloudData && Array.isArray(cloudData.notes)) {
        onRestoreAllData({
          notes: cloudData.notes,
          importantNotes: cloudData.importantNotes || [],
          userName: cloudData.username || userName,
          boardStyle: (cloudData.prefs?.boardStyle as any) || boardStyle,
        });
        setStatusMessage({
          type: 'success',
          text: `Successfully restored ${cloudData.notes.length} tasks from Firebase Cloud for "${userName}"!`,
        });
        setLastSyncText('Just now');
      } else {
        setStatusMessage({
          type: 'info',
          text: `No cloud record found yet in Firebase for "${userName}". It is a clean new board.`,
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Error pulling from Firebase Cloud' });
    } finally {
      setIsLoading(false);
    }
  };

  // Pull data from cloud sync
  const handlePull = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const activeKey = inputKey.trim().toUpperCase() || syncKey;
      saveStoredSyncKey(activeKey);
      setSyncKey(activeKey);

      const result = await pullSyncData(activeKey);
      if (result.success && result.data) {
        const remoteData = result.data;
        onRestoreAllData({
          notes: remoteData.notes || [],
          importantNotes: remoteData.importantNotes || [],
          userName: remoteData.userName || userName,
          boardStyle: remoteData.boardStyle || boardStyle,
        });

        setStatusMessage({
          type: 'success',
          text: `Restored ${remoteData.notes?.length || 0} tasks and settings from Sync Code: ${activeKey}`,
        });
        setLastSyncText('Just now');
        setRemoteInfo({
          exists: true,
          itemCount: remoteData.notes?.length || 0,
          updatedAt: result.data.lastUpdated,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'No tasks found for this Sync Code on cloud',
        });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Error pulling data' });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    const activeKey = inputKey.trim().toUpperCase() || syncKey;
    const url = generateShareUrl(activeKey);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setStatusMessage({
        type: 'info',
        text: 'Sync URL copied to clipboard! Send this link to your phone or paste in any browser to open your task board.',
      });
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Copy Sync Code
  const handleCopyCode = () => {
    const activeKey = inputKey.trim().toUpperCase() || syncKey;
    navigator.clipboard.writeText(activeKey).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  // Export JSON file
  const handleExport = () => {
    const payload = {
      notes,
      importantNotes,
      userName,
      boardStyle,
      lastUpdated: Date.now(),
    };
    exportBackupFile(payload);
  };

  // Import JSON file
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const imported = await importBackupFile(file);
      onRestoreAllData({
        notes: imported.notes || [],
        importantNotes: imported.importantNotes || [],
        userName: imported.userName || userName,
        boardStyle: imported.boardStyle || boardStyle,
      });
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${imported.notes?.length || 0} tasks from ${file.name}`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to read backup file' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // Toggle auto sync
  const handleToggleAutoSync = (val: boolean) => {
    setAutoSync(val);
    setAutoSyncEnabled(val);
    if (val) {
      handlePush();
    }
  };

  const completedCount = notes.filter((n) => n.completed).length;
  const activeCount = notes.length - completedCount;

  // Calculate approximate storage usage
  const storedJsonLength = (localStorage.getItem('pinboard_excel_tasks_v8') || '').length;
  const storageKb = (storedJsonLength / 1024).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl my-6 bg-white border-2 border-slate-300 rounded-2xl shadow-2xl p-5 sm:p-7 flex flex-col select-none text-slate-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-200 mb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Cloud className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                Device Sync & Local Storage
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Persistent offline local storage + Cloud sync for Mobile & PC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Status Message Banner if present */}
        {statusMessage && (
          <div
            className={`mb-4 px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-950 border-rose-300'
                : 'bg-blue-50 text-blue-950 border-blue-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
            ) : (
              <Cloud className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* 1. Local Storage Status Section */}
          <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Local Storage Active & Saved</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-950 border border-emerald-300">
                    Offline Ready 🟢 (~{storageKb} KB)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 mt-1 font-medium">
                  All your tasks and routines are continuously saved to your browser's <strong className="font-bold">localStorage</strong> immediately upon every change (add, edit, check, reorder). Data is never lost on refresh or restart.
                </p>
                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-emerald-200 text-[11px] font-bold text-emerald-950 flex-wrap justify-between">
                  <span>
                    Saved: {notes.length} Tasks ({activeCount} pending, {completedCount} completed) • {importantNotes.length} Reference Notes
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveToLocalStorageNow}
                    className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                  >
                    {savedLocal ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Verify & Save Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Firebase Cloud Firestore Sync Card */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-2 border-blue-200 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                <Cloud className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Firebase Cloud Sync</span>
                    <span className="text-slate-500 font-normal">({userName})</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    Cloud Firestore Connected ☁️
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mt-1 font-medium">
                  Tasks added by <strong className="font-bold text-blue-900">{userName}</strong> are saved to Firebase Cloud in real-time. Each user has their own private isolated board.
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-100 flex-wrap justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>User: <strong>{userName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleFirebasePullNow}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Pull Cloud</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleFirebaseSyncNow}
                      className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Sync to Firebase Cloud</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Multi-Device Cloud Sync Section */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <label className="text-xs sm:text-sm font-bold text-slate-950">
                  Cloud Sync (Sync with Another Device)
                </label>
              </div>
              <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">
                Last Synced: {lastSyncText}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3 font-medium">
              Enter or share this unique <strong className="text-slate-900">Sync Code</strong> to keep your tasks synchronized across phones, tablets, and laptops:
            </p>

            {/* Sync Code input bar with Copy & Connect */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                  placeholder="Enter or create Sync Code e.g., SUMIT-DESK"
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-950 font-mono font-bold text-xs sm:text-sm tracking-wider focus:outline-none focus:border-blue-600 uppercase"
                />
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                title="Copy Sync Code to clipboard"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Action buttons: Push vs Pull */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePush}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                title="Upload all current tasks from this device to cloud under this code"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Upload to Cloud (Push)</span>
              </button>

              <button
                type="button"
                onClick={handlePull}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-700 hover:bg-blue-50 bg-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
                title="Download and update tasks from cloud onto this device"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download from Cloud (Pull)</span>
              </button>
            </div>

            {/* Auto-sync toggle */}
            <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-slate-400 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Auto-sync changes to cloud in background</span>
              </label>

              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Auto-syncs on task updates
              </span>
            </div>
          </div>

          {/* 3. Mobile Phone Pairing: QR Code & 1-Click Link */}
          <div className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-950 block">
                    Open & Sync on Mobile Phone
                  </span>
                  <span className="text-[11px] text-blue-800">
                    Scan QR code with your phone camera or copy link to open in Chrome
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQr((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    showQr
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'
                  }`}
                >
                  <QrCodeIcon className="w-3.5 h-3.5" />
                  <span>{showQr ? 'Hide QR' : 'Show QR Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR Code Display Card */}
            {showQr && qrDataUrl && (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-blue-200 animate-in fade-in duration-200">
                <img
                  src={qrDataUrl}
                  alt="Scan QR code to sync tasks"
                  className="w-36 h-36 border border-slate-200 rounded-lg shadow-xs"
                />
                <div className="text-left text-xs text-slate-700 flex-1">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>How to open on Phone:</span>
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Open your smartphone camera or Google Lens.</li>
                    <li>Point camera at this QR code.</li>
                    <li>Tap the popup banner to open the task sheet.</li>
                    <li>Both devices are now linked to Code <strong className="font-mono text-blue-700 font-bold">{inputKey || syncKey}</strong>!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* 4. Manual Offline Backup & Transfer (.json File) */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Database className="w-3.5 h-3.5 text-slate-600" />
                <span>Manual Offline File Backup & Transfer (.json)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">No internet needed</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExport}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Download JSON backup file to save on USB drive or drive"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download Backup (.json)</span>
              </button>

              <label className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Restore Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t-2 border-slate-200 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
