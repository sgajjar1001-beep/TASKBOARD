import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  LogOut,
  History,
  Lock,
  Timer,
  Settings,
  Layers,
  Moon,
  Sun,
  CheckCircle2,
} from 'lucide-react';
import { AUTO_LOCK_OPTIONS } from './LockScreenModal';

interface RadialControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onOpenHistory?: () => void;
  onOpenSettings?: () => void;
  onLockScreen?: () => void;
  onLogOff?: () => void;
  autoLockDuration?: number;
  onChangeAutoLock?: (seconds: number) => void;
  isCompactRoutineMode?: boolean;
  onToggleCompactRoutineMode?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenModesModal?: () => void;
}

interface HubItem {
  id: string;
  label: string;
  sublabel: string;
  angle: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  borderHighlight: string;
  badge?: string;
  badgeColor?: string;
  action: () => void;
}

export const RadialControlCenterModal: React.FC<RadialControlCenterModalProps> = ({
  isOpen,
  onClose,
  userName = '',
  onOpenHistory,
  onOpenSettings,
  onLockScreen,
  onLogOff,
  autoLockDuration = 120,
  onChangeAutoLock,
  isCompactRoutineMode = false,
  onToggleCompactRoutineMode,
  isDarkMode = false,
  onToggleDarkMode,
  onOpenModesModal,
}) => {
  const [hoveredItem, setHoveredItem] = useState<{ label: string; sublabel: string } | null>(null);
  const [radius, setRadius] = useState<number>(142);
  const [containerSize, setContainerSize] = useState<number>(460);

  // Dynamic responsive radius calculation:
  // Orbit radius is strictly 32% of container diameter.
  // This guarantees buttons sit precisely centered on the circular dashed track!
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const available = Math.min(w - 32, h - 140);
      const size = Math.min(Math.max(available, 330), 460);
      setContainerSize(size);
      setRadius(Math.round(size * 0.32));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentAutoLockOpt =
    AUTO_LOCK_OPTIONS.find((opt) => opt.value === autoLockDuration) || AUTO_LOCK_OPTIONS[0];

  // 5 tools arranged in perfect 72° symmetry around center with distinct highlighted borders in Day Mode
  const items: HubItem[] = [
    {
      id: 'routine-mode',
      label: 'Modes',
      sublabel: 'Customizable sliders for Calendar, Theme, Wallpaper & more',
      angle: -90, // Top (12 o'clock)
      icon: Layers,
      iconColor: 'text-[#1a73e8]',
      badge: 'MODES',
      badgeColor: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]',
      borderHighlight:
        'border-2 border-[#1a73e8] bg-blue-50/70 dark:bg-[#1a2333] dark:border-[#3b82f6] shadow-md ring-2 ring-blue-200/80 dark:ring-blue-900/50',
      action: () => {
        onClose();
        if (onOpenModesModal) {
          onOpenModesModal();
        } else {
          onToggleCompactRoutineMode?.();
        }
      },
    },
    {
      id: 'history',
      label: 'History',
      sublabel: 'Task history & activity logs',
      angle: -18, // Top-Right (72° from top)
      icon: History,
      iconColor: 'text-[#0284c7]',
      borderHighlight:
        'border-2 border-[#0284c7] bg-sky-50/70 dark:bg-[#162330] dark:border-[#38bdf8] shadow-md ring-2 ring-sky-200/80 dark:ring-sky-900/50',
      action: () => {
        onClose();
        onOpenHistory?.();
      },
    },
    {
      id: 'auto-lock',
      label: 'Auto-Lock',
      sublabel: autoLockDuration === 0 ? 'Auto-Lock is Off' : `Lock after ${currentAutoLockOpt.label}`,
      angle: 54, // Bottom-Right (72° from History)
      icon: Timer,
      iconColor: 'text-[#0d9488]',
      badge: autoLockDuration > 0 ? currentAutoLockOpt.label.split(' ')[0] : 'Off',
      badgeColor: 'bg-[#e4f7fb] text-[#129eaf] border-[#b2ebf2]',
      borderHighlight:
        'border-2 border-[#0d9488] bg-teal-50/70 dark:bg-[#142624] dark:border-[#2dd4bf] shadow-md ring-2 ring-teal-200/80 dark:ring-teal-900/50',
      action: () => {
        const idx = AUTO_LOCK_OPTIONS.findIndex((opt) => opt.value === autoLockDuration);
        const nextIdx = (idx + 1) % AUTO_LOCK_OPTIONS.length;
        onChangeAutoLock?.(AUTO_LOCK_OPTIONS[nextIdx].value);
      },
    },
    {
      id: 'lock-screen',
      label: 'Lock',
      sublabel: 'Privacy lock screen with password',
      angle: 126, // Bottom-Left (72° from Auto-Lock)
      icon: Lock,
      iconColor: 'text-[#7c3aed]',
      borderHighlight:
        'border-2 border-[#7c3aed] bg-purple-50/70 dark:bg-[#221733] dark:border-[#a855f7] shadow-md ring-2 ring-purple-200/80 dark:ring-purple-900/50',
      action: () => {
        onClose();
        onLockScreen?.();
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      sublabel: 'Preferences, sound & backup settings',
      angle: 198, // Top-Left (72° from Lock)
      icon: Settings,
      iconColor: 'text-[#475569]',
      borderHighlight:
        'border-2 border-[#475569] bg-slate-100/90 dark:bg-[#202328] dark:border-[#94a3b8] shadow-md ring-2 ring-slate-300/80 dark:ring-slate-700/50',
      action: () => {
        onClose();
        onOpenSettings?.();
      },
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-3 sm:p-5 bg-black/35 backdrop-blur-[2px] animate-in fade-in duration-150 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 
          ========================================================================
          TOP ACTION BAR: Control Hub Title + Night Mode Switch + Close Button
          ========================================================================
        */}
        <div
          style={{
            width: `${containerSize}px`,
          }}
          className="mb-2.5 sm:mb-3 flex items-center justify-between px-2 gap-2"
        >
          {/* Title Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/30 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/20 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8] animate-pulse" />
            <h2 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white tracking-wide drop-shadow-xs">
              {userName ? `${userName}'s Control Hub` : 'Control Hub'}
            </h2>
          </div>

          {/* Interactive Night Mode Switch Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDarkMode?.();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer backdrop-blur-xl ${
              isDarkMode
                ? 'bg-black/40 border-amber-400/60 text-amber-300 hover:bg-black/60'
                : 'bg-white/30 hover:bg-white/50 border-white/40 text-slate-900 font-extrabold'
            }`}
            title={isDarkMode ? 'Night Mode is ON (Click to switch to Day)' : 'Day Mode is ON (Click to turn ON Night Mode)'}
          >
            {isDarkMode ? (
              <Moon className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400 stroke-[2]" />
            )}
            <span className="text-[11px] font-black select-none">
              {isDarkMode ? 'Night Mode' : 'Day Mode'}
            </span>
            {/* Toggle switch knob */}
            <div
              className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                  isDarkMode ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/30 dark:bg-black/40 hover:bg-white/50 dark:hover:bg-black/60 text-slate-900 dark:text-white border border-white/40 dark:border-white/20 shadow-sm flex items-center justify-center transition-colors cursor-pointer backdrop-blur-xl"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.3]" />
          </button>
        </div>

        {/* 
          ========================================================================
          THE BIG CIRCLE: PERFECT GEOMETRICAL ALIGNMENT & TRANSPARENT GLASS
          ========================================================================
        */}
        <div
          style={{
            width: `${containerSize}px`,
            height: `${containerSize}px`,
          }}
          className="relative rounded-full bg-white/25 dark:bg-black/40 backdrop-blur-2xl border-4 border-white/40 dark:border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-200"
        >
          {/* Subtle Outer Safety Ring */}
          <div className="absolute inset-3 sm:inset-4 rounded-full border border-white/20 dark:border-white/10 pointer-events-none" />

          {/* Dashed Orbit Track: Matches exact button center path */}
          <div
            style={{
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute rounded-full border-2 border-dashed border-[#1a73e8]/40 dark:border-[#8ab4f8]/40 pointer-events-none"
          />

          {/* 
            ========================================================================
            CENTRE ME LOG OUT (ROUND RED LOG OUT BUTTON WITH CRISP HIGHLIGHTED RING)
            ========================================================================
          */}
          <div
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-30 flex flex-col items-center justify-center"
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogOff?.();
              }}
              onMouseEnter={() =>
                setHoveredItem({
                  label: 'Log Out',
                  sublabel: userName ? `Log out from ${userName}'s session` : 'Exit session safely',
                })
              }
              onMouseLeave={() => setHoveredItem(null)}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#d93025] hover:bg-[#b3261e] text-white border-4 border-red-200 dark:border-red-900 ring-4 ring-red-100 dark:ring-red-950/60 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer group"
              title="Log Out from Task Board"
            >
              <LogOut className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white stroke-[2.3] group-hover:rotate-12 transition-transform" />
              <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase leading-none">
                LOG OUT
              </span>
              <span className="text-[9px] text-red-100 font-medium opacity-90">
                Exit
              </span>
            </button>
          </div>

          {/* 
            ========================================================================
            5 CIRCULAR BUTTONS IN EQUAL 72° ORBIT WITH HIGHLIGHTED BORDERS
            Precise mathematical alignment: left 50% + x, top 50% + y, translate(-50%, -50%)
            ========================================================================
          */}
          {items.map((item) => {
            const rad = (item.angle * Math.PI) / 180;
            const x = Math.round(radius * Math.cos(rad));
            const y = Math.round(radius * Math.sin(rad));
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-20 flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() =>
                    setHoveredItem({
                      label: item.label,
                      sublabel: item.sublabel,
                    })
                  }
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full hover:scale-110 active:scale-95 flex flex-col items-center justify-center p-1 transition-all duration-150 cursor-pointer relative group ${item.borderHighlight}`}
                  title={item.label}
                >
                  <Icon
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.3] ${item.iconColor} transition-transform group-hover:scale-110`}
                  />
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-[#202124] dark:text-[#f1f3f4] text-center leading-none mt-1 max-w-[50px] truncate">
                    {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge && (
                    <span
                      className={`absolute -top-1 -right-1 text-[8px] sm:text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs flex items-center justify-center leading-none ${
                        item.badgeColor || 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 
          ========================================================================
          BOTTOM HOVER STATUS BANNER (OUTSIDE CIRCLE SO IT NEVER GETS CUT OFF)
          ========================================================================
        */}
        <div
          style={{ width: `${containerSize}px` }}
          className="mt-3 px-4 py-2.5 rounded-2xl bg-white/30 dark:bg-black/40 border border-white/40 dark:border-white/20 backdrop-blur-xl shadow-md flex items-center justify-center text-center transition-all"
        >
          {hoveredItem ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-100 flex-wrap justify-center">
              <span className="text-xs sm:text-sm font-black text-[#1a73e8] dark:text-[#8ab4f8]">
                {hoveredItem.label}:
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {hoveredItem.sublabel}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Hover any tool to view details or click center to Log Out</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
