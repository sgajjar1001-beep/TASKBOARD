import React, { useState } from 'react';
import {
  Check,
  Plus,
  Pin,
  Star,
  Clock,
  Calendar,
  AlertCircle,
  RotateCw,
  ListChecks,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Trash2,
  Columns3,
  CalendarDays,
  Flame,
  Share2,
} from 'lucide-react';
import { TaskNote, TaskCadence, TaskPriority, RoutineTaskType } from '../types';
import {
  getTodayString,
  getTomorrowString,
  formatDueDate,
  formatFollowUp,
  isDateOverdue,
  formatMinimalDateOrDay,
} from '../utils/date';

interface CompactRoutineBoardProps {
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
  onOpenShareModal?: (note: TaskNote) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onSwitchToThreeColumns: () => void;
  onOpenNewTaskModal?: (cadence?: TaskCadence) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const CompactRoutineBoard: React.FC<CompactRoutineBoardProps> = ({
  notes,
  onToggleComplete,
  onClickTask,
  onAddTask,
  onDeleteTask,
  onTogglePin,
  onToggleImportant,
  onTogglePriority,
  onOpenShareModal,
  onToggleSubtask,
  onSwitchToThreeColumns,
  onOpenNewTaskModal,
  searchQuery = '',
  onClearSearch,
}) => {
  const [quickAddText, setQuickAddText] = useState('');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  // Search filter
  const q = searchQuery.trim().toLowerCase();
  const filteredNotes = notes.filter((note) => {
    if (!q) return true;
    const matchTitle = note.text.toLowerCase().includes(q);
    const matchNotes = note.notesDetail?.toLowerCase().includes(q);
    const matchSubtask = note.subtasks?.some((st) => st.text.toLowerCase().includes(q));
    const matchSchedule =
      note.scheduledDay !== undefined && String(note.scheduledDay).toLowerCase().includes(q);
    return matchTitle || matchNotes || matchSubtask || matchSchedule;
  });

  const activeNotes = filteredNotes.filter((n) => !n.completed);
  const completedNotes = filteredNotes.filter((n) => n.completed);

  // Group active tasks date-wise:
  // 1. Overdue (dueDate or assignedDate < today)
  // 2. Today (dueDate === today or assignedDate === today or fixed_daily)
  // 3. Tomorrow (dueDate === tomorrow)
  // 4. Upcoming Future Dates (dueDate > tomorrow or scheduledDay)
  // 5. General Routine / Other

  const overdueList: TaskNote[] = [];
  const todayList: TaskNote[] = [];
  const tomorrowList: TaskNote[] = [];
  const upcomingList: TaskNote[] = [];
  const generalRoutineList: TaskNote[] = [];

  activeNotes.forEach((note) => {
    const isDueOverdue = Boolean(note.dueDate && isDateOverdue(note.dueDate));
    const isDueToday = note.dueDate === todayStr;
    const isDueTomorrow = note.dueDate === tomorrowStr;

    if (isDueOverdue) {
      overdueList.push(note);
    } else if (isDueToday || note.assignedDate === todayStr) {
      todayList.push(note);
    } else if (isDueTomorrow) {
      tomorrowList.push(note);
    } else if (note.dueDate && note.dueDate > tomorrowStr) {
      upcomingList.push(note);
    } else if (note.scheduledDay !== undefined) {
      upcomingList.push(note);
    } else {
      generalRoutineList.push(note);
    }
  });

  // Sort upcoming chronologically
  upcomingList.sort((a, b) => {
    const dateA = a.dueDate || String(a.scheduledDay || '999');
    const dateB = b.dueDate || String(b.scheduledDay || '999');
    return dateA.localeCompare(dateB);
  });

  // Quick submit
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAddText.trim();
    if (!trimmed) return;
    onAddTask(trimmed, 'daily', todayStr, undefined, undefined, 'single_day');
    setQuickAddText('');
  };

  // Helper to render priority card style - 100% transparent background with clean priority border strip
  const getPriorityHighlight = (note: TaskNote) => {
    const priority: TaskPriority = note.priority || 'medium';
    if (note.completed) {
      return 'border-l-4 border-l-slate-400 dark:border-l-slate-600 opacity-60';
    }
    if (priority === 'urgent') {
      return 'border-l-4 border-l-[#d32f2f] dark:border-l-[#f28b82]';
    }
    if (priority === 'high') {
      return 'border-l-4 border-l-[#e65100] dark:border-l-[#fdd663]';
    }
    if (priority === 'medium') {
      return 'border-l-4 border-l-[#1565c0] dark:border-l-[#8ab4f8]';
    }
    // low / normal
    return 'border-l-4 border-l-[#2e7d32] dark:border-l-[#81c995]';
  };

  const renderTaskItem = (note: TaskNote) => {
    return (
      <div
        key={note.id}
        onClick={() => onClickTask(note)}
        className={`group px-3.5 py-2.5 flex items-start gap-3 transition-all cursor-pointer border-b border-white/20 dark:border-white/10 bg-transparent hover:bg-white/15 dark:hover:bg-white/10 backdrop-blur-[1px] ${
          note.completed ? 'opacity-60' : ''
        }`}
      >
        {/* Main Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(note.id);
          }}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs backdrop-blur-xs ${
            note.completed
              ? 'bg-[#188038] border-[#188038] text-white'
              : 'border-white/60 dark:border-white/30 bg-white/60 dark:bg-black/50 hover:border-blue-600'
          }`}
          title={note.completed ? 'Completed (Click to mark pending)' : 'Click to complete task'}
        >
          {note.completed && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
        </button>

        {/* Task Content (Only task completion status & text, no checklist, no priority badge, no time/day) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.isPinned && (
              <Pin className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
            )}
            {note.isImportant && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}

            <span className={`text-xs sm:text-sm font-semibold leading-normal break-words ${note.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-950 dark:text-white'}`}>
              {note.text}
            </span>
          </div>
        </div>

        {/* Action icons (Pin, Priority, Share, Delete) - Highlighted Header-Style Glass Pill */}
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

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 max-w-5xl mx-auto w-full">
      {/* Top Banner / Mode Switcher */}
      <div className="bg-transparent backdrop-blur-xs border border-white/25 dark:border-white/15 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-950/80 border-2 border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0 backdrop-blur-xs">
            <Layers className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs">
                Routine Tasks (Single Head Board)
              </h1>
              <span className="text-[11px] font-black bg-blue-100/90 text-blue-900 dark:bg-blue-950 dark:text-[#8ab4f8] border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded-full shadow-2xs backdrop-blur-xs">
                Single Head Compact View
              </span>
            </div>
            <p className="text-xs text-slate-900 dark:text-slate-100 font-extrabold drop-shadow-2xs">
              All tasks unified date-wise • Today ({todayList.length}) • Active ({activeNotes.length})
            </p>
          </div>
        </div>

        {/* Controls: Switch to 3 Columns & Add Detailed Task */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={onSwitchToThreeColumns}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/30 dark:border-white/20 bg-white/25 dark:bg-white/10 hover:bg-white/40 dark:hover:bg-white/20 text-slate-950 dark:text-white text-xs font-black transition-all cursor-pointer shadow-xs backdrop-blur-md"
            title="Switch back to 3-column board view"
          >
            <Columns3 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
            <span>3 Columns View</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewTaskModal?.('daily')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer"
            title="Open new task form with mini-tasks & dates"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Single Column Task Container */}
      <div className="bg-white/10 dark:bg-black/25 backdrop-blur-md border border-white/30 dark:border-white/15 rounded-2xl shadow-lg overflow-hidden flex flex-col flex-1">
        {/* Quick Add Bar */}
        <form
          onSubmit={handleQuickAdd}
          className="p-3 bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            placeholder="Quick add a routine task for today and press Enter..."
            className="flex-1 px-3 py-2 bg-white/35 dark:bg-black/35 border-2 border-white/40 dark:border-white/20 rounded-xl text-xs sm:text-sm font-bold text-slate-950 dark:text-white placeholder:text-slate-700 dark:placeholder:text-slate-300 focus:outline-none focus:border-blue-600 shadow-2xs backdrop-blur-md"
          />
          <button
            type="submit"
            disabled={!quickAddText.trim()}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {/* Task Sections Arranged Date-Wise */}
        <div className="flex-1 overflow-y-auto divide-y-2 divide-slate-200">
          {activeNotes.length === 0 && completedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-600 h-64">
              <CalendarDays className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-gray-800">
                {q ? `No tasks match "${searchQuery}"` : 'No routine tasks found'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Add a new task using the input above or "+ Add Task" button
              </p>
            </div>
          ) : null}

          {/* 1. OVERDUE TASKS (If any) */}
          {overdueList.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-rose-500/15 backdrop-blur-xs border-b border-rose-300/30 flex items-center justify-between text-xs font-black text-rose-950 dark:text-rose-100">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>OVERDUE TASKS</span>
                </div>
                <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {overdueList.length} Overdue
                </span>
              </div>
              <div className="divide-y divide-rose-100">
                {overdueList.map(renderTaskItem)}
              </div>
            </div>
          )}

          {/* 2. TODAY'S TASKS */}
          {todayList.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-amber-500/15 backdrop-blur-xs border-b border-amber-300/30 flex items-center justify-between text-xs font-black text-amber-950 dark:text-amber-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>TODAY'S ROUTINE TASKS • {todayStr}</span>
                </div>
                <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {todayList.length} Today
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {todayList.map(renderTaskItem)}
              </div>
            </div>
          )}

          {/* 3. TOMORROW'S TASKS */}
          {tomorrowList.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-blue-500/15 backdrop-blur-xs border-b border-blue-300/30 flex items-center justify-between text-xs font-black text-blue-950 dark:text-blue-100">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>TOMORROW'S SCHEDULE • {tomorrowStr}</span>
                </div>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {tomorrowList.length} Tomorrow
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {tomorrowList.map(renderTaskItem)}
              </div>
            </div>
          )}

          {/* 4. UPCOMING TASKS (Sorted by Date) */}
          {upcomingList.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-purple-500/15 backdrop-blur-xs border-b border-purple-300/30 flex items-center justify-between text-xs font-black text-purple-950 dark:text-purple-100">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-purple-600" />
                  <span>UPCOMING TASKS (BY DATE)</span>
                </div>
                <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {upcomingList.length} Upcoming
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {upcomingList.map(renderTaskItem)}
              </div>
            </div>
          )}

          {/* 5. GENERAL ROUTINE TASKS (Recurring/Without specific date) */}
          {generalRoutineList.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-emerald-500/15 backdrop-blur-xs border-b border-emerald-300/30 flex items-center justify-between text-xs font-black text-emerald-950 dark:text-emerald-100">
                <div className="flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-emerald-600" />
                  <span>RECURRING DAILY ROUTINES</span>
                </div>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {generalRoutineList.length} Tasks
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {generalRoutineList.map(renderTaskItem)}
              </div>
            </div>
          )}

          {/* 6. COMPLETED TASKS SECTION */}
          {completedNotes.length > 0 && (
            <div className="bg-slate-50">
              <button
                type="button"
                onClick={() => setIsCompletedExpanded((prev) => !prev)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Completed Tasks ({completedNotes.length})</span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-blue-600 font-bold">
                  <span>{isCompletedExpanded ? 'Hide' : 'Show'}</span>
                  {isCompletedExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>

              {isCompletedExpanded && (
                <div className="divide-y divide-slate-200 border-t border-slate-200 bg-white">
                  {completedNotes.map((compNote) => (
                    <div
                      key={compNote.id}
                      onClick={() => onClickTask(compNote)}
                      className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(compNote.id);
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-2 border-emerald-600 bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="Click to reopen / mark active"
                      >
                        <Check className="w-3 h-3 stroke-[3] text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-500 line-through font-semibold break-words block">
                          {compNote.text}
                        </span>
                        {compNote.completedAt && (
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                            Completed: {compNote.completedAt}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
