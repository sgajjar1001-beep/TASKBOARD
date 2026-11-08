import React, { useState } from 'react';
import {
  Plus,
  Check,
  Trash2,
  Pin,
  Star,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Search,
  Flame,
  Clock,
  Calendar,
  CalendarDays,
  StickyNote,
  ExternalLink,
  Square,
  CheckSquare,
  LayoutGrid,
  Share2,
  Layers,
} from 'lucide-react';
import {
  TaskNote,
  TaskCadence,
  RoutineTaskType,
  TaskPriority,
  ImportantNote,
  NoteColor,
  NoteChecklistItem,
} from '../types';
import { formatMinimalDateOrDay } from '../utils/date';
import { CalendarDateTasksModal, CalendarDateGroup } from './CalendarDateTasksModal';
import { CalendarDateGroupView } from './CalendarDateGroupView';
import { CalendarTasksPanel } from './CalendarTasksPanel';

interface ExcelThreeColumnBoardProps {
  notes: TaskNote[];
  onToggleComplete: (id: string) => void;
  onClickTask: (note: TaskNote) => void;
  onAddTask: (
    text: string,
    cadence: TaskCadence,
    dueDate?: string,
    scheduledDay?: number | string,
    deadlineDay?: number | string,
    routineType?: RoutineTaskType
  ) => void;
  onDeleteTask?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onToggleImportant?: (id: string) => void;
  onTogglePriority?: (id: string) => void;
  onToggleRoutineType?: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onOpenNewTaskModal?: (cadence: TaskCadence) => void;
  onOpenShareModal?: (note: TaskNote) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  importantNotes?: ImportantNote[];
  onSaveImportantNotes?: (notes: ImportantNote[]) => void;
  onOpenNotesModal?: () => void;
  isCalendarEnabled?: boolean;
  onOpenModesModal?: () => void;
}


// Helper to calculate upcoming scheduled date and sort weight for tasks
function getTaskSortDate(note: TaskNote): {
  sortTime: number;
  displayDate?: string;
  isToday?: boolean;
  isOverdue?: boolean;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const todayTime = new Date(currentYear, currentMonth, currentDay).getTime();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 1. Explicit dueDate (YYYY-MM-DD)
  if (note.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(note.dueDate)) {
    const [y, m, d] = note.dueDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dtTime = dt.getTime();
    const isToday = note.dueDate === todayStr;
    const isOverdue = dtTime < todayTime;
    const displayDate = isToday ? 'Today' : `${d} ${monthNames[m - 1]}`;

    return { sortTime: dtTime, displayDate, isToday, isOverdue };
  }

  // 2. scheduledDay is number
  if (typeof note.scheduledDay === 'number' && note.scheduledDay >= 1 && note.scheduledDay <= 31) {
    const d = note.scheduledDay;
    const dt = new Date(currentYear, currentMonth, d);
    const dtTime = dt.getTime();
    const isToday = d === currentDay;
    const isOverdue = dtTime < todayTime;
    const displayDate = isToday ? 'Today' : `${d} ${monthNames[currentMonth]}`;

    return { sortTime: dtTime, displayDate, isToday, isOverdue };
  }

  // 3. deadlineDay is number
  if (typeof note.deadlineDay === 'number' && note.deadlineDay >= 1 && note.deadlineDay <= 31) {
    const d = note.deadlineDay;
    const dt = new Date(currentYear, currentMonth, d);
    const dtTime = dt.getTime();
    const isToday = d === currentDay;
    const isOverdue = dtTime < todayTime;
    const displayDate = isToday ? 'Today' : `${d} ${monthNames[currentMonth]}`;

    return { sortTime: dtTime, displayDate, isToday, isOverdue };
  }

  // 4. scheduledDay string
  if (typeof note.scheduledDay === 'string') {
    const matches = note.scheduledDay.match(/\b\d{1,2}\b/g);
    if (matches && matches.length > 0) {
      const days = matches.map(Number).filter((n) => n >= 1 && n <= 31).sort((a, b) => a - b);
      if (days.length > 0) {
        const upcoming = days.find((d) => d >= currentDay);
        if (upcoming !== undefined) {
          const dt = new Date(currentYear, currentMonth, upcoming);
          return {
            sortTime: dt.getTime(),
            displayDate: upcoming === currentDay ? 'Today' : `${upcoming} ${monthNames[currentMonth]}`,
            isToday: upcoming === currentDay,
            isOverdue: false,
          };
        } else {
          const nextMonth = (currentMonth + 1) % 12;
          const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
          const dt = new Date(nextYear, nextMonth, days[0]);
          return {
            sortTime: dt.getTime(),
            displayDate: `${days[0]} ${monthNames[nextMonth]}`,
            isToday: false,
            isOverdue: false,
          };
        }
      }
    }
  }

  return { sortTime: new Date(note.createdAt || 0).getTime() };
}

// Authentic Sticky Note Mobile Style Themes
const STICKY_THEMES: Record<
  NoteColor,
  {
    bg: string;
    border: string;
    header: string;
    pin: string;
    text: string;
    accent: string;
  }
> = {
  yellow: {
    bg: 'bg-[#fffde7]',
    border: 'border-[#fff59d]',
    header: 'bg-[#fff9c4]',
    pin: 'bg-rose-500',
    text: 'text-[#212121]',
    accent: 'text-[#795548]',
  },
  green: {
    bg: 'bg-[#e8f5e9]',
    border: 'border-[#c8e6c9]',
    header: 'bg-[#dcedc8]',
    pin: 'bg-emerald-600',
    text: 'text-[#1b5e20]',
    accent: 'text-[#2e7d32]',
  },
  blue: {
    bg: 'bg-[#e3f2fd]',
    border: 'border-[#bbdefb]',
    header: 'bg-[#d2e3fc]',
    pin: 'bg-blue-600',
    text: 'text-[#0d47a1]',
    accent: 'text-[#1565c0]',
  },
  pink: {
    bg: 'bg-[#fce4ec]',
    border: 'border-[#f8bbd0]',
    header: 'bg-[#f48fb1]/40',
    pin: 'bg-pink-600',
    text: 'text-[#880e4f]',
    accent: 'text-[#ad1457]',
  },
  purple: {
    bg: 'bg-[#f3e5f5]',
    border: 'border-[#e1bee7]',
    header: 'bg-[#ce93d8]/40',
    pin: 'bg-purple-600',
    text: 'text-[#4a148c]',
    accent: 'text-[#6a1b9a]',
  },
  orange: {
    bg: 'bg-[#fff3e0]',
    border: 'border-[#ffe0b2]',
    header: 'bg-[#ffcc80]/40',
    pin: 'bg-amber-600',
    text: 'text-[#bf360c]',
    accent: 'text-[#e65100]',
  },
};

export const ExcelThreeColumnBoard: React.FC<ExcelThreeColumnBoardProps> = ({
  notes,
  onToggleComplete,
  onClickTask,
  onAddTask,
  onDeleteTask,
  onTogglePin,
  onToggleImportant,
  onTogglePriority,
  onToggleRoutineType,
  onToggleSubtask,
  onOpenNewTaskModal,
  onOpenShareModal,
  searchQuery = '',
  onClearSearch,
  importantNotes = [],
  onSaveImportantNotes,
  onOpenNotesModal,
  isCalendarEnabled = true,
  onOpenModesModal,
}) => {
  // Inline adding state for tasks
  const [addingCadence, setAddingCadence] = useState<TaskCadence | null>(null);
  const [inlineText, setInlineText] = useState('');

  // Dropdown open/hide states for Routine, Weekly, Monthly, and Sticky Notes as requested
  const [isRoutineOpen, setIsRoutineOpen] = useState<boolean>(true);
  const [isWeeklyOpen, setIsWeeklyOpen] = useState<boolean>(true);
  const [isMonthlyOpen, setIsMonthlyOpen] = useState<boolean>(true);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(true);

  // Selected date group for popup task list modal
  const [selectedDateGroupForModal, setSelectedDateGroupForModal] = useState<CalendarDateGroup | null>(null);

  // Expanded completed tasks state per cadence
  const [expandedCompleted, setExpandedCompleted] = useState<Record<string, boolean>>({
    daily: false,
    weekly: false,
    monthly: false,
  });

  // Note creation form state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState<NoteColor>('yellow');

  // Search filtering
  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (n: TaskNote) => {
    if (!q) return true;
    if (n.text.toLowerCase().includes(q)) return true;
    if (n.notesDetail && n.notesDetail.toLowerCase().includes(q)) return true;
    if (n.dueDate && n.dueDate.includes(q)) return true;
    if (n.subtasks && n.subtasks.some((st) => st.text.toLowerCase().includes(q))) return true;
    return false;
  };

  const matchesNoteSearch = (inote: ImportantNote) => {
    if (!q) return true;
    if (inote.title.toLowerCase().includes(q)) return true;
    if (inote.content.toLowerCase().includes(q)) return true;
    if (inote.checklist && inote.checklist.some((c) => c.text.toLowerCase().includes(q))) return true;
    return false;
  };

  // Partition notes by cadence
  const dailyNotes = notes.filter((n) => n.cadence === 'daily' && matchesSearch(n));
  const dailyActive = dailyNotes.filter((n) => !n.completed);
  const dailyCompleted = dailyNotes.filter((n) => n.completed);

  const weeklyNotes = notes.filter((n) => n.cadence === 'weekly' && matchesSearch(n));
  const weeklyActive = weeklyNotes.filter((n) => !n.completed);
  const weeklyCompleted = weeklyNotes.filter((n) => n.completed);

  const monthlyNotes = notes.filter((n) => n.cadence === 'monthly' && matchesSearch(n));
  const monthlyActive = monthlyNotes.filter((n) => !n.completed);
  const monthlyCompleted = monthlyNotes.filter((n) => n.completed);

  const filteredNotes = importantNotes.filter(matchesNoteSearch);

  // Sorter for tasks
  const sortTasks = (taskList: TaskNote[]) => {
    return [...taskList].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aDate = getTaskSortDate(a);
      const bDate = getTaskSortDate(b);
      if (aDate.sortTime !== bDate.sortTime) {
        return aDate.sortTime - bDate.sortTime;
      }
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return 0;
    });
  };

  const sortedDailyActive = sortTasks(dailyActive);
  const sortedWeeklyActive = sortTasks(weeklyActive);
  const sortedMonthlyActive = sortTasks(monthlyActive);

  // Ordinal suffix helper: 1st, 2nd, 3rd, 4th, etc.
  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  // Group Weekly Tasks into Date/Day-wise lines like a calendar
  const groupWeeklyTasksByDate = (taskList: TaskNote[]): CalendarDateGroup[] => {
    const dayMap: Record<string, CalendarDateGroup> = {};
    const now = new Date();
    const todayDayName = now.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
    const todayDateNum = now.getDate();

    const weekdayOrder: Record<string, number> = {
      MONDAY: 1, MON: 1, M: 1,
      TUESDAY: 2, TUE: 2,
      WEDNESDAY: 3, WED: 3,
      THURSDAY: 4, THU: 4,
      FRIDAY: 5, FRI: 5,
      SATURDAY: 6, SAT: 6,
      SUNDAY: 7, SUN: 7,
    };

    taskList.forEach((task) => {
      let groupKey = 'OTHER';
      let dateNumber = 'All';
      let dateSubtext = 'Wk';
      let fullLabel = 'Flexible / This Week';
      let sublabel = '';
      let isToday = false;
      let sortOrder = 99;

      if (task.scheduledDay) {
        const raw = String(task.scheduledDay).trim().toUpperCase();
        if (weekdayOrder[raw]) {
          groupKey = `DAY_${raw}`;
          let dayShort = raw.length > 3 ? raw.slice(0, 3) : raw;
          dateNumber = dayShort.charAt(0) + dayShort.slice(1).toLowerCase();
          dateSubtext = 'Day';
          fullLabel = `Every ${raw.charAt(0) + raw.slice(1).toLowerCase()}`;
          sortOrder = weekdayOrder[raw];
          isToday = raw.startsWith(todayDayName);
        } else if (raw.includes('SATURDAY') || raw === 'SAT') {
          groupKey = 'DAY_SAT';
          dateNumber = 'Sat';
          dateSubtext = 'Day';
          fullLabel = 'Every Saturday';
          sortOrder = 6;
          isToday = todayDayName === 'SAT';
        } else if (raw.includes('FRIDAY') || raw === 'FRI') {
          groupKey = 'DAY_FRI';
          dateNumber = 'Fri';
          dateSubtext = 'Day';
          fullLabel = 'Every Friday';
          sortOrder = 5;
          isToday = todayDayName === 'FRI';
        } else if (raw.includes('10, 21, 29')) {
          groupKey = 'DATE_10_21_29';
          dateNumber = '10+';
          dateSubtext = 'Dates';
          fullLabel = 'Dates 10, 21, 29';
          sublabel = 'Recurring weekly/monthly cycle';
          sortOrder = 10;
          isToday = [10, 21, 29].includes(todayDateNum);
        } else if (raw.includes('15, 30')) {
          groupKey = 'DATE_15_30';
          dateNumber = '15+';
          dateSubtext = 'Dates';
          fullLabel = 'Dates 15, 30';
          sublabel = 'Bi-monthly recurring cycle';
          sortOrder = 15;
          isToday = [15, 30].includes(todayDateNum);
        } else {
          groupKey = `CUSTOM_${raw}`;
          dateNumber = String(task.scheduledDay).slice(0, 3);
          dateSubtext = 'Wk';
          fullLabel = String(task.scheduledDay);
          sortOrder = 20;
        }
      } else if (task.dueDate) {
        try {
          const parts = task.dueDate.split('-');
          if (parts.length === 3) {
            const dateObj = new Date(
              parseInt(parts[0], 10),
              parseInt(parts[1], 10) - 1,
              parseInt(parts[2], 10)
            );
            const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
            const dayNum = parseInt(parts[2], 10);
            const monthName = dateObj.toLocaleDateString(undefined, { month: 'short' });

            groupKey = `DUE_${task.dueDate}`;
            dateNumber = `${dayNum}`;
            dateSubtext = dayName;
            fullLabel = `${dayName} • ${dayNum} ${monthName}`;
            sortOrder = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
            isToday = dateObj.toDateString() === now.toDateString();
          }
        } catch {
          groupKey = `DUE_${task.dueDate}`;
          dateNumber = 'Due';
          fullLabel = task.dueDate;
        }
      }

      if (!dayMap[groupKey]) {
        dayMap[groupKey] = {
          id: groupKey,
          dateNumber,
          dateSubtext,
          fullLabel,
          label: fullLabel,
          sublabel,
          isToday,
          sortOrder,
          cadence: 'weekly',
          tasks: [],
        };
      }
      dayMap[groupKey].tasks.push(task);
    });

    return Object.values(dayMap).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  // Group Monthly Tasks into Date/Day-wise lines like a calendar
  const groupMonthlyTasksByDate = (taskList: TaskNote[]): CalendarDateGroup[] => {
    const dateMap: Record<string, CalendarDateGroup> = {};
    const now = new Date();
    const currentDay = now.getDate();
    const monthName = now.toLocaleDateString(undefined, { month: 'short' });

    taskList.forEach((task) => {
      let groupKey = 'M_OTHER';
      let dateNumber = 'Mo';
      let dateSubtext = 'All';
      let fullLabel = 'General Monthly';
      let sublabel = '';
      let isToday = false;
      let sortOrder = 999;

      if (
        typeof task.scheduledDay === 'number' ||
        (typeof task.scheduledDay === 'string' && /^\d+$/.test(task.scheduledDay.trim()))
      ) {
        const dayNum = parseInt(String(task.scheduledDay).trim(), 10);
        groupKey = `DAY_${dayNum}`;
        dateNumber = `${dayNum}`;
        dateSubtext = monthName;
        fullLabel = `${dayNum}${getOrdinalSuffix(dayNum)} of Month`;
        if (task.deadlineDay) {
          sublabel = `Deadline: ${task.deadlineDay}${getOrdinalSuffix(Number(task.deadlineDay))}`;
        }
        sortOrder = dayNum;
        isToday = currentDay === dayNum;
      } else if (task.scheduledDay) {
        const str = String(task.scheduledDay).trim();
        const matchNums = str.match(/\b\d{1,2}\b/g);
        if (matchNums && matchNums.length > 0) {
          const primaryNum = parseInt(matchNums[0], 10);
          groupKey = `STR_${matchNums.join('_')}`;
          dateNumber = matchNums.length > 1 ? `${matchNums[0]}+` : `${matchNums[0]}`;
          dateSubtext = 'Dates';
          fullLabel = `Dates: ${matchNums.join(', ')} of Month`;
          sublabel = `Recurring on ${matchNums.join(', ')}`;
          sortOrder = primaryNum;
          isToday = matchNums.map(Number).includes(currentDay);
        } else {
          groupKey = `STR_${str}`;
          dateNumber = str.slice(0, 3);
          dateSubtext = 'Mo';
          fullLabel = `Monthly: ${str}`;
          sortOrder = 50;
        }
      } else if (task.dueDate) {
        try {
          const parts = task.dueDate.split('-');
          if (parts.length === 3) {
            const dayNum = parseInt(parts[2], 10);
            const dateObj = new Date(
              parseInt(parts[0], 10),
              parseInt(parts[1], 10) - 1,
              dayNum
            );
            const dateFormatted = dateObj.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
            });
            groupKey = `DUE_${task.dueDate}`;
            dateNumber = `${dayNum}`;
            dateSubtext = dateObj.toLocaleDateString(undefined, { month: 'short' });
            fullLabel = `${dayNum}${getOrdinalSuffix(dayNum)} • ${dateFormatted}`;
            sortOrder = dayNum;
            isToday = currentDay === dayNum;
          }
        } catch {
          groupKey = `DUE_${task.dueDate}`;
          dateNumber = 'Due';
          fullLabel = task.dueDate;
        }
      }

      if (!dateMap[groupKey]) {
        dateMap[groupKey] = {
          id: groupKey,
          dateNumber,
          dateSubtext,
          fullLabel,
          label: fullLabel,
          sublabel,
          sortOrder,
          cadence: 'monthly',
          tasks: [],
        };
      }
      dateMap[groupKey].tasks.push(task);
    });

    return Object.values(dateMap).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  // Render a compact sticky note card for Weekly/Monthly calendar grid with hover scale
  const renderCalendarStickyTaskCard = (
    note: TaskNote,
    defaultColorTheme: 'green' | 'purple'
  ) => {
    const hasSubtasks = Boolean(note.subtasks && note.subtasks.length > 0);
    const completedSubtasksCount = hasSubtasks
      ? note.subtasks!.filter((s) => s.completed).length
      : 0;

    const priority = note.priority || 'medium';

    // Background, border, and pushpin colors determined by priority:
    // Urgent: Light rose/red (Day: bg-[#ffebee], Night: dark:bg-[#2d1519])
    // High: Warm peach/orange (Day: bg-[#fff3e0], Night: dark:bg-[#2e1f10])
    // Low: Soft mint/green (Day: bg-[#e8f5e9], Night: dark:bg-[#14281b])
    // Medium: Cadence pastel (green for weekly, purple for monthly)
    let cardBg =
      defaultColorTheme === 'green'
        ? 'bg-[#e8f5e9] dark:bg-[#14281b]'
        : 'bg-[#f3e5f5] dark:bg-[#24172e]';
    let cardBorder =
      defaultColorTheme === 'green'
        ? 'border-[#c8e6c9] dark:border-[#1e452a]'
        : 'border-[#e1bee7] dark:border-[#4a2663]';
    let pinColor = defaultColorTheme === 'green' ? 'bg-emerald-500' : 'bg-purple-500';

    if (priority === 'urgent') {
      cardBg = 'bg-[#ffebee] dark:bg-[#2d1519]';
      cardBorder = 'border-[#ffcdd2] dark:border-[#521e25]';
      pinColor = 'bg-rose-500';
    } else if (priority === 'high') {
      cardBg = 'bg-[#fff3e0] dark:bg-[#2e1f10]';
      cardBorder = 'border-[#ffe0b2] dark:border-[#543315]';
      pinColor = 'bg-amber-500';
    } else if (priority === 'low') {
      cardBg = 'bg-[#e8f5e9] dark:bg-[#14281b]';
      cardBorder = 'border-[#c8e6c9] dark:border-[#1e452a]';
      pinColor = 'bg-emerald-500';
    }

    if (note.completed) {
      cardBg = 'bg-[#f8f9fa] dark:bg-[#1a1b1d] opacity-75';
      cardBorder = 'border-slate-300 dark:border-slate-700';
      pinColor = 'bg-slate-400';
    }

    return (
      <div
        key={note.id}
        onClick={() => onClickTask(note)}
        className={`relative rounded-xl border ${cardBorder} ${cardBg} p-2.5 pt-3.5 shadow-2xs hover:shadow-lg hover:scale-105 hover:z-20 transition-all duration-200 ease-out flex flex-col justify-between group cursor-pointer min-h-[96px] select-none`}
      >
        {/* Authentic Pushpin at Top-Center */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div
            className={`w-2.5 h-2.5 rounded-full ${pinColor} border border-white dark:border-[#121214] shadow-xs`}
          />
        </div>

        {/* Top Bar: Checkbox + Badges */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(note.id);
              }}
              className="w-4 h-4 rounded border border-black/20 dark:border-white/20 bg-white/90 dark:bg-[#282a2c] hover:border-[#1a73e8] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
              title={note.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {note.completed && <Check className="w-3 h-3 stroke-[3] text-emerald-600" />}
            </button>

            {note.assignedTo && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                👤 {note.assignedTo}
              </span>
            )}
          </div>

          {/* Action buttons (Pin, Priority, Share, Delete) - Always visible on mobile & desktop */}
          <div
            className="flex items-center gap-0.5 sm:gap-1 opacity-95 sm:opacity-80 group-hover:opacity-100 transition-all shrink-0 bg-white/40 dark:bg-black/30 backdrop-blur-xs px-1 py-0.5 rounded-lg border border-white/30 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note.id);
                }}
                className={`p-1 rounded hover:bg-white/80 dark:hover:bg-zinc-800 cursor-pointer transition-colors ${
                  note.isPinned ? 'text-[#1a73e8] bg-blue-100/80 dark:bg-blue-950' : 'text-slate-600 dark:text-slate-400'
                }`}
                title={note.isPinned ? 'Unpin' : 'Pin to top'}
              >
                <Pin className={`w-3 h-3 ${note.isPinned ? 'fill-[#1a73e8]' : ''}`} />
              </button>
            )}

            {onTogglePriority && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePriority(note.id);
                }}
                className="p-1 rounded hover:bg-white/80 dark:hover:bg-zinc-800 cursor-pointer transition-transform hover:scale-110"
                title={`Priority: ${note.priority || 'medium'} (Click to change)`}
              >
                <Flame
                  className={`w-3 h-3 ${
                    note.priority === 'urgent'
                      ? 'text-rose-600 fill-rose-600'
                      : note.priority === 'high'
                      ? 'text-amber-600 fill-amber-600'
                      : note.priority === 'low'
                      ? 'text-emerald-600 fill-emerald-600'
                      : 'text-blue-600 fill-blue-600'
                  }`}
                />
              </button>
            )}

            {onOpenShareModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenShareModal(note);
                }}
                className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-300 transition-colors cursor-pointer"
                title="Assign / Share Task with Team"
              >
                <Share2 className="w-3 h-3" />
              </button>
            )}

            {onDeleteTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(note.id);
                }}
                className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                title="Delete task"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Task Text Title */}
        <div className="flex-1 my-0.5">
          <h4 className="text-xs font-bold text-[#202124] dark:text-white leading-snug break-words line-clamp-2">
            {note.text}
          </h4>
        </div>

        {/* Footer: Subtasks only if present (no redundant date/day) */}
        {hasSubtasks && (
          <div className="mt-1 pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">
            <span className="flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300">
              <ListChecks className="w-3 h-3" />
              <span>
                {completedSubtasksCount}/{note.subtasks!.length}
              </span>
            </span>
          </div>
        )}
      </div>
    );
  };

  // Submit inline task add
  const handleSubmitInline = (cadence: TaskCadence) => {
    const trimmed = inlineText.trim();
    if (!trimmed) return;
    onAddTask(trimmed, cadence);
    setInlineText('');
    setAddingCadence(null);
  };

  // Toggle checklist item inside an Important Note
  const handleToggleNoteChecklist = (noteId: string, checklistId: string) => {
    if (!onSaveImportantNotes) return;
    const updated = importantNotes.map((nt) => {
      if (nt.id !== noteId || !nt.checklist) return nt;
      return {
        ...nt,
        checklist: nt.checklist.map((item) =>
          item.id === checklistId ? { ...item, completed: !item.completed } : item
        ),
      };
    });
    onSaveImportantNotes(updated);
  };

  // Toggle pin on an Important Note
  const handleTogglePinNote = (noteId: string) => {
    if (!onSaveImportantNotes) return;
    const updated = importantNotes.map((nt) =>
      nt.id === noteId ? { ...nt, isPinned: !nt.isPinned } : nt
    );
    onSaveImportantNotes(updated);
  };

  // Delete an Important Note
  const handleDeleteNote = (noteId: string) => {
    if (!onSaveImportantNotes) return;
    const updated = importantNotes.filter((nt) => nt.id !== noteId);
    onSaveImportantNotes(updated);
  };

  // Create new note
  const handleCreateNote = () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;
    const newNote: ImportantNote = {
      id: `inote-${Date.now()}`,
      title: newNoteTitle.trim() || 'Untitled Note',
      content: newNoteContent.trim(),
      color: newNoteColor,
      isPinned: false,
      createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    onSaveImportantNotes?.([newNote, ...importantNotes]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  // Render individual task row with priority background
  const renderTaskRow = (note: TaskNote) => {
    return (
      <div
        key={note.id}
        onClick={() => onClickTask(note)}
        className={`group px-3.5 py-2.5 flex items-start gap-2.5 transition-all cursor-pointer border-b border-white/20 dark:border-white/10 bg-transparent hover:bg-white/15 dark:hover:bg-white/10 backdrop-blur-[1px] ${
          note.completed ? 'opacity-60' : ''
        }`}
      >
        {/* Complete Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(note.id);
          }}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs backdrop-blur-xs ${
            note.completed
              ? 'bg-[#188038] border-[#188038] text-white'
              : 'border-white/60 dark:border-white/30 bg-white/60 dark:bg-black/50 hover:border-[#1a73e8]'
          }`}
          title={note.completed ? 'Completed (Click to mark pending)' : 'Click to complete task'}
        >
          {note.completed && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
        </button>

        {/* Task Text & Details (Clean: only complete status & task text, no checklist, no priority badge, no time/day) */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.isPinned && <Pin className="w-3.5 h-3.5 text-[#1a73e8] fill-[#1a73e8] shrink-0" />}
            {note.isImportant && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}

            <span className={`text-xs sm:text-sm font-extrabold leading-normal break-words drop-shadow-xs ${note.completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-950 dark:text-white'}`}>
              {note.text}
            </span>

            {/* Assigned to badge */}
            {note.assignedTo && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-950 dark:text-purple-200 border border-purple-400/40 shrink-0 shadow-2xs backdrop-blur-xs">
                👤 {note.assignedTo}
              </span>
            )}
          </div>
        </div>

        {/* Action icons (Pin, Priority, Share, Star, Delete) - Highlighted Header-Style Glass Pill */}
        <div
          className="flex items-center gap-1 shrink-0 ml-auto bg-white/55 dark:bg-black/60 backdrop-blur-md border border-white/60 dark:border-white/25 shadow-md rounded-xl px-1.5 py-1 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {onTogglePin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note.id);
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                note.isPinned
                  ? 'bg-[#1a73e8] text-white shadow-xs'
                  : 'text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-white/80 dark:hover:bg-white/20'
              }`}
              title={note.isPinned ? 'Pinned to top (Click to unpin)' : 'Pin task to top'}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-white stroke-[2.4]' : 'stroke-[2.2]'}`} />
            </button>
          )}

          {onTogglePriority && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePriority(note.id);
              }}
              className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-white/20 transition-all cursor-pointer hover:scale-110 active:scale-95"
              title={`Priority: ${(note.priority || 'medium').toUpperCase()} (Click to change)`}
            >
              <Flame
                className={`w-3.5 h-3.5 stroke-[2.2] ${
                  note.priority === 'urgent'
                    ? 'text-rose-600 fill-rose-600 animate-pulse'
                    : note.priority === 'high'
                    ? 'text-amber-500 fill-amber-500'
                    : note.priority === 'low'
                    ? 'text-emerald-500 fill-emerald-500'
                    : 'text-blue-600 fill-blue-600'
                }`}
              />
            </button>
          )}

          {onOpenShareModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenShareModal(note);
              }}
              className="p-1.5 rounded-lg text-purple-600 dark:text-purple-300 hover:bg-white/80 dark:hover:bg-white/20 transition-all cursor-pointer hover:scale-110 active:scale-95"
              title="Assign / Share Task with Team"
            >
              <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}

          {onToggleImportant && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleImportant(note.id);
              }}
              className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-white/20 transition-all cursor-pointer hover:scale-110 active:scale-95"
              title={note.isImportant ? 'Important (Click to unmark)' : 'Mark as important'}
            >
              <Star
                className={`w-3.5 h-3.5 stroke-[2.2] ${
                  note.isImportant
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              />
            </button>
          )}

          {onDeleteTask && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(note.id);
              }}
              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 transition-all cursor-pointer hover:scale-110 active:scale-95"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render completed tasks section
  const renderCompletedSection = (cadence: TaskCadence, completedList: TaskNote[]) => {
    if (completedList.length === 0) return null;
    const isExp = Boolean(expandedCompleted[cadence]);

    return (
      <div className="border-t border-[#dadce0] bg-[#f8f9fa] flex flex-col shrink-0">
        <button
          type="button"
          onClick={() => setExpandedCompleted((prev) => ({ ...prev, [cadence]: !prev[cadence] }))}
          className="w-full px-3 py-2 flex items-center justify-between text-xs text-[#3c4043] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer select-none"
        >
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed ({completedList.length})</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#1a73e8] font-bold">
            <span>{isExp ? 'Hide' : 'Show'}</span>
            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isExp && (
          <div className="max-h-56 overflow-y-auto divide-y divide-[#dadce0] border-t border-[#dadce0] bg-white">
            {completedList.map((comp) => (
              <div
                key={comp.id}
                onClick={() => onClickTask(comp)}
                className="px-3 py-2 flex items-start gap-2 hover:bg-[#f8f9fa] transition-colors cursor-pointer group"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(comp.id);
                  }}
                  className="mt-0.5 w-3.5 h-3.5 rounded border border-emerald-600 bg-emerald-600 flex items-center justify-center cursor-pointer shrink-0"
                  title="Reopen task"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[#5f6368] line-through font-medium break-words block">
                    {comp.text}
                  </span>
                  {comp.completedAt && (
                    <span className="text-[10px] text-emerald-700 font-mono">
                      Completed: {comp.completedAt}
                    </span>
                  )}
                </div>
                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTask(comp.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#5f6368] hover:text-[#c5221f] hover:bg-[#fce8e6] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full bg-transparent p-3 sm:p-5 overflow-y-auto">
      {/* Search results notice if search active */}
      {q && (
        <div className="max-w-[1600px] mx-auto mb-4 bg-white border border-[#dadce0] rounded-xl p-3 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#202124]">
            <Search className="w-4 h-4 text-[#1a73e8]" />
            <span>Search results for <strong>"{searchQuery}"</strong></span>
          </div>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="text-xs text-[#1a73e8] hover:text-[#1557b0] font-semibold flex items-center gap-1 cursor-pointer hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Search</span>
            </button>
          )}
        </div>
      )}


      {/* 
        ========================================================================
        SPACIOUS BOARD (Optional 2-Column with Calendar or Full-Width Routine):
        Col 1: Routine Tasks (Full Width & Spacious)
        Col 2: Calendar Tasks Board (Weekly & Monthly Interactive Schedule - Optional)
        ========================================================================
      */}
      <div className={isCalendarEnabled ? "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-[1600px] mx-auto items-start" : "w-full max-w-4xl mx-auto items-start"}>
        {/* ====================================================================
            COLUMN 1: ROUTINE TASKS (SPACIOUS & CLEAN)
           ==================================================================== */}
        <div className="bg-white/10 dark:bg-black/25 backdrop-blur-md border border-white/30 dark:border-white/15 border-t-4 border-t-[#1a73e8] rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all">
          {/* Routine Dropdown Toggle Header */}
          <div
            onClick={() => setIsRoutineOpen(!isRoutineOpen)}
            className="px-3.5 py-3 bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 flex items-center justify-between cursor-pointer select-none hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
            title={isRoutineOpen ? 'Click to hide Routine Tasks' : 'Click to open Routine Tasks'}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-1 -ml-1 text-[#1a73e8] hover:bg-white/10 dark:hover:bg-white/10 rounded cursor-pointer transition-transform"
                title={isRoutineOpen ? 'Hide Routine Tasks' : 'Show Routine Tasks'}
              >
                {isRoutineOpen ? (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
              <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
              <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs">Routine Tasks</h2>
              <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-[#e8f0fe]/80 dark:bg-blue-950/80 text-[#1a73e8] dark:text-[#8ab4f8] border border-blue-200/80 dark:border-blue-800 shadow-2xs backdrop-blur-xs">
                {sortedDailyActive.length}
              </span>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setIsRoutineOpen(true);
                  if (addingCadence === 'daily') setAddingCadence(null);
                  else {
                    setAddingCadence('daily');
                    setInlineText('');
                  }
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-white/30 dark:border-white/20 bg-white/25 dark:bg-white/10 hover:bg-white/40 dark:hover:bg-white/20 text-slate-900 dark:text-white transition-colors cursor-pointer flex items-center justify-center shadow-2xs backdrop-blur-md"
                title="Add Routine Task"
              >
                {addingCadence === 'daily' ? (
                  <X className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                ) : (
                  <Plus className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8] stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>

          {/* Routine Body (When Open) */}
          {isRoutineOpen && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-100 min-h-[380px]">
              {/* Inline Add Box */}
              {addingCadence === 'daily' && (
                <div className="p-3 bg-white/40 dark:bg-black/30 backdrop-blur-xs border-b border-slate-200/60 dark:border-white/10">
                  <input
                    type="text"
                    value={inlineText}
                    onChange={(e) => setInlineText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmitInline('daily');
                      if (e.key === 'Escape') setAddingCadence(null);
                    }}
                    placeholder="Type routine task and press Enter..."
                    autoFocus
                    className="w-full px-3 py-1.5 bg-white/80 dark:bg-black/50 border border-slate-300/80 dark:border-white/20 focus:border-[#1a73e8] rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none shadow-2xs backdrop-blur-xs"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setAddingCadence(null)}
                      className="px-2.5 py-1 text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!inlineText.trim()}
                      onClick={() => handleSubmitInline('daily')}
                      className="px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              )}

              {/* Active Tasks List */}
              <div className="flex-1 divide-y divide-[#f1f3f4] dark:divide-[#303134] overflow-y-auto max-h-[640px]">
                {sortedDailyActive.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-[#5f6368] dark:text-[#9aa0a6] h-48 select-none">
                    <CheckCircle2 className="w-7 h-7 text-[#9aa0a6] mb-1.5" />
                    <p className="text-xs font-semibold text-[#3c4043] dark:text-slate-200">No routine tasks right now</p>
                    <button
                      type="button"
                      onClick={() => setAddingCadence('daily')}
                      className="mt-2.5 px-3 py-1 rounded-lg bg-[#e8f0fe] dark:bg-blue-950/80 hover:bg-[#d2e3fc] text-xs text-[#1a73e8] dark:text-[#8ab4f8] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Routine Task</span>
                    </button>
                  </div>
                ) : (
                  sortedDailyActive.map(renderTaskRow)
                )}
              </div>

              {/* Completed Routine Tasks */}
              {renderCompletedSection('daily', dailyCompleted)}
            </div>
          )}
        </div>

        {/* ====================================================================
            COLUMN 2: UNIFIED CALENDAR TASK PANEL (WEEKLY & MONTHLY SCHEDULE - OPTIONAL)
           ==================================================================== */}
        {isCalendarEnabled && (
          <div className="flex flex-col gap-4">
            <CalendarTasksPanel
              notes={notes}
              onToggleComplete={onToggleComplete}
              onClickTask={onClickTask}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              onTogglePin={onTogglePin}
              onToggleImportant={onToggleImportant}
              onToggleSubtask={onToggleSubtask}
              onOpenShareModal={onOpenShareModal}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </div>

      {/* Pop-up Window for Specific Date Tasks (Triggered by clicking any Calendar Round Date Icon) */}
      <CalendarDateTasksModal
        isOpen={Boolean(selectedDateGroupForModal)}
        onClose={() => setSelectedDateGroupForModal(null)}
        dateGroup={
          selectedDateGroupForModal
            ? {
                ...selectedDateGroupForModal,
                tasks: notes.filter((n) =>
                  selectedDateGroupForModal.tasks.some((t) => t.id === n.id)
                ),
              }
            : null
        }
        onToggleComplete={onToggleComplete}
        onClickTask={onClickTask}
        onDeleteTask={onDeleteTask}
        onTogglePin={onTogglePin}
        onToggleImportant={onToggleImportant}
        onToggleSubtask={onToggleSubtask}
        onOpenShareModal={onOpenShareModal}
        onAddTask={onAddTask}
      />
    </div>
  );
};
