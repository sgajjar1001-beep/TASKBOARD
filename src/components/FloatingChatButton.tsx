import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  UserPlus,
  Share2,
  X,
  Plus,
  MessageCircle,
} from 'lucide-react';

interface FloatingChatButtonProps {
  unreadCount?: number;
  onOpenChat: () => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenShareTask: () => void;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  unreadCount = 0,
  onOpenChat,
  onOpenNewChat,
  onOpenNewGroup,
  onOpenShareTask,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end select-none">
      {/* Speed Dial Menu Options (Pop-up above the round icon) */}
      {isOpen && (
        <div className="mb-3 flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Option 1: Share Task */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenShareTask();
            }}
            className="flex items-center gap-2.5 bg-white dark:bg-[#303134] text-[#202124] dark:text-white px-3.5 py-2 rounded-full shadow-lg border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-all hover:scale-105 cursor-pointer group"
          >
            <span className="text-xs font-semibold tracking-wide">Share Task</span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Share2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>

          {/* Option 2: Create Group */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenNewGroup();
            }}
            className="flex items-center gap-2.5 bg-white dark:bg-[#303134] text-[#202124] dark:text-white px-3.5 py-2 rounded-full shadow-lg border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-all hover:scale-105 cursor-pointer group"
          >
            <span className="text-xs font-semibold tracking-wide">Create New Group</span>
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>

          {/* Option 3: New 1-on-1 Chat */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenNewChat();
            }}
            className="flex items-center gap-2.5 bg-white dark:bg-[#303134] text-[#202124] dark:text-white px-3.5 py-2 rounded-full shadow-lg border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-all hover:scale-105 cursor-pointer group"
          >
            <span className="text-xs font-semibold tracking-wide">New Chat (DM)</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>

          {/* Option 4: Open All Chats */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenChat();
            }}
            className="flex items-center gap-2.5 bg-white dark:bg-[#303134] text-[#202124] dark:text-white px-3.5 py-2 rounded-full shadow-lg border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-all hover:scale-105 cursor-pointer group"
          >
            <span className="text-xs font-semibold tracking-wide">Open All Chats</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <MessageSquare className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>
        </div>
      )}

      {/* Main Floating Action Button (App Theme Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'bg-[#202124] text-white rotate-90 scale-95'
            : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white hover:scale-105 active:scale-95 shadow-[#1a73e8]/40 ring-2 ring-white/50'
        }`}
        title={isOpen ? 'Close menu' : 'Team Baat-Chit & Discussions'}
        aria-label="Chat & Collaboration"
      >
        {isOpen ? (
          <X className="w-6 h-6 stroke-[2.5]" />
        ) : (
          <>
            <MessageCircle className="w-7 h-7 stroke-[2.2] fill-current" />
            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white text-[#1a73e8] border-2 border-[#1a73e8] flex items-center justify-center font-bold shadow-xs">
              <Plus className="w-3 h-3 stroke-[3]" />
            </span>
          </>
        )}

        {/* Unread Message Badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
