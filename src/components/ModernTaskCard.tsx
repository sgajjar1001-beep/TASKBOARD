import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Calendar, AlertCircle, Clock } from 'lucide-react';
import { TaskNote } from '../types';
import { isDateOverdue, formatDueDate } from '../utils/date';
import { NOTE_COLOR_MAP } from '../constants';

interface ModernTaskCardProps {
  note: TaskNote;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, newText: string) => void;
  onUpdateDueDate?: (id: string, newDueDate?: string) => void;
}

export const ModernTaskCard: React.FC<ModernTaskCardProps> = ({
  note,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onUpdateDueDate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const [editDueDate, setEditDueDate] = useState(note.dueDate || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const isOverdue = Boolean(note.dueDate && !note.completed && isDateOverdue(note.dueDate));
  const dueInfo = note.dueDate ? formatDueDate(note.dueDate) : null;
  const colorConfig = NOTE_COLOR_MAP[note.color] || NOTE_COLOR_MAP.yellow;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== note.text) {
      onUpdateText(note.id, trimmed);
    } else {
      setEditText(note.text);
    }
    if (onUpdateDueDate && editDueDate !== (note.dueDate || '')) {
      onUpdateDueDate(note.id, editDueDate || undefined);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(note.text);
      setEditDueDate(note.dueDate || '');
      setIsEditing(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isEditing) {
          setEditText(note.text);
          setEditDueDate(note.dueDate || '');
          setIsEditing(true);
        }
      }}
      className={`group relative rounded-xl p-3.5 transition-all duration-200 cursor-pointer ${
        note.completed
          ? 'bg-stone-900/60 border border-stone-800/80 opacity-75'
          : isOverdue
          ? 'bg-stone-900/90 border-2 border-red-500/70 shadow-md shadow-red-950/30 hover:border-red-400'
          : 'bg-stone-900/90 hover:bg-stone-850 border border-stone-700/70 hover:border-amber-500/50 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Subtle color dot/accent at top left corner */}
      <div
        className="absolute top-3 left-2.5 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: note.pinColor || colorConfig.pinColor }}
      />

      {/* Editing Mode */}
      {isEditing ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="space-y-2.5"
        >
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-amber-500/80 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            placeholder="Task description..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="text-xs px-1.5 py-0.5 rounded bg-stone-950 border border-stone-700 text-stone-200 focus:outline-none"
              />
              {editDueDate && (
                <button
                  type="button"
                  onClick={() => setEditDueDate('')}
                  className="text-[10px] text-stone-500 hover:text-red-400 ml-0.5"
                  title="Remove deadline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEditText(note.text);
                  setEditDueDate(note.dueDate || '');
                  setIsEditing(false);
                }}
                className="px-2.5 py-1 rounded-md text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Normal View Mode */
        <div className="flex items-start gap-3">
          {/* Checkbox for completing the task */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(note.id);
            }}
            className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              note.completed
                ? 'bg-emerald-500 border-emerald-500 text-stone-950 shadow-2xs'
                : 'border-stone-500 hover:border-amber-400 bg-stone-950/60 hover:bg-amber-500/10'
            }`}
            title={note.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {note.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm leading-snug font-medium break-words transition-colors ${
                note.completed
                  ? 'line-through text-stone-400'
                  : 'text-stone-100 group-hover:text-amber-100'
              }`}
            >
              {note.text}
            </p>

            {/* Badges: Due Date & Overdue */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {note.dueDate && dueInfo && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    isOverdue
                      ? 'bg-red-950/70 border-red-700/60 text-red-300 animate-pulse'
                      : note.completed
                      ? 'bg-stone-800/60 border-stone-700/50 text-stone-400'
                      : 'bg-stone-800/80 border-stone-700 text-stone-300'
                  }`}
                >
                  {isOverdue ? (
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                  )}
                  <span>{isOverdue ? `Overdue: ${dueInfo.label}` : `Due: ${dueInfo.label}`}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action on Hover: Delete Task */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-all cursor-pointer shrink-0"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
