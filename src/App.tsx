import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ExcelThreeColumnBoard } from './components/ExcelThreeColumnBoard';
import { CompactRoutineBoard } from './components/CompactRoutineBoard';
import { ColumnsBoard } from './components/ColumnsBoard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { NewTaskModal } from './components/NewTaskModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { HistoryCalendarModal } from './components/HistoryCalendarModal';
import { StartupLoginFlow } from './components/StartupLoginFlow';
import { LockScreenModal } from './components/LockScreenModal';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { TeamMiniChatModal } from './components/TeamMiniChatModal';
import { TaskShareAssignModal } from './components/TaskShareAssignModal';
import { SharedTasksDrawer } from './components/SharedTasksDrawer';
import { UserProfileModal } from './components/UserProfileModal';
import { FloatingChatButton } from './components/FloatingChatButton';
import { TodayTaskSummaryModal } from './components/TodayTaskSummaryModal';
import { ModesControlModal } from './components/ModesControlModal';
import { TaskReminderAlertModal } from './components/TaskReminderAlertModal';
import { FloatingAssistiveWidget } from './components/FloatingAssistiveWidget';
import { AndroidOverlayPermissionModal } from './components/AndroidOverlayPermissionModal';
import {
  fetchBingDailyWallpaper,
  getBingWallpaperEnabled,
  setBingWallpaperEnabled,
  getInitialBingWallpaper,
  getNextBingWallpaper,
  BingWallpaperData,
} from './services/bingWallpaperService';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification,
  playReminderChime,
  hasReminderFired,
  markReminderFired,
  NotificationPermissionState,
} from './services/notificationService';
import { Share2, X, RefreshCw } from 'lucide-react';
import { subscribeToSharedTasks } from './services/collaborationService';
import {
  getStoredSyncKey,
  getAutoSyncEnabled,
  pushSyncData,
  pullSyncData,
  checkSyncStatus,
  getLastSyncedTime,
} from './services/syncService';
import { testFirebaseConnection } from './services/firebase';
import { subscribeToAuthState, logoutUser } from './services/authService';
import {
  loadUserTasks,
  saveUserTasksAndSync,
  getActiveUser,
  setActiveUser,
  getUserProfile,
  getUserTasksStorageKey,
  getUserNotesStorageKey,
  upsertFirebaseUserAccount,
} from './services/userService';
import {
  TaskNote,
  TaskCadence,
  RoutineTaskType,
  NoteColor,
  BoardStyle,
  BackupData,
  ImportantNote,
  TaskPriority,
  SubTask,
} from './types';
import { INITIAL_NOTES, ROUTINE_TASKS_LIST } from './constants';
import {
  getTodayString,
  formatCurrentTimestamp,
  isTaskPendingFromPreviousDay,
  isTaskForToday,
} from './utils/date';
import {
  playPinSound,
  playUnpinSound,
  playTaskCompleteSound,
  playClickSound,
  playLockSound,
} from './utils/sound';

const STORAGE_KEY = 'pinboard_excel_tasks_v8';
const STORAGE_PREFS_KEY = 'pinboard_excel_prefs_v7';
const IMPORTANT_NOTES_STORAGE_KEY = 'pinboard_important_notes_v1';
const AUTO_LOCK_STORAGE_KEY = 'pinboard_auto_lock_seconds_v1';

const INITIAL_IMPORTANT_NOTES: ImportantNote[] = [
  {
    id: 'inote-1',
    title: 'Printer Readings & Office Tasks',
    content: 'MANJULA PRINTER METER READING ON 25 OF EVERY MONTH.\nRemember to note down both B/W and Color page count values.',
    checklist: [
      { id: 'c1', text: 'Note down B/W page count reading', completed: true },
      { id: 'c2', text: 'Note down Color page count reading', completed: false },
      { id: 'c3', text: 'Send meter reading slip to vendor', completed: false },
    ],
    color: 'yellow',
    isPinned: true,
    createdAt: 'Sep 25, 2026, 10:00 AM',
    updatedAt: 'Sep 25, 2026, 10:00 AM',
  },
  {
    id: 'inote-2',
    title: 'Important Reminders & References',
    content: 'Review pending rollover items every morning.\nKeep critical contacts and vendor details noted here.',
    checklist: [
      { id: 'c4', text: 'Review pending rollover items every morning', completed: true },
      { id: 'c5', text: 'Check paper & stationary stock for office', completed: false },
      { id: 'c6', text: 'Cross-verify monthly invoice file', completed: false },
    ],
    color: 'blue',
    isPinned: false,
    createdAt: 'Sep 25, 2026, 10:00 AM',
    updatedAt: 'Sep 25, 2026, 10:00 AM',
  },
];

export function App() {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [userName, setUserName] = useState<string>(() => {
    try {
      const active = getActiveUser();
      if (active?.username) return active.username;
    } catch {}
    return '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pinboard_authenticated_v1') === 'true' && Boolean(getActiveUser());
    } catch {
      return false;
    }
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [autoLockDuration, setAutoLockDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(AUTO_LOCK_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return 120; // default 2 minutes
  });
  const lastActivityRef = useRef<number>(Date.now());

  const [boardStyle, setBoardStyle] = useState<BoardStyle>('chrome_light');
  const [muted, setMuted] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<TaskCadence, boolean>>({
    daily: true,
    weekly: true,
    monthly: true,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskNote | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isImportantNotesOpen, setIsImportantNotesOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCompactRoutineMode, setIsCompactRoutineMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pinboard_compact_routine_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [newTaskDefaultCadence, setNewTaskDefaultCadence] = useState<TaskCadence>('daily');
  const [isDeviceSyncOpen, setIsDeviceSyncOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [chatInitialViewMode, setChatInitialViewMode] = useState<
    'chat' | 'new_dm' | 'new_group' | 'share_task'
  >('chat');
  const [taskShareNotification, setTaskShareNotification] = useState<{
    id: string;
    title: string;
    sender: string;
  } | null>(null);
  const knownSharedTaskIdsRef = useRef<Set<string>>(new Set());
  const [isSharedTasksDrawerOpen, setIsSharedTasksDrawerOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [userDesignation, setUserDesignation] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [taskForShareModal, setTaskForShareModal] = useState<TaskNote | null>(null);
  const [pendingSharedTasksCount, setPendingSharedTasksCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('synced');
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastPushedHashRef = useRef<string>('');
  const isNotesLoadedRef = useRef<boolean>(false);

  // Today's Task Notes Summary Modal (opened on clicking header total tasks progress ring)
  const [isTaskSummaryOpen, setIsTaskSummaryOpen] = useState<boolean>(false);

  // Modes & Layout Control Modal
  const [isModesModalOpen, setIsModesModalOpen] = useState<boolean>(false);

  // Optional Calendar Board State (persistent)
  const [isCalendarEnabled, setIsCalendarEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('TASK_BOARD_CALENDAR_ENABLED');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Microsoft Bing Daily Wallpaper State
  const [isBingWallpaperEnabled, setIsBingWallpaperEnabledState] = useState<boolean>(() =>
    getBingWallpaperEnabled()
  );
  const [bingWallpaper, setBingWallpaper] = useState<BingWallpaperData | null>(() =>
    getInitialBingWallpaper()
  );

  // Task Reminders State & Active Alert
  const [isReminderEnabled, setIsReminderEnabled] = useState<boolean>(true);
  const [activeReminderTask, setActiveReminderTask] = useState<TaskNote | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [autoCarryForward, setAutoCarryForward] = useState<boolean>(true);

  // Floating AssistiveTouch Assistant state & Android Overlay guide
  const [isAssistiveTouchEnabled, setIsAssistiveTouchEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pinboard_assistive_touch_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });
  const [isAndroidOverlayGuideOpen, setIsAndroidOverlayGuideOpen] = useState<boolean>(false);

  const handleToggleAssistiveTouch = useCallback(() => {
    setIsAssistiveTouchEnabled((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('pinboard_assistive_touch_enabled', String(nextVal));
      } catch {}
      return nextVal;
    });
    playClickSound(muted);
  }, [muted]);

  // Night Mode state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pinboard_night_mode') === 'true';
      if (saved) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      }
      return saved;
    } catch {
      return false;
    }
  });

  const handleToggleNightMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pinboard_night_mode', String(next));
      } catch {}
      if (next) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Restore all data handler (from DeviceSyncModal, Cloud Pull, or Backup File)
  const handleRestoreAllData = useCallback(
    (data: {
      notes: TaskNote[];
      importantNotes?: ImportantNote[];
      userName?: string;
      boardStyle?: string;
    }) => {
      if (Array.isArray(data.notes)) {
        setNotes(data.notes);
        isNotesLoadedRef.current = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.notes));
        } catch {}
      }
      if (Array.isArray(data.importantNotes)) {
        setImportantNotes(data.importantNotes);
        try {
          localStorage.setItem(IMPORTANT_NOTES_STORAGE_KEY, JSON.stringify(data.importantNotes));
        } catch {}
      }
      if (data.userName) {
        setUserName(data.userName);
      }
      if (
        data.boardStyle &&
        ['chrome_light', 'modern_dark', 'glassmorphic', 'retro_terminal', 'executive_dashboard'].includes(
          data.boardStyle
        )
      ) {
        setBoardStyle(data.boardStyle as BoardStyle);
      }
      setSyncStatus('synced');
      playPinSound(muted);
    },
    [muted]
  );

  const handleToggleCompactRoutineMode = () => {
    setIsCompactRoutineMode((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('pinboard_compact_routine_mode', String(nextVal));
      } catch {
        // storage fallback
      }
      return nextVal;
    });
    playClickSound(muted);
  };

  // Load user profile & designation whenever user changes
  useEffect(() => {
    if (userName) {
      const profile = getUserProfile(userName);
      setUserDesignation(profile?.designation || '');
      setUserAvatarUrl(profile?.avatarUrl || '');
    }
  }, [userName]);

  // Activity tracking for auto-lock timer
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
    };
  }, []);

  // Auto-lock timer: automatically lock if idle for selected duration
  useEffect(() => {
    if (!isAuthenticated || isLocked || autoLockDuration <= 0) return;

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - lastActivityRef.current) / 1000;
      if (elapsedSeconds >= autoLockDuration) {
        setIsLocked(true);
        playLockSound(muted);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isLocked, autoLockDuration, muted]);

  const handleLoginSuccess = (name: string, isNewUser?: boolean) => {
    const finalName = name.trim() || 'Sumit';
    setUserName(finalName);
    setIsAuthenticated(true);
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    try {
      sessionStorage.setItem('pinboard_authenticated_v1', 'true');
      const savedPrefs = localStorage.getItem(STORAGE_PREFS_KEY);
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.userName = finalName;
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // storage fallback
    }

    if (isNewUser) {
      // BRAND NEW USER: 100% BLANK / CLEAN BOARD - NO PRELOADED TASKS!
      setNotes([]);
      setImportantNotes([]);
      isNotesLoadedRef.current = true;
      saveUserTasksAndSync(finalName, finalName, [], []);
    } else {
      // EXISTING USER: Load only the tasks they previously added
      loadUserTasks(finalName, INITIAL_NOTES).then((result) => {
        setNotes(result.tasks);
        setImportantNotes(result.importantNotes);
        isNotesLoadedRef.current = true;
      });
    }
  };

  // Immediate manual screen lock (when stepping away from desk)
  const handleLock = () => {
    setIsLocked(true);
    playLockSound(muted);
  };

  // Firebase Auth listener: securely persist authentication & require email verification
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.emailVerified) {
          const finalName =
            firebaseUser.displayName ||
            (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
          setUserName(finalName);
          setIsAuthenticated(true);
          try {
            sessionStorage.setItem('pinboard_authenticated_v1', 'true');
          } catch {}
          upsertFirebaseUserAccount(firebaseUser.uid, firebaseUser.email, finalName);
        } else {
          // Email not verified: keep unauthenticated to show verification prompt
          setIsAuthenticated(false);
          try {
            sessionStorage.removeItem('pinboard_authenticated_v1');
          } catch {}
        }
      } else {
        setIsAuthenticated(false);
        setActiveUser(null);
        try {
          sessionStorage.removeItem('pinboard_authenticated_v1');
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Unlock screen
  const handleUnlock = () => {
    setIsLocked(false);
    lastActivityRef.current = Date.now();
  };

  // Log off completely (clears session, logs out of Firebase Auth, returns to Welcome screen)
  const handleLogOff = async () => {
    setIsLocked(false);
    setIsAuthenticated(false);
    setActiveUser(null);
    setNotes([]);
    setImportantNotes([]);
    isNotesLoadedRef.current = false;
    try {
      sessionStorage.removeItem('pinboard_authenticated_v1');
    } catch {
      // storage fallback
    }
    await logoutUser();
  };

  // Change auto-lock duration preference
  const handleChangeAutoLock = (seconds: number) => {
    setAutoLockDuration(seconds);
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(AUTO_LOCK_STORAGE_KEY, String(seconds));
    } catch {
      // storage fallback
    }
  };
  const [importantNotes, setImportantNotes] = useState<ImportantNote[]>([]);

  const handleSaveImportantNotes = (updated: ImportantNote[]) => {
    setImportantNotes(updated);
    if (!userName) return;
    try {
      localStorage.setItem(getUserNotesStorageKey(userName), JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    saveUserTasksAndSync(userName, userName, notes, updated, {
      boardStyle,
      muted,
      visibleColumns,
    });
  };

  // Test Firebase Firestore connection & load authenticated user's isolated tasks
  useEffect(() => {
    testFirebaseConnection();

    const active = getActiveUser();
    const effectiveUser = active?.username || userName;

    if (isAuthenticated && effectiveUser) {
      loadUserTasks(effectiveUser, INITIAL_NOTES).then((result) => {
        setNotes(result.tasks);
        setImportantNotes(result.importantNotes);
        isNotesLoadedRef.current = true;
      });
    }

    try {
      const savedPrefs = localStorage.getItem(STORAGE_PREFS_KEY);
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (typeof prefs.muted === 'boolean') setMuted(prefs.muted);
        if (prefs.boardStyle) setBoardStyle(prefs.boardStyle);
      }
    } catch (e) {}
  }, [isAuthenticated]);

  // Save notes locally per user and auto-sync to Firebase Cloud
  useEffect(() => {
    if (!isNotesLoadedRef.current || !userName) return;
    const cleanId = userName.trim().toLowerCase();

    // 1. Instant local persistence for this specific user
    try {
      localStorage.setItem(getUserTasksStorageKey(cleanId), JSON.stringify(notes));
    } catch (e) {
      // Storage error
    }

    // 2. Debounce push to Firebase Firestore Cloud
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }
    syncDebounceRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      const ok = await saveUserTasksAndSync(cleanId, userName, notes, importantNotes, {
        boardStyle,
        muted,
        visibleColumns,
      });
      if (ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('idle');
      }
    }, 1200);

    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [notes, importantNotes, userName, boardStyle, muted, visibleColumns]);

  // Save prefs
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({ boardStyle, muted, userName, visibleColumns })
      );
    } catch (e) {
      // Ignore
    }
  }, [boardStyle, muted, userName, visibleColumns]);

  // 1. Initial Sync Check (URL param or auto-pull newer changes) + Window Focus Listener
  useEffect(() => {
    const checkSyncLinkAndAutoPull = async () => {
      const activeKey = getStoredSyncKey();
      if (!activeKey) return;

      const hasUrlParam =
        typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).has('sync') ||
          window.location.hash.startsWith('#sync='));

      const autoSync = getAutoSyncEnabled();

      if (hasUrlParam || autoSync) {
        setSyncStatus('syncing');
        const status = await checkSyncStatus(activeKey);
        const lastLocalSync = getLastSyncedTime();

        if (status.exists && (hasUrlParam || (status.updatedAt && status.updatedAt > lastLocalSync))) {
          const res = await pullSyncData(activeKey);
          if (res.success && res.data && res.data.notes) {
            handleRestoreAllData({
              notes: res.data.notes,
              importantNotes: res.data.importantNotes,
              userName: res.data.userName,
              boardStyle: res.data.boardStyle,
            });
            setSyncStatus('synced');
            return;
          }
        }
        setSyncStatus('synced');
      }
    };

    checkSyncLinkAndAutoPull();

    const onFocus = () => {
      const activeKey = getStoredSyncKey();
      const autoSync = getAutoSyncEnabled();
      if (activeKey && autoSync) {
        checkSyncStatus(activeKey).then((status) => {
          const lastLocalSync = getLastSyncedTime();
          if (status.exists && status.updatedAt && status.updatedAt > lastLocalSync) {
            pullSyncData(activeKey).then((res) => {
              if (res.success && res.data && res.data.notes) {
                handleRestoreAllData({
                  notes: res.data.notes,
                  importantNotes: res.data.importantNotes,
                  userName: res.data.userName,
                  boardStyle: res.data.boardStyle,
                });
              }
            });
          }
        });
      }
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [handleRestoreAllData]);

  // 2. Auto-sync push to cloud when notes, important notes, or preferences change
  useEffect(() => {
    if (notes.length === 0) return;
    const activeKey = getStoredSyncKey();
    const autoSync = getAutoSyncEnabled();
    if (!activeKey || !autoSync) return;

    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }

    syncDebounceRef.current = setTimeout(async () => {
      const payloadHash = `${notes.length}-${notes.map((n) => n.id + (n.completed ? '1' : '0')).join('')}`;
      if (payloadHash === lastPushedHashRef.current) return;

      setSyncStatus('syncing');
      const payload = {
        notes,
        importantNotes,
        userName,
        boardStyle,
        lastUpdated: Date.now(),
      };
      const res = await pushSyncData(activeKey, payload);
      if (res.success) {
        lastPushedHashRef.current = payloadHash;
        setSyncStatus('synced');
      } else {
        setSyncStatus('idle');
      }
    }, 2000);

    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [notes, importantNotes, userName, boardStyle]);

  // 3. Microsoft Bing Daily Wallpaper fetch on mount
  useEffect(() => {
    fetchBingDailyWallpaper().then((data) => {
      setBingWallpaper(data);
    });
  }, []);

  const handleToggleBingWallpaper = () => {
    setIsBingWallpaperEnabledState((prev) => {
      const next = !prev;
      setBingWallpaperEnabled(next);
      return next;
    });
  };

  const handleNextWallpaper = async () => {
    const next = await getNextBingWallpaper(bingWallpaper?.url);
    setBingWallpaper(next);
  };

  const handleToggleCalendar = () => {
    setIsCalendarEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('TASK_BOARD_CALENDAR_ENABLED', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRequestNotificationPermission = async () => {
    const res = await requestNotificationPermission();
    setNotificationPermission(res);
    if (res === 'granted') {
      sendBrowserNotification('Notifications Enabled! 🎉', {
        body: 'You will receive timely reminders for scheduled tasks on PC and Mobile.',
      });
    }
  };

  const handleSnoozeTask = (taskId: string, minutes: number = 5) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const newTime = `${h12}:${m} ${ampm}`;

    setNotes((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueTime: newTime } : t))
    );
  };

  // 4. Task Reminder periodic monitor: checks due tasks and triggers chime + system notification + in-app alert
  useEffect(() => {
    if (!isReminderEnabled) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const todayStr = getTodayString();

      notes.forEach((task) => {
        if (task.completed) return;
        if (!task.dueTime) return;

        // Check if task is due today or has no explicit date
        const isScheduledToday = !task.dueDate || task.dueDate === todayStr || task.assignedDate === todayStr;
        if (!isScheduledToday) return;

        // Parse dueTime (supports "17:50", "05:50 PM", "5:50pm", "17:50:00")
        const clean = task.dueTime.trim().toLowerCase();
        let isMatch = false;

        const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
        if (match24) {
          const h = parseInt(match24[1], 10);
          const m = parseInt(match24[2], 10);
          isMatch = h === currentHours && m === currentMinutes;
        } else {
          const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
          if (match12) {
            let h = parseInt(match12[1], 10);
            const m = parseInt(match12[2], 10);
            const ampm = match12[3];
            if (ampm === 'pm' && h < 12) h += 12;
            if (ampm === 'am' && h === 12) h = 0;
            isMatch = h === currentHours && m === currentMinutes;
          }
        }

        if (isMatch) {
          const reminderKey = `${task.id}-${todayStr}-${currentHours}:${currentMinutes}`;
          if (!hasReminderFired(reminderKey)) {
            markReminderFired(reminderKey);
            setActiveReminderTask(task);
            playReminderChime(muted);
            sendBrowserNotification(`⏰ Reminder: ${task.text}`, {
              body: `Scheduled for ${task.dueTime}. Tap to complete or view.`,
              onClick: () => {
                setSelectedTaskForModal(task);
              },
            });
          }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, [notes, isReminderEnabled, muted]);

  // Toggle Mute
  const handleToggleMute = () => {
    setMuted((prev) => !prev);
  };

  // Toggle Column Visibility (Hide / Unhide)
  const handleToggleColumnVisibility = (cadence: TaskCadence) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [cadence]: !prev[cadence],
    }));
    playClickSound(muted);
  };

  // Add Task directly into a column or via executive modal
  const handleAddTask = (
    text: string,
    cadence: TaskCadence,
    dueDate?: string,
    scheduledDay?: number | string,
    deadlineDay?: number | string,
    routineType?: RoutineTaskType,
    priority?: TaskPriority,
    extra?: {
      notesDetail?: string;
      subtasks?: SubTask[];
      dueTime?: string;
      assignedDate?: string;
      followUpDate?: string;
      autoCarryForward?: boolean;
      rolloverRetentionLimit?: 'until_done' | '3_days' | '7_days';
      escalateOnRollover?: boolean;
      tags?: string[];
    }
  ) => {
    const randomColor: NoteColor =
      cadence === 'daily' ? 'blue' : cadence === 'weekly' ? 'green' : 'purple';

    const todayStr = getTodayString();
    const timestamp = formatCurrentTimestamp();
    const resolvedRoutineType = cadence === 'daily' ? routineType || 'single_day' : undefined;
    const resolvedPriority = priority || 'medium';

    const newNote: TaskNote = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      cadence,
      routineType: resolvedRoutineType,
      priority: resolvedPriority,
      completed: false,
      color: randomColor,
      pinColor:
        cadence === 'daily'
          ? '#38bdf8'
          : cadence === 'weekly'
          ? '#34d399'
          : '#c084fc',
      dueDate,
      dueTime: extra?.dueTime,
      scheduledDay,
      deadlineDay,
      followUpDate: extra?.followUpDate,
      assignedDate: extra?.assignedDate || todayStr,
      notesDetail: extra?.notesDetail,
      subtasks: extra?.subtasks,
      x: 20,
      y: 20,
      rotation: 0,
      createdAt: timestamp,
      history: [
        {
          id: `h-${Date.now()}`,
          action: 'created',
          timestamp,
          description:
            cadence === 'daily'
              ? `Routine task created as ${resolvedRoutineType === 'fixed_daily' ? 'FIX DAILY 🔁' : 'TASK 📅'} (${resolvedPriority.toUpperCase()} priority)`
              : `Task created in ${cadence.toUpperCase()} column (${resolvedPriority.toUpperCase()} priority)`,
        },
      ],
    };

    setNotes((prev) => [newNote, ...prev]);
    playPinSound(muted);
  };

  // Toggle task priority: Low -> Medium -> High -> Low
  const handleTogglePriority = (id: string) => {
    const nextPriorityMap: Record<TaskPriority, TaskPriority> = {
      low: 'medium',
      medium: 'high',
      high: 'urgent',
      urgent: 'low',
    };
    const timestamp = formatCurrentTimestamp();
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const currentP = n.priority || 'medium';
          const nextP = nextPriorityMap[currentP];
          const historyList = [...(n.history || [])];
          historyList.unshift({
            id: `h-p-${Date.now()}`,
            action: 'priority_changed',
            timestamp,
            description: `Priority toggled to ${nextP.toUpperCase()}`,
          });
          return {
            ...n,
            priority: nextP,
            history: historyList,
          };
        }
        return n;
      })
    );
    playClickSound(muted);
  };

  // Toggle routine frequency between 'fixed_daily' and 'single_day'
  const handleToggleRoutineType = (id: string) => {
    const timestamp = formatCurrentTimestamp();
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id && n.cadence === 'daily') {
          const currentType = n.routineType || 'single_day';
          const newType: RoutineTaskType =
            currentType === 'fixed_daily' ? 'single_day' : 'fixed_daily';
          const historyList = [...(n.history || [])];
          historyList.unshift({
            id: `h-type-${Date.now()}`,
            action: 'updated',
            timestamp,
            description: `Routine frequency updated to: ${
              newType === 'fixed_daily' ? 'Fix Daily (Daily Recurring) 🔁' : 'Task 📅'
            }`,
          });

          return {
            ...n,
            routineType: newType,
            history: historyList,
          };
        }
        return n;
      })
    );
    playClickSound(muted);
  };

  // Sticky Note handlers
  const handleUpdateCadence = (id: string, newCadence: TaskCadence) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, cadence: newCadence } : n))
    );
    playPinSound(muted);
  };

  const handleUpdateText = (id: string, newText: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text: newText } : n))
    );
  };

  const handleUpdateDueDate = (id: string, newDueDate?: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dueDate: newDueDate } : n))
    );
  };

  // Toggle Complete with full history logging and date tracking for calendar history
  const handleToggleComplete = (id: string) => {
    const timestamp = formatCurrentTimestamp();
    const todayStr = getTodayString();
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const isNowDone = !n.completed;
          if (isNowDone) {
            playTaskCompleteSound(muted);
          } else {
            playClickSound(muted);
          }

          const existingHistory = n.history || [];
          const newHistoryItem = {
            id: `h-${Date.now()}`,
            action: isNowDone ? ('completed' as const) : ('reopened' as const),
            timestamp,
            description: isNowDone
              ? 'Task marked as completed ✅ (Archived to History)'
              : 'Task reopened as active 🔄',
          };

          return {
            ...n,
            completed: isNowDone,
            completedAt: isNowDone ? timestamp : undefined,
            completedDate: isNowDone ? todayStr : undefined,
            history: [newHistoryItem, ...existingHistory],
          };
        }
        return n;
      })
    );

    // If modal is open for this task, sync it too
    setSelectedTaskForModal((curr) => {
      if (curr && curr.id === id) {
        const isNowDone = !curr.completed;
        return {
          ...curr,
          completed: isNowDone,
          completedAt: isNowDone ? timestamp : undefined,
          completedDate: isNowDone ? todayStr : undefined,
        };
      }
      return curr;
    });
  };

  // Toggle subtask within a task
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === taskId && n.subtasks) {
          const updatedSubtasks = n.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          return {
            ...n,
            subtasks: updatedSubtasks,
          };
        }
        return n;
      })
    );
    playClickSound(muted);
  };

  // Delete Note
  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedTaskForModal && selectedTaskForModal.id === id) {
      setSelectedTaskForModal(null);
    }
    playUnpinSound(muted);
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleToggleImportant = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isImportant: !n.isImportant } : n))
    );
  };

  // Update Task From Mini Form Popup
  const handleUpdateTaskFromModal = (updatedNote: TaskNote) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
    setSelectedTaskForModal(updatedNote);
    playPinSound(muted);
  };

  // Open Share & Assign modal for a task
  const handleOpenShareModal = (note: TaskNote) => {
    setTaskForShareModal(note);
  };

  // Called when task is assigned to another user
  const handleTaskAssigned = (updatedNote: TaskNote) => {
    setNotes((prev) => {
      const nextNotes = prev.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      if (userName) {
        saveUserTasksAndSync(userName, userName, nextNotes, importantNotes);
      }
      return nextNotes;
    });
    if (selectedTaskForModal?.id === updatedNote.id) {
      setSelectedTaskForModal(updatedNote);
    }
  };

  // Import task to current user's board (from Team Chat or Shared Tasks drawer)
  const handleImportTaskToBoard = (partialNote: Partial<TaskNote>) => {
    const today = getTodayString();
    const newId = `shared-task-${Date.now()}`;
    const newNote: TaskNote = {
      id: newId,
      text: partialNote.text || 'Untitled Shared Task',
      cadence: partialNote.cadence || 'daily',
      routineType: partialNote.routineType || 'single_day',
      priority: partialNote.priority || 'medium',
      completed: false,
      color: partialNote.color || 'yellow',
      pinColor: '#1a73e8',
      assignedDate: today,
      dueDate: partialNote.dueDate || today,
      notesDetail: partialNote.notesDetail,
      assignedBy: partialNote.assignedBy,
      assignedTo: userName || 'Me',
      shareStatus: 'accepted',
      createdAt: formatCurrentTimestamp(),
      x: Math.floor(Math.random() * 60) + 10,
      y: Math.floor(Math.random() * 50) + 10,
      rotation: (Math.random() - 0.5) * 4,
    };

    setNotes((prev) => {
      const nextNotes = [newNote, ...prev];
      if (userName) {
        saveUserTasksAndSync(userName, userName, nextNotes, importantNotes);
      }
      return nextNotes;
    });
    playPinSound(muted);
  };

  // Subscribe to real-time shared tasks for unread badge count & instant share notifications
  useEffect(() => {
    if (!userName) return;
    const cleanName = userName.trim().toLowerCase();
    const unsubscribe = subscribeToSharedTasks((tasks) => {
      const myPending = tasks.filter(
        (t) =>
          (t.assignedTo.toLowerCase() === cleanName || t.assignedTo.toLowerCase() === 'all') &&
          t.status === 'pending'
      );
      setPendingSharedTasksCount(myPending.length);

      // Check for incoming new tasks from another user
      myPending.forEach((t) => {
        if (!knownSharedTaskIdsRef.current.has(t.id)) {
          knownSharedTaskIdsRef.current.add(t.id);
          // If assigned by someone else, show alert notification!
          if (t.assignedBy && t.assignedBy.toLowerCase() !== cleanName) {
            setTaskShareNotification({
              id: t.id,
              title: t.text,
              sender: t.assignedBy,
            });
            playPinSound(muted);
          }
        }
      });
    });
    return () => unsubscribe();
  }, [userName, muted]);

  // Carry Forward a single task to today / next day
  const handleCarryForwardSingle = (id: string) => {
    const todayStr = getTodayString();
    const timestamp = formatCurrentTimestamp();

    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const newCount = (n.carryForwardCount || 0) + 1;
          const historyList = [...(n.history || [])];
          historyList.unshift({
            id: `h-cf-${Date.now()}`,
            action: 'carried_forward',
            timestamp,
            description: `Carried forward to ${todayStr} (Day rollover #${newCount})`,
          });

          return {
            ...n,
            lastCarriedDate: todayStr,
            carryForwardCount: newCount,
            history: historyList,
          };
        }
        return n;
      })
    );

    playPinSound(muted);
  };

  // Carry Forward All Pending Daily Tasks from previous days
  const handleCarryForwardAllDailyPending = () => {
    const todayStr = getTodayString();
    const timestamp = formatCurrentTimestamp();
    let count = 0;

    setNotes((prev) =>
      prev.map((n) => {
        if (isTaskPendingFromPreviousDay(n)) {
          count++;
          const newCount = (n.carryForwardCount || 0) + 1;
          const historyList = [...(n.history || [])];
          historyList.unshift({
            id: `h-cf-${Date.now()}-${count}`,
            action: 'carried_forward',
            timestamp,
            description: `Carried forward from ${n.lastCarriedDate || n.assignedDate} to today (${todayStr})`,
          });

          return {
            ...n,
            lastCarriedDate: todayStr,
            carryForwardCount: newCount,
            history: historyList,
          };
        }
        return n;
      })
    );

    playPinSound(muted);
  };

  // Clear all completed notes
  const handleClearCompleted = () => {
    setNotes((prev) => prev.filter((n) => !n.completed));
    playUnpinSound(muted);
  };

  // Restore from Backup
  const handleRestoreBackup = (backup: BackupData, mode: 'replace' | 'merge') => {
    if (!backup || !Array.isArray(backup.notes)) return false;

    if (mode === 'replace') {
      setNotes(backup.notes);
    } else {
      setNotes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newNotes = backup.notes.filter((n) => !existingIds.has(n.id));
        return [...newNotes, ...prev];
      });
    }

    if (backup.importantNotes && Array.isArray(backup.importantNotes)) {
      if (mode === 'replace') {
        handleSaveImportantNotes(backup.importantNotes);
      } else {
        const existingIds = new Set(importantNotes.map((n) => n.id));
        const newNotes = backup.importantNotes.filter((n) => !existingIds.has(n.id));
        handleSaveImportantNotes([...newNotes, ...importantNotes]);
      }
    }

    if (backup.userName !== undefined) {
      setUserName(backup.userName);
    }

    if (backup.preferences) {
      if (backup.preferences.boardStyle) setBoardStyle(backup.preferences.boardStyle);
      if (typeof backup.preferences.muted === 'boolean') setMuted(backup.preferences.muted);
      if (backup.preferences.visibleColumns) setVisibleColumns(backup.preferences.visibleColumns);
    }

    playPinSound(muted);
    return true;
  };

  // Counts: Header displays ONLY tasks belonging to that day (today's date)
  // as specifically requested: "HEADER ME JO TASK KA LIKHA AA RAHA HE KI TOTAL ITNE HE USME SIRF VAHI TASK KA TOTAL DIKHE JO US DIN KE HO YANI KE AGAR AJKI DATE KE 10 TASK HE TO UNHI KA TOTAL DIKHE"
  const counts = useMemo(() => {
    const todayNotes = notes.filter((n) => isTaskForToday(n));
    const todayCompleted = todayNotes.filter((n) => n.completed).length;
    const todayTotal = todayNotes.length;

    return {
      all: todayTotal, // Today's total count (e.g. 10 if 10 tasks for today)
      completed: todayCompleted, // Today's completed tasks count
      todayTotal,
      todayCompleted,
      totalAll: notes.length, // Overall count across entire board
      completedAll: notes.filter((n) => n.completed).length,
      daily: notes.filter((n) => n.cadence === 'daily').length,
      weekly: notes.filter((n) => n.cadence === 'weekly').length,
      monthly: notes.filter((n) => n.cadence === 'monthly').length,
    };
  }, [notes]);

  const hasCompleted = counts.completed > 0;
  const pendingCarryCount = notes.filter((n) => isTaskPendingFromPreviousDay(n)).length;

  // Global Keyboard Shortcuts (Power User Keybindings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // 1. ESCAPE: Close any currently open modal (priority stack)
      if (e.key === 'Escape') {
        if (isShortcutsHelpOpen) {
          e.preventDefault();
          setIsShortcutsHelpOpen(false);
          return;
        }
        if (isImportantNotesOpen) {
          e.preventDefault();
          setIsImportantNotesOpen(false);
          return;
        }
        if (isHistoryModalOpen) {
          e.preventDefault();
          setIsHistoryModalOpen(false);
          return;
        }
        if (isNewTaskModalOpen) {
          e.preventDefault();
          setIsNewTaskModalOpen(false);
          return;
        }
        if (selectedTaskForModal) {
          e.preventDefault();
          setSelectedTaskForModal(null);
          return;
        }
        if (isSettingsOpen) {
          e.preventDefault();
          setIsSettingsOpen(false);
          return;
        }
      }

      // 2. Ctrl+N or Cmd+N: Open New Task Modal (intercepts browser new window)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewTaskModalOpen(true);
        return;
      }

      // 3. Single key triggers when not actively typing in an input or textarea
      if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'n' || e.key === 'N' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          setIsNewTaskModalOpen(true);
          return;
        }
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
          e.preventDefault();
          setIsShortcutsHelpOpen((prev) => !prev);
          return;
        }
      }

      // 4. Ctrl+F, Cmd+F, or '/' (when not typing): Focus Header Search Bar
      if (
        (!isTyping && e.key === '/') ||
        ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'f')
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('header-task-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 5. Ctrl+, or Cmd+,: Open Settings Modal
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      // 6. Ctrl+1, Ctrl+2, Ctrl+3: Toggle Column Visibilities
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleToggleColumnVisibility('daily');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          handleToggleColumnVisibility('weekly');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          handleToggleColumnVisibility('monthly');
          return;
        }
      }

      // 7. Ctrl+Shift+C: Clear Completed Tasks
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClearCompleted();
        return;
      }

      // 8. Ctrl+Shift+F: Carry Forward Pending Daily Tasks
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleCarryForwardAllDailyPending();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isNewTaskModalOpen,
    selectedTaskForModal,
    isSettingsOpen,
    isShortcutsHelpOpen,
    isImportantNotesOpen,
    isHistoryModalOpen,
    handleToggleColumnVisibility,
    handleClearCompleted,
    handleCarryForwardAllDailyPending,
  ]);

  const rootClasses =
    boardStyle === 'chrome_light'
      ? 'bg-[#f1f3f4] text-[#202124] selection:bg-[#1a73e8] selection:text-white'
      : boardStyle === 'modern_dark'
      ? 'bg-[#09090b] text-zinc-100 selection:bg-zinc-700 selection:text-white'
      : boardStyle === 'modern_aurora'
      ? 'bg-[#080915] text-purple-100 selection:bg-purple-800 selection:text-white'
      : 'bg-[#f8fafc] text-slate-800 selection:bg-slate-800 selection:text-white';

  const hasBingWallpaper = isBingWallpaperEnabled && Boolean(bingWallpaper?.url);

  return (
    <div
      className={`min-h-screen flex flex-col antialiased font-sans transition-colors duration-200 relative ${
        isDarkMode
          ? `dark ${hasBingWallpaper ? 'bg-transparent' : 'bg-[#121214]'} text-[#e8eaed] selection:bg-[#1a73e8] selection:text-white`
          : `${hasBingWallpaper ? 'bg-transparent' : 'bg-[#f1f3f4]'} text-[#202124] selection:bg-[#1a73e8] selection:text-white`
      }`}
    >
      {/* Microsoft Bing Daily Wallpaper background layer */}
      {hasBingWallpaper && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 transition-all duration-700"
          style={{ backgroundImage: `url(${bingWallpaper?.url})` }}
        />
      )}

      {/* Balanced translucent overlay for crisp readability without washing out wallpaper */}
      {hasBingWallpaper && (
        <div className="fixed inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-[0.5px] pointer-events-none z-0" />
      )}


      {/* Header with History Calendar, Notes, Search Bar, Circular Progress, Settings, Lock, Log Off & Add Task button */}
      <div className="relative z-10">
        <Header
          userName={userName}
          onOpenNewTask={() => {
            setNewTaskDefaultCadence('daily');
            setIsNewTaskModalOpen(true);
          }}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDeviceSync={() => setIsDeviceSyncOpen(true)}
          onOpenChat={() => setIsChatModalOpen(true)}
          onOpenSharedTasks={() => setIsSharedTasksDrawerOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          userDesignation={userDesignation}
          userAvatarUrl={userAvatarUrl}
          pendingSharedTasksCount={pendingSharedTasksCount}
          syncStatus={syncStatus}
          onLockScreen={handleLock}
          onLogOff={handleLogOff}
          autoLockDuration={autoLockDuration}
          onChangeAutoLock={handleChangeAutoLock}
          isCompactRoutineMode={isCompactRoutineMode}
          onToggleCompactRoutineMode={handleToggleCompactRoutineMode}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleNightMode}
          counts={counts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenTaskSummary={() => setIsTaskSummaryOpen(true)}
          onOpenModesModal={() => setIsModesModalOpen(true)}
        />
      </div>

      {/* Main Board: Either Compact Single-Head Routine View or 3-Column Sheet Board */}
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        {isCompactRoutineMode ? (
          <CompactRoutineBoard
            notes={notes}
            onToggleComplete={handleToggleComplete}
            onClickTask={(note) => setSelectedTaskForModal(note)}
            onAddTask={handleAddTask}
            onDeleteTask={handleDelete}
            onTogglePin={handleTogglePin}
            onToggleImportant={handleToggleImportant}
            onTogglePriority={handleTogglePriority}
            onOpenShareModal={handleOpenShareModal}
            onToggleSubtask={handleToggleSubtask}
            onSwitchToThreeColumns={handleToggleCompactRoutineMode}
            onOpenNewTaskModal={(cadence) => {
              setNewTaskDefaultCadence(cadence || 'daily');
              setIsNewTaskModalOpen(true);
            }}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : (
          <ExcelThreeColumnBoard
            notes={notes}
            onToggleComplete={handleToggleComplete}
            onClickTask={(note) => setSelectedTaskForModal(note)}
            onAddTask={handleAddTask}
            onDeleteTask={handleDelete}
            onTogglePin={handleTogglePin}
            onToggleImportant={handleToggleImportant}
            onToggleRoutineType={handleToggleRoutineType}
            onToggleSubtask={handleToggleSubtask}
            onTogglePriority={handleTogglePriority}
            onOpenNewTaskModal={(cadence) => {
              setNewTaskDefaultCadence(cadence);
              setIsNewTaskModalOpen(true);
            }}
            onOpenShareModal={handleOpenShareModal}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            isCalendarEnabled={isCalendarEnabled}
            onOpenModesModal={() => setIsModesModalOpen(true)}
          />
        )}
      </main>

      {/* Settings Modal (with Export Data option) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          const p = getUserProfile(userName);
          if (p) {
            setUserDesignation(p.designation || '');
            setUserAvatarUrl(p.avatarUrl || '');
          }
        }}
        userName={userName}
        onUpdateUserName={(name) => setUserName(name)}
        boardStyle={boardStyle}
        onChangeBoardStyle={(style) => setBoardStyle(style)}
        layout="columns"
        muted={muted}
        onToggleMute={() => setMuted((prev) => !prev)}
        notes={notes}
        onRestoreBackup={handleRestoreBackup}
        onOpenDeviceSync={() => {
          setIsSettingsOpen(false);
          setIsDeviceSyncOpen(true);
        }}
      />

      {/* Device Sync & Local Storage Modal */}
      <DeviceSyncModal
        isOpen={isDeviceSyncOpen}
        onClose={() => setIsDeviceSyncOpen(false)}
        notes={notes}
        importantNotes={importantNotes}
        userName={userName}
        boardStyle={boardStyle}
        onRestoreAllData={handleRestoreAllData}
      />

      {/* History Calendar Modal */}
      <HistoryCalendarModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        notes={notes}
        onToggleComplete={handleToggleComplete}
      />



      {/* Global New Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onAddTask={handleAddTask}
        boardStyle="chrome_light"
        defaultCadence={newTaskDefaultCadence}
      />

      {/* Task Details Modal (Opens on row click) */}
      {selectedTaskForModal && (
        <TaskDetailModal
          note={selectedTaskForModal}
          isOpen={Boolean(selectedTaskForModal)}
          boardStyle="chrome_light"
          onClose={() => setSelectedTaskForModal(null)}
          onUpdateTask={handleUpdateTaskFromModal}
          onDeleteTask={handleDelete}
          onCarryForwardTask={handleCarryForwardSingle}
          onOpenShareModal={handleOpenShareModal}
          currentUserName={userName}
        />
      )}

      {/* Team Mini Chat & Baat-Chit Modal (WhatsApp-style Clean Chat, DMs & Groups) */}
      <TeamMiniChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        currentUserName={userName}
        notes={notes}
        onImportTaskToBoard={handleImportTaskToBoard}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        muted={muted}
        initialViewMode={chatInitialViewMode}
      />

      {/* Floating Action Button (WhatsApp Style in bottom-right corner as requested) */}
      <FloatingChatButton
        unreadCount={pendingSharedTasksCount}
        onOpenChat={() => {
          setChatInitialViewMode('chat');
          setIsChatModalOpen(true);
        }}
        onOpenNewChat={() => {
          setChatInitialViewMode('new_dm');
          setIsChatModalOpen(true);
        }}
        onOpenNewGroup={() => {
          setChatInitialViewMode('new_group');
          setIsChatModalOpen(true);
        }}
        onOpenShareTask={() => {
          setChatInitialViewMode('share_task');
          setIsChatModalOpen(true);
        }}
      />

      {/* Real-time Task Share Notification Toast Banner */}
      {taskShareNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white dark:bg-[#202124] border-2 border-[#1a73e8] rounded-xl shadow-2xl p-3.5 flex items-start gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1a73e8] flex items-center justify-center shrink-0 shadow-xs">
            <Share2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-xs font-bold text-[#1a73e8]">New Task Shared!</span>
              <button
                type="button"
                onClick={() => setTaskShareNotification(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-bold text-[#202124] dark:text-white truncate">
              {taskShareNotification.title}
            </p>
            <p className="text-[11px] text-[#5f6368] dark:text-slate-400">
              Shared by <span className="font-semibold text-slate-800 dark:text-slate-200">@{taskShareNotification.sender}</span>
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setTaskShareNotification(null);
                  setIsSharedTasksDrawerOpen(true);
                }}
                className="px-2.5 py-1 bg-[#1a73e8] text-white text-[11px] font-bold rounded-lg cursor-pointer"
              >
                View Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setTaskShareNotification(null);
                  setChatInitialViewMode('chat');
                  setIsChatModalOpen(true);
                }}
                className="px-2.5 py-1 bg-[#f1f3f4] text-[#3c4043] dark:bg-[#303134] dark:text-slate-200 text-[11px] font-bold rounded-lg cursor-pointer"
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Assign & Share Modal */}
      <TaskShareAssignModal
        isOpen={Boolean(taskForShareModal)}
        onClose={() => setTaskForShareModal(null)}
        task={taskForShareModal}
        currentUserName={userName}
        onTaskAssigned={handleTaskAssigned}
        muted={muted}
      />

      {/* Shared & Assigned Tasks Drawer */}
      <SharedTasksDrawer
        isOpen={isSharedTasksDrawerOpen}
        onClose={() => setIsSharedTasksDrawerOpen(false)}
        currentUserName={userName}
        onAcceptTaskToBoard={handleImportTaskToBoard}
        onOpenNewTaskModal={(cadence) => {
          setNewTaskDefaultCadence(cadence || 'daily');
          setIsNewTaskModalOpen(true);
        }}
      />

      {/* User Profile & Designation Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userName={userName}
        onProfileUpdated={(updated) => {
          if (updated.username) setUserName(updated.username);
          if (updated.designation !== undefined) setUserDesignation(updated.designation || '');
          if (updated.avatarUrl !== undefined) setUserAvatarUrl(updated.avatarUrl || '');
        }}
      />


      {/* Cinematic Startup Login Flow (Welcome -> Shutter Animation -> Center Log In -> Small Login Window -> Good Morning Sumit -> Main Board) */}
      {!isAuthenticated && (
        <StartupLoginFlow
          onLoginSuccess={handleLoginSuccess}
          defaultUserName=""
          muted={muted}
          bingWallpaperUrl={bingWallpaper?.url}
        />
      )}

      {/* Security Lock Screen (Manual Lock or Auto-Lock Inactivity) */}
      <LockScreenModal
        isOpen={isAuthenticated && isLocked}
        userName={userName}
        onUnlock={handleUnlock}
        onLogOff={handleLogOff}
        autoLockDuration={autoLockDuration}
        onChangeAutoLock={handleChangeAutoLock}
        muted={muted}
        bingWallpaperUrl={hasBingWallpaper ? bingWallpaper?.url : undefined}
      />

      {/* Today's Tasks Notes Summary Modal (Notes Styled Popup with Excel lines and Pending/Completed tabs) */}
      <TodayTaskSummaryModal
        isOpen={isTaskSummaryOpen}
        onClose={() => setIsTaskSummaryOpen(false)}
        notes={notes}
        onToggleComplete={handleToggleComplete}
        onClickTask={(note) => {
          setSelectedTaskForModal(note);
          setIsTaskSummaryOpen(false);
        }}
      />

      {/* Board Modes & Layouts Modal (Toggle sliders with explanatory notes for Calendar, Theme, Bing Wallpaper & more) */}
      <ModesControlModal
        isOpen={isModesModalOpen}
        onClose={() => setIsModesModalOpen(false)}
        isCalendarEnabled={isCalendarEnabled}
        onToggleCalendar={handleToggleCalendar}
        isCompactRoutineMode={isCompactRoutineMode}
        onToggleCompactRoutineMode={handleToggleCompactRoutineMode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleNightMode}
        autoCarryForward={autoCarryForward}
        onToggleAutoCarryForward={() => setAutoCarryForward((prev) => !prev)}
        muted={muted}
        onToggleMute={handleToggleMute}
        isReminderEnabled={isReminderEnabled}
        onToggleReminder={() => setIsReminderEnabled((prev) => !prev)}
        isBingWallpaperEnabled={isBingWallpaperEnabled}
        onToggleBingWallpaper={handleToggleBingWallpaper}
        onNextWallpaper={handleNextWallpaper}
        onRequestNotificationPermission={handleRequestNotificationPermission}
        notificationPermission={notificationPermission}
        isAssistiveTouchEnabled={isAssistiveTouchEnabled}
        onToggleAssistiveTouch={handleToggleAssistiveTouch}
        onOpenAndroidGuide={() => {
          setIsModesModalOpen(false);
          setIsAndroidOverlayGuideOpen(true);
        }}
      />

      {/* Task Reminder Audio-Visual Popup & Mobile/PC Notification Alert */}
      <TaskReminderAlertModal
        task={activeReminderTask}
        isOpen={Boolean(activeReminderTask)}
        onClose={() => setActiveReminderTask(null)}
        onCompleteTask={handleToggleComplete}
        onSnoozeTask={handleSnoozeTask}
        onOpenTaskDetails={(t) => {
          setSelectedTaskForModal(t);
        }}
        permissionStatus={notificationPermission}
        onRequestPermission={handleRequestNotificationPermission}
      />

      {/* iPhone-Style Floating AssistiveTouch Assistant Widget (Works on both Web & Mobile) */}
      <FloatingAssistiveWidget
        enabled={isAssistiveTouchEnabled}
        onOpenNewTask={() => {
          setNewTaskDefaultCadence('daily');
          setIsNewTaskModalOpen(true);
        }}
        onOpenTodaySummary={() => setIsTaskSummaryOpen(true)}
        onLockScreen={handleLock}
        onCarryForward={handleCarryForwardAllDailyPending}
        onOpenChat={() => {
          setChatInitialViewMode('chat');
          setIsChatModalOpen(true);
        }}
        onNextWallpaper={handleNextWallpaper}
        onOpenModes={() => setIsModesModalOpen(true)}
        onOpenAndroidGuide={() => setIsAndroidOverlayGuideOpen(true)}
        onToggleEnabled={handleToggleAssistiveTouch}
        muted={muted}
      />

      {/* Android APK Display Over Other Apps Permission & Picture-in-Picture Setup Guide */}
      <AndroidOverlayPermissionModal
        isOpen={isAndroidOverlayGuideOpen}
        onClose={() => setIsAndroidOverlayGuideOpen(false)}
      />

      {/* Microsoft Bing Daily Wallpaper Floating Credit Badge with Manual Switch Button */}
      {hasBingWallpaper && bingWallpaper?.title && (
        <div className="fixed bottom-3 left-3 sm:left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md text-white text-[10px] sm:text-xs font-mono shadow-lg border border-white/20 select-none">
          <span className="truncate max-w-[130px] sm:max-w-[220px]">📷 {bingWallpaper.title}</span>
          <button
            type="button"
            onClick={handleNextWallpaper}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-sans font-bold cursor-pointer transition-all active:scale-95 shrink-0"
            title="Manually switch to next Bing wallpaper"
          >
            <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>Next Wallpaper</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
