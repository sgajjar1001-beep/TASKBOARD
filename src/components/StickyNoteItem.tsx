import React, { useState } from 'react';
import {
  Check,
  Trash2,
  Edit2,
  CheckCircle2,
  RotateCw,
  Calendar,
  AlertCircle,
  X,
  Flame,
} from 'lucide-react';
import { TaskNote, TaskCadence, TaskPriority } from '../types';
import { NOTE_COLOR_MAP, CADENCE_INFO } from '../constants';
import { isDateOverdue, formatDueDate } from '../utils/date';

interface StickyNoteItemProps {
  note: TaskNote;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateCadence: (id: string, newCadence: TaskCadence) => void;
  onUpdateText: (id: string, newText: string) => void;
  onUpdateDueDate?: (id: string, newDueDate?: string) => void;
  onUpdatePriority?: (id: string, newPriority: TaskPriority) => void;
  isDragging?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  isDraggable?: boolean;
}

const PRIORITY_THEME: Record<
  TaskPriority,
  {
    label: string;
    badgeClass: string;
    iconColor: string;
  }
> = {
  urgent: {
    label: 'URGENT',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    iconColor: 'text-purple-600',
  },
  high: {
    label: 'HIGH',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    iconColor: 'text-rose-600',
  },
  medium: {
    label: 'MEDIUM',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    iconColor: 'text-amber-600',
  },
  low: {
    label: 'LOW',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    iconColor: 'text-emerald-600',
  },
};

export const StickyNoteItem: React.FC<StickyNoteItemProps> = ({
  note,
  onToggleComplete,
  onDelete,
  onUpdateCadence,
  onUpdateText,
  onUpdateDueDate,
  onUpdatePriority,
  isDragging = false,
  onMouseDown,
  onTouchStart,
  isDraggable = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [editDueDate, setEditDueDate] = useState(note.dueDate || '');
  const [isPickingDate, setIsPickingDate] = useState(false);

  const priority: TaskPriority = note.priority || 'medium';
  const priorityStyle = PRIORITY_THEME[priority] || PRIORITY_THEME.medium;
  const colorConfig = NOTE_COLOR_MAP[note.color] || NOTE_COLOR_MAP.yellow;
  const cadenceConfig = CADENCE_INFO[note.cadence] || CADENCE_INFO.daily;

  const isOverdue = Boolean(note.dueDate && !note.completed && isDateOverdue(note.dueDate));
  const dueInfo = note.dueDate ? formatDueDate(note.dueDate) : null;

  const handleCycleCadence = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cadences: TaskCadence[] = ['daily', 'weekly', 'monthly'];
    const nextIdx = (cadences.indexOf(note.cadence) + 1) % cadences.length;
    onUpdateCadence(note.id, cadences[nextIdx]);
  };

  const handleCyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdatePriority) return;
    const nextPriorityMap: Record<TaskPriority, TaskPriority> = {
      low: 'medium',
      medium: 'high',
      high: 'urgent',
      urgent: 'low',
    };
    onUpdatePriority(note.id, nextPriorityMap[priority]);
  };

  const handleSaveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editText.trim()) {
      onUpdateText(note.id, editText.trim());
      if (onUpdateDueDate) {
        onUpdateDueDate(note.id, editDueDate || undefined);
      }
    } else {
      setEditText(note.text);
    }
    setIsEditing(false);
  };

  return (
    <div
      onMouseDown={isDraggable ? onMouseDown : undefined}
      onTouchStart={isDraggable ? onTouchStart : undefined}
      style={
        isDraggable
          ? {
              left: `${note.x}%`,
              top: `${note.y}%`,
              transform: `rotate(${note.rotation}deg) scale(${isDragging ? 1.05 : 1})`,
            }
          : {
              transform: `rotate(${note.rotation * 0.5}deg)`,
            }
      }
      className={`group select-none transition-shadow duration-150 ${
        isDraggable ? 'absolute cursor-grab active:cursor-grabbing' : 'relative cursor-default'
      } ${isDragging ? 'z-40' : 'z-10 hover:z-30'}`}
    >
      {/* Pushpin at top center - clean natural pin color */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
        <div
          style={{
            backgroundColor: isOverdue ? '#dc2626' : note.pinColor || colorConfig.pinColor,
          }}
          className="w-4 h-4 rounded-full pushpin-head border border-black/20 shadow-xs"
        />
        <div className="w-1 h-2 bg-stone-500/70 -mt-0.5 rounded-b-xs shadow-xs" />
      </div>

      {/* Note Paper Body: Highlighted with priority color border without priority tag */}
      <div
        className={`w-64 sm:w-72 min-h-[165px] p-4 rounded-md flex flex-col justify-between transition-all duration-150 relative overflow-hidden ${
          colorConfig.bg
        } ${
          isOverdue
            ? 'border-2 border-red-500/90 ring-2 ring-red-400/50 shadow-md shadow-red-500/30'
            : priority === 'urgent'
            ? 'border-2 border-rose-500 ring-2 ring-rose-400/40 shadow-md shadow-rose-500/25'
            : priority === 'high'
            ? 'border-2 border-amber-500 ring-2 ring-amber-400/40 shadow-md shadow-amber-500/25'
            : priority === 'medium'
            ? 'border-2 border-blue-400/80 ring-1 ring-blue-400/30'
            : `${colorConfig.border} border ${colorConfig.shadow}`
        } ${
          isDragging ? 'note-paper-shadow-dragging' : 'note-paper-shadow hover:shadow-xl'
        } ${note.completed ? 'opacity-85' : ''}`}
      >
        {/* Note Top Bar: Cadence Badge, Due Date & Action buttons (No priority tag) */}
        <div className="flex items-center justify-between gap-1 mb-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Cadence Badge with Cycle Tooltip */}
            <button
              type="button"
              onClick={handleCycleCadence}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-transform hover:scale-105 cursor-pointer flex items-center gap-1 ${cadenceConfig.bgClass}`}
              title="Click to switch Routine / Weekly / Monthly"
            >
              <span>{cadenceConfig.label}</span>
              <RotateCw className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Deadline / Overdue Badge */}
            {note.dueDate && dueInfo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPickingDate(!isPickingDate);
                }}
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-transform hover:scale-105 cursor-pointer ${
                  isOverdue
                    ? 'bg-red-100/90 text-red-700 border-red-300 font-bold shadow-2xs animate-pulse'
                    : 'bg-black/5 text-stone-700 border-black/15 hover:bg-black/10'
                }`}
                title="Click to change deadline"
              >
                {isOverdue ? (
                  <AlertCircle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                ) : (
                  <Calendar className="w-2.5 h-2.5 text-stone-600 shrink-0" />
                )}
                <span>{isOverdue ? `Overdue: ${dueInfo.label}` : `Due: ${dueInfo.label}`}</span>
              </button>
            )}
          </div>

          {/* Edit, Date & Delete Controls */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPickingDate(!isPickingDate);
              }}
              className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-black/10 transition-colors cursor-pointer"
              title={note.dueDate ? 'Edit deadline' : 'Add deadline'}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditText(note.text);
                setEditDueDate(note.dueDate || '');
                setIsEditing(!isEditing);
              }}
              className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-black/10 transition-colors cursor-pointer"
              title="Edit text"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="p-1 rounded-md text-stone-600 hover:text-red-700 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Delete task note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Quick Date Picker Popover (if clicked from badge or icon) */}
        {isPickingDate && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mb-2 p-2 bg-white/95 rounded-lg border border-stone-300 shadow-lg flex items-center justify-between gap-1.5 text-xs animate-in fade-in"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-600 shrink-0" />
              <input
                type="date"
                defaultValue={note.dueDate || ''}
                onChange={(e) => {
                  onUpdateDueDate?.(note.id, e.target.value || undefined);
                  setIsPickingDate(false);
                }}
                className="text-xs p-1 rounded border border-stone-300 bg-white text-stone-900 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              {note.dueDate && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDueDate?.(note.id, undefined);
                    setIsPickingDate(false);
                  }}
                  className="px-1.5 py-0.5 text-[10px] text-red-600 hover:text-red-800 font-semibold rounded hover:bg-red-50"
                  title="Remove deadline"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPickingDate(false)}
                className="p-0.5 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Note Content Text or Inline Edit Form */}
        <div className="flex-1 my-1">
          {isEditing ? (
            <form
              onSubmit={handleSaveEdit}
              onClick={(e) => e.stopPropagation()}
              className="space-y-2"
            >
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                rows={3}
                className="w-full text-xs sm:text-sm p-1.5 bg-white/80 rounded border border-black/20 text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-medium leading-relaxed"
              />

              {/* Deadline field in edit form */}
              <div className="flex items-center justify-between gap-1.5 bg-white/60 p-1.5 rounded border border-black/10 text-xs">
                <div className="flex items-center gap-1 text-stone-700">
                  <Calendar className="w-3 h-3 text-stone-500" />
                  <span className="text-[10px] font-medium">Deadline:</span>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="text-[11px] px-1 py-0.5 bg-white rounded border border-stone-300 text-stone-900 focus:outline-none"
                  />
                </div>
                {editDueDate && (
                  <button
                    type="button"
                    onClick={() => setEditDueDate('')}
                    className="text-[10px] text-stone-500 hover:text-red-600 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditText(note.text);
                    setEditDueDate(note.dueDate || '');
                    setIsEditing(false);
                  }}
                  className="px-2 py-0.5 text-[10px] rounded bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[10px] rounded bg-stone-900 hover:bg-stone-800 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <p
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditText(note.text);
                setEditDueDate(note.dueDate || '');
                setIsEditing(true);
              }}
              className={`text-sm sm:text-[15px] font-semibold tracking-tight leading-snug break-words ${
                note.completed
                  ? 'line-through text-stone-400 italic'
                  : 'text-stone-800'
              }`}
            >
              {note.text}
            </p>
          )}

          {/* Completed Stamp / Badge */}
          {note.completed && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/15 border border-emerald-600/30 text-emerald-800 text-[10px] font-bold tracking-wider uppercase animate-mark-stamp">
              <CheckCircle2 className="w-3 h-3" />
              <span>Completed</span>
            </div>
          )}
        </div>

        {/* Footer: Date & Done Toggle Icon Button */}
        <div className="pt-2 mt-1 border-t border-black/10 flex items-center justify-between text-[11px] text-stone-500">
          <span className="text-[10px] font-medium opacity-75">
            {note.completed && note.completedAt ? note.completedAt : note.createdAt}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(note.id);
            }}
            title={note.completed ? 'Completed (click to undo)' : 'Mark as completed'}
            aria-label={note.completed ? 'Completed (click to undo)' : 'Mark as completed'}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
              note.completed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 hover:scale-110'
                : 'bg-stone-900/90 hover:bg-black text-stone-300 hover:text-amber-300 border border-stone-700/60 hover:scale-110'
            }`}
          >
            <Check className={`w-4 h-4 ${note.completed ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
