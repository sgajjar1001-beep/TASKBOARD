import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
} from 'lucide-react';
import { TaskNote, TaskPriority } from '../types';
import { CalendarDateGroup } from './CalendarDateTasksModal';

interface CalendarDateGroupViewProps {
  cadence: 'weekly' | 'monthly';
  dateGroups: CalendarDateGroup[];
  onSelectDateGroup: (group: CalendarDateGroup) => void;
  onToggleComplete?: (id: string) => void;
  onClickTask?: (note: TaskNote) => void;
  onOpenShareModal?: (note: TaskNote) => void;
}

export const CalendarDateGroupView: React.FC<CalendarDateGroupViewProps> = ({
  cadence,
  dateGroups,
  onSelectDateGroup,
}) => {
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const isWeekly = cadence === 'weekly';

  const theme = isWeekly
    ? {
        border: 'border-emerald-500',
        activeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        activeText: 'text-[#188038] dark:text-[#81c995]',
        hoverBg: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40',
        badgeBg: 'bg-[#188038]',
        glowRing: 'ring-[#188038]/30',
        subtext: 'Weekly Schedule',
      }
    : {
        border: 'border-[#9334e6]',
        activeBg: 'bg-purple-50 dark:bg-purple-950/60',
        activeText: 'text-[#9334e6] dark:text-[#c084fc]',
        hoverBg: 'hover:bg-purple-50/80 dark:hover:bg-purple-950/40',
        badgeBg: 'bg-[#9334e6]',
        glowRing: 'ring-[#9334e6]/30',
        subtext: 'Monthly Dates',
      };

  // If weekly, make sure all 7 days of the week are available in order so users have a complete calendar week
  const displayGroups = React.useMemo(() => {
    if (!isWeekly) return dateGroups;

    const weekdayOrder: Record<string, { full: string; order: number; sub: string }> = {
      Mon: { full: 'Every Monday', order: 1, sub: 'Day' },
      Tue: { full: 'Every Tuesday', order: 2, sub: 'Day' },
      Wed: { full: 'Every Wednesday', order: 3, sub: 'Day' },
      Thu: { full: 'Every Thursday', order: 4, sub: 'Day' },
      Fri: { full: 'Every Friday', order: 5, sub: 'Day' },
      Sat: { full: 'Every Saturday', order: 6, sub: 'Day' },
      Sun: { full: 'Every Sunday', order: 7, sub: 'Day' },
    };

    const existingMap = new Map<string, CalendarDateGroup>();
    dateGroups.forEach((g) => {
      existingMap.set(g.dateNumber.toLowerCase(), g);
      if (g.id) existingMap.set(g.id.toLowerCase(), g);
    });

    const now = new Date();
    const todayDayName = now.toLocaleDateString(undefined, { weekday: 'short' });

    const fullWeekList: CalendarDateGroup[] = Object.entries(weekdayOrder).map(
      ([code, meta]) => {
        const found =
          existingMap.get(code.toLowerCase()) ||
          existingMap.get(`day_${code.toUpperCase()}`.toLowerCase());

        if (found) {
          return found;
        }

        return {
          id: `DAY_${code.toUpperCase()}`,
          dateNumber: code,
          dateSubtext: meta.sub,
          fullLabel: meta.full,
          label: meta.full,
          isToday: todayDayName === code,
          sortOrder: meta.order,
          cadence: 'weekly',
          tasks: [],
        };
      }
    );

    // Also append any non-weekday custom cycle groups (e.g. "10+", "15+") that have tasks
    dateGroups.forEach((g) => {
      const isStandardWeekday = Object.keys(weekdayOrder).some(
        (code) => code.toLowerCase() === g.dateNumber.toLowerCase()
      );
      if (!isStandardWeekday) {
        fullWeekList.push(g);
      }
    });

    return fullWeekList.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dateGroups, isWeekly]);

  if (displayGroups.length === 0) {
    return (
      <div className="py-8 text-center text-[#5f6368] dark:text-[#9aa0a6] select-none">
        <CalendarDays className="w-8 h-8 text-[#9aa0a6] mx-auto mb-2 opacity-50" />
        <p className="text-xs font-semibold">No scheduled dates configured yet</p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3">
      {/* 
        ========================================================================
        ONLY CIRCULAR ICONS GRID (No Task Cards on Screen)
        "Task or icon dono nahi chahiye sirf icon hi rakho uspe click karke list open ho task ki"
        ========================================================================
      */}
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 justify-items-center">
        {displayGroups.map((group) => {
          const taskCount = group.tasks.length;
          const hasTasks = taskCount > 0;
          const activeTasks = group.tasks.filter((t) => !t.completed);
          const allCompleted = hasTasks && activeTasks.length === 0;
          const isHovered = hoveredGroupId === group.id;

          return (
            <div
              key={group.id}
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredGroupId(group.id)}
              onMouseLeave={() => setHoveredGroupId(null)}
            >
              {/* The Circular Date Icon Button */}
              <button
                type="button"
                onClick={() => onSelectDateGroup(group)}
                className={`group/iconBtn relative flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                  theme.hoverBg
                } ${group.isToday ? 'scale-105' : 'hover:scale-105 active:scale-95'}`}
                title={`Click to open task list for ${group.fullLabel} (${taskCount} tasks)`}
              >
                {/* Round Circular Icon */}
                <div className="relative">
                  <div
                    className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center font-black transition-all duration-200 shadow-2xs group-hover/iconBtn:shadow-md ${
                      hasTasks
                        ? allCompleted
                          ? 'border-2.5 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : `border-2.5 ${theme.border} ${theme.activeBg} ${theme.activeText}`
                        : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-[#18191b] text-slate-400 dark:text-slate-500 hover:border-slate-400'
                    } ${group.isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1e1f21]' : ''}`}
                  >
                    {/* Date / Day Number */}
                    <span
                      className={`font-black leading-none ${
                        group.dateNumber.length > 2 ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
                      }`}
                    >
                      {group.dateNumber}
                    </span>

                    {/* Tiny subtext e.g. "Day" or "Oct" */}
                    {group.dateSubtext && (
                      <span className="text-[8px] font-extrabold uppercase leading-none opacity-75 mt-0.5">
                        {group.dateSubtext}
                      </span>
                    )}
                  </div>

                  {/* Multiple Tasks Count Badge (Only when tasks exist) */}
                  {hasTasks && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-[#1e1f21] shadow-xs ${
                        allCompleted ? 'bg-emerald-600' : 'bg-[#1a73e8]'
                      }`}
                      title={`${taskCount} tasks scheduled`}
                    >
                      {allCompleted ? '✓' : taskCount}
                    </span>
                  )}

                  {/* "TODAY" micro badge */}
                  {group.isToday && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.2 bg-blue-600 text-white text-[7px] font-black rounded uppercase shadow-xs pointer-events-none">
                      Today
                    </span>
                  )}
                </div>

                {/* Subtitle Label under the circle icon */}
                <span
                  className={`text-[11px] font-bold mt-1.5 truncate max-w-[68px] text-center ${
                    hasTasks
                      ? 'text-[#202124] dark:text-[#e8eaed]'
                      : 'text-[#80868b] dark:text-[#5f6368]'
                  }`}
                >
                  {group.dateNumber.length > 2 ? group.fullLabel.split(' ')[0] : `${group.dateNumber}th`}
                </span>

                {/* Small indicator text: task count */}
                <span className="text-[9px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] leading-none">
                  {hasTasks ? `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}` : 'Empty'}
                </span>
              </button>

              {/* 
                ========================================================================
                DESKTOP HOVER PREVIEW WINDOW (Only for Large Screen / Mouse Cursor)
                "and bina click kare bhi agr task dekhna ho to us date par miuse k cursor rakhenge to hiver hogi screen and mobile ke liye to ye feature work nahi karega sirf badi screen ya mouse vale ke liye hi hoga"
                ========================================================================
              */}
              {hasTasks && (
                <div
                  className={`absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-40 w-64 sm:w-72 p-3 bg-white dark:bg-[#202124] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#3c4043] pointer-events-none transition-all duration-200 ${
                    isHovered ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden'
                  } hidden md:block`}
                >
                  {/* Hover Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#3c4043] mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full border-2 ${theme.border} ${theme.activeBg} ${theme.activeText} flex items-center justify-center font-bold text-xs`}
                      >
                        {group.dateNumber}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#202124] dark:text-[#e8eaed] leading-tight">
                          {group.fullLabel}
                        </h4>
                        <span className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                          {activeTasks.length} active • {group.tasks.length - activeTasks.length} done
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#1a2f4c] px-1.5 py-0.5 rounded">
                      Preview
                    </span>
                  </div>

                  {/* Hover Tasks List */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {group.tasks.map((task) => {
                      const priority: TaskPriority = task.priority || 'medium';
                      let dotColor = 'bg-blue-500';
                      if (priority === 'urgent') dotColor = 'bg-rose-500';
                      else if (priority === 'high') dotColor = 'bg-amber-500';
                      else if (priority === 'low') dotColor = 'bg-emerald-500';

                      return (
                        <div
                          key={`hover-${task.id}`}
                          className={`p-1.5 rounded-lg border text-xs flex items-start gap-1.5 ${
                            task.completed
                              ? 'bg-[#f8f9fa] dark:bg-[#18191b] border-slate-200 dark:border-slate-700 text-slate-400'
                              : 'bg-white dark:bg-[#252628] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                          <div className="flex-1 min-w-0">
                            <span
                              className={`block leading-snug break-words ${
                                task.completed ? 'line-through text-slate-400' : 'font-medium'
                              }`}
                            >
                              {task.text}
                            </span>
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400">
                                ✓ {task.subtasks.filter((s) => s.completed).length}/
                                {task.subtasks.length} subtasks
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hover Card Footer Hint */}
                  <div className="mt-2 pt-1.5 border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                    <span>🖱️ Click to open task window</span>
                    <span className="font-bold text-[#1a73e8]">Open →</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
