import React from 'react';
import { StickyNoteItem } from './StickyNoteItem';
import { TaskNote, TaskCadence, BoardStyle } from '../types';
import { Calendar, CalendarDays, CalendarRange, Plus } from 'lucide-react';

interface ColumnsBoardProps {
  notes: TaskNote[];
  boardStyle: BoardStyle;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateCadence: (id: string, newCadence: TaskCadence) => void;
  onUpdateText: (id: string, newText: string) => void;
  onQuickAddCadence: (cadence: TaskCadence) => void;
  onUpdateDueDate?: (id: string, newDueDate?: string) => void;
}

export const ColumnsBoard: React.FC<ColumnsBoardProps> = ({
  notes,
  boardStyle,
  onToggleComplete,
  onDelete,
  onUpdateCadence,
  onUpdateText,
  onQuickAddCadence,
  onUpdateDueDate,
}) => {
  const dailyNotes = notes.filter((n) => n.cadence === 'daily' && !n.completed);
  const weeklyNotes = notes.filter((n) => n.cadence === 'weekly' && !n.completed);
  const monthlyNotes = notes.filter((n) => n.cadence === 'monthly' && !n.completed);

  const surfaceClass =
    boardStyle === 'felt'
      ? 'feltboard-surface'
      : boardStyle === 'grid'
      ? 'gridboard-surface'
      : boardStyle === 'darkwood'
      ? 'darkwood-surface'
      : boardStyle === 'chalkboard'
      ? 'chalkboard-surface'
      : 'corkboard-surface';

  const columns: {
    cadence: TaskCadence;
    title: string;
    icon: React.ReactNode;
    headerBg: string;
    headerText: string;
    notes: TaskNote[];
  }[] = [
    {
      cadence: 'daily',
      title: 'Routine Tasks',
      icon: <Calendar className="w-4 h-4 text-sky-600" />,
      headerBg: 'bg-sky-50/90 border-sky-200 text-sky-900',
      headerText: 'Today & Habits',
      notes: dailyNotes,
    },
    {
      cadence: 'weekly',
      title: 'Weekly Goals',
      icon: <CalendarDays className="w-4 h-4 text-emerald-600" />,
      headerBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
      headerText: 'This Week Sprint',
      notes: weeklyNotes,
    },
    {
      cadence: 'monthly',
      title: 'Monthly Plan',
      icon: <CalendarRange className="w-4 h-4 text-purple-600" />,
      headerBg: 'bg-purple-50/90 border-purple-200 text-purple-900',
      headerText: 'Big Milestones',
      notes: monthlyNotes,
    },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[550px] p-4 sm:p-6 overflow-hidden flex flex-col">
      {/* Wood Frame Outer Container */}
      <div
        className={`relative flex-1 w-full rounded-2xl border-[10px] sm:border-[14px] border-[#5c3a21] shadow-2xl overflow-y-auto p-4 sm:p-6 ${surfaceClass}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto h-full items-start">
          {columns.map((col) => (
            <div
              key={col.cadence}
              className="bg-black/15 backdrop-blur-xs rounded-xl p-3 border border-white/20 flex flex-col min-h-[420px]"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg border shadow-xs mb-4 ${col.headerBg}`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white shadow-2xs">{col.icon}</div>
                  <div>
                    <h3 className="text-xs font-bold tracking-tight leading-tight">
                      {col.title}
                    </h3>
                    <span className="text-[10px] opacity-70 font-medium">{col.headerText}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 border text-stone-800">
                    {col.notes.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuickAddCadence(col.cadence)}
                    className="p-1 rounded-md bg-white hover:bg-stone-100 text-stone-700 shadow-2xs transition-colors cursor-pointer"
                    title={`Add new ${col.cadence} note`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column Notes */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {col.notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-stone-700/80 text-center p-4">
                    <p className="text-xs font-semibold">No {col.cadence} tasks</p>
                    <button
                      type="button"
                      onClick={() => onQuickAddCadence(col.cadence)}
                      className="mt-2 text-xs text-amber-900 font-bold hover:underline"
                    >
                      + Add a {col.cadence} task
                    </button>
                  </div>
                ) : (
                  col.notes.map((note) => (
                    <div key={note.id} className="flex justify-center py-1">
                      <StickyNoteItem
                        note={note}
                        isDraggable={false}
                        onToggleComplete={onToggleComplete}
                        onDelete={onDelete}
                        onUpdateCadence={onUpdateCadence}
                        onUpdateText={onUpdateText}
                        onUpdateDueDate={onUpdateDueDate}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
