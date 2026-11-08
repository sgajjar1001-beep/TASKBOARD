import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Calendar,
  Lock,
  RotateCw,
  MessageSquare,
  Image,
  Layers,
  Smartphone,
  Sliders,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { playClickSound } from '../utils/sound';

interface FloatingAssistiveWidgetProps {
  enabled: boolean;
  onOpenNewTask: () => void;
  onOpenTodaySummary: () => void;
  onLockScreen: () => void;
  onCarryForward: () => void;
  onOpenChat: () => void;
  onNextWallpaper?: () => void;
  onOpenModes: () => void;
  onOpenAndroidGuide: () => void;
  onToggleEnabled: () => void;
  muted?: boolean;
}

const STORAGE_POS_KEY = 'pinboard_assistive_touch_pos_v2';

export const FloatingAssistiveWidget: React.FC<FloatingAssistiveWidgetProps> = ({
  enabled,
  onOpenNewTask,
  onOpenTodaySummary,
  onLockScreen,
  onCarryForward,
  onOpenChat,
  onNextWallpaper,
  onOpenModes,
  onOpenAndroidGuide,
  onToggleEnabled,
  muted = false,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    // Default: right side, centered vertically
    return {
      x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 72) : 280,
      y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight / 2 - 28) : 320,
    };
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false,
  });

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Check if browser supports modern Document Picture-in-Picture
  const isDocumentPiPSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isMenuOpen) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 3500);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer, isMenuOpen]);

  // Save position on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(position));
    } catch {}
  }, [position]);

  // Handle window resize boundaries
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 68),
        y: Math.min(Math.max(20, prev.y), window.innerHeight - 68),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!enabled) return null;

  // Pointer drag handling (unified mouse & touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMenuOpen) return;
    setIsDragging(true);
    resetIdleTimer();

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      moved: false,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStartRef.current.moved = true;
    }

    if (dragStartRef.current.moved) {
      const newX = Math.max(10, Math.min(window.innerWidth - 64, dragStartRef.current.initX + deltaX));
      const newY = Math.max(20, Math.min(window.innerHeight - 64, dragStartRef.current.initY + deltaY));
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // If it was just a tap (not dragged), toggle menu
    if (!dragStartRef.current.moved) {
      playClickSound(muted);
      setIsMenuOpen((prev) => !prev);
    } else {
      // Gentle snap to nearest edge
      const snapToRight = position.x > window.innerWidth / 2;
      const snappedX = snapToRight ? window.innerWidth - 64 : 12;
      setPosition((prev) => ({ ...prev, x: snappedX }));
    }
  };

  // Launch Native Document Picture-in-Picture window if supported
  const handleLaunchPiP = async () => {
    if (!isDocumentPiPSupported) {
      onOpenAndroidGuide();
      return;
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 340,
        height: 480,
      });

      // Copy stylesheets to PiP window
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.type = styleSheet.type;
            link.media = styleSheet.media;
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = pipWindow.document.createElement('style');
            Array.from(styleSheet.cssRules).forEach((rule) => {
              style.appendChild(pipWindow.document.createTextNode(rule.cssText));
            });
            pipWindow.document.head.appendChild(style);
          }
        } catch {}
      });

      // Add container in PiP
      const container = pipWindow.document.createElement('div');
      container.id = 'pip-floating-root';
      container.className = 'p-3 bg-[#f8f9fa] dark:bg-[#202124] min-h-screen font-sans text-xs';
      container.innerHTML = `
        <div style="font-family: -apple-system, sans-serif; padding: 12px; background: white; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); border: 1px solid #dadce0;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <strong style="color: #1a73e8; font-size: 13px;">Pinboard Mini Float</strong>
            <span style="font-size: 10px; background: #e8f0fe; color: #1a73e8; padding: 2px 6px; border-radius: 8px; font-weight: bold;">Always on Top</span>
          </div>
          <p style="font-size: 11px; color: #5f6368; margin: 0 0 10px 0;">Floating over all desktop apps!</p>
          <button id="pip-add-btn" style="width: 100%; padding: 8px; background: #1a73e8; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 11px; margin-bottom: 6px;">
            + Add New Task
          </button>
          <button id="pip-today-btn" style="width: 100%; padding: 8px; background: #f1f3f4; color: #202124; border: 1px solid #dadce0; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 11px;">
            📋 Open Today's Sheet
          </button>
        </div>
      `;

      pipWindow.document.body.appendChild(container);

      pipWindow.document.getElementById('pip-add-btn')?.addEventListener('click', () => {
        window.focus();
        onOpenNewTask();
      });

      pipWindow.document.getElementById('pip-today-btn')?.addEventListener('click', () => {
        window.focus();
        onOpenTodaySummary();
      });

      setIsMenuOpen(false);
    } catch (err) {
      console.warn('PiP launch error, showing guide:', err);
      onOpenAndroidGuide();
    }
  };

  return createPortal(
    <>
      {/* 1. Main Draggable Floating Bubble (iPhone AssistiveTouch style) */}
      <div
        ref={widgetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsIdle(false)}
        onTouchStart={resetIdleTimer}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: 'none',
        }}
        className={`fixed top-0 left-0 z-[99998] select-none cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
          isIdle && !isMenuOpen ? 'opacity-40 hover:opacity-100' : 'opacity-100'
        }`}
        title="Assistive Touch: Drag anywhere or tap for quick actions"
      >
        <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-black/60 dark:bg-black/80 backdrop-blur-xl border-2 border-white/40 dark:border-white/20 shadow-2xl flex items-center justify-center p-2 transition-transform duration-150 hover:scale-105 active:scale-95 group">
          {/* AssistiveTouch Concentric Ring Aesthetic */}
          <div className="w-8 h-8 rounded-full border border-white/50 flex items-center justify-center shadow-inner group-hover:border-white transition-colors">
            <div className="w-4.5 h-4.5 rounded-full bg-white/90 shadow-sm flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
            </div>
          </div>

          {/* Quick notification glow dot */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1a73e8] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1a73e8] border border-white" />
          </span>
        </div>
      </div>

      {/* 2. Expanded AssistiveTouch Radial / Grid Menu (iOS style) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            playClickSound(muted);
            setIsMenuOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-xs sm:max-w-sm bg-black/80 dark:bg-zinc-950/90 backdrop-blur-2xl border border-white/25 rounded-3xl p-5 shadow-2xl text-white flex flex-col items-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-white/15">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
                <span className="text-xs font-black tracking-wider uppercase text-slate-200">
                  Assistive Touch
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Quick Actions Grid (Icon + Label in circular cards) */}
            <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
              {/* 1. Add Task */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onOpenNewTask();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center mb-1.5 border border-blue-400/40 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">New Task</span>
              </button>

              {/* 2. Today's Tasks */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onOpenTodaySummary();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center mb-1.5 border border-emerald-400/40 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xs">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">Today's List</span>
              </button>

              {/* 3. Lock Screen */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onLockScreen();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/30 text-rose-300 flex items-center justify-center mb-1.5 border border-rose-400/40 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-xs">
                  <Lock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">Lock App</span>
              </button>

              {/* 4. Carry Forward */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onCarryForward();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center mb-1.5 border border-amber-400/40 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs">
                  <RotateCw className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">Carry Fwd</span>
              </button>

              {/* 5. Team Chat */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onOpenChat();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/30 text-cyan-300 flex items-center justify-center mb-1.5 border border-cyan-400/40 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-xs">
                  <MessageSquare className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">Team Chat</span>
              </button>

              {/* 6. Next Wallpaper */}
              {onNextWallpaper && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(muted);
                    onNextWallpaper();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center mb-1.5 border border-indigo-400/40 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-xs">
                    <Image className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-bold leading-tight text-slate-200">Wallpaper</span>
                </button>
              )}

              {/* 7. Float Over Apps (Picture-in-Picture) */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  handleLaunchPiP();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
                title="Float over other apps on screen"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center mb-1.5 border border-purple-400/40 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-xs">
                  <Layers className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">Float Apps</span>
              </button>

              {/* 8. Android APK Permissions Guide */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onOpenAndroidGuide();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-teal-500/30 text-teal-300 flex items-center justify-center mb-1.5 border border-teal-400/40 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-xs">
                  <Smartphone className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">APK Setup</span>
              </button>

              {/* 9. Modes Hub */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                  onOpenModes();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer hover:scale-105 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-500/30 text-slate-300 flex items-center justify-center mb-1.5 border border-slate-400/40 group-hover:bg-slate-500 group-hover:text-white transition-all shadow-xs">
                  <Sliders className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-bold leading-tight text-slate-200">Settings</span>
              </button>
            </div>

            {/* Bottom Dismiss Button */}
            <div className="w-full mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate">Drag bubble to reposition</span>
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setIsMenuOpen(false);
                }}
                className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
