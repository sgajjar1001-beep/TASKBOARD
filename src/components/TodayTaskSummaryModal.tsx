import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  ListTodo,
  Star,
} from 'lucide-react';
import { TaskNote, TaskCadence } from '../types';
import { getTodayString, isTaskForToday } from '../utils/date';

interface TodayTaskSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: TaskNote[];
  onToggleComplete?: (id: string) => void;
  onClickTask?: (note: TaskNote) => void;
}

export const TodayTaskSummaryModal: React.FC<TodayTaskSummaryModalProps> = ({
  isOpen,
  onClose,
  notes,
  onToggleComplete,
  onClickTask,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

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

  if (!isOpen) return null;

  const todayStr = getTodayString();

  // Filter tasks that are relevant to today:
  // 1. Routine Tasks (daily fixed routine)
  // 2. Today's Daily Tasks (assigned or due today)
  // 3. Weekly Tasks (scheduled for today or weekly cadence)
  // 4. Monthly Tasks (scheduled for today or monthly cadence)

  const isRoutine = (n: TaskNote) =>
    n.cadence === 'daily' && (n.routineType === 'fixed_daily' || (n as any).taskType === 'daily_routine');

  const isTodayDaily = (n: TaskNote) =>
    n.cadence === 'daily' && !isRoutine(n);

  const isWeekly = (n: TaskNote) => n.cadence === 'weekly';
  const isMonthly = (n: TaskNote) => n.cadence === 'monthly';

  const pendingRoutine = notes.filter((n) => isRoutine(n) && !n.completed);
  const completedRoutine = notes.filter((n) => isRoutine(n) && n.completed);

  const pendingTodayDaily = notes.filter((n) => isTodayDaily(n) && isTaskForToday(n) && !n.completed);
  const completedTodayDaily = notes.filter((n) => isTodayDaily(n) && isTaskForToday(n) && n.completed);

  const pendingWeekly = notes.filter((n) => isWeekly(n) && !n.completed);
  const completedWeekly = notes.filter((n) => isWeekly(n) && n.completed);

  const pendingMonthly = notes.filter((n) => isMonthly(n) && !n.completed);
  const completedMonthly = notes.filter((n) => isMonthly(n) && n.completed);

  const totalPending =
    pendingRoutine.length + pendingTodayDaily.length + pendingWeekly.length + pendingMonthly.length;
  const totalCompleted =
    completedRoutine.length + completedTodayDaily.length + completedWeekly.length + completedMonthly.length;

  const currentRoutine = activeTab === 'pending' ? pendingRoutine : completedRoutine;
  const currentTodayDaily = activeTab === 'pending' ? pendingTodayDaily : completedTodayDaily;
  const currentWeekly = activeTab === 'pending' ? pendingWeekly : completedWeekly;
  const currentMonthly = activeTab === 'pending' ? pendingMonthly : completedMonthly;

  const currentTotal =
    currentRoutine.length + currentTodayDaily.length + currentWeekly.length + currentMonthly.length;

  // Helper to render an Excel sheet styled table for a section using the App Theme
  const renderExcelSection = (
    sectionTitle: string,
    sectionEmoji: string,
    headerClasses: string,
    badgeClasses: string,
    tasks: TaskNote[],
    startIndex: number
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-1">
        {/* Section Header */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 rounded-t-xl border-x border-t ${headerClasses}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{sectionEmoji}</span>
            <span className="text-xs font-bold leading-tight">{sectionTitle}</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${badgeClasses}`}>
            {tasks.length}
          </span>
        </div>

        {/* Excel Sheet Table Grid with Clean Transparent Lines */}
        <div className="overflow-x-auto border border-white/30 dark:border-white/15 rounded-b-xl shadow-2xs">
          <table className="w-full border-collapse text-left text-xs bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <thead>
              <tr className="bg-white/50 dark:bg-black/50 border-b border-white/30 dark:border-white/15 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider select-none">
                <th className="py-2 px-2.5 border-r border-white/20 dark:border-white/10 text-center w-9">
                  #
                </th>
                <th className="py-2 px-3">
                  Task
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => {
                const rowNum = startIndex + idx + 1;
                const isEven = idx % 2 === 0;
                const rowBg = isEven
                  ? 'bg-transparent'
                  : 'bg-white/20 dark:bg-white/5';

                return (
                  <tr
                    key={task.id}
                    className={`${rowBg} hover:bg-white/40 dark:hover:bg-white/10 transition-colors border-b border-white/15 dark:border-white/10 last:border-b-0`}
                  >
                    {/* Excel Row # Cell */}
                    <td className="py-2.5 px-2.5 border-r border-white/15 dark:border-white/10 text-center text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 select-none">
                      {rowNum}
                    </td>

                    {/* Task Title Cell (Pure Clean List) */}
                    <td
                      onClick={() => onClickTask?.(task)}
                      className="py-2.5 px-3 font-bold text-slate-950 dark:text-white cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        {task.isImportant && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <span
                          className={`break-words leading-snug group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] transition-colors text-xs sm:text-[13px] ${
                            task.completed ? 'line-through text-slate-400 dark:text-slate-500 opacity-75' : ''
                          }`}
                        >
                          {task.text}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white/35 dark:bg-black/45 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-white/40 dark:border-white/20 flex flex-col max-h-[90dvh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar - Super Compact on Mobile to maximize task space */}
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-transparent backdrop-blur-xs border-b border-white/20 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-100/80 dark:bg-blue-950/80 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shadow-xs shrink-0 backdrop-blur-xs">
              <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white leading-tight truncate drop-shadow-xs">
                  Today's Tasks Sheet
                </h3>
                <span className="text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50/80 text-[#1a73e8] dark:bg-blue-950/60 dark:text-[#8ab4f8] border border-blue-200 dark:border-blue-800 font-mono shrink-0 backdrop-blur-xs">
                  {todayStr}
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-700 dark:text-slate-300 font-bold mt-0.2 truncate">
                Excel lines view for today's routine & scheduled tasks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Compact Tabs Bar: Pending Tasks vs Completed Tasks */}
        <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-transparent border-b border-white/20 dark:border-white/10 flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Pending Tasks Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1 sm:py-1.5 px-2 rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
              activeTab === 'pending'
                ? 'bg-[#1a73e8] text-white shadow-xs'
                : 'bg-white/25 dark:bg-black/30 text-slate-800 dark:text-slate-200 border border-white/30 dark:border-white/15 hover:bg-white/40'
            }`}
          >
            <ListTodo className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Pending Tasks</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-mono font-black ${
                activeTab === 'pending'
                  ? 'bg-white/25 text-white'
                  : 'bg-white/50 dark:bg-black/40 text-[#1a73e8] dark:text-[#8ab4f8] border border-white/30'
              }`}
            >
              {totalPending}
            </span>
          </button>

          {/* Completed Tasks Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-1 sm:py-1.5 px-2 rounded-lg font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
              activeTab === 'completed'
                ? 'bg-[#188038] text-white shadow-xs'
                : 'bg-white/25 dark:bg-black/30 text-slate-800 dark:text-slate-200 border border-white/30 dark:border-white/15 hover:bg-white/40'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Completed Tasks</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-mono font-black ${
                activeTab === 'completed'
                  ? 'bg-white/25 text-white'
                  : 'bg-white/50 dark:bg-black/40 text-[#188038] dark:text-[#34a853] border border-white/30'
              }`}
            >
              {totalCompleted}
            </span>
          </button>
        </div>

        {/* Scrollable Body: Excel Sheet Grids grouped by Routine, Today, Weekly, Monthly */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-2.5">
          {currentTotal === 0 ? (
            <div className="py-14 text-center flex flex-col items-center justify-center space-y-2 text-[#5f6368] dark:text-[#9aa0a6]">
              <div className="w-12 h-12 rounded-2xl bg-[#f1f3f4] dark:bg-[#2c2d30] flex items-center justify-center border border-[#dadce0] dark:border-[#3c4043]">
                {activeTab === 'pending' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#188038] dark:text-[#34a853]" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <p className="text-xs font-bold text-[#202124] dark:text-white">
                {activeTab === 'pending'
                  ? 'No pending tasks! All clear for today 🎉'
                  : 'No tasks marked completed yet'}
              </p>
              <p className="text-[11px] opacity-75">
                {activeTab === 'pending'
                  ? 'Switch to Completed Tasks tab to see finished tasks.'
                  : 'Complete tasks from the board to see them listed here.'}
              </p>
            </div>
          ) : (
            <>
              {/* 1. Routine Tasks */}
              {renderExcelSection(
                'Daily Routine Tasks',
                '📋',
                'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-[#1a73e8] dark:text-[#8ab4f8]',
                'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
                currentRoutine,
                0
              )}

              {/* 2. Today Daily Tasks */}
              {renderExcelSection(
                "Today's Tasks",
                '📅',
                'bg-slate-100 dark:bg-[#2c2d30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-white',
                'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
                currentTodayDaily,
                currentRoutine.length
              )}

              {/* 3. Weekly Tasks */}
              {renderExcelSection(
                'Weekly Schedule',
                '🔄',
                'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-[#188038] dark:text-emerald-300',
                'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
                currentWeekly,
                currentRoutine.length + currentTodayDaily.length
              )}

              {/* 4. Monthly Tasks */}
              {renderExcelSection(
                'Monthly Schedule',
                '🗓️',
                'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300',
                'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
                currentMonthly,
                currentRoutine.length + currentTodayDaily.length + currentWeekly.length
              )}
            </>
          )}
        </div>

        {/* Modal Footer: Quick Summary Stats & Done */}
        <div className="px-5 py-3 bg-[#f8f9fa] dark:bg-[#252628] border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#5f6368] dark:text-[#9aa0a6] font-semibold">
            <span>Showing: {currentTotal} task{currentTotal !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span className="text-[#1a73e8] dark:text-[#8ab4f8] font-bold">
              {totalPending} pending / {totalCompleted} completed
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
