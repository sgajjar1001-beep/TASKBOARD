import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  Star,
  Sun,
  Bell,
  Calendar,
  RotateCw,
  Flag,
  Share2,
  Trash2,
  X,
  Pin,
  User,
  Clock,
  Sparkles,
  Plus,
  ListTodo,
} from 'lucide-react';
import {
  TaskNote,
  TaskCadence,
  RoutineTaskType,
  TaskPriority,
  BoardStyle,
  SubTask,
} from '../types';
import {
  getTodayString,
  getTomorrowString,
  formatCurrentTimestamp,
} from '../utils/date';

interface TaskDetailModalProps {
  note: TaskNote | null;
  isOpen: boolean;
  boardStyle?: BoardStyle;
  onClose: () => void;
  onUpdateTask: (updatedNote: TaskNote, historyAction?: string) => void;
  onDeleteTask?: (id: string) => void;
  onCarryForwardTask?: (id: string) => void;
  onOpenShareModal?: (note: TaskNote) => void;
  currentUserName?: string;
}

const WEEKDAYS = [
  { id: 'Mon', initial: 'M', name: 'Monday' },
  { id: 'Tue', initial: 'T', name: 'Tuesday' },
  { id: 'Wed', initial: 'W', name: 'Wednesday' },
  { id: 'Thu', initial: 'Th', name: 'Thursday' },
  { id: 'Fri', initial: 'F', name: 'Friday' },
  { id: 'Sat', initial: 'Sa', name: 'Saturday' },
  { id: 'Sun', initial: 'Su', name: 'Sunday' },
];

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  note,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onOpenShareModal,
  currentUserName,
}) => {
  // Form State
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskType, setTaskType] = useState<'normal' | 'daily_routine' | 'weekly' | 'monthly'>('normal');
  const [lastDate, setLastDate] = useState(getTodayString());
  const [isDueSet, setIsDueSet] = useState(true);

  // Weekly & Monthly Scheduling
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(['Fri']);
  const [monthlyDay, setMonthlyDay] = useState('10');

  // Follow-up Reminder
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(getTodayString());
  const [followUpTime, setFollowUpTime] = useState('17:50');

  // Notes & Flags
  const [notesDetail, setNotesDetail] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Related Tasks / Subtasks List
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newRelatedTaskText, setNewRelatedTaskText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');

  // UI Expand toggles
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  // Sync state when opened
  useEffect(() => {
    if (note) {
      setText(note.text || '');
      setPriority(note.priority || 'medium');

      // Resolve Task Type
      if (note.cadence === 'weekly') {
        setTaskType('weekly');
      } else if (note.cadence === 'monthly') {
        setTaskType('monthly');
      } else if (note.cadence === 'daily') {
        setTaskType(note.routineType === 'fixed_daily' ? 'daily_routine' : 'normal');
      } else {
        setTaskType('normal');
      }

      setLastDate(note.dueDate || getTodayString());
      setIsDueSet(Boolean(note.dueDate));

      // Weekly / Monthly day parsing
      if (note.scheduledDay !== undefined && note.scheduledDay !== '') {
        const s = String(note.scheduledDay).trim();
        if (/[a-zA-Z]/.test(s)) {
          const rawDays = s.split(',').map((x) => x.trim().toUpperCase());
          const mappedShorts: string[] = [];
          rawDays.forEach((dayStr) => {
            if (dayStr.includes('MON') || dayStr === 'M') mappedShorts.push('Mon');
            else if (dayStr.includes('TUE') || dayStr === 'T') mappedShorts.push('Tue');
            else if (dayStr.includes('WED') || dayStr === 'W') mappedShorts.push('Wed');
            else if (dayStr.includes('THU') || dayStr === 'TH') mappedShorts.push('Thu');
            else if (dayStr.includes('FRI') || dayStr === 'F') mappedShorts.push('Fri');
            else if (dayStr.includes('SAT') || dayStr === 'SA' || dayStr === 'S') mappedShorts.push('Sat');
            else if (dayStr.includes('SUN') || dayStr === 'SU') mappedShorts.push('Sun');
          });
          setSelectedWeekdays(mappedShorts.length > 0 ? mappedShorts : ['Fri']);
        } else {
          setMonthlyDay(s);
        }
      } else {
        setSelectedWeekdays(['Fri']);
        setMonthlyDay('10');
      }

      // Follow-up
      if (note.followUpDate) {
        setHasFollowUp(true);
        const parts = note.followUpDate.split(' ');
        if (parts.length >= 2) {
          setFollowUpDate(parts[0]);
          setFollowUpTime(parts.slice(1).join(' '));
        } else {
          setFollowUpDate(note.followUpDate);
          setFollowUpTime('17:50');
        }
      } else {
        setHasFollowUp(false);
        setFollowUpDate(getTodayString());
        setFollowUpTime('17:50');
      }

      setNotesDetail(note.notesDetail || '');
      setIsImportant(Boolean(note.isImportant));
      setIsPinned(Boolean(note.isPinned));
      setCompleted(Boolean(note.completed));

      // Sync Related Tasks / Subtasks
      setSubtasks(note.subtasks ? [...note.subtasks] : []);
      setNewRelatedTaskText('');
      setEditingSubtaskId(null);
      setEditingSubtaskText('');

      setShowRepeatPicker(false);
      setShowReminderPicker(false);
      setShowDuePicker(false);
      setShowPriorityPicker(false);
    }
  }, [note, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !note) return null;

  // Toggle weekday selection
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

  // Related Task Action Handlers
  const handleAddRelatedTask = () => {
    const trimmed = newRelatedTaskText.trim();
    if (!trimmed) return;
    const newItem: SubTask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      completed: false,
    };
    setSubtasks((prev) => [...prev, newItem]);
    setNewRelatedTaskText('');
  };

  const handleToggleSubtaskItem = (id: string) => {
    setSubtasks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteSubtaskItem = (id: string) => {
    setSubtasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartEditSubtask = (st: SubTask) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskText(st.text);
  };

  const handleSaveEditSubtask = (id: string) => {
    const trimmed = editingSubtaskText.trim();
    if (trimmed) {
      setSubtasks((prev) =>
        prev.map((item) => (item.id === id ? { ...item, text: trimmed } : item))
      );
    }
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  // Save changes
  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let resolvedCadence: TaskCadence = 'daily';
    let resolvedRoutineType: RoutineTaskType | undefined = 'single_day';
    let resolvedScheduledDay: string | number | undefined = undefined;
    let resolvedDueDate = isDueSet ? lastDate : undefined;

    if (taskType === 'normal') {
      resolvedCadence = 'daily';
      resolvedRoutineType = 'single_day';
    } else if (taskType === 'daily_routine') {
      resolvedCadence = 'daily';
      resolvedRoutineType = 'fixed_daily';
    } else if (taskType === 'weekly') {
      resolvedCadence = 'weekly';
      resolvedRoutineType = undefined;
      resolvedScheduledDay = selectedWeekdays.join(', ');
    } else if (taskType === 'monthly') {
      resolvedCadence = 'monthly';
      resolvedRoutineType = undefined;
      resolvedScheduledDay = monthlyDay.trim() || '10';
    }

    const timestamp = formatCurrentTimestamp();
    const historyList = [...(note.history || [])];
    historyList.unshift({
      id: `h-${Date.now()}`,
      action: 'updated',
      timestamp,
      description: 'Task details updated',
    });

    const updatedNote: TaskNote = {
      ...note,
      text: trimmed,
      cadence: resolvedCadence,
      routineType: resolvedRoutineType,
      priority,
      dueDate: resolvedDueDate,
      scheduledDay: resolvedScheduledDay,
      followUpDate: hasFollowUp ? `${followUpDate} ${followUpTime}` : undefined,
      isImportant,
      isPinned,
      notesDetail: notesDetail.trim() || undefined,
      completed,
      completedAt: completed ? (note.completedAt || timestamp) : undefined,
      history: historyList,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    };

    onUpdateTask(updatedNote, 'Task updated');
    onClose();
  };


  const priorityConfigs = {
    urgent: { label: 'Urgent', color: 'text-rose-600', dot: 'bg-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/60' },
    high: { label: 'High', color: 'text-amber-600', dot: 'bg-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/60' },
    medium: { label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/60' },
    low: { label: 'Low', color: 'text-emerald-600', dot: 'bg-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
  };

  const currentPriority = priorityConfigs[priority];

  // Repeat summary text
  const getRepeatSummary = () => {
    if (taskType === 'daily_routine') return 'Daily (Recurring routine)';
    if (taskType === 'weekly') return `Weekly (Every ${selectedWeekdays.join(', ')})`;
    if (taskType === 'monthly') return `Monthly (${monthlyDay}${monthlyDay === '1' ? 'st' : monthlyDay === '2' ? 'nd' : monthlyDay === '3' ? 'rd' : 'th'} of month)`;
    return 'Never (One-time)';
  };

  // Due date summary text
  const getDueSummary = () => {
    if (!isDueSet || !lastDate) return 'Add due date';
    const today = getTodayString();
    const tomorrow = getTomorrowString();
    if (lastDate === today) return 'Due Today';
    if (lastDate === tomorrow) return 'Due Tomorrow';
    return `Due ${lastDate}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 sm:backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleSave}
    >
      <div
        className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-[#f8f9fa] dark:bg-[#1a1b1e] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-[#dadce0] dark:border-[#3c4043] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation Bar: Back Arrow + Section Title + Top Quick Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#f8f9fa] dark:bg-[#1a1b1e] border-b border-[#dadce0]/80 dark:border-[#3c4043] flex items-center justify-between gap-3 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleSave}
              className="p-2 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#2c2d30] rounded-full transition-colors cursor-pointer"
              title="Save & Close"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#f1f3f4] capitalize truncate">
              {isImportant ? 'Important' : taskType === 'daily_routine' ? 'Routine Tasks' : taskType === 'weekly' ? 'Weekly Tasks' : taskType === 'monthly' ? 'Monthly Tasks' : 'Tasks'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pin Action */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isPinned
                  ? 'bg-blue-100 text-[#1a73e8] dark:bg-blue-950/80 dark:text-[#8ab4f8]'
                  : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-[#2c2d30]'
              }`}
              title={isPinned ? 'Unpin task' : 'Pin to top'}
            >
              <Pin className={`w-4 h-4 stroke-[2.2] ${isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Share / Forward Action (WhatsApp style) */}
            {onOpenShareModal && (
              <button
                type="button"
                onClick={() => onOpenShareModal(note)}
                className="p-2 text-slate-500 hover:text-[#188038] hover:bg-emerald-50 dark:text-slate-400 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                title="Share Task"
              >
                <Share2 className="w-4 h-4 stroke-[2.2]" />
              </button>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - with large bottom padding so mobile keyboard never covers content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 pb-44 sm:pb-8">
          {/* Main Task Title Row with Large Round Checkbox & Star (Exactly as in photo) */}
          <div className="bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
            {/* Big Round Completion Checkbox */}
            <button
              type="button"
              onClick={() => setCompleted(!completed)}
              className={`mt-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs ${
                completed
                  ? 'bg-[#1a73e8] border-[#1a73e8] text-white scale-105'
                  : 'border-slate-400 dark:border-slate-500 hover:border-[#1a73e8] bg-transparent'
              }`}
              title={completed ? 'Mark incomplete' : 'Mark completed'}
            >
              {completed && <Check className="w-4 h-4 stroke-[3]" />}
            </button>

            {/* Large Bold Editable Title */}
            <div className="flex-1 min-w-0">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Task title..."
                rows={2}
                className={`w-full bg-transparent border-none focus:outline-none text-base sm:text-xl font-bold text-slate-900 dark:text-[#f1f3f4] resize-none leading-snug placeholder:text-slate-400 ${
                  completed ? 'line-through opacity-60 text-slate-500' : ''
                }`}
              />
            </div>

            {/* Star Icon (Toggle Important) */}
            <button
              type="button"
              onClick={() => setIsImportant(!isImportant)}
              className="mt-0.5 p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
              title={isImportant ? 'Remove from Important' : 'Mark as Important'}
            >
              <Star
                className={`w-6 h-6 stroke-[2] ${
                  isImportant ? 'text-amber-500 fill-amber-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
            </button>
          </div>

          {/* Section 1: Related Tasks / Subtasks List (Replaces "Added to My Day") */}
          <div className="bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
            {/* Header: Title + Progress counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8] shrink-0">
                  <ListTodo className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#f1f3f4]">
                      Related Tasks
                    </span>
                    {subtasks.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-[#1a73e8] dark:text-[#8ab4f8] border border-blue-200 dark:border-blue-800">
                        {subtasks.filter((s) => s.completed).length}/{subtasks.length} Done
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add smaller tasks, action steps or sub-items related to this task
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar (if 1 or more subtasks exist) */}
            {subtasks.length > 0 && (
              <div className="w-full bg-slate-100 dark:bg-[#1a1b1e] h-1.5 rounded-full overflow-hidden border border-slate-200/60 dark:border-[#34373a]">
                <div
                  className="h-full bg-[#1a73e8] dark:bg-[#8ab4f8] transition-all duration-300"
                  style={{
                    width: `${(subtasks.filter((s) => s.completed).length / subtasks.length) * 100}%`,
                  }}
                />
              </div>
            )}

            {/* Input Row to add related task */}
            <div className="flex items-center gap-2 bg-[#f8f9fa] dark:bg-[#1f2023] border border-[#dadce0] dark:border-[#3c4043] rounded-xl px-3 py-1.5 focus-within:border-[#1a73e8] dark:focus-within:border-[#8ab4f8] focus-within:ring-1 focus-within:ring-[#1a73e8]/20 transition-all">
              <Plus className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                value={newRelatedTaskText}
                onChange={(e) => setNewRelatedTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRelatedTask();
                  }
                }}
                placeholder="Write a related task and press Enter..."
                className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAddRelatedTask}
                disabled={!newRelatedTaskText.trim()}
                className="px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                + Add
              </button>
            </div>

            {/* List of Related Tasks */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className={`group flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                      st.completed
                        ? 'bg-slate-50 dark:bg-[#1c1d20] border-slate-200/80 dark:border-[#34373a] opacity-75'
                        : 'bg-white dark:bg-[#202124] border-[#dadce0] dark:border-[#3c4043] shadow-2xs hover:border-[#1a73e8]/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSubtaskItem(st.id)}
                      className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        st.completed
                          ? 'bg-[#1a73e8] border-[#1a73e8] text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#2b2c30] hover:border-[#1a73e8]'
                      }`}
                      title={st.completed ? 'Mark pending' : 'Mark completed'}
                    >
                      {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    {/* Content or Edit Input */}
                    {editingSubtaskId === st.id ? (
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        <input
                          type="text"
                          value={editingSubtaskText}
                          onChange={(e) => setEditingSubtaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditSubtask(st.id);
                            if (e.key === 'Escape') setEditingSubtaskId(null);
                          }}
                          className="w-full px-2 py-0.5 rounded border border-[#1a73e8] bg-white dark:bg-[#1a1b1e] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditSubtask(st.id)}
                          className="px-2 py-0.5 bg-[#1a73e8] text-white text-[11px] font-bold rounded cursor-pointer shrink-0"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() => handleStartEditSubtask(st)}
                        className={`flex-1 text-xs sm:text-sm font-medium break-words cursor-text ${
                          st.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                        title="Click to edit text"
                      >
                        {st.text}
                      </span>
                    )}

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtaskItem(st.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Delete related task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Grouped Schedule Actions (Remind me, Due Date, Repeat) */}
          <div className="bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-[#34373a]">
            {/* 1. Remind me Row */}
            <div className="p-3.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasFollowUp) setHasFollowUp(true);
                    setShowReminderPicker(!showReminderPicker);
                  }}
                  className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                >
                  <Bell
                    className={`w-5 h-5 stroke-[2] shrink-0 ${
                      hasFollowUp ? 'text-[#1a73e8]' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <span
                      className={`text-xs sm:text-sm font-bold block ${
                        hasFollowUp ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hasFollowUp ? `Remind me at ${followUpTime}` : 'Remind me'}
                    </span>
                    {hasFollowUp && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {followUpDate === getTodayString() ? 'Today' : followUpDate}
                      </span>
                    )}
                  </div>
                </button>

                {hasFollowUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasFollowUp(false);
                      setShowReminderPicker(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear reminder"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline Reminder Time/Date Picker */}
              {showReminderPicker && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#34373a] grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Reminder Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-slate-50 dark:bg-[#1a1b1e] text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Reminder Time
                    </label>
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-slate-50 dark:bg-[#1a1b1e] text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Due Date Row */}
            <div className="p-3.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowDuePicker(!showDuePicker)}
                  className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                >
                  <Calendar
                    className={`w-5 h-5 stroke-[2] shrink-0 ${
                      isDueSet ? 'text-[#1a73e8]' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isDueSet ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {getDueSummary()}
                  </span>
                </button>

                {isDueSet && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDueSet(false);
                      setShowDuePicker(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear due date"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline Due Date Picker */}
              {showDuePicker && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#34373a] space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setLastDate(getTodayString());
                        setIsDueSet(true);
                        setShowDuePicker(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-[#8ab4f8] text-xs font-bold border border-blue-200 dark:border-blue-800 cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLastDate(getTomorrowString());
                        setIsDueSet(true);
                        setShowDuePicker(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#34373a] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      Tomorrow
                    </button>
                  </div>
                  <input
                    type="date"
                    value={lastDate}
                    onChange={(e) => {
                      setLastDate(e.target.value);
                      setIsDueSet(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-slate-50 dark:bg-[#1a1b1e] text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* 3. Repeat (Cadence: Daily, Weekly, Monthly) Row */}
            <div className="p-3.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowRepeatPicker(!showRepeatPicker)}
                  className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                >
                  <RotateCw
                    className={`w-5 h-5 stroke-[2] shrink-0 ${
                      taskType !== 'normal' ? 'text-[#1a73e8]' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <span
                      className={`text-xs sm:text-sm font-bold block ${
                        taskType !== 'normal' ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Repeat
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {getRepeatSummary()}
                    </span>
                  </div>
                </button>

                {taskType !== 'normal' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTaskType('normal');
                      setShowRepeatPicker(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Don't repeat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline Repeat Frequency Selector */}
              {showRepeatPicker && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#34373a] space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTaskType('normal')}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        taskType === 'normal'
                          ? 'bg-slate-800 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                          : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-700 dark:text-slate-300 border-[#dadce0] dark:border-[#3c4043]'
                      }`}
                    >
                      Never
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskType('daily_routine')}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        taskType === 'daily_routine'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-700 dark:text-slate-300 border-[#dadce0] dark:border-[#3c4043]'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskType('weekly')}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        taskType === 'weekly'
                          ? 'bg-[#188038] text-white border-[#137333] shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-700 dark:text-slate-300 border-[#dadce0] dark:border-[#3c4043]'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskType('monthly')}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        taskType === 'monthly'
                          ? 'bg-[#9334e6] text-white border-[#7b1fa2] shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-700 dark:text-slate-300 border-[#dadce0] dark:border-[#3c4043]'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>

                  {/* Weekly Day Selector Chips */}
                  {taskType === 'weekly' && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                        Select Recurring Weekday:
                      </span>
                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAYS.map((w) => {
                          const isSel = selectedWeekdays.includes(w.id);
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => handleToggleWeekday(w.id)}
                              className={`h-9 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                                isSel
                                  ? 'bg-[#188038] text-white border-[#137333] shadow-xs'
                                  : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-800 dark:text-slate-200 border-[#dadce0] dark:border-[#5f6368] hover:bg-emerald-50'
                              }`}
                              title={w.name}
                            >
                              <span>{w.initial}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monthly Day Selector */}
                  {taskType === 'monthly' && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                        Day of Month (1 - 31):
                      </span>
                      <input
                        type="text"
                        value={monthlyDay}
                        onChange={(e) => setMonthlyDay(e.target.value)}
                        placeholder="e.g. 10, 15, 25..."
                        className="w-full px-3 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-slate-50 dark:bg-[#1a1b1e] text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Priority & Assignment Group */}
          <div className="bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-[#34373a]">
            {/* Priority Row */}
            <div className="p-3.5">
              <button
                type="button"
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Flag className={`w-5 h-5 stroke-[2] ${currentPriority.color}`} />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block">
                      Priority
                    </span>
                    <span className={`text-[11px] font-bold ${currentPriority.color}`}>
                      {currentPriority.label} Priority
                    </span>
                  </div>
                </div>
                <span className={`w-3 h-3 rounded-full ${currentPriority.dot}`} />
              </button>

              {showPriorityPicker && (
                <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-[#34373a] animate-in fade-in duration-150">
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => {
                    const cfg = priorityConfigs[p];
                    const isSel = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPriority(p);
                          setShowPriorityPicker(false);
                        }}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          isSel
                            ? `${cfg.bg} ${cfg.color} border-current shadow-xs`
                            : 'bg-slate-50 dark:bg-[#1a1b1e] text-slate-600 dark:text-slate-400 border-[#dadce0] dark:border-[#3c4043]'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assign / Share Row */}
            {onOpenShareModal && (
              <div className="p-3.5">
                <button
                  type="button"
                  onClick={() => onOpenShareModal(note)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-500 dark:text-slate-400 stroke-[2]" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block">
                        Assigned To
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {note.assignedTo ? `👤 ${note.assignedTo}` : 'Assign to contact or group'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[#1a73e8] dark:text-[#8ab4f8] font-bold">
                    {note.assignedTo ? 'Change' : 'Assign'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Add Note (Clean Textarea exactly like photo) */}
          <div className="bg-white dark:bg-[#252628] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Add note
            </label>
            <textarea
              value={notesDetail}
              onChange={(e) => setNotesDetail(e.target.value)}
              placeholder="Add note..."
              rows={4}
              className="w-full bg-transparent border-none focus:outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-[#f1f3f4] resize-none placeholder:text-slate-400 leading-relaxed"
            />
          </div>
        </div>

        {/* Bottom Footer Bar: Created Timestamp on Left & Trash Delete on Right */}
        <div className="px-5 py-3.5 bg-[#f8f9fa] dark:bg-[#1a1b1e] border-t border-[#dadce0]/80 dark:border-[#3c4043] flex items-center justify-between shrink-0 select-none pb-[max(0.85rem,env(safe-area-inset-bottom))] sticky bottom-0 z-20">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {note.createdAt ? `Created ${note.createdAt}` : 'Created recently'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer sm:hidden"
            >
              Done & Save
            </button>

            {onDeleteTask && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this task?')) {
                    onDeleteTask(note.id);
                    onClose();
                  }
                }}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                title="Delete task"
              >
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
