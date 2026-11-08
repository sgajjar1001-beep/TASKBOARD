import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { TaskNote, TaskCadence, BoardStyle } from '../types';
import { ModernTaskCard } from './ModernTaskCard';

interface ModernThreeColumnBoardProps {
  notes: TaskNote[];
  boardStyle: BoardStyle;
  visibleColumns: Record<TaskCadence, boolean>;
  onToggleColumnVisibility: (cadence: TaskCadence) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, newText: string) => void;
  onUpdateDueDate?: (id: string, newDueDate?: string) => void;
  onAddTask: (text: string, cadence: TaskCadence, dueDate?: string) => void;
}

export const ModernThreeColumnBoard: React.FC<ModernThreeColumnBoardProps> = ({
  notes,
  boardStyle,
  visibleColumns,
  onToggleColumnVisibility,
  onToggleComplete,
  onDelete,
  onUpdateText,
  onUpdateDueDate,
  onAddTask,
}) => {
  // Track which column has the inline add input active
  const [activeAddCadence, setActiveAddCadence] = useState<TaskCadence | null>(null);
  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

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

  const handleOpenAdd = (cadence: TaskCadence) => {
    setActiveAddCadence(cadence);
    setNewText('');
    setNewDueDate('');
  };

  const handleCloseAdd = () => {
    setActiveAddCadence(null);
    setNewText('');
    setNewDueDate('');
  };

  const handleSubmitAdd = (cadence: TaskCadence) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    onAddTask(trimmed, cadence, newDueDate || undefined);
    setNewText('');
    setNewDueDate('');
    // Keep input open for consecutive fast adding
  };

  const columnsConfig: {
    cadence: TaskCadence;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accentColor: string;
    badgeBg: string;
  }[] = [
    {
      cadence: 'daily',
      title: 'Routine Tasks',
      subtitle: 'Today & Routines',
      icon: <Calendar className="w-4 h-4 text-sky-400" />,
      accentColor: 'border-sky-500/40 text-sky-400',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      cadence: 'weekly',
      title: 'Weekly Tasks',
      subtitle: 'This Week Focus',
      icon: <CalendarDays className="w-4 h-4 text-emerald-400" />,
      accentColor: 'border-emerald-500/40 text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      cadence: 'monthly',
      title: 'Monthly Tasks',
      subtitle: 'Milestones & Goals',
      icon: <CalendarRange className="w-4 h-4 text-purple-400" />,
      accentColor: 'border-purple-500/40 text-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  ];

  const visibleList = columnsConfig.filter((col) => visibleColumns[col.cadence]);
  const visibleCount = visibleList.length;

  const gridColsClass =
    visibleCount === 3
      ? 'grid-cols-1 lg:grid-cols-3'
      : visibleCount === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 max-w-2xl mx-auto';

  return (
    <div className="relative w-full flex-1 p-3 sm:p-5 flex flex-col overflow-hidden">
      {/* Surface Frame Container */}
      <div
        className={`relative flex-1 w-full rounded-2xl border-[8px] sm:border-[12px] border-[#3e2413] shadow-2xl overflow-y-auto p-3 sm:p-5 transition-colors ${surfaceClass}`}
      >
        {/* If all columns are hidden */}
        {visibleCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 max-w-md mx-auto text-center bg-stone-900/90 border border-stone-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <EyeOff className="w-10 h-10 text-stone-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">All columns are hidden</h3>
            <p className="text-xs text-stone-400 mb-4">
              Use the top buttons or click below to unhide your task columns.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {columnsConfig.map((col) => (
                <button
                  key={col.cadence}
                  type="button"
                  onClick={() => onToggleColumnVisibility(col.cadence)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Unhide {col.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Columns Grid */
          <div className={`grid ${gridColsClass} gap-4 sm:gap-6 h-full items-start max-w-7xl mx-auto`}>
            {visibleList.map((col) => {
              const colNotes = notes.filter((n) => n.cadence === col.cadence);
              const completedCount = colNotes.filter((n) => n.completed).length;
              const isAddOpen = activeAddCadence === col.cadence;

              return (
                <div
                  key={col.cadence}
                  className="bg-stone-950/75 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg flex flex-col min-h-[460px] max-h-[calc(100vh-140px)] transition-all"
                >
                  {/* Column Header: Title, Counts, Add Task Icon & Hide Column Icon */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-stone-900 border border-stone-700 shadow-2xs">
                        {col.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-white tracking-tight">
                            {col.title}
                          </h2>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.2 rounded-full border ${col.badgeBg}`}
                          >
                            {colNotes.length}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400 block font-medium">
                          {col.subtitle}
                        </span>
                      </div>
                    </div>

                    {/* Top Action Icons: Add Task (+) and Hide Column (EyeOff) */}
                    <div className="flex items-center gap-1.5">
                      {/* Add Task Icon Button */}
                      <button
                        type="button"
                        onClick={() => (isAddOpen ? handleCloseAdd() : handleOpenAdd(col.cadence))}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs ${
                          isAddOpen
                            ? 'bg-stone-800 text-stone-300 hover:text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:scale-105'
                        }`}
                        title={isAddOpen ? 'Close input' : `Add task to ${col.title}`}
                      >
                        {isAddOpen ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span className="hidden sm:inline pr-1">Add</span>
                          </>
                        )}
                      </button>

                      {/* Hide Column Icon Button */}
                      <button
                        type="button"
                        onClick={() => onToggleColumnVisibility(col.cadence)}
                        className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700/80 transition-colors cursor-pointer"
                        title={`Hide ${col.title}`}
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Task Creator Form at the top of column */}
                  {isAddOpen && (
                    <div className="mb-3.5 p-3 rounded-xl bg-stone-900/95 border border-amber-500/70 shadow-md space-y-2.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmitAdd(col.cadence);
                          } else if (e.key === 'Escape') {
                            handleCloseAdd();
                          }
                        }}
                        placeholder={`What needs to be done in ${col.title.toLowerCase()}?`}
                        className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {/* Optional Due Date */}
                        <div className="flex items-center gap-1.5 text-xs text-stone-400">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <input
                            type="date"
                            value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)}
                            className="text-xs px-2 py-0.5 rounded bg-stone-950 border border-stone-700 text-stone-200 focus:outline-none"
                          />
                          {newDueDate && (
                            <button
                              type="button"
                              onClick={() => setNewDueDate('')}
                              className="text-[10px] text-stone-500 hover:text-red-400 ml-0.5"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCloseAdd}
                            className="px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!newText.trim()}
                            onClick={() => handleSubmitAdd(col.cadence)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                          >
                            Add Task
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks List Container */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
                    {colNotes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-stone-400 text-center p-4 border border-dashed border-stone-800 rounded-xl my-2">
                        <Sparkles className="w-6 h-6 text-stone-600 mb-1.5" />
                        <p className="text-xs font-semibold text-stone-300">No {col.title.toLowerCase()} yet</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">Click + at the top to write your first task</p>
                        <button
                          type="button"
                          onClick={() => handleOpenAdd(col.cadence)}
                          className="mt-3 px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs border border-stone-700 transition-colors cursor-pointer"
                        >
                          + Add Task
                        </button>
                      </div>
                    ) : (
                      colNotes.map((note) => (
                        <ModernTaskCard
                          key={note.id}
                          note={note}
                          onToggleComplete={onToggleComplete}
                          onDelete={onDelete}
                          onUpdateText={onUpdateText}
                          onUpdateDueDate={onUpdateDueDate}
                        />
                      ))
                    )}
                  </div>

                  {/* Column Footer: Progress */}
                  {colNotes.length > 0 && (
                    <div className="pt-3 mt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          {completedCount} of {colNotes.length} completed
                        </span>
                      </div>
                      {completedCount === colNotes.length && colNotes.length > 0 && (
                        <span className="text-emerald-400 font-semibold">All done! 🎉</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
