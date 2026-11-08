import React from 'react';
import {
  Check,
  Pin,
  Star,
  Clock,
  Calendar,
  RotateCw,
  AlertCircle,
  FileText,
  History,
} from 'lucide-react';
import { TaskNote, BoardStyle } from '../types';
import { isDateOverdue, formatDueDate, formatFollowUp, formatMinimalDateOrDay } from '../utils/date';

interface ExcelTaskRowProps {
  note: TaskNote;
  rowIndex: number;
  boardStyle?: BoardStyle;
  onToggleComplete: (id: string) => void;
  onClickTask: (note: TaskNote) => void;
  onCarryForwardSingle?: (id: string) => void;
}

export const ExcelTaskRow: React.FC<ExcelTaskRowProps> = ({
  note,
  rowIndex,
  boardStyle = 'modern_dark',
  onToggleComplete,
  onClickTask,
  onCarryForwardSingle,
}) => {
  const isOverdue = Boolean(note.dueDate && !note.completed && isDateOverdue(note.dueDate));
  const dueInfo = note.dueDate ? formatDueDate(note.dueDate) : null;
  const followUpInfo = note.followUpDate ? formatFollowUp(note.followUpDate) : null;
  const hasNotes = Boolean(note.notesDetail && note.notesDetail.trim());
  const historyCount = (note.history && note.history.length) || 0;

  const isDark = boardStyle === 'modern_dark' || boardStyle === 'modern_aurora';
  const isAurora = boardStyle === 'modern_aurora';
  const isChrome = boardStyle === 'chrome_light';

  // Priority color highlighting (clean border-l stripe and subtle tint, zero text space consumed)
  const priority = note.priority || 'medium';
  const priorityConfig = {
    urgent: {
      borderL: 'border-l-4 border-l-[#d32f2f]',
      bgChrome: 'bg-[#ffebee] hover:bg-[#ffcdd2]',
      bgDark: 'bg-rose-950/40 hover:bg-rose-900/50',
      label: 'Urgent',
    },
    high: {
      borderL: 'border-l-4 border-l-[#e65100]',
      bgChrome: 'bg-[#fff3e0] hover:bg-[#ffe0b2]',
      bgDark: 'bg-amber-950/40 hover:bg-amber-900/50',
      label: 'High',
    },
    medium: {
      borderL: 'border-l-4 border-l-[#1565c0]',
      bgChrome: 'bg-[#e3f2fd] hover:bg-[#bbdefb]',
      bgDark: 'bg-blue-950/40 hover:bg-blue-900/50',
      label: 'Medium',
    },
    low: {
      borderL: 'border-l-4 border-l-[#2e7d32]',
      bgChrome: 'bg-[#e8f5e9] hover:bg-[#c8e6c9]',
      bgDark: 'bg-emerald-950/40 hover:bg-emerald-900/50',
      label: 'Low',
    },
  }[priority];

  // Dynamic row styles based on theme & priority highlighting
  let rowStyleClass = '';
  if (isChrome) {
    if (note.completed) {
      rowStyleClass = 'bg-[#f8f9fa] border-b border-[#f1f3f4] text-[#80868b] border-l-2 border-l-slate-300 hover:bg-[#f1f3f4]';
    } else if (note.isPinned) {
      rowStyleClass = `bg-[#fef7e0] border-b border-[#f9ab00]/30 hover:bg-[#feefc3] text-[#202124] shadow-2xs ${priorityConfig.borderL}`;
    } else if (isOverdue) {
      rowStyleClass = `bg-[#fce8e6] border-b border-[#f28b82]/40 hover:bg-[#fad2cf] text-[#202124] ${priorityConfig.borderL}`;
    } else {
      rowStyleClass = `${priorityConfig.bgChrome} ${priorityConfig.borderL} border-b border-[#f1f3f4] text-[#202124]`;
    }
  } else if (isDark) {
    if (note.completed) {
      rowStyleClass = 'bg-zinc-900/30 border-zinc-800/40 text-zinc-500 hover:bg-zinc-900/60 border-l-2 border-l-zinc-700';
    } else if (note.isPinned) {
      rowStyleClass = `${isAurora ? 'bg-purple-950/30 border-purple-800/40 text-purple-100' : 'bg-amber-950/25 border-amber-800/40 text-amber-100'} ${priorityConfig.borderL}`;
    } else if (isOverdue) {
      rowStyleClass = `bg-rose-950/30 border-rose-800/40 hover:bg-rose-900/30 text-rose-100 ${priorityConfig.borderL}`;
    } else {
      rowStyleClass = `${priorityConfig.bgDark} ${priorityConfig.borderL} border-zinc-800/60 hover:bg-zinc-800/60 text-zinc-200`;
    }
  } else {
    if (note.completed) {
      rowStyleClass = 'bg-slate-50/70 border-slate-100 text-slate-400 hover:bg-slate-100/60 border-l-2 border-l-slate-300';
    } else if (note.isPinned) {
      rowStyleClass = `bg-amber-50/70 border-amber-200 hover:bg-amber-100/60 text-slate-900 shadow-2xs ${priorityConfig.borderL}`;
    } else if (isOverdue) {
      rowStyleClass = `bg-rose-50/70 border-rose-200 hover:bg-rose-100/60 text-slate-900 ${priorityConfig.borderL}`;
    } else {
      rowStyleClass = `${priorityConfig.bgChrome} ${priorityConfig.borderL} border-slate-100 hover:bg-slate-50 text-slate-800`;
    }
  }

  const indexColor = isChrome
    ? 'text-[#5f6368] group-hover:text-[#1a73e8]'
    : isDark
    ? isAurora ? 'text-indigo-400/50 group-hover:text-indigo-300' : 'text-zinc-500 group-hover:text-zinc-300'
    : 'text-slate-400 group-hover:text-slate-700';

  const checkboxClass = isChrome
    ? note.completed
      ? 'bg-[#1a73e8] border-[#1a73e8] text-white'
      : 'border-[#dadce0] bg-white hover:border-[#1a73e8] group-hover:border-[#5f6368]'
    : isDark
    ? note.completed
      ? isAurora ? 'bg-purple-600 border-purple-500 text-white' : 'bg-emerald-500 border-emerald-400 text-black'
      : isAurora ? 'border-indigo-700/70 bg-indigo-950/50 hover:border-purple-400' : 'border-zinc-700 bg-zinc-800/70 hover:border-zinc-500'
    : note.completed
      ? 'bg-slate-800 border-slate-800 text-white'
      : 'border-slate-300 bg-white hover:border-slate-600 group-hover:border-slate-400';

  const textClass = note.completed
    ? isChrome
      ? 'line-through text-[#80868b]'
      : isDark ? 'line-through text-zinc-600' : 'line-through text-slate-400'
    : isChrome
      ? 'text-[#202124] group-hover:text-black'
      : isDark
      ? isAurora ? 'text-slate-100 group-hover:text-white' : 'text-zinc-100 group-hover:text-white'
      : 'text-slate-800 group-hover:text-slate-950';

  return (
    <div
      onClick={() => onClickTask(note)}
      className={`group relative flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 border-b transition-all duration-150 cursor-pointer select-none text-xs sm:text-sm ${rowStyleClass}`}
    >
      {/* Spreadsheet Row Index / Cell ID */}
      <div className={`w-5 sm:w-6 text-[11px] font-mono shrink-0 text-center select-none font-semibold ${indexColor}`}>
        {rowIndex}
      </div>

      {/* Checkbox Column */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(note.id);
        }}
        className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 rounded-md border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${checkboxClass}`}
        title={note.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {note.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Pin Icon (if pinned) */}
      {note.isPinned && (
        <span
          className={`shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
          title="Pinned to top"
        >
          <Pin className="w-3.5 h-3.5 fill-amber-400 -rotate-45" />
        </span>
      )}

      {/* Important Star (if marked important) */}
      {note.isImportant && (
        <span
          className={`shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-500'}`}
          title="Important task"
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
        </span>
      )}

      {/* Task Description Text */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Scheduled Date badge from User's Sheet */}
          {note.scheduledDay !== undefined && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border shrink-0 ${
                isChrome
                  ? 'bg-[#e8f0fe] border-[#d2e3fc] text-[#1a73e8]'
                  : isDark
                  ? 'bg-sky-950/60 border-sky-800/60 text-sky-300'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
              title={`Scheduled Day: ${note.scheduledDay}`}
            >
              <Calendar className="w-2.5 h-2.5 opacity-80" />
              <span>
                {formatMinimalDateOrDay(note) || (typeof note.scheduledDay === 'number'
                  ? `${note.scheduledDay}`
                  : note.scheduledDay)}
              </span>
            </span>
          )}

          <span className={`font-medium break-words leading-tight transition-colors ${textClass}`}>
            {note.text}
          </span>

          {hasNotes && (
            <span
              className={isChrome ? 'text-[#5f6368] group-hover:text-[#202124]' : isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-slate-400 group-hover:text-slate-700'}
              title={note.notesDetail}
            >
              <FileText className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Badges & Icons container */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {/* Deadline Date Badge from User's Sheet */}
        {note.deadlineDay !== undefined && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shadow-2xs ${
              isChrome
                ? 'bg-[#fce8e6] border-[#fad2cf] text-[#c5221f]'
                : isDark
                ? 'bg-purple-950/70 border-purple-800/80 text-purple-200'
                : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}
            title={`Target Deadline Date: ${note.deadlineDay}`}
          >
            <Clock className="w-2.5 h-2.5 text-purple-400" />
            <span>DL: {note.deadlineDay}</span>
          </span>
        )}

        {/* Carried Forward Badge (🔁) */}
        {note.carryForwardCount && note.carryForwardCount > 0 ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (onCarryForwardSingle) onCarryForwardSingle(note.id);
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer shadow-2xs ${
              isChrome
                ? 'bg-[#fef7e0] text-[#b06000] border border-[#fce8b2] hover:bg-[#feefc3]'
                : isDark
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60'
                : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
            }`}
            title={`Carried forward ${note.carryForwardCount} day(s). Click to forward again.`}
          >
            <RotateCw className="w-2.5 h-2.5 text-amber-400" />
            <span>+{note.carryForwardCount}d</span>
          </span>
        ) : null}

        {/* Follow-up Icon & Badge (⏰) */}
        {followUpInfo && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shadow-2xs ${
              followUpInfo.isOverdue && !note.completed
                ? isDark
                  ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                  : 'bg-rose-50 border-rose-300 text-rose-700'
                : isDark
                  ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={`Follow-up scheduled: ${followUpInfo.label}`}
          >
            <Clock className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">{followUpInfo.label}</span>
          </span>
        )}

        {/* Deadline Badge (📅) */}
        {dueInfo && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shadow-2xs ${
              isOverdue
                ? isDark
                  ? 'bg-rose-950/70 border-rose-800/80 text-rose-300 font-bold'
                  : 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                : dueInfo.isToday
                ? isDark
                  ? 'bg-amber-950/70 border-amber-800/80 text-amber-300 font-bold'
                  : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                : isDark
                  ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={`Deadline: ${dueInfo.label}`}
          >
            {isOverdue ? (
              <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            ) : (
              <Calendar className="w-2.5 h-2.5" />
            )}
            <span>{dueInfo.label}</span>
          </span>
        )}

        {/* History indicator (logs count) */}
        {historyCount > 0 && (
          <span
            className={`${isDark ? 'text-zinc-600 group-hover:text-zinc-400' : 'text-slate-400 group-hover:text-slate-600'} text-[10px] flex items-center gap-0.5 hidden md:inline-flex`}
            title={`${historyCount} history logs. Click to view.`}
          >
            <History className="w-3 h-3" />
            <span>{historyCount}</span>
          </span>
        )}
      </div>
    </div>
  );
};
