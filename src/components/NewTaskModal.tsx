import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Calendar,
  Clock,
  Check,
  FileText,
  Trash2,
  Bell,
  Sparkles,
  ChevronDown,
  ListChecks,
} from 'lucide-react';
import { TaskCadence, RoutineTaskType, SubTask, TaskPriority, BoardStyle } from '../types';
import { getTodayString, getTomorrowString } from '../utils/date';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (
    text: string,
    cadence: TaskCadence,
    dueDate?: string,
    scheduledDay?: number | string,
    deadlineDay?: number | string,
    routineType?: RoutineTaskType,
    subtasks?: SubTask[],
    priority?: TaskPriority,
    followUpDate?: string,
    notesDetail?: string
  ) => void;
  boardStyle?: BoardStyle;
  defaultCadence?: TaskCadence;
}

// Calendar style short days for weekly tasks: Mon, Tue, Wed, Thu, Fri, Sat, Sun
const CALENDAR_DAY_BUTTONS = [
  { id: 'Mon', code: 'MON', initial: 'M', short: 'Mon', name: 'Monday' },
  { id: 'Tue', code: 'TUE', initial: 'T', short: 'Tue', name: 'Tuesday' },
  { id: 'Wed', code: 'WED', initial: 'W', short: 'Wed', name: 'Wednesday' },
  { id: 'Thu', code: 'THU', initial: 'Th', short: 'Thu', name: 'Thursday' },
  { id: 'Fri', code: 'FRI', initial: 'F', short: 'Fri', name: 'Friday' },
  { id: 'Sat', code: 'SAT', initial: 'Sa', short: 'Sat', name: 'Saturday' },
  { id: 'Sun', code: 'SUN', initial: 'Su', short: 'Sun', name: 'Sunday' },
];

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  defaultCadence = 'daily',
}) => {
  // Form State
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskType, setTaskType] = useState<'normal' | 'daily_routine' | 'weekly' | 'monthly'>('normal');
  const [startDate, setStartDate] = useState(getTodayString());
  const [lastDate, setLastDate] = useState(getTodayString());

  // Weekly Options: Day of Week vs Specific Dates
  const [weeklyMode, setWeeklyMode] = useState<'day' | 'dates'>('day');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(['Fri']);
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [newDateInput, setNewDateInput] = useState(getTomorrowString());

  // Monthly target day
  const [monthlyDay, setMonthlyDay] = useState('10');

  // Mini-tasks / Sub-tasks list
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [miniTaskInput, setMiniTaskInput] = useState('');

  // Follow-up reminder
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(getTodayString());
  const [followUpTime, setFollowUpTime] = useState('11:00 AM');

  // Remarks / notes
  const [notesDetail, setNotesDetail] = useState('');
  const [showRemarks, setShowRemarks] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const miniTaskInputRef = useRef<HTMLInputElement>(null);

  // Sync default cadence
  useEffect(() => {
    if (isOpen) {
      setText('');
      setPriority('medium');
      setStartDate(getTodayString());
      setLastDate(getTodayString());
      setWeeklyMode('day');
      setSelectedWeekdays(['Fri']);
      setSpecificDates([]);
      setMonthlyDay('10');
      setSubtasks([]);
      setMiniTaskInput('');
      setHasFollowUp(false);
      setFollowUpDate(getTodayString());
      setFollowUpTime('11:00 AM');
      setNotesDetail('');
      setShowRemarks(false);

      if (defaultCadence === 'weekly') {
        setTaskType('weekly');
      } else if (defaultCadence === 'monthly') {
        setTaskType('monthly');
      } else {
        setTaskType('normal');
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, defaultCadence]);

  // Handle escape key
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

  // Mini-tasks handlers
  const handleAddMiniTask = () => {
    const trimmed = miniTaskInput.trim();
    if (!trimmed) return;
    const newSub: SubTask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text: trimmed,
      completed: false,
    };
    setSubtasks((prev) => [...prev, newSub]);
    setMiniTaskInput('');
    miniTaskInputRef.current?.focus();
  };

  const handleRemoveMiniTask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // Weekday selection
  const handleToggleWeekday = (dayId: string) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  // Add specific date for weekly task
  const handleAddSpecificDate = () => {
    if (!newDateInput) return;
    if (!specificDates.includes(newDateInput)) {
      setSpecificDates((prev) => [...prev, newDateInput].sort());
    }
  };

  const handleRemoveSpecificDate = (d: string) => {
    setSpecificDates((prev) => prev.filter((item) => item !== d));
  };

  // Priority color config
  const priorityInfo = {
    urgent: {
      label: 'Urgent',
      badgeBg: 'bg-rose-100 text-rose-950 border-rose-300',
      dotColor: 'bg-rose-600',
      previewCard: 'bg-[#ffebee] border-l-4 border-l-[#d32f2f] border-rose-200 text-gray-950 shadow-sm',
    },
    high: {
      label: 'High',
      badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
      dotColor: 'bg-amber-600',
      previewCard: 'bg-[#fff3e0] border-l-4 border-l-[#e65100] border-amber-200 text-gray-950 shadow-sm',
    },
    medium: {
      label: 'Medium',
      badgeBg: 'bg-blue-100 text-blue-950 border-blue-300',
      dotColor: 'bg-blue-600',
      previewCard: 'bg-[#e3f2fd] border-l-4 border-l-[#1565c0] border-blue-200 text-gray-950 shadow-sm',
    },
    low: {
      label: 'Low',
      badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      dotColor: 'bg-emerald-600',
      previewCard: 'bg-[#e8f5e9] border-l-4 border-l-[#2e7d32] border-emerald-200 text-gray-950 shadow-sm',
    },
  }[priority];

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    let resolvedCadence: TaskCadence = 'daily';
    let resolvedRoutineType: RoutineTaskType | undefined = 'single_day';
    let resolvedScheduledDay: string | number | undefined = undefined;
    let resolvedDueDate = lastDate || undefined;

    if (taskType === 'normal') {
      resolvedCadence = 'daily';
      resolvedRoutineType = 'single_day';
      resolvedDueDate = lastDate || startDate || undefined;
    } else if (taskType === 'daily_routine') {
      resolvedCadence = 'daily';
      resolvedRoutineType = 'fixed_daily';
      resolvedDueDate = lastDate || undefined;
    } else if (taskType === 'weekly') {
      resolvedCadence = 'weekly';
      resolvedRoutineType = undefined;
      if (weeklyMode === 'day') {
        resolvedScheduledDay = selectedWeekdays.join(', ');
      } else {
        resolvedScheduledDay = specificDates.length > 0 ? specificDates.join(', ') : undefined;
        if (specificDates.length > 0) {
          resolvedDueDate = specificDates[0];
        }
      }
    } else if (taskType === 'monthly') {
      resolvedCadence = 'monthly';
      resolvedRoutineType = undefined;
      resolvedScheduledDay = monthlyDay.trim() || '10';
    }

    const resolvedFollowUp = hasFollowUp ? `${followUpDate} ${followUpTime}` : undefined;

    onAddTask(
      trimmed,
      resolvedCadence,
      resolvedDueDate,
      resolvedScheduledDay,
      undefined,
      resolvedRoutineType,
      subtasks.length > 0 ? subtasks : undefined,
      priority,
      resolvedFollowUp,
      notesDetail.trim() || undefined
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto overscroll-contain select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl my-auto bg-white border border-slate-200 sm:border-2 sm:border-slate-300 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-900 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Sticky */}
        <div className="px-5 sm:px-7 pt-4 sm:pt-5 pb-3.5 border-b-2 border-slate-200 bg-white shrink-0 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                Add New Task
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Directives, mini-tasks checklist, dates, and priority highlight
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Task Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="px-5 sm:px-7 py-4 overflow-y-auto flex-1 overscroll-contain flex flex-col gap-4">
            {/* 1. Main Task Name Input */}
            <div>
              <label className="block text-sm font-bold text-slate-950 mb-1">
                Task Name (Main Heading) <span className="text-rose-600">*</span>
              </label>
              <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter main task heading..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-950 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
          </div>

          {/* 2. Mini Tasks Checklist Section */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <label className="text-sm font-bold text-slate-950">
                  Mini Tasks Checklist (Word Document Outline)
                </label>
              </div>
              <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 font-mono">
                {subtasks.length} {subtasks.length === 1 ? 'Step' : 'Steps'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2 font-medium">
              Add individual steps required to complete this task. Clicking a checkbox marks it done:
            </p>

            {/* Input to add mini-task */}
            <div className="flex items-center gap-2 mb-2">
              <input
                ref={miniTaskInputRef}
                type="text"
                value={miniTaskInput}
                onChange={(e) => setMiniTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMiniTask();
                  }
                }}
                placeholder="Type a mini task and press Enter or click + Add..."
                className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleAddMiniTask}
                disabled={!miniTaskInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Add</span>
              </button>
            </div>

            {/* List of Added Mini Tasks */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mt-2.5 pt-2 border-t border-slate-200">
                {subtasks.map((st, index) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-950 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded border-2 border-slate-400 bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-700">{index + 1}</span>
                      </span>
                      <span className="font-semibold text-slate-950 break-words">{st.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMiniTask(st.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                      title="Remove mini task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3 & 4. Dropdowns Row: Priority Dropdown + Task Type Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Dropdown 1: Priority */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs sm:text-sm font-bold text-slate-950">
                  Priority Highlight
                </label>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${priorityInfo.badgeBg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${priorityInfo.dotColor}`} />
                  <span>Highlight</span>
                </span>
              </div>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-950 text-xs sm:text-sm font-bold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer appearance-none pr-8"
                >
                  <option value="low">🟢 Low Priority (Green Highlight)</option>
                  <option value="medium">🔵 Medium Priority (Blue Highlight)</option>
                  <option value="high">🟠 High Priority (Orange Highlight)</option>
                  <option value="urgent">🔴 Urgent Priority (Red Highlight)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
              </div>
            </div>

            {/* Dropdown 2: Task Type Dropdown */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-950 mb-1">
                Task Frequency
              </label>
              <div className="relative">
                <select
                  value={taskType}
                  onChange={(e) =>
                    setTaskType(
                      e.target.value as 'normal' | 'daily_routine' | 'weekly' | 'monthly'
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-950 text-xs sm:text-sm font-bold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer appearance-none pr-8"
                >
                  <option value="normal">📅 Normal Task (One-time)</option>
                  <option value="daily_routine">🔄 Daily Routine (Every day)</option>
                  <option value="weekly">📆 Weekly Task (Weekly)</option>
                  <option value="monthly">🗓️ Monthly Task (Monthly)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* 5. Start Date & Last Date (Deadline) Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div>
              <label className="block text-xs font-bold text-slate-950 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-950 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-950 mb-1">
                Last Date (Deadline)
              </label>
              <input
                type="date"
                value={lastDate}
                onChange={(e) => setLastDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-950 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* 6. WEEKLY SPECIAL: Day of Week vs Multiple Specific Dates */}
          {taskType === 'weekly' && (
            <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-bold text-emerald-950">
                  Weekly Schedule: Date or Day Selection
                </label>
                {/* Mode Selector Toggle: Day of Week vs Specific Dates */}
                <div className="flex items-center bg-white border border-emerald-300 rounded-lg p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWeeklyMode('day')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      weeklyMode === 'day'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-900 hover:bg-emerald-50'
                    }`}
                  >
                    Week Day (M, T, W, F...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyMode('dates')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      weeklyMode === 'dates'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-900 hover:bg-emerald-50'
                    }`}
                  >
                    Specific Dates (2-3 Dates)
                  </button>
                </div>
              </div>

              {/* Mode A: Fixed Week Day */}
              {weeklyMode === 'day' ? (
                <div>
                  <p className="text-[11px] text-emerald-900 font-medium mb-2">
                    Select a recurring day of the week (e.g., Every Friday: F):
                  </p>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {CALENDAR_DAY_BUTTONS.map((day) => {
                      const isSelected = selectedWeekdays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleWeekday(day.id)}
                          className={`h-11 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm scale-105'
                              : 'bg-white text-slate-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={`${day.name} (${day.initial})`}
                        >
                          <span className="text-sm font-black font-mono leading-none">{day.initial}</span>
                          <span className="text-[9px] font-bold mt-0.5 opacity-90">{day.name.substring(0, 3)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Selected Day:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {selectedWeekdays.join(', ')}
                    </span>
                    <span className="text-[11px] text-emerald-800 font-normal">
                      (Displays on card in short e.g., Mon, Fri)
                    </span>
                  </div>
                </div>
              ) : (
                /* Mode B: Multiple Specific Dates */
                <div>
                  <p className="text-[11px] text-emerald-900 font-medium mb-2">
                    Add 2, 3 or more specific dates for this weekly task:
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="date"
                      value={newDateInput}
                      onChange={(e) => setNewDateInput(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border-2 border-emerald-300 bg-white text-xs font-bold text-slate-950"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpecificDate}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Add Date</span>
                    </button>
                  </div>

                  {specificDates.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {specificDates.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-xs font-bold text-emerald-950 shadow-2xs font-mono"
                        >
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          <span>{d}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecificDate(d)}
                            className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-700 italic">
                      No specific dates added (using Last Date by default)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Monthly Special: Scheduled Day of Month */}
          {taskType === 'monthly' && (
            <div className="bg-purple-50/70 border-2 border-purple-300 rounded-xl p-3">
              <label className="block text-xs sm:text-sm font-bold text-purple-950 mb-1">
                Monthly Target Day (Day of Month)
              </label>
              <input
                type="text"
                value={monthlyDay}
                onChange={(e) => setMonthlyDay(e.target.value)}
                placeholder="e.g. 10, 15, 20, 25, 30..."
                className="w-full px-3 py-1.5 rounded-lg border-2 border-purple-300 bg-white text-xs sm:text-sm font-bold text-purple-950 focus:outline-none focus:border-purple-600"
              />
              <p className="text-[11px] text-purple-700 mt-1 font-medium">
                Displays on the task card as a date number (e.g., 10th).
              </p>
            </div>
          )}

          {/* 7. Follow-up Reminder Option */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasFollowUp}
                  onChange={(e) => setHasFollowUp(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-slate-400 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Follow-up Reminder Required</span>
              </label>

              {hasFollowUp && (
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  Reminder Active
                </span>
              )}
            </div>

            {hasFollowUp && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Follow-up Time
                  </label>
                  <input
                    type="text"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    placeholder="e.g. 11:00 AM"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-950"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8. Remarks / Notes (Optional) */}
          <div>
            {!showRemarks ? (
              <button
                type="button"
                onClick={() => setShowRemarks(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ Add remarks or reference notes</span>
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-950">
                    Remarks & Reference Notes
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDetail('');
                      setShowRemarks(false);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={notesDetail}
                  onChange={(e) => setNotesDetail(e.target.value)}
                  placeholder="Enter reference numbers, client notes, or instructions..."
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-semibold text-slate-950 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
          </div>

          {/* 9. Live Card Preview showing minimal day/date and Word outline hierarchy */}
          <div className="mt-1 pt-2 border-t-2 border-slate-200">
            <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Live Card Preview (Board Appearance):
            </span>

            <div className={`p-3 rounded-xl border ${priorityInfo.previewCard}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-950 break-words">
                    {text.trim() || 'Your Task Heading Will Appear Here'}
                  </span>

                  {/* Clean minimal calendar short day or date badge */}
                  {taskType === 'weekly' ? (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-900 border border-slate-300 shadow-2xs">
                      {weeklyMode === 'day'
                        ? selectedWeekdays.join(', ')
                        : specificDates.length > 0
                        ? specificDates.map((d) => (d.split('-')[2] ? String(parseInt(d.split('-')[2], 10)) : d)).join(', ')
                        : lastDate
                        ? String(parseInt(lastDate.split('-')[2], 10))
                        : ''}
                    </span>
                  ) : taskType === 'monthly' ? (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-900 border border-slate-300 shadow-2xs">
                      {monthlyDay}
                    </span>
                  ) : null}

                  {hasFollowUp && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                      <Clock className="w-2.5 h-2.5 text-amber-700" />
                      <span>Follow-up: {followUpDate}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Subtasks checklist preview like MS Word outline */}
              {subtasks.length > 0 && (
                <div className="mt-2 pl-3.5 space-y-1 border-l-2 border-slate-400 py-0.5">
                  {subtasks.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-1.5 text-xs text-slate-900">
                      <span className="w-3.5 h-3.5 rounded border-2 border-slate-400 bg-white inline-flex items-center justify-center shrink-0 text-[9px] font-bold">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-slate-950">{st.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions - Sticky Bottom */}
          <div className="px-5 sm:px-7 py-3.5 border-t-2 border-slate-200 bg-slate-50/95 backdrop-blur-xs shrink-0 sticky bottom-0 z-20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
