import React from 'react';
import { X, Keyboard, Command, CornerDownLeft } from 'lucide-react';
import { BoardStyle } from '../types';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardStyle: BoardStyle;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  boardStyle,
}) => {
  if (!isOpen) return null;

  const isChrome = boardStyle === 'chrome_light';
  const isDark = boardStyle === 'modern_dark' || boardStyle === 'modern_aurora' || boardStyle === 'office_slate';

  const modalBg =
    boardStyle === 'chrome_light'
      ? 'bg-white border-[#dadce0] text-[#202124] shadow-2xl'
      : boardStyle === 'modern_dark'
      ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-2xl shadow-black/80'
      : boardStyle === 'modern_aurora'
      ? 'bg-[#0f1123] border-purple-800/60 text-purple-100 shadow-2xl shadow-purple-950/60'
      : boardStyle === 'modern_light'
      ? 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
      : boardStyle === 'office_slate'
      ? 'bg-[#1e293b] border-slate-700 text-slate-100 shadow-2xl'
      : 'bg-white border-emerald-600/30 text-zinc-900 shadow-2xl';

  const shortcutGroups = [
    {
      category: 'Creation & Modals',
      items: [
        {
          label: 'Open New Task Modal',
          keys: ['Ctrl', 'N'],
          macKeys: ['⌘', 'N'],
          description: 'Quickly create a new task from anywhere',
        },
        {
          label: 'Search All Tasks',
          keys: ['Ctrl', 'F'],
          macKeys: ['⌘', 'F'],
          description: 'Focus Header Search Bar (or press /)',
        },
        {
          label: 'Quick New Task (when not typing)',
          keys: ['N'],
          macKeys: ['N'],
          description: 'Instant task creator shortcut',
        },
        {
          label: 'Save Task / Apply Changes',
          keys: ['Ctrl', 'Enter'],
          macKeys: ['⌘', 'Enter'],
          description: 'Submit inside task modals',
        },
        {
          label: 'Close Any Open Modal',
          keys: ['Esc'],
          macKeys: ['Esc'],
          description: 'Dismiss modal, drawer, or popup',
        },
        {
          label: 'Open Settings',
          keys: ['Ctrl', ','],
          macKeys: ['⌘', ','],
          description: 'Configure profile, theme & backups',
        },
        {
          label: 'Keyboard Shortcuts Cheatsheet',
          keys: ['?'],
          macKeys: ['?'],
          description: 'Show this keyboard guide',
        },
      ],
    },
    {
      category: 'Columns & Bulk Workflow',
      items: [
        {
          label: 'Toggle Routine Column',
          keys: ['Ctrl', '1'],
          macKeys: ['⌘', '1'],
          description: 'Show/hide Column A (Routine)',
        },
        {
          label: 'Toggle Weekly Column',
          keys: ['Ctrl', '2'],
          macKeys: ['⌘', '2'],
          description: 'Show/hide Column B (Weekly)',
        },
        {
          label: 'Toggle Monthly Column',
          keys: ['Ctrl', '3'],
          macKeys: ['⌘', '3'],
          description: 'Show/hide Column C (Monthly)',
        },
        {
          label: 'Carry Forward Pending Tasks',
          keys: ['Ctrl', 'Shift', 'F'],
          macKeys: ['⌘', 'Shift', 'F'],
          description: 'Roll over previous pending routine tasks to today',
        },
        {
          label: 'Clear Completed Tasks',
          keys: ['Ctrl', 'Shift', 'C'],
          macKeys: ['⌘', 'Shift', 'C'],
          description: 'Archive/clean all completed items',
        },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Keyboard Shortcuts</h2>
              <p className="text-xs opacity-60">Power user keybindings for seamless workflow</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 opacity-60 hover:opacity-100 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="flex flex-col gap-5">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 px-1">
                {group.category}
              </h3>
              <div className={`flex flex-col rounded-xl border divide-y overflow-hidden ${
                isDark
                  ? 'border-white/10 divide-white/5 bg-white/2'
                  : 'border-[#dadce0] divide-[#dadce0] bg-[#f8f9fa]'
              }`}>
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-[11px] opacity-60">{item.description}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          <kbd className={`px-2 py-1 rounded-md border font-mono text-[11px] font-bold shadow-2xs ${
                            isDark
                              ? 'border-white/15 bg-white/10 text-white'
                              : 'border-[#dadce0] bg-white text-[#202124]'
                          }`}>
                            {k}
                          </kbd>
                          {i < item.keys.length - 1 && (
                            <span className="opacity-40 text-[10px]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`pt-2 flex items-center justify-between border-t text-xs opacity-70 ${isDark ? 'border-white/10' : 'border-[#dadce0]'}`}>
          <span>Tip: Press <kbd className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${isDark ? 'border-white/10 bg-white/5' : 'border-[#dadce0] bg-white text-[#202124]'}`}>Esc</kbd> anytime to dismiss modals.</span>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
              isChrome
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white border-transparent'
                : isDark
                ? 'border-white/15 hover:bg-white/10 text-white'
                : 'border-slate-300 hover:bg-slate-100 text-slate-800'
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
