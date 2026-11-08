import React, { useState, useRef, useEffect } from 'react';
import { StickyNoteItem } from './StickyNoteItem';
import { TaskNote, TaskCadence, BoardStyle } from '../types';
import { Pin, Sparkles } from 'lucide-react';

interface FreeformBoardProps {
  notes: TaskNote[];
  boardStyle: BoardStyle;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateCadence: (id: string, newCadence: TaskCadence) => void;
  onUpdateText: (id: string, newText: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateDueDate?: (id: string, newDueDate?: string) => void;
}

export const FreeformBoard: React.FC<FreeformBoardProps> = ({
  notes,
  boardStyle,
  onToggleComplete,
  onDelete,
  onUpdateCadence,
  onUpdateText,
  onUpdatePosition,
  onUpdateDueDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle Dragging
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, note: TaskNote) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentPixelX = (note.x / 100) * rect.width;
    const currentPixelY = (note.y / 100) * rect.height;

    setDragOffset({
      x: clientX - rect.left - currentPixelX,
      y: clientY - rect.top - currentPixelY,
    });
    setDraggingId(note.id);
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current || !draggingId) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      let newPixelX = clientX - rect.left - dragOffset.x;
      let newPixelY = clientY - rect.top - dragOffset.y;

      // Note size approx 288px width, 180px height
      const maxX = rect.width - 290;
      const maxY = rect.height - 180;

      newPixelX = Math.max(10, Math.min(newPixelX, Math.max(10, maxX)));
      newPixelY = Math.max(15, Math.min(newPixelY, Math.max(15, maxY)));

      const percentX = Math.round((newPixelX / rect.width) * 100);
      const percentY = Math.round((newPixelY / rect.height) * 100);

      onUpdatePosition(draggingId, percentX, percentY);
    };

    const handleEnd = () => {
      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [draggingId, dragOffset, onUpdatePosition]);

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

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[550px] p-4 sm:p-6 overflow-hidden flex flex-col">
      {/* Wood Frame Border Outer Container */}
      <div
        ref={containerRef}
        className={`relative flex-1 w-full rounded-2xl border-[10px] sm:border-[14px] border-[#5c3a21] shadow-2xl overflow-hidden ${surfaceClass}`}
      >
        {/* Decorative corner metallic brackets for frame realism */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-900/40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-900/40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-900/40 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-900/40 pointer-events-none" />

        {/* Empty State message if board has no notes */}
        {notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-stone-700/80 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-black/10 backdrop-blur-xs flex items-center justify-center mb-3">
              <Pin className="w-8 h-8 -rotate-45 text-stone-800" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Your Pinboard is Clear!</h3>
            <p className="text-xs sm:text-sm text-stone-800 max-w-sm mt-1">
              Type a task in the bar above and click "Pin Task" to pin your daily, weekly, or monthly to-dos here.
            </p>
          </div>
        )}

        {/* Render sticky notes */}
        {notes.map((note) => (
          <StickyNoteItem
            key={note.id}
            note={note}
            isDraggable
            isDragging={draggingId === note.id}
            onMouseDown={(e) => handleStartDrag(e, note)}
            onTouchStart={(e) => handleStartDrag(e, note)}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onUpdateCadence={onUpdateCadence}
            onUpdateText={onUpdateText}
            onUpdateDueDate={onUpdateDueDate}
          />
        ))}

        {/* Subtle bottom info badge */}
        <div className="absolute bottom-3 right-4 pointer-events-none hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-xs text-[11px] font-medium text-stone-800">
          <Sparkles className="w-3 h-3" />
          <span>Drag notes anywhere • Click badge to cycle Routine/Weekly/Monthly</span>
        </div>
      </div>
    </div>
  );
};
