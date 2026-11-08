import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Key,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { playUnlockSound } from '../utils/sound';
import { verifyUserPasswordForUnlock } from '../services/authService';

interface LockScreenModalProps {
  isOpen: boolean;
  userName: string;
  onUnlock: () => void;
  onLogOff: () => void;
  autoLockDuration: number;
  onChangeAutoLock: (seconds: number) => void;
  muted?: boolean;
  bingWallpaperUrl?: string;
}

export const AUTO_LOCK_OPTIONS = [
  { label: 'Off (Never)', value: 0 },
  { label: '30 Seconds', value: 30 },
  { label: '1 Minute', value: 60 },
  { label: '2 Minutes', value: 120 },
  { label: '5 Minutes', value: 300 },
  { label: '10 Minutes', value: 600 },
  { label: '15 Minutes', value: 900 },
];

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  isOpen,
  userName,
  onUnlock,
  onLogOff,
  muted = false,
  bingWallpaperUrl,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Live digital clock
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset form & autofocus input on open
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setIsVerifying(false);
      setIsUnlocking(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const performUnlock = () => {
    setIsUnlocking(true);
    playUnlockSound(muted);
    setTimeout(() => {
      onUnlock();
      setIsUnlocking(false);
    }, 300);
  };

  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying || isUnlocking) return;

    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMsg('Enter password');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const isCorrect = await verifyUserPasswordForUnlock(cleanPass);
      if (!isCorrect) {
        setErrorMsg('Incorrect password');
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      setErrorMsg('');
      performUnlock();
    } catch {
      setErrorMsg('Verification failed');
      setIsVerifying(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none animate-in fade-in duration-200 overflow-hidden">
      {/* Microsoft Bing Daily Wallpaper background layer */}
      {bingWallpaperUrl && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${bingWallpaperUrl})` }}
        />
      )}

      {/* Subtle translucent dark glass backdrop - allows wallpaper to shine through */}
      <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] pointer-events-none" />

      {/* 
        ========================================================================
        SLEEK CIRCULAR TRANSPARENT LOCK SCREEN
        - Pure circle geometry (rounded-full aspect-square)
        - Glassmorphic transparency with backdrop blur
        - Pressing Enter in input unlocks seamlessly
        - Completely uncluttered: NO "Enter to unlock" text, NO "Unlock Phone"
        ========================================================================
      */}
      <div
        className={`relative z-10 w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] rounded-full bg-white/20 dark:bg-black/35 backdrop-blur-2xl border-2 border-white/40 dark:border-white/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-6 sm:p-7 flex flex-col items-center justify-between text-center overflow-hidden ring-1 ring-black/10 dark:ring-white/10 transition-all duration-300 ${
          isUnlocking
            ? 'scale-110 opacity-0 pointer-events-none'
            : 'scale-100 opacity-100'
        }`}
      >
        {/* Top: Minimal Lock Status Icon & User Name */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/40 dark:bg-white/10 border border-white/30 dark:border-white/20 shadow-xs backdrop-blur-sm mt-1">
          <Lock className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8] stroke-[2.4]" />
          <span className="text-xs font-black text-slate-950 dark:text-white tracking-tight">
            {userName || 'Locked'}
          </span>
        </div>

        {/* Center: Live Digital Clock */}
        <div className="my-auto py-1">
          <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-slate-950 dark:text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            {formattedTime}
          </div>
          <div className="text-[11px] sm:text-xs text-slate-900 dark:text-slate-200 font-extrabold tracking-wide mt-0.5">
            {formattedDate}
          </div>
        </div>

        {/* Center/Bottom: Password Input Form (Enter to unlock, zero extra instructional text) */}
        <form onSubmit={handleUnlockSubmit} className="w-full max-w-[210px] space-y-1.5 my-auto">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-700 dark:text-slate-300">
              <Key className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
            </div>

            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUnlockSubmit();
                }
              }}
              placeholder="PIN / Password"
              autoFocus
              className="w-full pl-7 pr-15 py-1.5 bg-white/70 dark:bg-black/50 hover:bg-white/85 dark:hover:bg-black/70 focus:bg-white dark:focus:bg-zinc-900 border border-white/60 dark:border-white/30 rounded-full text-xs text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/30 transition-all text-center font-bold shadow-xs backdrop-blur-sm"
            />

            {/* Toggle show password */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-8 inset-y-0 px-1 flex items-center text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>

            {/* Arrow submit button */}
            <button
              type="submit"
              disabled={isVerifying || isUnlocking}
              className="absolute right-1 w-6 h-6 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white flex items-center justify-center cursor-pointer transition-all shadow-xs disabled:opacity-50"
            >
              {isVerifying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowRight className="w-3 h-3 stroke-[2.6]" />
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold leading-tight animate-in fade-in bg-rose-50/90 dark:bg-rose-950/70 py-0.5 px-2 rounded-full border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </p>
          )}
        </form>

        {/* Bottom: Subtle Log Out */}
        <div className="w-full flex justify-center mb-1">
          <button
            type="button"
            onClick={onLogOff}
            className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-700 font-extrabold cursor-pointer transition-colors"
          >
            <LogOut className="w-3 h-3 stroke-[2.2]" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
