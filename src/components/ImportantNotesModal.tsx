import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Pin,
  Trash2,
  Copy,
  Check,
  StickyNote,
  Clock,
  Menu,
  ChevronLeft,
  CheckSquare,
  Square,
  ListTodo,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ImportantNote, NoteChecklistItem, NoteColor } from '../types';
import { playTaskCompleteSound, playClickSound } from '../utils/sound';

interface ImportantNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ImportantNote[];
  onSaveNotes: (notes: ImportantNote[]) => void;
  muted?: boolean;
}

// Authentic Windows 10 & 11 Sticky Notes color scheme
const WINDOWS_STICKY_COLORS: Record<
  NoteColor,
  {
    name: string;
    headerBg: string;
    bodyBg: string;
    border: string;
    text: string;
    placeholder: string;
    dot: string;
    activeRing: string;
    pillBg: string;
    pillText: string;
    progressBg: string;
  }
> = {
  yellow: {
    name: 'Yellow',
    headerBg: 'bg-[#fff59d] border-[#fff176]',
    bodyBg: 'bg-[#fffde7]',
    border: 'border-[#fff176]',
    text: 'text-[#212121]',
    placeholder: 'placeholder-[#757575]',
    dot: 'bg-[#fbc02d]',
    activeRing: 'ring-[#fbc02d]',
    pillBg: 'bg-[#fff59d]/80',
    pillText: 'text-[#5d4037]',
    progressBg: 'bg-[#fbc02d]',
  },
  green: {
    name: 'Green',
    headerBg: 'bg-[#c8e6c9] border-[#a5d6a7]',
    bodyBg: 'bg-[#e8f5e9]',
    border: 'border-[#a5d6a7]',
    text: 'text-[#1b5e20]',
    placeholder: 'placeholder-[#2e7d32]/70',
    dot: 'bg-[#4caf50]',
    activeRing: 'ring-[#4caf50]',
    pillBg: 'bg-[#c8e6c9]/80',
    pillText: 'text-[#1b5e20]',
    progressBg: 'bg-[#4caf50]',
  },
  pink: {
    name: 'Pink',
    headerBg: 'bg-[#f8bbd0] border-[#f48fb1]',
    bodyBg: 'bg-[#fce4ec]',
    border: 'border-[#f48fb1]',
    text: 'text-[#880e4f]',
    placeholder: 'placeholder-[#ad1457]/70',
    dot: 'bg-[#e91e63]',
    activeRing: 'ring-[#e91e63]',
    pillBg: 'bg-[#f8bbd0]/80',
    pillText: 'text-[#880e4f]',
    progressBg: 'bg-[#e91e63]',
  },
  purple: {
    name: 'Purple',
    headerBg: 'bg-[#e1bee7] border-[#ce93d8]',
    bodyBg: 'bg-[#f3e5f5]',
    border: 'border-[#ce93d8]',
    text: 'text-[#4a148c]',
    placeholder: 'placeholder-[#6a1b9a]/70',
    dot: 'bg-[#9c27b0]',
    activeRing: 'ring-[#9c27b0]',
    pillBg: 'bg-[#e1bee7]/80',
    pillText: 'text-[#4a148c]',
    progressBg: 'bg-[#9c27b0]',
  },
  blue: {
    name: 'Blue',
    headerBg: 'bg-[#bbdefb] border-[#90caf9]',
    bodyBg: 'bg-[#e3f2fd]',
    border: 'border-[#90caf9]',
    text: 'text-[#0d47a1]',
    placeholder: 'placeholder-[#1565c0]/70',
    dot: 'bg-[#2196f3]',
    activeRing: 'ring-[#2196f3]',
    pillBg: 'bg-[#bbdefb]/80',
    pillText: 'text-[#0d47a1]',
    progressBg: 'bg-[#2196f3]',
  },
  orange: {
    name: 'Peach',
    headerBg: 'bg-[#ffe0b2] border-[#ffcc80]',
    bodyBg: 'bg-[#fff3e0]',
    border: 'border-[#ffcc80]',
    text: 'text-[#e65100]',
    placeholder: 'placeholder-[#ef6c00]/70',
    dot: 'bg-[#ff9800]',
    activeRing: 'ring-[#ff9800]',
    pillBg: 'bg-[#ffe0b2]/80',
    pillText: 'text-[#e65100]',
    progressBg: 'bg-[#ff9800]',
  },
};

type NoteTabMode = 'checklist' | 'text' | 'both';

export const ImportantNotesModal: React.FC<ImportantNotesModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSaveNotes,
  muted = false,
}) => {
  // View mode: 'note' (single Windows Sticky Note view) or 'list' (all notes gallery)
  const [viewMode, setViewMode] = useState<'note' | 'list'>('note');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [activeTabMode, setActiveTabMode] = useState<NoteTabMode>('checklist');

  // Sync active note on open
  useEffect(() => {
    if (isOpen) {
      if (notes.length > 0) {
        if (!selectedNoteId || !notes.find((n) => n.id === selectedNoteId)) {
          setSelectedNoteId(notes[0].id);
        }
      } else {
        setSelectedNoteId(null);
      }
      setCopied(false);
      setNewChecklistText('');
    }
  }, [isOpen, notes, selectedNoteId]);

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || notes[0] || null;
  }, [notes, selectedNoteId]);

  // Filter notes for the list view
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const inTitle = n.title.toLowerCase().includes(q);
        const inContent = n.content.toLowerCase().includes(q);
        const inChecklist = (n.checklist || []).some((item) =>
          item.text.toLowerCase().includes(q)
        );
        return inTitle || inContent || inChecklist;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, searchQuery]);

  const handleCreateNewNote = (color: NoteColor = 'yellow') => {
    const now = new Date();
    const formattedDate =
      now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + `, ` + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newNote: ImportantNote = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      checklist: [],
      color,
      isPinned: false,
      createdAt: formattedDate,
      updatedAt: formattedDate,
    };

    const updated = [newNote, ...notes];
    onSaveNotes(updated);
    setSelectedNoteId(newNote.id);
    setViewMode('note');
    setActiveTabMode('checklist');
  };

  const handleUpdateActiveNote = (updates: Partial<ImportantNote>) => {
    if (!activeNote) return;
    const now = new Date();
    const formattedDate =
      now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + `, ` + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updated = notes.map((n) => {
      if (n.id === activeNote.id) {
        return {
          ...n,
          ...updates,
          updatedAt: formattedDate,
        };
      }
      return n;
    });

    onSaveNotes(updated);
  };

  // Add a new checklist task to the active note
  const handleAddChecklistItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChecklistText.trim() || !activeNote) return;

    const newItem: NoteChecklistItem = {
      id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: newChecklistText.trim(),
      completed: false,
    };

    const currentList = activeNote.checklist || [];
    handleUpdateActiveNote({
      checklist: [...currentList, newItem],
    });

    setNewChecklistText('');
  };

  // Toggle completion of a checklist item
  const handleToggleChecklistItem = (itemId: string) => {
    if (!activeNote) return;
    const currentList = activeNote.checklist || [];
    let isNowCompleted = false;

    const updatedList = currentList.map((item) => {
      if (item.id === itemId) {
        const nextState = !item.completed;
        if (nextState) isNowCompleted = true;
        return { ...item, completed: nextState };
      }
      return item;
    });

    if (isNowCompleted) {
      playTaskCompleteSound(muted);
    } else {
      playClickSound(muted);
    }

    handleUpdateActiveNote({ checklist: updatedList });
  };

  // Update text of an existing checklist item
  const handleUpdateChecklistItemText = (itemId: string, newText: string) => {
    if (!activeNote) return;
    const currentList = activeNote.checklist || [];
    const updatedList = currentList.map((item) => {
      if (item.id === itemId) {
        return { ...item, text: newText };
      }
      return item;
    });
    handleUpdateActiveNote({ checklist: updatedList });
  };

  // Delete a checklist item
  const handleDeleteChecklistItem = (itemId: string) => {
    if (!activeNote) return;
    const currentList = activeNote.checklist || [];
    handleUpdateActiveNote({
      checklist: currentList.filter((item) => item.id !== itemId),
    });
  };

  // Clear completed checklist tasks
  const handleClearCompletedChecklist = () => {
    if (!activeNote) return;
    const currentList = activeNote.checklist || [];
    handleUpdateActiveNote({
      checklist: currentList.filter((item) => !item.completed),
    });
  };

  // Convert content lines into checklist items
  const handleConvertLinesToChecklist = () => {
    if (!activeNote || !activeNote.content.trim()) return;
    const lines = activeNote.content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const newItems: NoteChecklistItem[] = lines.map((line, idx) => ({
      id: `check-conv-${Date.now()}-${idx}`,
      text: line.replace(/^[-*•]\s*/, ''), // strip bullet points
      completed: false,
    }));

    const currentList = activeNote.checklist || [];
    handleUpdateActiveNote({
      checklist: [...currentList, ...newItems],
    });
    setActiveTabMode('checklist');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    onSaveNotes(updated);
    if (selectedNoteId === id) {
      const nextNote = updated[0];
      setSelectedNoteId(nextNote ? nextNote.id : null);
      if (!nextNote) {
        setViewMode('list');
      }
    }
  };

  const handleCopyNote = () => {
    if (!activeNote) return;
    const checklistText = (activeNote.checklist || [])
      .map((item) => `${item.completed ? '[x]' : '[ ]'} ${item.text}`)
      .join('\n');

    const sections = [];
    if (activeNote.title) sections.push(activeNote.title);
    if (checklistText) sections.push(`Checklist:\n${checklistText}`);
    if (activeNote.content) sections.push(`Notes:\n${activeNote.content}`);

    const textToCopy = sections.join('\n\n').trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const activeColorConfig =
    activeNote && activeNote.color
      ? WINDOWS_STICKY_COLORS[activeNote.color] || WINDOWS_STICKY_COLORS.yellow
      : WINDOWS_STICKY_COLORS.yellow;

  // Active note checklist metrics
  const activeChecklist = activeNote?.checklist || [];
  const completedChecklistCount = activeChecklist.filter((i) => i.completed).length;
  const totalChecklistCount = activeChecklist.length;
  const checklistProgressPercent =
    totalChecklistCount > 0
      ? Math.round((completedChecklistCount / totalChecklistCount) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* VIEW 1: SINGLE WINDOWS STICKY NOTE WITH CHECKLIST SUPPORT */}
        {viewMode === 'note' && activeNote ? (
          <div
            className={`w-full rounded-2xl shadow-2xl overflow-hidden border ${activeColorConfig.border} ${activeColorConfig.bodyBg} flex flex-col h-[560px] max-h-[88vh] animate-in zoom-in-95 duration-150 select-text`}
          >
            {/* Windows Sticky Note Top Titlebar */}
            <div
              className={`px-3 py-2 border-b flex items-center justify-between shrink-0 select-none ${activeColorConfig.headerBg}`}
            >
              {/* Left: + New Note & All Notes Hub icon */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCreateNewNote(activeNote.color || 'yellow')}
                  className="p-1.5 rounded-lg hover:bg-black/10 active:scale-95 text-[#212121] transition-all cursor-pointer flex items-center gap-1"
                  title="New note (+)"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-2 py-1 rounded-lg hover:bg-black/10 active:scale-95 text-xs font-semibold text-[#212121] transition-all cursor-pointer flex items-center gap-1.5"
                  title="View all sticky notes (Notes list)"
                >
                  <Menu className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-sans">Notes ({notes.length})</span>
                </button>
              </div>

              {/* Right: Color Dots, Pin, Copy, Delete, Close */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Windows Sticky Notes Pastel Color Dots */}
                <div className="flex items-center gap-1 bg-black/5 px-1.5 py-1 rounded-full">
                  {(Object.keys(WINDOWS_STICKY_COLORS) as NoteColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateActiveNote({ color: c })}
                      className={`w-3.5 h-3.5 rounded-full ${WINDOWS_STICKY_COLORS[c].dot} transition-transform cursor-pointer ${
                        activeNote.color === c
                          ? 'ring-2 ring-offset-1 ring-black/70 scale-125'
                          : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      title={WINDOWS_STICKY_COLORS[c].name}
                    />
                  ))}
                </div>

                {/* Pin toggle */}
                <button
                  type="button"
                  onClick={() => handleUpdateActiveNote({ isPinned: !activeNote.isPinned })}
                  className={`p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer ${
                    activeNote.isPinned ? 'text-amber-800' : 'text-[#424242]'
                  }`}
                  title={activeNote.isPinned ? 'Unpin note' : 'Pin note to top'}
                >
                  <Pin className={`w-3.5 h-3.5 ${activeNote.isPinned ? 'fill-amber-700' : ''}`} />
                </button>

                {/* Copy content */}
                <button
                  type="button"
                  onClick={handleCopyNote}
                  className="p-1.5 rounded-lg hover:bg-black/10 text-[#424242] transition-colors cursor-pointer"
                  title="Copy note text and tasks"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteNote(activeNote.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-[#424242] hover:text-red-700 transition-colors cursor-pointer"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Close window */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-black/10 text-[#424242] hover:text-black transition-colors cursor-pointer ml-0.5"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Content Area */}
            <div className="flex-1 p-3.5 sm:p-4 flex flex-col overflow-hidden">
              {/* Optional Title / Subject line */}
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black/5">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                  placeholder="Note Title / Topic (e.g. Printer Readings, Office Tasks)..."
                  className={`w-full text-base font-bold bg-transparent border-none focus:outline-none ${activeColorConfig.text} ${activeColorConfig.placeholder}`}
                />
              </div>

              {/* View Switcher Tabs: Checklist Tasks vs Text Notes vs Both */}
              <div className="flex items-center justify-between gap-1.5 mb-3 bg-black/5 p-1 rounded-xl shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTabMode('checklist')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTabMode === 'checklist'
                        ? 'bg-white shadow-xs text-[#202124]'
                        : 'text-[#5f6368] hover:text-[#202124]'
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                    <span>Checklist Tasks</span>
                    {totalChecklistCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono">
                        {completedChecklistCount}/{totalChecklistCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabMode('text')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTabMode === 'text'
                        ? 'bg-white shadow-xs text-[#202124]'
                        : 'text-[#5f6368] hover:text-[#202124]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Text Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabMode('both')}
                    className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTabMode === 'both'
                        ? 'bg-white shadow-xs text-[#202124]'
                        : 'text-[#5f6368] hover:text-[#202124]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Both</span>
                  </button>
                </div>

                {/* Fast conversion button if text exists but checklist is empty */}
                {activeNote.content.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleConvertLinesToChecklist}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white/60 hover:bg-white px-2 py-0.8 rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    title="Convert text lines into checklist items"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span className="hidden md:inline">Lines to Tasks</span>
                  </button>
                )}
              </div>

              {/* Main Body Scrolling Container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {/* 1. CHECKLIST TASKS SECTION */}
                {(activeTabMode === 'checklist' || activeTabMode === 'both') && (
                  <div className="space-y-2.5">
                    {/* Add New Checklist Task Input Form */}
                    <form
                      onSubmit={handleAddChecklistItem}
                      className="flex items-center gap-2 bg-white/70 hover:bg-white focus-within:bg-white border border-black/10 focus-within:border-blue-500 rounded-xl px-2.5 py-1.5 shadow-2xs transition-all"
                    >
                      <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                      <input
                        type="text"
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        placeholder="Add extra regular work task / item... (Press Enter)"
                        className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-none text-[#202124] placeholder-[#757575] font-medium"
                      />
                      <button
                        type="submit"
                        disabled={!newChecklistText.trim()}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                      >
                        Add Task
                      </button>
                    </form>

                    {/* Progress Bar (if items exist) */}
                    {totalChecklistCount > 0 && (
                      <div className="flex items-center justify-between text-[11px] px-1 py-0.5">
                        <div className="flex items-center gap-2 text-[#424242] font-medium">
                          <span>
                            Progress: <strong>{completedChecklistCount}/{totalChecklistCount}</strong> done ({checklistProgressPercent}%)
                          </span>
                          {completedChecklistCount === totalChecklistCount && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                              All done! 🎉
                            </span>
                          )}
                        </div>

                        {completedChecklistCount > 0 && (
                          <button
                            type="button"
                            onClick={handleClearCompletedChecklist}
                            className="text-[10px] text-red-600 hover:text-red-800 font-medium underline cursor-pointer"
                          >
                            Clear completed
                          </button>
                        )}
                      </div>
                    )}

                    {/* Checklist Task Items */}
                    {activeChecklist.length === 0 ? (
                      <div className="p-4 text-center rounded-xl border border-dashed border-black/15 bg-black/5 text-[#5f6368]">
                        <ListTodo className="w-6 h-6 mx-auto mb-1 text-[#80868b]" />
                        <p className="text-xs font-medium">
                          No extra tasks in this note yet.
                        </p>
                        <p className="text-[11px] opacity-75 mt-0.5">
                          Type above and press Enter to add regular work tasks or checklist items!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {activeChecklist.map((item) => (
                          <div
                            key={item.id}
                            className={`group flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition-all border ${
                              item.completed
                                ? 'bg-black/5 border-transparent opacity-75'
                                : 'bg-white/80 hover:bg-white border-black/10 shadow-2xs'
                            }`}
                          >
                            {/* Checkbox Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleChecklistItem(item.id)}
                              className="mt-0.5 text-[#202124] hover:scale-115 active:scale-95 transition-transform cursor-pointer shrink-0"
                              title={item.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {item.completed ? (
                                <CheckSquare className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#5f6368] hover:text-[#202124]" />
                              )}
                            </button>

                            {/* Editable Task Text */}
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) =>
                                handleUpdateChecklistItemText(item.id, e.target.value)
                              }
                              className={`flex-1 text-xs sm:text-sm bg-transparent border-none focus:outline-none font-medium leading-relaxed ${
                                item.completed
                                  ? 'line-through text-[#616161]'
                                  : activeColorConfig.text
                              }`}
                            />

                            {/* Delete Item Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#757575] hover:text-red-700 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                              title="Delete task item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. TEXT NOTES SECTION */}
                {(activeTabMode === 'text' || activeTabMode === 'both') && (
                  <div className="flex flex-col h-full space-y-1 pt-1">
                    {activeTabMode === 'both' && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5f6368] px-1">
                        Freeform Remarks & Reference Details
                      </span>
                    )}
                    <textarea
                      value={activeNote.content}
                      onChange={(e) => handleUpdateActiveNote({ content: e.target.value })}
                      placeholder="Take a note...
(Type any reference details, machine numbers, instructions or phone numbers here. Everything is auto-saved)"
                      className={`w-full min-h-[140px] flex-1 resize-none bg-white/60 focus:bg-white p-3 rounded-xl border border-black/10 focus:border-blue-500 focus:outline-none text-xs sm:text-sm leading-relaxed font-sans ${activeColorConfig.text} ${activeColorConfig.placeholder}`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Note Bottom Bar */}
            <div
              className={`px-4 py-2 border-t text-[11px] flex items-center justify-between select-none ${activeColorConfig.headerBg} border-black/5 opacity-85`}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-[10px] text-[#424242]">
                  <Clock className="w-3 h-3" />
                  <span>{activeNote.updatedAt || activeNote.createdAt}</span>
                </span>

                {totalChecklistCount > 0 && (
                  <span className="text-[10px] font-semibold text-[#424242] flex items-center gap-1">
                    <ListTodo className="w-3 h-3 text-blue-700" />
                    <span>{completedChecklistCount}/{totalChecklistCount} tasks completed</span>
                  </span>
                )}
              </div>

              <span className="font-semibold text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Saved</span>
              </span>
            </div>
          </div>
        ) : (
          /* VIEW 2: WINDOWS STICKY NOTES LIST HUB (ALL NOTES GALLERY) */
          <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#dadce0] flex flex-col h-[560px] max-h-[85vh] text-[#202124] animate-in zoom-in-95 duration-150">
            {/* Hub Header */}
            <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#202124] leading-tight">Sticky Notes & Tasks</h3>
                  <span className="text-[11px] text-[#5f6368]">{notes.length} notes & extra checklists</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeNote && (
                  <button
                    type="button"
                    onClick={() => setViewMode('note')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#3c4043] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Note</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCreateNewNote('yellow')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Note</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-[#dadce0] bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes and extra checklist tasks..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#f8f9fa] border border-[#dadce0] rounded-lg text-xs text-[#202124] placeholder-[#5f6368] focus:outline-none focus:border-[#1a73e8] focus:bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sticky Notes Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#f1f3f4]">
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-[#5f6368] space-y-2">
                  <StickyNote className="w-8 h-8 text-[#dadce0]" />
                  <p className="text-xs">No notes or tasks found.</p>
                  <button
                    type="button"
                    onClick={() => handleCreateNewNote('yellow')}
                    className="text-xs text-[#1a73e8] font-bold hover:underline cursor-pointer"
                  >
                    + Create a new sticky note
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredNotes.map((note) => {
                    const colorConfig =
                      WINDOWS_STICKY_COLORS[note.color || 'yellow'] ||
                      WINDOWS_STICKY_COLORS.yellow;

                    const noteChecklist = note.checklist || [];
                    const doneCount = noteChecklist.filter((i) => i.completed).length;

                    return (
                      <div
                        key={note.id}
                        onClick={() => {
                          setSelectedNoteId(note.id);
                          setViewMode('note');
                        }}
                        className={`rounded-xl border ${colorConfig.border} ${colorConfig.bodyBg} p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all cursor-pointer relative group min-h-[170px]`}
                      >
                        {/* Top bar of card */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <h4 className={`text-xs font-bold truncate ${colorConfig.text}`}>
                              {note.title.trim() || 'Untitled Note'}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              {noteChecklist.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/70 font-mono font-bold text-[#37474f] border border-black/5 flex items-center gap-1">
                                  <CheckSquare className="w-2.5 h-2.5 text-blue-600" />
                                  <span>{doneCount}/{noteChecklist.length}</span>
                                </span>
                              )}
                              {note.isPinned && (
                                <Pin className="w-3 h-3 text-amber-700 fill-amber-700 shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Checklist preview on card */}
                          {noteChecklist.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {noteChecklist.slice(0, 2).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-1.5 text-[11px] text-[#424242]"
                                >
                                  {item.completed ? (
                                    <CheckSquare className="w-3 h-3 text-emerald-700 shrink-0" />
                                  ) : (
                                    <Square className="w-3 h-3 text-[#757575] shrink-0" />
                                  )}
                                  <span
                                    className={`truncate ${
                                      item.completed ? 'line-through opacity-60' : ''
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                              {noteChecklist.length > 2 && (
                                <span className="text-[10px] text-[#616161] font-semibold pl-4">
                                  +{noteChecklist.length - 2} more tasks...
                                </span>
                              )}
                            </div>
                          )}

                          {/* Free text preview */}
                          {note.content.trim() && (
                            <p
                              className={`text-xs line-clamp-2 leading-relaxed break-words ${colorConfig.text} opacity-90`}
                            >
                              {note.content.trim()}
                            </p>
                          )}

                          {!note.content.trim() && noteChecklist.length === 0 && (
                            <p className="text-xs italic opacity-50">Empty note...</p>
                          )}
                        </div>

                        {/* Bottom date and delete */}
                        <div className="flex items-center justify-between text-[10px] text-[#616161] pt-2 border-t border-black/5 mt-2">
                          <span className="truncate">{note.updatedAt || note.createdAt}</span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="p-1 rounded text-red-600 hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
