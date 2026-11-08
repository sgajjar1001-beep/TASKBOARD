import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Search,
  Send,
  Users,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Shield,
  UserPlus,
} from 'lucide-react';
import { TaskNote, TeamMember, ChatGroup, TaskPriority } from '../types';
import {
  getAvailableTeamMembers,
  assignTaskToUser,
  getLocalChatGroups,
  subscribeToChatGroups,
  registerNewTeammate,
  sendChatMessage,
} from '../services/collaborationService';
import { normalizeUserId } from '../services/userService';
import { playClickSound, playTaskCompleteSound } from '../utils/sound';

interface TaskShareAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskNote | null;
  currentUserName: string;
  onTaskAssigned?: (updatedTask: TaskNote) => void;
  onOpenChatWithTask?: (task: TaskNote) => void;
  muted?: boolean;
}

export const TaskShareAssignModal: React.FC<TaskShareAssignModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUserName,
  onTaskAssigned,
  onOpenChatWithTask,
  muted = false,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{ id: string; name: string; isGroup: boolean; groupRoomId?: string }>
  >([]);
  const [captionNote, setCaptionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [showAddCustomMember, setShowAddCustomMember] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');

  const cleanCurrentName = currentUserName.trim() || 'Sumit';

  // Load team members and groups
  useEffect(() => {
    if (isOpen) {
      const members = getAvailableTeamMembers(cleanCurrentName);
      setTeamMembers(members);
      setChatGroups(getLocalChatGroups());

      const unsubGroups = subscribeToChatGroups((groups) => {
        setChatGroups(groups);
      });

      // Default pre-select first teammate if none selected
      const firstOther = members.find(
        (m) => m.name.toLowerCase() !== cleanCurrentName.toLowerCase()
      );
      if (firstOther) {
        setSelectedRecipients([
          { id: firstOther.id, name: firstOther.name, isGroup: false },
        ]);
      } else {
        setSelectedRecipients([]);
      }

      setSearchQuery('');
      setCaptionNote('');
      setSuccessToast('');
      setIsSubmitting(false);
      setShowAddCustomMember(false);
      setCustomName('');
      setCustomRole('');

      return () => unsubGroups();
    }
  }, [isOpen, cleanCurrentName]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter contacts and groups by search
  const filteredTeammates = useMemo(() => {
    const others = teamMembers.filter(
      (m) => m.name.toLowerCase() !== cleanCurrentName.toLowerCase()
    );
    if (!searchQuery.trim()) return others;
    const q = searchQuery.toLowerCase();
    return others.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [teamMembers, cleanCurrentName, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return chatGroups;
    const q = searchQuery.toLowerCase();
    return chatGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  }, [chatGroups, searchQuery]);

  // Frequently contacted persons (top 4 teammates)
  const frequentlyContacted = useMemo(() => {
    return teamMembers
      .filter((m) => m.name.toLowerCase() !== cleanCurrentName.toLowerCase())
      .slice(0, 5);
  }, [teamMembers, cleanCurrentName]);

  if (!isOpen || !task) return null;

  const isRecipientSelected = (name: string, isGroup: boolean) => {
    return selectedRecipients.some(
      (r) => r.name.toLowerCase() === name.toLowerCase() && r.isGroup === isGroup
    );
  };

  const handleToggleRecipient = (
    id: string,
    name: string,
    isGroup: boolean,
    groupRoomId?: string
  ) => {
    if (!muted) playClickSound();
    if (isRecipientSelected(name, isGroup)) {
      setSelectedRecipients((prev) =>
        prev.filter(
          (r) => !(r.name.toLowerCase() === name.toLowerCase() && r.isGroup === isGroup)
        )
      );
    } else {
      setSelectedRecipients((prev) => [
        ...prev,
        { id, name, isGroup, groupRoomId },
      ]);
    }
  };

  const handleCreateAndSelectCustomMember = () => {
    const name = customName.trim();
    if (!name) return;
    const newMember = registerNewTeammate(name, customRole.trim() || 'Team Member');
    setTeamMembers(getAvailableTeamMembers(cleanCurrentName));
    setSelectedRecipients((prev) => [
      ...prev,
      { id: newMember.id, name: newMember.name, isGroup: false },
    ]);
    setCustomName('');
    setCustomRole('');
    setShowAddCustomMember(false);
  };

  const handleForwardTaskSubmit = async () => {
    if (selectedRecipients.length === 0 || !task) return;
    if (!muted) playTaskCompleteSound();
    setIsSubmitting(true);

    try {
      for (const recipient of selectedRecipients) {
        if (recipient.isGroup) {
          // Announce in the Group chat room
          await sendChatMessage({
            senderId: normalizeUserId(cleanCurrentName),
            senderName: cleanCurrentName,
            text: captionNote.trim()
              ? `📋 Forwarded Task: "${task.text}"\nNote: ${captionNote.trim()}`
              : `📋 Forwarded Task: "${task.text}" (Cadence: ${task.cadence})`,
            roomId: recipient.groupRoomId || recipient.id,
            isPrivate: false,
            taskId: task.id,
            taskTitle: task.text,
            taskCadence: task.cadence,
            taskPriority: task.priority || 'medium',
            taskDueDate: task.dueDate,
          });
        } else {
          // Assign task and announce in 1-on-1 DM
          await assignTaskToUser({
            taskId: task.id,
            text: task.text,
            notesDetail: task.notesDetail,
            cadence: task.cadence,
            priority: task.priority || 'medium',
            assignedBy: cleanCurrentName,
            assignedTo: recipient.name,
            shareNote: captionNote.trim() || undefined,
            dueDate: task.dueDate,
            subtasks: task.subtasks,
            color: task.color,
            alsoShareInChat: true,
            isPrivateAnnouncement: true,
          });
        }
      }

      // Update local task state
      const primaryRecipient = selectedRecipients[0];
      const updatedNote: TaskNote = {
        ...task,
        assignedTo: selectedRecipients.map((r) => r.name).join(', '),
        assignedBy: cleanCurrentName,
        shareNote: captionNote.trim() || undefined,
        shareStatus: 'pending',
        sharedAt: new Date().toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };

      if (onTaskAssigned) {
        onTaskAssigned(updatedNote);
      }

      setSuccessToast(
        `Task forwarded to ${selectedRecipients.map((r) => r.name).join(', ')}!`
      );

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error forwarding task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#121b22] border border-[#dadce0] dark:border-[#2a3942] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp Style Green Header Bar */}
        <div className="px-4 py-3 bg-[#075E54] dark:bg-[#1f2c34] text-white flex items-center justify-between shadow-md select-none">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Forward Task
              </h3>
              <p className="text-[11px] text-emerald-200/90 font-medium">
                {selectedRecipients.length > 0
                  ? `${selectedRecipients.length} selected`
                  : 'Select contact or group'}
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
            <Share2 className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Task Preview Card (What is being forwarded) */}
        <div className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#202c33] flex items-center gap-2.5 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#075E54] dark:text-[#25D366] bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                Forwarding Task
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                • {task.cadence}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {task.text}
            </p>
          </div>
        </div>

        {/* WhatsApp Search Bar (Search contacts or groups) */}
        <div className="p-2.5 bg-white dark:bg-[#121b22] border-b border-[#e9edef] dark:border-[#202c33]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#54656f] dark:text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts or groups..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl text-xs text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Recipient Directory (Frequently Contacted, Groups, Contacts) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e9edef] dark:divide-[#202c33]">
          {/* SECTION 1: Frequently Contacted Horizontal Avatars */}
          {!searchQuery && frequentlyContacted.length > 0 && (
            <div className="p-3 bg-white dark:bg-[#121b22]">
              <span className="text-[11px] font-bold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wide block mb-2 px-1">
                Frequently Contacted
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1 scrollbar-none">
                {frequentlyContacted.map((member) => {
                  const selected = isRecipientSelected(member.name, false);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleRecipient(member.id, member.name, false)}
                      className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group select-none"
                    >
                      <div className="relative">
                        <div
                          className={`w-12 h-12 rounded-full ${
                            member.avatarBg || 'bg-[#00a884]'
                          } text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105 border-2 ${
                            selected
                              ? 'border-[#25D366] ring-2 ring-[#25D366]/40'
                              : 'border-transparent'
                          }`}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            member.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {selected ? (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121b22]" />
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 max-w-[56px] truncate text-center">
                        {member.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Groups Section (WhatsApp Style) */}
          {filteredGroups.length > 0 && (
            <div className="bg-white dark:bg-[#121b22] py-1">
              <span className="text-[11px] font-bold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wide block px-4 pt-2 pb-1">
                Groups ({filteredGroups.length})
              </span>
              {filteredGroups.map((group) => {
                const selected = isRecipientSelected(group.name, true);
                return (
                  <div
                    key={group.id}
                    onClick={() =>
                      handleToggleRecipient(group.id, group.name, true, group.id)
                    }
                    className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      selected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
                        : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-full ${
                          group.color || 'bg-blue-600'
                        } text-white flex items-center justify-center shadow-xs shrink-0`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {group.name}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#202c33] text-slate-500 dark:text-slate-400">
                            Group
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {group.description || `${group.memberNames.length} members`}
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Checkmark Circle */}
                    <div
                      className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        selected
                          ? 'border-[#25D366] bg-[#25D366] text-white shadow-xs'
                          : 'border-[#8696a0] bg-transparent'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION 3: All Teammates / Contacts */}
          <div className="bg-white dark:bg-[#121b22] py-1">
            <div className="flex items-center justify-between px-4 pt-2 pb-1">
              <span className="text-[11px] font-bold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wide">
                All Contacts ({filteredTeammates.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddCustomMember(!showAddCustomMember)}
                className="text-[11px] text-[#00a884] dark:text-[#25D366] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Add Person</span>
              </button>
            </div>

            {/* Quick add custom teammate inline form */}
            {showAddCustomMember && (
              <div className="mx-3 my-2 p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl space-y-2 border border-[#dadce0] dark:border-[#2a3942]">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Teammate name..."
                    className="px-2.5 py-1 bg-white dark:bg-[#121b22] rounded-lg text-xs font-semibold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Role (e.g. Sales, Admin)..."
                    className="px-2.5 py-1 bg-white dark:bg-[#121b22] rounded-lg text-xs font-semibold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomMember(false)}
                    className="px-2 py-0.5 text-xs text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!customName.trim()}
                    onClick={handleCreateAndSelectCustomMember}
                    className="px-3 py-1 bg-[#25D366] text-slate-950 font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    Add & Select
                  </button>
                </div>
              </div>
            )}

            {filteredTeammates.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No matching contacts found
              </div>
            ) : (
              filteredTeammates.map((member) => {
                const selected = isRecipientSelected(member.name, false);
                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggleRecipient(member.id, member.name, false)}
                    className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      selected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
                        : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-full ${
                          member.avatarBg || 'bg-[#00a884]'
                        } text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {member.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {member.role || 'Team Member'}
                        </p>
                      </div>
                    </div>

                    {/* Checkmark Circle */}
                    <div
                      className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        selected
                          ? 'border-[#25D366] bg-[#25D366] text-white shadow-xs'
                          : 'border-[#8696a0] bg-transparent'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* WhatsApp Style Bottom Forward Bar & Green Send Action Button */}
        <div className="p-3 bg-[#f0f2f5] dark:bg-[#1f2c34] border-t border-[#e9edef] dark:border-[#2a3942] flex flex-col gap-2">
          {/* Caption / Note input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={captionNote}
              onChange={(e) => setCaptionNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleForwardTaskSubmit();
              }}
              placeholder="Add a message or note (optional)..."
              className="flex-1 px-3 py-2 bg-white dark:bg-[#2a3942] rounded-xl text-xs text-slate-900 dark:text-white placeholder-[#8696a0] border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-[#25D366] shadow-2xs font-medium"
            />

            {/* WhatsApp Floating Green Forward Button */}
            <button
              type="button"
              disabled={selectedRecipients.length === 0 || isSubmitting}
              onClick={handleForwardTaskSubmit}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#25D366] hover:bg-[#20ba5a] disabled:opacity-40 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
              title="Forward to selected recipients"
            >
              <Send className="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>

          {/* Selected recipients summary */}
          <div className="flex items-center justify-between text-[11px] text-[#54656f] dark:text-[#8696a0] px-1 select-none">
            <span className="truncate max-w-[280px]">
              {selectedRecipients.length > 0 ? (
                <>
                  Sending to:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {selectedRecipients.map((r) => r.name).join(', ')}
                  </strong>
                </>
              ) : (
                'Select at least 1 person or group'
              )}
            </span>
            <span className="font-mono text-[10px]">
              {selectedRecipients.length} selected
            </span>
          </div>
        </div>

        {/* Success toast */}
        {successToast && (
          <div className="absolute top-14 left-4 right-4 bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
