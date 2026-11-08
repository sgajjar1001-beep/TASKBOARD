import React, { useState } from 'react';
import { Pin, Calendar, X } from 'lucide-react';
import { TaskCadence, NoteColor } from '../types';
import { NOTE_COLOR_MAP } from '../constants';

interface QuickAddBarProps {
  defaultCadence: TaskCadence;
  onAddNote: (text: string, cadence: TaskCadence, color: NoteColor, dueDate?: string) => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  defaultCadence,
  onAddNote,
}) => {
  const [text, setText] = useState('');
  const [cadence, setCadence] = useState<TaskCadence>(defaultCadence);
  const [selectedColor, setSelectedColor] = useState<NoteColor>('yellow');
  const [dueDate, setDueDate] = useState<string>('');

  // Keep cadence synced with active tab if defaultCadence changes
  React.useEffect(() => {
    if (defaultCadence) {
      setCadence(defaultCadence);
    }
  }, [defaultCadence]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddNote(text.trim(), cadence, selectedColor, dueDate || undefined);
    setText('');
    setDueDate('');
  };

  const colors: NoteColor[] = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange'];

  return (
    <div className="bg-stone-900/95 backdrop-blur-md border-b border-stone-800 px-4 sm:px-6 py-2.5 shadow-sm z-20">
      <form
        onSubmit={handleSubmit}
        className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-2.5"
      >
        {/* Main Text Input */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a task to pin... (e.g., Morning workout, Call accountant)"
            className="w-full pl-3.5 pr-4 py-2 bg-stone-950 text-stone-100 placeholder-stone-500 rounded-xl border border-stone-700 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
            maxLength={120}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end w-full sm:w-auto gap-2 shrink-0">
          {/* Cadence Selection (Routine | Weekly | Monthly) */}
          <div className="flex items-center bg-stone-950 p-0.5 rounded-xl border border-stone-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCadence('daily')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                cadence === 'daily'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Routine
            </button>
            <button
              type="button"
              onClick={() => setCadence('weekly')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                cadence === 'weekly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setCadence('monthly')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                cadence === 'monthly'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Optional Date Selector */}
          <div className="flex items-center bg-stone-950 px-2 py-1 rounded-xl border border-stone-800 text-xs gap-1.5">
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${dueDate ? 'text-amber-400' : 'text-stone-500'}`} />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent text-stone-200 text-xs focus:outline-none cursor-pointer [color-scheme:dark] max-w-[115px]"
              title="Set optional deadline"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer transition-colors"
                title="Clear deadline"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Color Dots Picker */}
          <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-xl border border-stone-800">
            {colors.map((col) => {
              const info = NOTE_COLOR_MAP[col];
              const isSelected = selectedColor === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer relative ${info.bg} ${
                    isSelected
                      ? 'scale-125 ring-2 ring-amber-400 shadow-sm'
                      : 'opacity-70 hover:opacity-100 hover:scale-110'
                  }`}
                  title={info.name}
                />
              );
            })}
          </div>

          {/* Pin Button */}
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
          >
            <Pin className="w-3.5 h-3.5 -rotate-45" />
            <span>Pin Task</span>
          </button>
        </div>
      </form>
    </div>
  );
};
