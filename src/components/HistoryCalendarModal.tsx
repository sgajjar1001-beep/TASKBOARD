import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRightCircle,
  RotateCcw,
  History,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { TaskNote } from '../types';
import { getTodayString, getYesterdayString } from '../utils/date';
import { CADENCE_INFO } from '../constants';

interface HistoryCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: TaskNote[];
  onToggleComplete: (id: string) => void;
}

export const HistoryCalendarModal: React.FC<HistoryCalendarModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  onToggleComplete,
}) => {
  const todayStr = useMemo(() => {
    try {
      return getTodayString();
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  const yesterdayStr = useMemo(() => {
    try {
      return getYesterdayString();
    } catch {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    }
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Helper to parse date string safely without ever throwing RangeError
  const parseSafeDate = (dateStr: string): Date => {
    try {
      if (!dateStr || typeof dateStr !== 'string') return new Date();
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const dateObj = new Date(y, m - 1, d);
          if (!isNaN(dateObj.getTime())) return dateObj;
        }
      }
      const direct = new Date(dateStr);
      if (!isNaN(direct.getTime())) return direct;
    } catch {
      // fallback
    }
    return new Date();
  };

  // Safe formatted date string
  const formattedSelectedDate = useMemo(() => {
    try {
      const d = parseSafeDate(selectedDate || todayStr);
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedDate || todayStr;
    }
  }, [selectedDate, todayStr]);

  if (!isOpen) return null;

  // Change date by offset in days safely
  const handleShiftDate = (days: number) => {
    try {
      const dateObj = parseSafeDate(selectedDate || todayStr);
      dateObj.setDate(dateObj.getDate() + days);
      const newStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      setSelectedDate(newStr);
    } catch {
      setSelectedDate(todayStr);
    }
  };

  const rawNotes = Array.isArray(notes) ? notes : [];
  const safeNotes = Array.from(new Map(rawNotes.filter((n) => n && n.id).map((n) => [n.id, n])).values());
  const currentTargetDate = selectedDate || todayStr;

  // 1. Completed tasks on this day (fully null/undefined safe)
  const completedOnThisDay = safeNotes.filter((n) => {
    if (!n) return false;
    // Check if completedDate matches
    if (n.completed && n.completedDate === currentTargetDate) return true;

    // Check history safely
    if (Array.isArray(n.history)) {
      const hasCompleted = n.history.some((h) => {
        if (!h || h.action !== 'completed') return false;
        const ts = typeof h.timestamp === 'string' ? h.timestamp : '';
        const desc = typeof h.description === 'string' ? h.description : '';
        return ts.includes(currentTargetDate) || desc.includes(currentTargetDate);
      });
      if (hasCompleted) return true;
    }

    // Fallback: task is completed and assignedDate matches with no completedDate
    if (n.completed && n.assignedDate === currentTargetDate && !n.completedDate) {
      return true;
    }

    return false;
  });

  // 2. Carried forward tasks on this day (fully null/undefined safe)
  const carriedOnThisDay = safeNotes.filter((n) => {
    if (!n) return false;
    if (n.lastCarriedDate === currentTargetDate) return true;

    if (Array.isArray(n.history)) {
      return n.history.some((h) => {
        if (!h || h.action !== 'carried_forward') return false;
        const ts = typeof h.timestamp === 'string' ? h.timestamp : '';
        const desc = typeof h.description === 'string' ? h.description : '';
        return ts.includes(currentTargetDate) || desc.includes(currentTargetDate);
      });
    }

    return false;
  });

  // 3. All history action entries that occurred on this day (fully null/undefined safe)
  const dayActivityEntries: {
    taskText: string;
    cadence: string;
    taskId: string;
    action: string;
    timestamp: string;
    description: string;
  }[] = [];

  safeNotes.forEach((note) => {
    if (!note || !Array.isArray(note.history)) return;
    note.history.forEach((h) => {
      if (!h) return;
      const ts = typeof h.timestamp === 'string' ? h.timestamp : '';
      const desc = typeof h.description === 'string' ? h.description : '';
      const matchesDate =
        (ts && ts.includes(currentTargetDate)) ||
        (desc && desc.includes(currentTargetDate)) ||
        (note.completedDate === currentTargetDate && h.action === 'completed');

      if (matchesDate) {
        dayActivityEntries.push({
          taskText: note.text || 'Untitled task',
          cadence: note.cadence || 'daily',
          taskId: note.id || String(Math.random()),
          action: h.action || 'updated',
          timestamp: ts || currentTargetDate,
          description: desc || 'Activity recorded',
        });
      }
    });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#dadce0] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#202124]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] shadow-2xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202124] flex items-center gap-2">
                <span>Task History Calendar</span>
              </h2>
              <p className="text-xs text-[#5f6368]">
                Select a date to view completed tasks and daily carry-forward log
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Date Picker Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-[#dadce0] flex flex-wrap items-center justify-between gap-3">
          {/* Day Navigation & Date Picker */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 rounded-lg border border-[#dadce0] hover:bg-[#f1f3f4] text-[#3c4043] transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Date input */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-[#dadce0] text-xs font-semibold text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-blue-500/20 bg-[#f8f9fa] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1.5 rounded-lg border border-[#dadce0] hover:bg-[#f1f3f4] text-[#3c4043] transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                  : 'bg-white text-[#3c4043] border-[#dadce0] hover:bg-[#f1f3f4]'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                  : 'bg-white text-[#3c4043] border-[#dadce0] hover:bg-[#f1f3f4]'
              }`}
            >
              Yesterday
            </button>
          </div>

          {/* Formatted Date Pill */}
          <div className="text-xs font-bold text-[#1a73e8] flex items-center gap-1.5 bg-[#e8f0fe] px-3 py-1 rounded-full border border-[#d2e3fc]">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedSelectedDate}</span>
          </div>
        </div>

        {/* Daily Summary Stats */}
        <div className="px-5 py-3 bg-[#f8f9fa] border-b border-[#dadce0] grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white p-2.5 rounded-xl border border-[#dadce0] flex items-center gap-2.5 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#202124]">{completedOnThisDay.length}</div>
              <div className="text-[11px] text-[#5f6368]">Completed Tasks</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#dadce0] flex items-center gap-2.5 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <ArrowRightCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#202124]">{carriedOnThisDay.length}</div>
              <div className="text-[11px] text-[#5f6368]">Carried Forward</div>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#dadce0] flex items-center gap-2.5 shadow-2xs col-span-2 sm:col-span-1">
            <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#202124]">{dayActivityEntries.length}</div>
              <div className="text-[11px] text-[#5f6368]">Actions Logged</div>
            </div>
          </div>
        </div>

        {/* Content Body: Scrollable list */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Completed Tasks on this day */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completed on this Day ({completedOnThisDay.length})</span>
              </h3>
            </div>

            {completedOnThisDay.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#dadce0] bg-[#fafafa] text-center text-xs text-[#5f6368]">
                No tasks were marked completed on this date.
              </div>
            ) : (
              <div className="space-y-2">
                {completedOnThisDay.map((task) => {
                  const cadInfo = CADENCE_INFO[task.cadence] || {
                    label: task.cadence || 'Task',
                    color: '#0284c7',
                    bgClass: 'bg-sky-100 text-sky-800 border-sky-300',
                    textClass: 'text-sky-800',
                    borderClass: 'border-sky-300',
                  };

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl border border-[#dadce0] bg-white hover:border-[#1a73e8]/30 transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${cadInfo.bgClass}`}>
                              {cadInfo.label}
                            </span>
                            <span className="text-xs font-medium line-through text-[#5f6368] break-words">
                              {task.text}
                            </span>
                          </div>
                          {task.completedAt && (
                            <div className="text-[10px] text-[#5f6368] mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>Completed: {task.completedAt}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reopen Action button */}
                      <button
                        type="button"
                        onClick={() => onToggleComplete(task.id)}
                        className="px-2.5 py-1 rounded-lg border border-[#dadce0] bg-[#f8f9fa] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold text-[#3c4043] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        title="Reopen task (unhide and restore to active section)"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reopen</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Tasks Carried Forward on this day */}
          {carriedOnThisDay.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] flex items-center gap-1.5">
                <ArrowRightCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Carried Forward Tasks ({carriedOnThisDay.length})</span>
              </h3>
              <div className="space-y-2">
                {carriedOnThisDay.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-semibold text-[#202124] truncate">{task.text}</span>
                    </div>
                    <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold border border-amber-300 shrink-0">
                      Rollover #{task.carryForwardCount || 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Timeline Activity Log for selected day */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Activity Log ({dayActivityEntries.length})</span>
            </h3>

            {dayActivityEntries.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#dadce0] bg-[#fafafa] text-center text-xs text-[#5f6368]">
                No activity logged for this date.
              </div>
            ) : (
              <div className="divide-y divide-[#dadce0] rounded-xl border border-[#dadce0] bg-white overflow-hidden shadow-2xs">
                {dayActivityEntries.map((act, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-2.5 hover:bg-[#f8f9fa] transition-colors text-xs">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        act.action === 'completed'
                          ? 'bg-emerald-500'
                          : act.action === 'carried_forward'
                          ? 'bg-amber-500'
                          : 'bg-[#1a73e8]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#202124] truncate">{act.taskText}</span>
                        <span className="text-[10px] text-[#5f6368] font-mono shrink-0">{act.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368] mt-0.5">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between text-xs text-[#5f6368]">
          <span>Completed tasks are safely stored in history and hidden from active board.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
