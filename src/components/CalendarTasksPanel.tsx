import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TaskNote, TaskCadence, TaskPriority } from '../types';
import { CalendarDateGroup, CalendarDateTasksModal } from './CalendarDateTasksModal';

interface CalendarTasksPanelProps {
  notes: TaskNote[];
  onToggleComplete: (id: string) => void;
  onClickTask: (note: TaskNote) => void;
  onAddTask: (
    text: string,
    cadence: TaskCadence,
    dueDate?: string,
    scheduledDay?: number | string
  ) => void;
  onDeleteTask?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onToggleImportant?: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onOpenShareModal?: (note: TaskNote) => void;
  searchQuery?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarTasksPanel: React.FC<CalendarTasksPanelProps> = ({
  notes,
  onToggleComplete,
  onClickTask,
  onAddTask,
  onDeleteTask,
  onTogglePin,
  onToggleImportant,
  onToggleSubtask,
  onOpenShareModal,
  searchQuery = '',
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [activeCadenceFilter, setActiveCadenceFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(true);

  // Selected date group for the click modal
  const [selectedDateGroup, setSelectedDateGroup] = useState<CalendarDateGroup | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Filter tasks: weekly, monthly, and scheduled daily tasks
  const scheduledTasks = useMemo(() => {
    return notes.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!t.text.toLowerCase().includes(q)) return false;
      }
      if (activeCadenceFilter === 'weekly') return t.cadence === 'weekly';
      if (activeCadenceFilter === 'monthly') return t.cadence === 'monthly';
      return t.cadence === 'weekly' || t.cadence === 'monthly' || Boolean(t.dueDate);
    });
  }, [notes, searchQuery, activeCadenceFilter]);

  // Map tasks by date for the calendar view
  // Key format: "YYYY-MM-DD" or day of month number "day-15" or weekday "weekday-Mon"
  const tasksByDateMap = useMemo(() => {
    const map = new Map<string, TaskNote[]>();

    const append = (key: string, task: TaskNote) => {
      const arr = map.get(key) || [];
      arr.push(task);
      map.set(key, arr);
    };

    scheduledTasks.forEach((task) => {
      // 1. Explicit dueDate (YYYY-MM-DD)
      if (task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
        append(task.dueDate, task);
        return;
      }

      // 2. Scheduled Day of month for Monthly tasks
      if (task.cadence === 'monthly' && typeof task.scheduledDay === 'number') {
        const dayStr = String(task.scheduledDay).padStart(2, '0');
        const monthStr = String(viewMonth + 1).padStart(2, '0');
        const constructed = `${viewYear}-${monthStr}-${dayStr}`;
        append(constructed, task);
        return;
      }

      // 3. Weekly tasks mapped to weekday in this view month
      if (task.cadence === 'weekly') {
        const weekdayStr = typeof task.scheduledDay === 'string' ? task.scheduledDay.substring(0, 3) : 'Mon';
        const weekdayMap: Record<string, number> = {
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
          Sun: 0,
        };
        const targetDayOfWeek = weekdayMap[weekdayStr] ?? 1;

        // Spread to the matching weekdays of current month
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = new Date(viewYear, viewMonth, d);
          if (dt.getDay() === targetDayOfWeek) {
            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            append(dateKey, task);
          }
        }
        return;
      }

      // 4. Fallback for tasks with created date
      if (task.createdAt) {
        const match = task.createdAt.match(/\d{4}-\d{2}-\d{2}/);
        if (match) {
          append(match[0], task);
        }
      }
    });

    return map;
  }, [scheduledTasks, viewYear, viewMonth]);

  // Calendar cells generation for viewMonth & viewYear
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
    // Adjust so Monday is first (index 0), Sun is index 6
    const startingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days: Array<{
      dayNumber: number;
      dateKey: string;
      isToday: boolean;
      tasks: TaskNote[];
    }> = [];

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday =
        today.getFullYear() === viewYear &&
        today.getMonth() === viewMonth &&
        today.getDate() === d;

      const dateTasks = tasksByDateMap.get(dateKey) || [];

      days.push({
        dayNumber: d,
        dateKey,
        isToday,
        tasks: dateTasks,
      });
    }

    return { days, startingOffset };
  }, [viewYear, viewMonth, tasksByDateMap, today]);

  // Open modal for a specific day
  const handleOpenDateModal = (dayNumber: number, dateKey: string, tasks: TaskNote[]) => {
    const dt = new Date(viewYear, viewMonth, dayNumber);
    const dayName = dt.toLocaleDateString([], { weekday: 'long' });
    const fullDateText = `${dayName}, ${MONTH_NAMES[viewMonth]} ${dayNumber}, ${viewYear}`;

    const dateGroup: CalendarDateGroup = {
      id: `cal-date-${dateKey}`,
      dateNumber: String(dayNumber),
      dateSubtext: MONTH_NAMES[viewMonth].substring(0, 3),
      fullLabel: fullDateText,
      sortOrder: dayNumber,
      cadence: 'monthly',
      tasks,
    };

    setSelectedDateGroup(dateGroup);
  };

  // Counts
  const totalWeekly = notes.filter((t) => t.cadence === 'weekly' && !t.completed).length;
  const totalMonthly = notes.filter((t) => t.cadence === 'monthly' && !t.completed).length;

  return (
    <div className="bg-white/10 dark:bg-black/25 backdrop-blur-md border border-white/30 dark:border-white/15 border-t-4 border-t-[#1a73e8] rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all">
      {/* Header: Title + Navigation */}
      <div className="px-3.5 py-3 bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          {/* Hide/Unhide Chevron Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="p-1 -ml-1 text-[#1a73e8] hover:bg-white/10 dark:hover:bg-white/10 rounded cursor-pointer transition-transform"
            title={isCalendarOpen ? 'Hide Calendar Task Board' : 'Unhide Calendar Task Board'}
          >
            {isCalendarOpen ? (
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>

          <div
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100/80 dark:bg-blue-950/80 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shadow-2xs backdrop-blur-xs">
              <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs">Calendar Task Board</h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50/80 text-[#1a73e8] dark:bg-blue-950/80 dark:text-[#8ab4f8] border border-blue-200/80 dark:border-blue-800 shadow-2xs backdrop-blur-xs">
                  Weekly & Monthly
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls: Month Selector (when open) */}
        {isCalendarOpen && (
          <div className="flex items-center gap-1 bg-white/25 dark:bg-black/25 p-1 rounded-xl border border-white/30 dark:border-white/15 shadow-2xs backdrop-blur-md">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white/20 dark:hover:bg-white/10 rounded text-slate-900 dark:text-slate-100 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <span className="text-xs font-black text-slate-950 dark:text-white px-2 min-w-[110px] text-center font-mono">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-white/20 dark:hover:bg-white/10 rounded text-slate-900 dark:text-slate-100 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2 py-0.5 text-[11px] font-black text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-white/30 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
            >
              Today
            </button>
          </div>
        )}
      </div>

      {isCalendarOpen && (
        <>

      {/* Cadence Quick Filter Pills + Legend */}
      <div className="px-3.5 py-2 bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCadenceFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
              activeCadenceFilter === 'all'
                ? 'bg-[#1a73e8] text-white shadow-2xs'
                : 'bg-white/60 text-slate-700 hover:bg-white dark:bg-black/30 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            All Scheduled ({totalWeekly + totalMonthly})
          </button>
          <button
            type="button"
            onClick={() => setActiveCadenceFilter('weekly')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
              activeCadenceFilter === 'weekly'
                ? 'bg-[#188038] text-white shadow-2xs'
                : 'bg-emerald-50/80 text-[#188038] hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Weekly ({totalWeekly})
          </button>
          <button
            type="button"
            onClick={() => setActiveCadenceFilter('monthly')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
              activeCadenceFilter === 'monthly'
                ? 'bg-[#9334e6] text-white shadow-2xs'
                : 'bg-purple-50/80 text-[#9334e6] hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Monthly ({totalMonthly})
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-700 dark:text-slate-300 font-bold">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#188038]" /> Weekly
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#9334e6]" /> Monthly
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#1a73e8]" /> Daily
          </span>
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="p-3 sm:p-4 bg-transparent">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div
              key={w}
              className={`text-[11px] uppercase tracking-wider py-1 select-none ${
                idx >= 5 ? 'text-amber-700 dark:text-amber-300 font-extrabold' : 'text-slate-700 dark:text-slate-200 font-bold'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty cells before month starts */}
          {Array.from({ length: calendarDays.startingOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[54px] sm:min-h-[62px] rounded-2xl border border-transparent bg-slate-50/40 dark:bg-slate-800/10 opacity-30 pointer-events-none"
            />
          ))}

          {/* Month Day Cells - Round-cornered date tiles directly (no square with inner circle) */}
          {calendarDays.days.map((dayItem) => {
            const hasTasks = dayItem.tasks.length > 0;
            const activeCount = dayItem.tasks.filter((t) => !t.completed).length;
            const completedCount = dayItem.tasks.filter((t) => t.completed).length;
            const isHovered = hoveredDateKey === dayItem.dateKey;

            // Cadence types present on this date
            const hasWeekly = dayItem.tasks.some((t) => t.cadence === 'weekly');
            const hasMonthly = dayItem.tasks.some((t) => t.cadence === 'monthly');
            const hasDaily = dayItem.tasks.some((t) => t.cadence === 'daily');

            // Intelligently calculate tooltip alignment so it never clips off screen
            const colIndex = (calendarDays.startingOffset + (dayItem.dayNumber - 1)) % 7;
            const isNearTop = dayItem.dayNumber + calendarDays.startingOffset <= 7;
            const tooltipPos =
              colIndex <= 1
                ? 'left-0 translate-x-0'
                : colIndex >= 5
                ? 'right-0 translate-x-0'
                : 'left-1/2 -translate-x-1/2';
            const tooltipVertical = isNearTop ? 'top-full mt-2' : 'bottom-full mb-2';

            return (
              <div
                key={dayItem.dateKey}
                onMouseEnter={() => setHoveredDateKey(dayItem.dateKey)}
                onMouseLeave={() => setHoveredDateKey(null)}
                onClick={() => {
                  setHoveredDateKey(null);
                  handleOpenDateModal(dayItem.dayNumber, dayItem.dateKey, dayItem.tasks);
                }}
                className={`relative min-h-[54px] sm:min-h-[62px] rounded-2xl p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer group select-none shadow-2xs ${
                  dayItem.isToday
                    ? 'bg-[#1a73e8] text-white ring-2 ring-blue-300 dark:ring-blue-500 shadow-md font-black hover:bg-[#1557b0]'
                    : hasTasks
                    ? 'bg-blue-50/90 dark:bg-[#1b2838] border-2 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100 hover:border-[#1a73e8] hover:bg-white dark:hover:bg-[#223348] hover:shadow-md hover:scale-102'
                    : 'bg-white/50 dark:bg-black/30 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white hover:border-[#1a73e8] hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-xs hover:scale-102 backdrop-blur-2xs'
                }`}
                title={`Click to view tasks or add a new task for ${dayItem.dayNumber} ${MONTH_NAMES[viewMonth]}`}
              >
                {/* Top Row: Date Number on Top-Left (Enlarged prominently so it stands out above the count badge) */}
                <div className="w-full flex items-start justify-between pr-5">
                  <span
                    className={`text-base sm:text-lg md:text-xl font-mono font-black leading-none tracking-tight ${
                      dayItem.isToday
                        ? 'text-white'
                        : hasTasks
                        ? 'text-blue-950 dark:text-blue-100 drop-shadow-xs'
                        : 'text-slate-950 dark:text-white group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] drop-shadow-2xs'
                    }`}
                  >
                    {dayItem.dayNumber}
                  </span>
                </div>

                {/* Task Badge Counter - Cleanly placed in top-right corner */}
                {hasTasks ? (
                  <span
                    className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-xs leading-none ring-1 ring-white/50 ${
                      dayItem.isToday
                        ? 'bg-white text-[#1a73e8]'
                        : activeCount > 0
                        ? 'bg-[#1a73e8] text-white dark:bg-blue-500 dark:text-white'
                        : 'bg-[#188038] text-white'
                    }`}
                    title={`${activeCount} pending, ${completedCount} done`}
                  >
                    {activeCount > 0 ? activeCount : '✓'}
                  </span>
                ) : (
                  <div
                    className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      dayItem.isToday ? 'text-white' : 'text-[#1a73e8] dark:text-[#8ab4f8]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}

                {/* Bottom Row: Cadence Indicator Dots */}
                <div className="w-full flex items-center gap-1 pt-1">
                  {hasWeekly && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dayItem.isToday ? 'bg-emerald-200 ring-1 ring-white/50' : 'bg-[#188038]'
                      } shadow-2xs`}
                      title="Weekly task scheduled"
                    />
                  )}
                  {hasMonthly && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dayItem.isToday ? 'bg-purple-200 ring-1 ring-white/50' : 'bg-[#9334e6]'
                      } shadow-2xs`}
                      title="Monthly task scheduled"
                    />
                  )}
                  {hasDaily && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dayItem.isToday ? 'bg-blue-100 ring-1 ring-white/50' : 'bg-[#1a73e8]'
                      } shadow-2xs`}
                      title="Daily task scheduled"
                    />
                  )}
                  {!hasTasks && (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-blue-300 dark:group-hover:bg-blue-600/40 transition-colors" />
                  )}

                  {hasTasks && (
                    <span
                      className={`text-[10px] font-mono truncate ml-auto hidden sm:inline ${
                        dayItem.isToday
                          ? 'text-white/80'
                          : 'text-[#5f6368] dark:text-slate-300'
                      }`}
                    >
                      {dayItem.tasks[0]?.text.substring(0, 8)}...
                    </span>
                  )}
                </div>

                {/* Desktop Hover Popover Preview (Bounded positioning to prevent cut-off) */}
                {isHovered && hasTasks && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`hidden md:block absolute ${tooltipPos} ${tooltipVertical} z-50 w-64 bg-white dark:bg-[#303134] rounded-xl border border-[#dadce0] dark:border-[#5f6368] shadow-2xl p-3 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#dadce0] dark:border-[#5f6368]">
                      <span className="text-xs font-extrabold text-[#202124] dark:text-white">
                        {dayItem.dayNumber} {MONTH_NAMES[viewMonth]} {viewYear}
                      </span>
                      <span className="text-[10px] font-bold text-[#1a73e8]">
                        {dayItem.tasks.length} task{dayItem.tasks.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {dayItem.tasks.map((t) => (
                        <div key={t.id} className="text-xs flex items-start gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                              t.cadence === 'weekly'
                                ? 'bg-[#188038]'
                                : t.cadence === 'monthly'
                                ? 'bg-[#9334e6]'
                                : 'bg-[#1a73e8]'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`truncate font-medium ${
                                t.completed
                                  ? 'line-through text-slate-400'
                                  : 'text-[#202124] dark:text-slate-100'
                              }`}
                            >
                              {t.text}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              <span className="capitalize">{t.cadence}</span>
                              {t.priority && <span>• {t.priority}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-[#dadce0] dark:border-[#5f6368] text-center">
                      <span className="text-[10px] text-[#1a73e8] dark:text-[#8ab4f8] font-bold">
                        Click date to open full task details & add new
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Pop-up Window for Specific Date Tasks & New Task Creation */}
      <CalendarDateTasksModal
        isOpen={Boolean(selectedDateGroup)}
        onClose={() => setSelectedDateGroup(null)}
        dateGroup={
          selectedDateGroup
            ? {
                ...selectedDateGroup,
                tasks: notes.filter((n) =>
                  selectedDateGroup.tasks.some((t) => t.id === n.id)
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
