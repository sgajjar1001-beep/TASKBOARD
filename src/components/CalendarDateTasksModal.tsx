import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  CheckCircle2,
  Plus,
  Pin,
  Star,
  Trash2,
  Share2,
  ListChecks,
  Calendar,
  CalendarDays,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { TaskNote, TaskCadence, TaskPriority } from '../types';

export interface CalendarDateGroup {
  id: string;
  dateNumber: string; // The number or text inside the small round icon: "10", "15", "Mon", "Sat", "31"
  dateSubtext?: string; // Optional mini label: "Oct", "Day", "Wk"
  fullLabel: string; // Full title: "15th of Every Month" or "Saturday • Weekly"
  label?: string; // Alias for backward compatibility
  sublabel?: string; // Optional detail: "Deadline: 20th" or "Cycle: 10, 21, 29"
  isToday?: boolean;
  sortOrder: number;
  cadence: 'weekly' | 'monthly';
  tasks: TaskNote[];
}

interface CalendarDateTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateGroup: CalendarDateGroup | null;
  onToggleComplete: (id: string) => void;
  onClickTask: (note: TaskNote) => void;
  onDeleteTask?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onToggleImportant?: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onOpenShareModal?: (note: TaskNote) => void;
  onAddTask?: (
    text: string,
    cadence: TaskCadence,
    dueDate?: string,
    scheduledDay?: number | string
  ) => void;
}

export const CalendarDateTasksModal: React.FC<CalendarDateTasksModalProps> = ({
  isOpen,
  onClose,
  dateGroup,
  onToggleComplete,
  onClickTask,
  onDeleteTask,
  onTogglePin,
  onToggleImportant,
  onToggleSubtask,
  onOpenShareModal,
  onAddTask,
}) => {
  const [inlineNewTaskText, setInlineNewTaskText] = useState('');
  const [selectedCadenceToAdd, setSelectedCadenceToAdd] = useState<TaskCadence>(
    dateGroup?.cadence || 'weekly'
  );
  const [isAddingTask, setIsAddingTask] = useState<boolean>(() => {
    return dateGroup ? dateGroup.tasks.length === 0 : false;
  });

  // Keep state updated when dateGroup changes
  useEffect(() => {
    if (dateGroup) {
      setSelectedCadenceToAdd(dateGroup.cadence || 'weekly');
      setIsAddingTask(dateGroup.tasks.length === 0);
    }
  }, [dateGroup]);

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

  if (!isOpen || !dateGroup) return null;

  const activeTasks = dateGroup.tasks.filter((t) => !t.completed);
  const completedTasks = dateGroup.tasks.filter((t) => t.completed);
  const isWeekly = dateGroup.cadence === 'weekly';

  const themeColors = isWeekly
    ? {
        border: 'border-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-300',
        ring: 'ring-emerald-500/20',
        accentBtn: 'bg-[#188038] hover:bg-[#137333]',
        pillBg: 'bg-[#e6f4ea] text-[#137333] border-emerald-200 dark:border-emerald-800',
      }
    : {
        border: 'border-[#9334e6]',
        bg: 'bg-purple-50 dark:bg-purple-950/60',
        text: 'text-[#9334e6] dark:text-[#c084fc]',
        ring: 'ring-purple-500/20',
        accentBtn: 'bg-[#9334e6] hover:bg-[#7b1fa2]',
        pillBg: 'bg-[#f3e8fd] text-[#7922c7] border-purple-200 dark:border-purple-800',
      };

  const handleAddNewTask = () => {
    const trimmed = inlineNewTaskText.trim();
    if (!trimmed || !onAddTask) return;

    let scheduledDayVal: number | string | undefined = undefined;
    let dueDateVal: string | undefined = undefined;

    const num = parseInt(dateGroup.dateNumber, 10);
    const hasNum = !isNaN(num) && num >= 1 && num <= 31;

    if (selectedCadenceToAdd === 'monthly') {
      scheduledDayVal = hasNum ? num : dateGroup.dateNumber;
    } else if (selectedCadenceToAdd === 'weekly') {
      scheduledDayVal = dateGroup.dateNumber;
    } else {
      // Daily task: attach dueDate if this is a calendar day
      if (hasNum) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(num).padStart(2, '0');
        dueDateVal = `${y}-${m}-${d}`;
      }
    }

    onAddTask(trimmed, selectedCadenceToAdd, dueDateVal, scheduledDayVal);
    setInlineNewTaskText('');
    setIsAddingTask(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1e1f21] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#3c4043] flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#252628] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Round-Corner Calendar Date Badge (rounded-2xl) */}
            <div className="relative shrink-0">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-2 ${themeColors.border} ${themeColors.bg} flex flex-col items-center justify-center shadow-xs`}
              >
                {dateGroup.dateSubtext && (
                  <span className="text-[9px] font-bold uppercase leading-none opacity-80 text-[#5f6368] dark:text-[#9aa0a6]">
                    {dateGroup.dateSubtext}
                  </span>
                )}
                <span className={`text-base font-black leading-tight ${themeColors.text}`}>
                  {dateGroup.dateNumber}
                </span>
              </div>
              {dateGroup.isToday && (
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-blue-600 text-white text-[8px] font-bold rounded shadow-xs uppercase">
                  Today
                </span>
              )}
            </div>

            {/* Title & Stats */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-[#202124] dark:text-[#f1f3f4] leading-snug truncate">
                  {dateGroup.fullLabel}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${themeColors.pillBg}`}
                >
                  {isWeekly ? 'Weekly' : 'Monthly'}
                </span>
              </div>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                {activeTasks.length} pending • {completedTasks.length} done (Total {dateGroup.tasks.length})
                {dateGroup.sublabel && ` • ${dateGroup.sublabel}`}
              </p>
            </div>
          </div>

          {/* Header Action Buttons: Prominent + Add Task Icon/Button & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {onAddTask && (
              <button
                type="button"
                onClick={() => setIsAddingTask((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isAddingTask
                    ? 'bg-slate-200 dark:bg-[#3c4043] text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                    : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
                }`}
                title={isAddingTask ? 'Close add form' : 'Add task for this date'}
              >
                <Plus className={`w-4 h-4 stroke-[2.5] transition-transform ${isAddingTask ? 'rotate-45' : ''}`} />
                <span>{isAddingTask ? 'Close' : 'Add Task'}</span>
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#2d2e30] hover:bg-[#dadce0]/50 dark:hover:bg-[#3c4043] text-[#5f6368] dark:text-[#e8eaed] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Quick Add Task Button or Form with Cadence Options */}
          {onAddTask && (
            <div>
              {isAddingTask ? (
                <div className="p-3 bg-[#f8f9fa] dark:bg-[#252628] rounded-xl border border-[#dadce0] dark:border-[#3c4043] space-y-2.5 animate-in fade-in duration-150">
                  {/* Cadence Option Selector: Weekly / Daily / Monthly as requested */}
                  <div>
                    <label className="text-[11px] font-bold text-[#5f6368] dark:text-[#9aa0a6] block mb-1.5 uppercase tracking-wide">
                      Select Task Type:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCadenceToAdd('daily')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          selectedCadenceToAdd === 'daily'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-white dark:bg-[#1e1f21] text-[#3c4043] dark:text-slate-300 border-[#dadce0] dark:border-[#5f6368] hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        <span>⚡</span>
                        <span>Daily</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCadenceToAdd('weekly')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          selectedCadenceToAdd === 'weekly'
                            ? 'bg-[#188038] text-white border-[#137333] shadow-xs'
                            : 'bg-white dark:bg-[#1e1f21] text-[#3c4043] dark:text-slate-300 border-[#dadce0] dark:border-[#5f6368] hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        <span>📅</span>
                        <span>Weekly</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCadenceToAdd('monthly')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                          selectedCadenceToAdd === 'monthly'
                            ? 'bg-[#9334e6] text-white border-[#7b1fa2] shadow-xs'
                            : 'bg-white dark:bg-[#1e1f21] text-[#3c4043] dark:text-slate-300 border-[#dadce0] dark:border-[#5f6368] hover:bg-purple-50 dark:hover:bg-purple-950/40'
                        }`}
                      >
                        <span>🗓️</span>
                        <span>Monthly</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={inlineNewTaskText}
                    onChange={(e) => setInlineNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNewTask();
                      if (e.key === 'Escape') {
                        if (dateGroup.tasks.length > 0) setIsAddingTask(false);
                      }
                    }}
                    placeholder={`Type ${selectedCadenceToAdd} task for this date...`}
                    autoFocus
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e1f21] border border-[#dadce0] dark:border-[#3c4043] focus:border-[#1a73e8] rounded-lg text-xs font-semibold text-[#202124] dark:text-[#e8eaed] focus:outline-none shadow-2xs"
                  />

                  <div className="flex justify-end gap-2">
                    {dateGroup.tasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingTask(false)}
                        className="px-2.5 py-1 text-xs text-[#5f6368] hover:text-[#202124] dark:hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!inlineNewTaskText.trim()}
                      onClick={handleAddNewTask}
                      className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50 ${
                        selectedCadenceToAdd === 'weekly'
                          ? 'bg-[#188038] hover:bg-[#137333]'
                          : selectedCadenceToAdd === 'monthly'
                          ? 'bg-[#9334e6] hover:bg-[#7b1fa2]'
                          : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                      }`}
                    >
                      + Add {selectedCadenceToAdd.charAt(0).toUpperCase() + selectedCadenceToAdd.slice(1)} Task
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Active Tasks - Immediately shown when tasks exist */}
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider block">
                Pending Tasks ({activeTasks.length})
              </span>
              {activeTasks.map((task) => renderTaskItem(task))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#dadce0] dark:border-[#3c4043]">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Completed Tasks ({completedTasks.length})</span>
              </span>
              {completedTasks.map((task) => renderTaskItem(task))}
            </div>
          )}

          {/* Empty State when no tasks */}
          {dateGroup.tasks.length === 0 && (
            <div className="py-8 text-center text-[#5f6368] dark:text-[#9aa0a6] space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center border border-blue-200 dark:border-blue-900 shadow-2xs">
                <Calendar className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#202124] dark:text-[#f1f3f4]">No tasks scheduled for this date</p>
                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Click "+ Add Task" above in header to add a task</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-[#f8f9fa] dark:bg-[#252628] border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between">
          <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
            Tip: Click task to view & edit details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white dark:bg-[#303134] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-xs font-bold text-[#202124] dark:text-[#e8eaed] border border-[#dadce0] dark:border-[#5f6368] transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  function renderTaskItem(task: TaskNote) {
    const hasSubtasks = Boolean(task.subtasks && task.subtasks.length > 0);
    const completedSubtasksCount = hasSubtasks
      ? task.subtasks!.filter((s) => s.completed).length
      : 0;
    const priority: TaskPriority = task.priority || 'medium';

    let priorityBorder = 'border-l-4 border-l-[#1565c0]';
    let priorityBg = 'bg-[#e3f2fd]/60 dark:bg-[#142236]/80';
    if (task.completed) {
      priorityBorder = 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
      priorityBg = 'bg-[#f8f9fa] dark:bg-[#18191b] opacity-75';
    } else if (priority === 'urgent') {
      priorityBorder = 'border-l-4 border-l-[#d32f2f]';
      priorityBg = 'bg-[#ffebee] dark:bg-[#2d1519]';
    } else if (priority === 'high') {
      priorityBorder = 'border-l-4 border-l-[#e65100]';
      priorityBg = 'bg-[#fff3e0] dark:bg-[#2e1f10]';
    } else if (priority === 'low') {
      priorityBorder = 'border-l-4 border-l-[#2e7d32]';
      priorityBg = 'bg-[#e8f5e9] dark:bg-[#14281b]';
    }

    return (
      <div
        key={task.id}
        onClick={() => onClickTask(task)}
        className={`group p-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] ${priorityBorder} ${priorityBg} shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-1.5`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Complete Checkbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id);
              }}
              className="mt-0.5 w-4.5 h-4.5 rounded border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#282a2c] hover:border-[#1a73e8] dark:hover:border-[#8ab4f8] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
              title={task.completed ? 'Mark incomplete' : 'Mark completed'}
            >
              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />}
            </button>

            {/* Task Text & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {task.isPinned && <Pin className="w-3.5 h-3.5 text-[#1a73e8] fill-[#1a73e8] shrink-0" />}
                {task.isImportant && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                <span
                  className={`text-xs sm:text-sm font-bold text-[#202124] dark:text-[#e8eaed] break-words ${
                    task.completed ? 'line-through text-[#80868b] dark:text-[#9aa0a6]' : ''
                  }`}
                >
                  {task.text}
                </span>

                {/* Assigned User */}
                {task.assignedTo && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                    👤 {task.assignedTo}
                  </span>
                )}
              </div>

              {/* Note Details preview if any */}
              {task.notesDetail && (
                <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] line-clamp-1 mt-0.5">
                  {task.notesDetail}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions (Share, Delete) */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {onOpenShareModal && (
              <button
                type="button"
                onClick={() => onOpenShareModal(task)}
                className="p-1 rounded text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950/80 transition-colors cursor-pointer"
                title="Share / Assign Task"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteTask && (
              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-colors cursor-pointer"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Subtasks checklist if present */}
        {hasSubtasks && (
          <div
            className="mt-1 pl-3 space-y-1 border-l-2 border-slate-300 dark:border-slate-600 pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {task.subtasks!.map((st) => (
              <label
                key={st.id}
                className="flex items-center gap-2 text-xs text-[#3c4043] dark:text-[#bdc1c6] cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={() => onToggleSubtask?.(task.id, st.id)}
                  className="rounded text-[#1a73e8] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
                <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.text}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }
};
