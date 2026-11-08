import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Layers,
  Calendar,
  Moon,
  Sun,
  FileSpreadsheet,
  RotateCw,
  Bell,
  Volume2,
  VolumeX,
  StickyNote,
  Info,
  CheckCircle2,
  Image,
  RefreshCw,
} from 'lucide-react';

export interface ModesState {
  isCalendarEnabled: boolean;
  isCompactRoutineMode: boolean;
  isDarkMode: boolean;
  autoCarryForward: boolean;
  isReminderEnabled: boolean;
  isSoundEnabled: boolean;
}

interface ModesControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCalendarEnabled: boolean;
  onToggleCalendar: () => void;
  isCompactRoutineMode: boolean;
  onToggleCompactRoutineMode: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  autoCarryForward: boolean;
  onToggleAutoCarryForward: () => void;
  muted: boolean;
  onToggleMute?: () => void;
  isReminderEnabled?: boolean;
  onToggleReminder?: () => void;
  onRequestNotificationPermission?: () => void;
  notificationPermission?: 'default' | 'granted' | 'denied' | 'unsupported';
  isBingWallpaperEnabled?: boolean;
  onToggleBingWallpaper?: () => void;
  onNextWallpaper?: () => void;
}

export const ModesControlModal: React.FC<ModesControlModalProps> = ({
  isOpen,
  onClose,
  isCalendarEnabled,
  onToggleCalendar,
  isCompactRoutineMode,
  onToggleCompactRoutineMode,
  isDarkMode,
  onToggleDarkMode,
  autoCarryForward,
  onToggleAutoCarryForward,
  muted,
  onToggleMute,
  isReminderEnabled = true,
  onToggleReminder,
  onRequestNotificationPermission,
  notificationPermission = 'default',
  isBingWallpaperEnabled = true,
  onToggleBingWallpaper,
  onNextWallpaper,
}) => {
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleNote = (id: string) => {
    setExpandedNoteId((prev) => (prev === id ? null : id));
  };

  const modeItems = [
    {
      id: 'calendar',
      title: 'Calendar Task Board',
      subtitle: isCalendarEnabled ? 'Calendar board is visible' : 'Calendar board is hidden (Routine only)',
      icon: Calendar,
      iconColor: 'text-[#1a73e8] dark:text-[#8ab4f8]',
      iconBg: 'bg-blue-100 dark:bg-blue-950/80',
      active: isCalendarEnabled,
      onToggle: onToggleCalendar,
      noteText:
        'Optionally enables or disables the interactive Calendar Task Board alongside Routine Tasks. When OFF, Routine Tasks expand across the full screen with zero clutter. When ON, shows monthly dates & weekly schedule board.',
    },
    {
      id: 'compact-routine',
      title: 'Compact Timeline Mode',
      subtitle: isCompactRoutineMode ? 'Single timeline view active' : 'Multi-section grid view active',
      icon: Layers,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-950/80',
      active: isCompactRoutineMode,
      onToggle: onToggleCompactRoutineMode,
      noteText:
        'Consolidates all tasks into a unified chronological stream (Overdue, Today, Tomorrow, Upcoming). Ideal for quick linear checking.',
    },
    {
      id: 'dark-mode',
      title: 'Night / Dark Mode',
      subtitle: isDarkMode ? 'Night theme active' : 'Day theme active',
      icon: isDarkMode ? Moon : Sun,
      iconColor: 'text-amber-500 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-950/80',
      active: isDarkMode,
      onToggle: onToggleDarkMode,
      noteText:
        'Toggles high-contrast night palette with dark surfaces, glowing badges, and soft text to protect eyes in low-light environments.',
    },
    {
      id: 'auto-carry',
      title: 'Auto Carry-Forward',
      subtitle: autoCarryForward ? 'Unfinished tasks roll over' : 'Manual rollover only',
      icon: RotateCw,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80',
      active: autoCarryForward,
      onToggle: onToggleAutoCarryForward,
      noteText:
        'When enabled, any pending daily tasks from previous days automatically roll forward into today’s task list so you never lose track of work.',
    },
    {
      id: 'reminders',
      title: 'Task Reminder Alerts & Notifications',
      subtitle: isReminderEnabled ? 'Reminders & alarms active' : 'Reminders muted',
      icon: Bell,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-950/80',
      active: isReminderEnabled,
      onToggle: () => onToggleReminder?.(),
      noteText:
        'Triggers timely notifications and audio chime alerts on your PC and mobile device when a scheduled task time arrives. Click the note button to enable system permissions.',
      hasPermissionAction: notificationPermission === 'default',
    },
    {
      id: 'sound',
      title: 'Audio Feedback & Chimes',
      subtitle: !muted ? 'Sound enabled' : 'Muted',
      icon: !muted ? Volume2 : VolumeX,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/80',
      active: !muted,
      onToggle: onToggleMute,
      noteText:
        'Plays subtle, pleasant audio feedback upon completing tasks, pinning, or receiving live shared assignments.',
    },
    {
      id: 'bing-wallpaper',
      title: 'Microsoft Bing Daily Wallpaper',
      subtitle: isBingWallpaperEnabled ? 'Daily wallpaper is active' : 'Clean solid background',
      icon: Image,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/80',
      active: Boolean(isBingWallpaperEnabled),
      onToggle: () => onToggleBingWallpaper?.(),
      noteText:
        'Connects directly to Microsoft Bing Picture of the Day to automatically update your board background every day with high-resolution landscapes & nature scenery. Features a subtle overlay for perfect task contrast and readability.',
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white/35 dark:bg-black/45 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-white/40 dark:border-white/20 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/80 dark:bg-blue-950/80 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shadow-xs backdrop-blur-xs">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black leading-snug drop-shadow-xs">
                  Board Modes & Controls
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50/80 text-[#1a73e8] dark:bg-blue-950/60 dark:text-[#8ab4f8] border border-blue-200 dark:border-blue-800 backdrop-blur-xs">
                  Customizable
                </span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-bold mt-0.5">
                Toggle modes with sliders & tap note icon for details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close modes modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Items List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {modeItems.map((item) => {
            const Icon = item.icon;
            const isNoteExpanded = expandedNoteId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  item.active
                    ? 'bg-white/40 dark:bg-black/35 border-white/45 dark:border-white/20 shadow-xs backdrop-blur-md'
                    : 'bg-white/20 dark:bg-black/20 border-white/25 dark:border-white/10 opacity-90 backdrop-blur-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Icon & Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-[#202124] dark:text-[#f1f3f4] truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate mt-0.2">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Note Icon Button + Toggle Slider Switch */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Manual Next Wallpaper Button if Bing Wallpaper is Active */}
                    {item.id === 'bing-wallpaper' && isBingWallpaperEnabled && onNextWallpaper && (
                      <button
                        type="button"
                        onClick={onNextWallpaper}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 border border-cyan-400/40 text-cyan-800 dark:text-cyan-200 text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                        title="Click to manually change to next Bing wallpaper"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-600 dark:text-cyan-300" />
                        <span>Change</span>
                      </button>
                    )}

                    {/* Small Note Icon Button */}
                    <button
                      type="button"
                      onClick={() => toggleNote(item.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isNoteExpanded
                          ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 shadow-xs'
                          : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0] hover:bg-amber-50 hover:text-amber-700 dark:bg-[#303134] dark:text-[#9aa0a6] dark:border-[#424448]'
                      }`}
                      title="Tap to read mode note / details"
                    >
                      <StickyNote className="w-4 h-4 stroke-[2.2]" />
                    </button>

                    {/* Toggle Slider Switch (iOS / Material style) */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.active}
                      onClick={item.onToggle}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.active
                          ? 'bg-[#1a73e8] dark:bg-[#8ab4f8]'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          item.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expandable Note Box with Warm Sticky-Note Styling */}
                {isNoteExpanded && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-[#2a2717] border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-100 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-bold text-sm shrink-0 mt-0.5">
                        📝 Note:
                      </span>
                      <p className="leading-relaxed flex-1">{item.noteText}</p>
                    </div>

                    {item.hasPermissionAction && (
                      <div className="pt-1.5 flex items-center justify-between border-t border-amber-200 dark:border-amber-800">
                        <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          Browser notification permission: {notificationPermission}
                        </span>
                        <button
                          type="button"
                          onClick={onRequestNotificationPermission}
                          className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-2xs"
                        >
                          Enable Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f8f9fa] dark:bg-[#252628] border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
            All mode preferences are auto-saved
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
