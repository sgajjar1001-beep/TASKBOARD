import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Search,
  X,
  CheckCircle2,
  Plus,
  LayoutGrid,
  MessageSquare,
} from 'lucide-react';
import { RadialControlCenterModal } from './RadialControlCenterModal';

interface HeaderProps {
  userName?: string;
  onOpenNewTask: () => void;
  onOpenHistory?: () => void;
  onOpenNotes?: () => void;
  importantNotesCount?: number;
  onOpenSettings?: () => void;
  onLockScreen?: () => void;
  onLogOff?: () => void;
  autoLockDuration?: number;
  onChangeAutoLock?: (seconds: number) => void;
  isCompactRoutineMode?: boolean;
  onToggleCompactRoutineMode?: () => void;
  onOpenDeviceSync?: () => void;
  onOpenChat?: () => void;
  onOpenSharedTasks?: () => void;
  onOpenProfile?: () => void;
  userDesignation?: string;
  userAvatarUrl?: string;
  pendingSharedTasksCount?: number;
  syncStatus?: 'synced' | 'syncing' | 'idle' | 'offline';
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  counts: {
    all: number;
    completed: number;
    todayTotal?: number;
    todayCompleted?: number;
    totalAll?: number;
    completedAll?: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenTaskSummary?: () => void;
  onOpenModesModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = '',
  onOpenNewTask,
  onOpenHistory,
  onOpenNotes,
  importantNotesCount = 0,
  onOpenSettings,
  onLockScreen,
  onLogOff,
  autoLockDuration = 120,
  onChangeAutoLock,
  isCompactRoutineMode = false,
  onToggleCompactRoutineMode,
  onOpenDeviceSync,
  onOpenChat,
  onOpenSharedTasks,
  onOpenProfile,
  userDesignation,
  userAvatarUrl,
  pendingSharedTasksCount = 0,
  syncStatus = 'synced',
  isDarkMode = false,
  onToggleDarkMode,
  counts,
  searchQuery = '',
  onSearchChange,
  onOpenTaskSummary,
  onOpenModesModal,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  const [isControlCenterOpen, setIsControlCenterOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fullDateString = currentDateTime.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const shortDateString = currentDateTime.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  // Circular Percentage Progress Calculations (Only Today's tasks)
  const todayTotal = counts.todayTotal !== undefined ? counts.todayTotal : counts.all;
  const todayCompleted =
    counts.todayCompleted !== undefined ? counts.todayCompleted : counts.completed;
  const percentage =
    todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const isAllDone = todayTotal > 0 && todayCompleted === todayTotal;

  // SVG circular progress ring geometry: r=15 => circumference = 2 * PI * 15 ≈ 94.25
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    todayTotal > 0 ? circumference - (percentage / 100) * circumference : circumference;

  // Small SVG for mobile pill: r=10 => circumference = 2 * PI * 10 ≈ 62.83
  const mobileRadius = 10;
  const mobileCircumference = 2 * Math.PI * mobileRadius;
  const mobileStrokeDashoffset =
    todayTotal > 0 ? mobileCircumference - (percentage / 100) * mobileCircumference : mobileCircumference;

  return (
    <header className="bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 px-3 sm:px-5 py-2 select-none sticky top-0 z-30 transition-all">
      {/* ========================================================
          DESKTOP & TABLET VIEW (md and up: 768px+)
          Single spacious row with Left, Center (Search + Progress), Right (Icons)
          ======================================================== */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Left: Brand & Date info (Clickable to Edit Profile) */}
        <div
          onClick={onOpenProfile}
          className={`flex items-center gap-3 shrink-0 ${
            onOpenProfile ? 'cursor-pointer group' : ''
          }`}
          title={onOpenProfile ? 'Click to view or edit your profile, photo & designation' : undefined}
        >
          <div className="relative w-8.5 h-8.5 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-white/30 dark:border-white/20 shadow-2xs group-hover:ring-2 group-hover:ring-[#1a73e8]/40 transition-all bg-white/25 dark:bg-white/10 backdrop-blur-xs">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center font-extrabold text-xs">
                {(userName.trim() || 'P').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight text-slate-950 dark:text-white group-hover:text-[#1a73e8] transition-colors truncate max-w-[200px] drop-shadow-xs">
              {userName.trim() ? `${userName.trim()}'s Work Board` : 'Work Board'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-100 font-extrabold drop-shadow-2xs">
              <Calendar className="w-3 h-3 text-[#1a73e8] dark:text-[#8ab4f8]" />
              <span>{fullDateString}</span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar & Circular Percentage Progress Indicator */}
        <div className="flex items-center gap-3 flex-1 justify-center max-w-lg">
          {onSearchChange && (
            <div className="relative w-48 lg:w-64">
              <div className="relative flex items-center w-full">
                <Search className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 absolute left-2.5 pointer-events-none" />
                <input
                  id="header-task-search-input"
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-7.5 pr-6 py-1 bg-white/25 dark:bg-black/25 hover:bg-white/35 dark:hover:bg-black/40 focus:bg-white/80 dark:focus:bg-zinc-900 border border-white/35 dark:border-white/20 focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#1a73e8]/20 rounded-full text-xs text-slate-950 dark:text-white placeholder:text-slate-700 dark:placeholder:text-slate-300 transition-all font-black backdrop-blur-md"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-1.5 p-0.5 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <kbd className="absolute right-2 hidden lg:inline-flex items-center text-[9px] font-mono text-slate-800 dark:text-slate-200 bg-white/40 dark:bg-white/10 border border-white/30 dark:border-white/20 px-1 py-0.2 rounded shadow-2xs pointer-events-none">
                    /
                  </kbd>
                )}
              </div>
            </div>
          )}

          {/* Circular Percentage Indicator (Today's Tasks) - Click to open Notes Excel sheet summary */}
          <button
            type="button"
            onClick={onOpenTaskSummary}
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/25 dark:bg-black/25 hover:bg-white/35 dark:hover:bg-black/40 border border-white/35 dark:border-white/20 transition-all shrink-0 shadow-2xs group relative cursor-pointer active:scale-95 text-left backdrop-blur-md"
            title={`Click to view Today's Task Breakdown: ${percentage}% (${todayCompleted} of ${todayTotal} completed for today)`}
          >
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <svg className="w-9 h-9 -rotate-90 transform" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  className="stroke-slate-300 dark:stroke-slate-600"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  className={`transition-all duration-500 ease-out ${
                    isAllDone ? 'stroke-[#188038] dark:stroke-[#34a853]' : 'stroke-[#1a73e8] dark:stroke-[#8ab4f8]'
                  }`}
                  strokeWidth="3.2"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-[10px] font-extrabold ${
                  isAllDone ? 'text-[#188038] dark:text-[#34a853]' : 'text-slate-900 dark:text-white'
                }`}
              >
                {percentage}%
              </span>
            </div>

            <div className="flex flex-col text-left leading-tight">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="text-sm font-black text-[#1a73e8] dark:text-[#8ab4f8]">
                  {todayCompleted}/{todayTotal}
                </span>
                <span className="text-[10px] font-extrabold text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#1a73e8]/30 border border-[#d2e3fc] dark:border-[#1a73e8]/50 px-1.5 py-0.2 rounded uppercase tracking-wider">
                  Today
                </span>
              </span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                {isAllDone && todayTotal > 0 ? (
                  <span className="text-[#188038] dark:text-[#34a853] font-black flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Today Done! 🎉</span>
                  </span>
                ) : (
                  <span>Today's Total: {todayTotal}</span>
                )}
              </span>
            </div>
          </button>
        </div>

        {/* Right Controls: Desktop Icon Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Team Baat-Chit & Mini Chat Button */}
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/25 dark:bg-black/25 hover:bg-white/35 dark:hover:bg-black/40 text-slate-900 dark:text-white hover:text-[#1a73e8] border border-white/35 dark:border-white/20 flex items-center justify-center shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-95 backdrop-blur-md"
              title="Team Baat-Chit (Mini Chat & Discussions)"
            >
              <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-[#1f2022]" />
              </span>
            </button>
          )}

          {/* Control Hub Icon-only Button */}
          <button
            type="button"
            onClick={() => setIsControlCenterOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/25 dark:bg-black/25 hover:bg-white/35 dark:hover:bg-black/40 text-slate-900 dark:text-white hover:text-[#1a73e8] border border-white/35 dark:border-white/20 flex items-center justify-center shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-95 backdrop-blur-md"
            title="Control Hub"
          >
            <LayoutGrid className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#1a73e8] dark:text-[#8ab4f8] group-hover:rotate-45 transition-transform duration-300 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* ========================================================
          MOBILE VIEW (< md: under 768px)
          Arranged into two clear, clean, purpose-built rows:
          Row 1: Profile + Date on left | Progress Ring + Chat + Share + Sync + Hub on right
          Row 2: Full-width Search Bar + Quick Add Task Button
          ======================================================== */}
      <div className="flex md:hidden flex-col gap-2">
        {/* Mobile Row 1: Profile Brand + Action Icons (Strictly 1 line, zero wrap) */}
        {/* Mobile Row 1: Profile Brand + Action Icons (Strictly 1 line, zero wrap) */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Mobile Left: Profile Avatar & Title */}
          <div
            onClick={onOpenProfile}
            className={`flex items-center gap-2 min-w-0 ${
              onOpenProfile ? 'cursor-pointer active:opacity-80' : ''
            }`}
            title="Edit Profile"
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-slate-300/80 dark:border-white/20 shadow-2xs bg-white/60 dark:bg-white/10 backdrop-blur-xs">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center font-extrabold text-xs">
                  {(userName.trim() || 'P').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-xs xs:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[105px] xs:max-w-[135px]">
                {userName.trim() ? userName.trim() : 'Work Board'}
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-slate-700 dark:text-slate-200 font-bold truncate">
                <Calendar className="w-2.5 h-2.5 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
                <span className="truncate">{shortDateString}</span>
              </div>
            </div>
          </div>

          {/* Mobile Right: Icon Group (Compact, perfectly spaced) */}
          <div className="flex items-center gap-1 xs:gap-1.5 shrink-0">
            {/* Mobile Today's Progress Badge - Click to open Today's Task Breakdown */}
            <button
              type="button"
              onClick={onOpenTaskSummary}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-300/80 dark:border-white/20 shadow-2xs cursor-pointer active:scale-95 transition-all text-left backdrop-blur-xs"
              title={`Today: ${todayCompleted}/${todayTotal} (${percentage}%) - Click for Task List`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 -rotate-90 transform" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r={mobileRadius}
                    className="stroke-slate-300 dark:stroke-slate-600"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={mobileRadius}
                    className={`transition-all duration-500 ease-out ${
                      isAllDone ? 'stroke-[#188038] dark:stroke-[#34a853]' : 'stroke-[#1a73e8] dark:stroke-[#8ab4f8]'
                    }`}
                    strokeWidth="2.5"
                    strokeDasharray={mobileCircumference}
                    strokeDashoffset={mobileStrokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-[8px] font-black ${
                    isAllDone ? 'text-[#188038] dark:text-[#34a853]' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {percentage}%
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-[#1a73e8] dark:text-[#8ab4f8] hidden min-[360px]:inline">
                {todayCompleted}/{todayTotal}
              </span>
            </button>

            {/* Mobile Chat Button */}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="relative w-7.5 h-7.5 xs:w-8 xs:h-8 rounded-lg bg-white/60 dark:bg-black/30 text-slate-800 dark:text-white border border-slate-300/80 dark:border-white/20 flex items-center justify-center shadow-2xs active:scale-95 transition-all backdrop-blur-xs"
                title="Mini Chat & Share"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white dark:border-[#1f2022]" />
                </span>
              </button>
            )}

            {/* Mobile Control Hub Button */}
            <button
              type="button"
              onClick={() => setIsControlCenterOpen(true)}
              className="w-7.5 h-7.5 xs:w-8 xs:h-8 rounded-lg bg-white/60 dark:bg-black/30 text-slate-800 dark:text-white border border-slate-300/80 dark:border-white/20 flex items-center justify-center shadow-2xs active:scale-95 transition-all backdrop-blur-xs"
              title="Control Hub"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8] stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Mobile Row 2: Full-Width Search Bar + Quick Add Task Button */}
        <div className="flex items-center gap-2 w-full pt-0.5">
          {onSearchChange && (
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tasks, subtasks, notes..."
                className="w-full pl-8 pr-7 py-1.5 bg-white/60 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/50 focus:bg-white dark:focus:bg-[#202124] border border-slate-300/80 dark:border-white/20 focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#1a73e8]/20 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 transition-all font-bold backdrop-blur-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Mobile Quick Add Task Button */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="h-7.5 xs:h-8 px-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center gap-1 text-xs font-bold shadow-2xs shrink-0 active:scale-95 transition-all cursor-pointer"
            title="Create New Task"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] font-bold">New</span>
          </button>
        </div>
      </div>

      {/* Radial Control Center Modal */}
      <RadialControlCenterModal
        isOpen={isControlCenterOpen}
        onClose={() => setIsControlCenterOpen(false)}
        userName={userName}
        onOpenHistory={onOpenHistory}
        onOpenSettings={onOpenSettings}
        onLockScreen={onLockScreen}
        onLogOff={onLogOff}
        autoLockDuration={autoLockDuration}
        onChangeAutoLock={onChangeAutoLock}
        isCompactRoutineMode={isCompactRoutineMode}
        onToggleCompactRoutineMode={onToggleCompactRoutineMode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onOpenModesModal={onOpenModesModal}
      />
    </header>
  );
};
