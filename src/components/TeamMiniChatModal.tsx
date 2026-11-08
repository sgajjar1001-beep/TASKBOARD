import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Send,
  Paperclip,
  CheckCircle2,
  Trash2,
  Users,
  Plus,
  MessageSquare,
  UserPlus,
  Search,
  ArrowLeft,
  Share2,
  Calendar,
  Clock,
  Sparkles,
  Check,
  CheckCheck,
  Smile,
} from 'lucide-react';
import {
  ChatMessage,
  ChatGroup,
  TaskNote,
  TeamMember,
  TaskCadence,
} from '../types';
import {
  subscribeToChatMessages,
  subscribeToTeamMembers,
  subscribeToChatGroups,
  createChatGroup,
  sendChatMessage,
  toggleMessageReaction,
  deleteChatMessage,
  getDmRoomId,
} from '../services/collaborationService';
import { normalizeUserId } from '../services/userService';

interface TeamMiniChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  notes: TaskNote[];
  onImportTaskToBoard?: (task: Partial<TaskNote>) => void;
  onOpenProfile?: () => void;
  muted?: boolean;
  initialViewMode?: 'chat' | 'new_dm' | 'new_group' | 'share_task';
}

const EMOJI_OPTIONS = ['👍', '❤️', '🚀', '✅', '🔥', '📌'];

export const TeamMiniChatModal: React.FC<TeamMiniChatModalProps> = ({
  isOpen,
  onClose,
  currentUserName,
  notes,
  onImportTaskToBoard,
  onOpenProfile,
  muted = false,
  initialViewMode = 'chat',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);

  // Navigation & Active Room
  // Room can be: 'team' | 'dm_user1__user2' | 'grp_xxx'
  const [activeRoomId, setActiveRoomId] = useState<string>('team');
  const [activeTab, setActiveTab] = useState<'all' | 'dms' | 'groups'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile navigation state: showing chat list or message screen
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat'>('list');

  // Input & attachments
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [selectedTaskToShare, setSelectedTaskToShare] = useState<TaskNote | null>(null);
  const [importedTaskIds, setImportedTaskIds] = useState<Record<string, boolean>>({});

  // Dialog modals: New Group, New DM
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroupMemberNames, setSelectedGroupMemberNames] = useState<string[]>([]);

  const [isCreatingDm, setIsCreatingDm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const cleanCurrentName = currentUserName.trim() || 'Sumit';
  const cleanCurrentUserId = normalizeUserId(cleanCurrentName);

  // Subscriptions for real-time data
  useEffect(() => {
    if (!isOpen) return;

    const unsubMembers = subscribeToTeamMembers(cleanCurrentName, (members) => {
      setTeamMembers(members);
    });

    const unsubChat = subscribeToChatMessages((msgs) => {
      setMessages(msgs);
    });

    const unsubGroups = subscribeToChatGroups((groups) => {
      setChatGroups(groups);
    });

    return () => {
      unsubMembers();
      unsubChat();
      unsubGroups();
    };
  }, [isOpen, cleanCurrentName]);

  // Handle initial view mode
  useEffect(() => {
    if (!isOpen) return;
    if (initialViewMode === 'new_group') {
      setIsCreatingGroup(true);
      setMobileScreen('list');
    } else if (initialViewMode === 'new_dm') {
      setIsCreatingDm(true);
      setMobileScreen('list');
    } else if (initialViewMode === 'share_task') {
      setIsTaskPickerOpen(true);
    }
  }, [isOpen, initialViewMode]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen && mobileScreen === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeRoomId, isOpen, mobileScreen]);

  // Active room metadata
  const currentRoomDetails = useMemo(() => {
    if (activeRoomId === 'team') {
      return {
        title: 'Team General',
        subtitle: `${teamMembers.length} team members`,
        isGroup: true,
        avatarColor: 'bg-blue-600',
        initials: 'TG',
      };
    }

    if (activeRoomId.startsWith('grp_')) {
      const grp = chatGroups.find((g) => g.id === activeRoomId);
      return {
        title: grp ? grp.name : 'Group Chat',
        subtitle: grp
          ? `${grp.memberNames.length || 'All'} members${grp.description ? ` • ${grp.description}` : ''}`
          : 'Group discussion',
        isGroup: true,
        avatarColor: grp?.color || 'bg-purple-600',
        initials: grp?.name ? grp.name.substring(0, 2).toUpperCase() : 'GP',
      };
    }

    if (activeRoomId.startsWith('dm_')) {
      // Find the other user
      const parts = activeRoomId.replace('dm_', '').split('__');
      const otherId = parts.find((id) => id !== cleanCurrentUserId) || parts[0];
      const member = teamMembers.find((m) => m.id === otherId);
      const displayName = member ? member.name : otherId;

      return {
        title: displayName,
        subtitle: member?.role || 'Direct Message',
        isGroup: false,
        avatarColor: member?.avatarBg || 'bg-[#1a73e8]',
        initials: displayName.substring(0, 2).toUpperCase(),
        member,
      };
    }

    return {
      title: 'Chat',
      subtitle: '',
      isGroup: false,
      avatarColor: 'bg-slate-600',
      initials: 'CH',
    };
  }, [activeRoomId, teamMembers, chatGroups, cleanCurrentUserId]);

  // Filter messages for current room
  const activeRoomMessages = useMemo(() => {
    return messages.filter((m) => {
      if (activeRoomId === 'team') {
        return !m.roomId || m.roomId === 'team';
      }
      return m.roomId === activeRoomId;
    });
  }, [messages, activeRoomId]);

  // Room lists with last message and unread count
  const roomsList = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      subtitle: string;
      avatarColor: string;
      initials: string;
      type: 'general' | 'dm' | 'group';
      lastMessage?: string;
      lastTime?: string;
      unread: number;
    }> = [];

    // 1. General Team
    const teamMsgs = messages.filter((m) => !m.roomId || m.roomId === 'team');
    const lastTeamMsg = teamMsgs[teamMsgs.length - 1];
    list.push({
      id: 'team',
      name: 'Team General',
      subtitle: 'All members',
      avatarColor: 'bg-blue-600',
      initials: 'TG',
      type: 'general',
      lastMessage: lastTeamMsg?.text || 'Group discussion and announcements',
      lastTime: lastTeamMsg?.timestamp || '',
      unread: 0,
    });

    // 2. Custom Groups
    chatGroups.forEach((grp) => {
      const grpMsgs = messages.filter((m) => m.roomId === grp.id);
      const lastMsg = grpMsgs[grpMsgs.length - 1];
      list.push({
        id: grp.id,
        name: grp.name,
        subtitle: `${grp.memberNames.length} members`,
        avatarColor: grp.color || 'bg-purple-600',
        initials: grp.name.substring(0, 2).toUpperCase(),
        type: 'group',
        lastMessage: lastMsg?.text || grp.description || 'New group created',
        lastTime: lastMsg?.timestamp || '',
        unread: 0,
      });
    });

    // 3. 1-on-1 Direct Messages
    teamMembers.forEach((member) => {
      if (member.id === cleanCurrentUserId) return;
      const dmId = getDmRoomId(cleanCurrentName, member.name);
      const dmMsgs = messages.filter((m) => m.roomId === dmId);
      const lastMsg = dmMsgs[dmMsgs.length - 1];

      list.push({
        id: dmId,
        name: member.name,
        subtitle: member.role || 'Teammate',
        avatarColor: member.avatarBg || 'bg-[#1a73e8]',
        initials: member.name.substring(0, 2).toUpperCase(),
        type: 'dm',
        lastMessage: lastMsg?.text || 'Tap to chat privately',
        lastTime: lastMsg?.timestamp || '',
        unread: 0,
      });
    });

    // Filter by active tab & search query
    return list.filter((r) => {
      if (activeTab === 'dms' && r.type !== 'dm') return false;
      if (activeTab === 'groups' && r.type !== 'group' && r.type !== 'general') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || (r.lastMessage && r.lastMessage.toLowerCase().includes(q));
      }
      return true;
    });
  }, [messages, chatGroups, teamMembers, cleanCurrentName, cleanCurrentUserId, activeTab, searchQuery]);

  // Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const raw = (textToSend || inputText).trim();
    if (!raw && !selectedTaskToShare) return;

    setIsSending(true);

    try {
      let recipientId: string | undefined;
      let recipientName: string | undefined;

      if (activeRoomId.startsWith('dm_')) {
        const parts = activeRoomId.replace('dm_', '').split('__');
        const otherId = parts.find((id) => id !== cleanCurrentUserId) || parts[0];
        recipientId = otherId;
        const member = teamMembers.find((m) => m.id === otherId);
        recipientName = member?.name || otherId;
      }

      await sendChatMessage({
        senderId: cleanCurrentUserId,
        senderName: cleanCurrentName,
        text: raw || (selectedTaskToShare ? `Shared task: "${selectedTaskToShare.text}"` : ''),
        roomId: activeRoomId,
        recipientId,
        recipientName,
        isPrivate: activeRoomId.startsWith('dm_'),
        taskId: selectedTaskToShare?.id,
        taskTitle: selectedTaskToShare?.text,
        taskCadence: selectedTaskToShare?.cadence,
        taskPriority: selectedTaskToShare?.priority,
        taskDueDate: selectedTaskToShare?.dueDate,
      });

      setInputText('');
      setSelectedTaskToShare(null);
    } catch (e) {
      console.warn('Failed to send message:', e);
    } finally {
      setIsSending(false);
      chatInputRef.current?.focus();
    }
  };

  // Create Group Handler
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const created = await createChatGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        createdBy: cleanCurrentName,
        memberNames: selectedGroupMemberNames,
      });

      setActiveRoomId(created.id);
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedGroupMemberNames([]);
      setMobileScreen('chat');
    } catch (e) {
      console.error('Error creating group:', e);
    }
  };

  // Start 1-on-1 DM Handler
  const handleStartDm = (member: TeamMember) => {
    const dmId = getDmRoomId(cleanCurrentName, member.name);
    setActiveRoomId(dmId);
    setIsCreatingDm(false);
    setMobileScreen('chat');
  };

  // Import task to board from chat bubble
  const handleImportTask = (msg: ChatMessage) => {
    if (!msg.taskTitle || !onImportTaskToBoard) return;
    onImportTaskToBoard({
      text: msg.taskTitle,
      cadence: msg.taskCadence || 'daily',
      priority: msg.taskPriority || 'medium',
      dueDate: msg.taskDueDate,
    });
    setImportedTaskIds((prev) => ({ ...prev, [msg.id]: true }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full h-full sm:h-[88vh] sm:max-w-4xl bg-[#f0f2f5] dark:bg-[#121b22] sm:rounded-2xl shadow-2xl flex overflow-hidden border border-[#dadce0] dark:border-[#2a3942]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====================================================================
            LEFT PANEL: WHATSAPP-STYLE CHAT LIST
           ==================================================================== */}
        <div
          className={`w-full sm:w-80 md:w-96 bg-white dark:bg-[#111b21] border-r border-[#dadce0] dark:border-[#222e35] flex flex-col shrink-0 ${
            mobileScreen === 'chat' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Top Bar: Profile & Action Icons */}
          <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#dadce0] dark:border-[#222e35] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {cleanCurrentName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#202124] dark:text-[#e9edef] leading-tight">
                  {cleanCurrentName}
                </h3>
                <span className="text-[10px] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
                  Active Online
                </span>
              </div>
            </div>

            {/* Quick Action Buttons: New DM, New Group, Close */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCreatingDm(true)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer transition-colors"
                title="New 1-on-1 Chat"
              >
                <UserPlus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsCreatingGroup(true)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer transition-colors"
                title="Create New Group"
              >
                <Users className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer transition-colors sm:hidden"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-white dark:bg-[#111b21] border-b border-[#dadce0] dark:border-[#222e35]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#54656f] dark:text-[#8696a0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg text-xs text-[#202124] dark:text-[#e9edef] placeholder-[#54656f] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'all'
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e4e6eb] dark:bg-[#202c33] dark:text-[#aebac1]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dms')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'dms'
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e4e6eb] dark:bg-[#202c33] dark:text-[#aebac1]'
                }`}
              >
                Direct Messages
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                  activeTab === 'groups'
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e4e6eb] dark:bg-[#202c33] dark:text-[#aebac1]'
                }`}
              >
                Groups
              </button>
            </div>
          </div>

          {/* Chat List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#dadce0]/50 dark:divide-[#222e35]">
            {roomsList.length === 0 ? (
              <div className="p-8 text-center text-[#54656f] dark:text-[#8696a0]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No chats found</p>
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(true)}
                  className="mt-3 px-3 py-1 bg-[#1a73e8] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Create Group
                </button>
              </div>
            ) : (
              roomsList.map((room) => {
                const isActive = activeRoomId === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setActiveRoomId(room.id);
                      setMobileScreen('chat');
                    }}
                    className={`px-3 py-3 flex items-center gap-3 cursor-pointer select-none transition-colors ${
                      isActive
                        ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                        : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div
                      className={`w-11 h-11 rounded-full ${room.avatarColor} text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs`}
                    >
                      {room.type === 'group' || room.type === 'general' ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        room.initials
                      )}
                    </div>

                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-[#202124] dark:text-[#e9edef] truncate">
                          {room.name}
                        </h4>
                        {room.lastTime && (
                          <span className="text-[10px] text-[#667781] dark:text-[#8696a0] font-mono shrink-0">
                            {room.lastTime}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#667781] dark:text-[#8696a0] truncate leading-tight">
                        {room.lastMessage}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Floating Action at bottom of list (WhatsApp style) */}
          <div className="p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#dadce0] dark:border-[#222e35] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#667781] dark:text-[#8696a0] font-medium">
              Real-time collaboration
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingGroup(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer transition-transform hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Group</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            RIGHT PANEL: CONVERSATION VIEW (CLEAN WHATSAPP STYLE)
           ==================================================================== */}
        <div
          className={`flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] ${
            mobileScreen === 'list' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Active Chat Header */}
          <div className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#dadce0] dark:border-[#222e35] flex items-center justify-between select-none">
            <div className="flex items-center gap-3 min-w-0">
              {/* Back button on mobile */}
              <button
                type="button"
                onClick={() => setMobileScreen('list')}
                className="p-1 -ml-1 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 rounded-full sm:hidden cursor-pointer"
                title="Back to chats"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Room Avatar */}
              <div
                className={`w-9 h-9 rounded-full ${currentRoomDetails.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0`}
              >
                {currentRoomDetails.isGroup ? (
                  <Users className="w-4 h-4" />
                ) : (
                  currentRoomDetails.initials
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#202124] dark:text-[#e9edef] truncate leading-tight">
                  {currentRoomDetails.title}
                </h3>
                <p className="text-[10px] text-[#667781] dark:text-[#8696a0] truncate">
                  {currentRoomDetails.subtitle}
                </p>
              </div>
            </div>

            {/* Top Right Actions: Share Task button & Close */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsTaskPickerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#2a3942] hover:bg-[#e4e6eb] text-[#1a73e8] dark:text-[#8ab4f8] rounded-full border border-[#dadce0] dark:border-[#3c4043] text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                title="Share Task into this chat"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Task</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Encryption notice / Greeting */}
            <div className="text-center my-2">
              <span className="inline-block px-3 py-1 bg-[#ffeecd] dark:bg-[#182229] rounded-lg text-[10px] text-[#54656f] dark:text-[#8696a0] shadow-2xs font-medium">
                🔒 Messages and shared tasks are synced in real-time with your team
              </span>
            </div>

            {activeRoomMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-[#54656f] dark:text-[#8696a0] select-none">
                <MessageSquare className="w-10 h-10 opacity-30 mb-2" />
                <p className="text-xs font-semibold">No messages in this chat yet</p>
                <p className="text-[11px] mt-1">
                  Say hi or click <span className="font-bold">Share Task</span> to assign a task!
                </p>
              </div>
            ) : (
              activeRoomMessages.map((msg) => {
                const isMe = msg.senderName.toLowerCase() === cleanCurrentName.toLowerCase();
                const hasTask = Boolean(msg.taskTitle);
                const isImported = Boolean(msg.taskId && importedTaskIds[msg.id]);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    {/* Chat Bubble */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs transition-shadow ${
                        isMe
                          ? 'bg-[#e8f0fe] dark:bg-[#1a2d42] text-[#202124] dark:text-[#f1f3f4] border border-[#d2e3fc] dark:border-[#2e4c70] rounded-tr-xs'
                          : 'bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e9edef] border border-[#dadce0] dark:border-[#3c4043] rounded-tl-xs'
                      }`}
                    >
                      {/* Sender Name in Group chats */}
                      {!isMe && currentRoomDetails.isGroup && (
                        <div className="text-[10px] font-extrabold text-[#1a73e8] dark:text-[#53bdeb] mb-0.5">
                          {msg.senderName}
                        </div>
                      )}

                      {/* Shared Task Card Inside Bubble (if attached) */}
                      {hasTask && (
                        <div className="mb-2 p-2.5 rounded-xl bg-white/90 dark:bg-black/30 border border-black/10 dark:border-white/10 shadow-2xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              📋 Shared Task
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 capitalize">
                              {msg.taskCadence || 'daily'}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-[#202124] dark:text-white leading-snug">
                            {msg.taskTitle}
                          </h5>

                          {msg.taskDueDate && (
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Due: {msg.taskDueDate}
                            </p>
                          )}

                          {/* 1-Click Import Task to My Board */}
                          {onImportTaskToBoard && (
                            <button
                              type="button"
                              onClick={() => handleImportTask(msg)}
                              disabled={isImported}
                              className={`mt-2 w-full py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isImported
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-2xs'
                              }`}
                            >
                              {isImported ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Added to Board</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>Add to my Board</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Message Text */}
                      {msg.text && (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Time and Ticks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781] dark:text-[#8696a0] font-mono">
                        <span>{msg.timestamp}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                      </div>

                      {/* Reaction Badge if any */}
                      {msg.reaction && (
                        <span className="absolute -bottom-2 -right-2 px-1 py-0.5 bg-white dark:bg-[#202c33] rounded-full border border-black/10 text-xs shadow-xs">
                          {msg.reaction}
                        </span>
                      )}
                    </div>

                    {/* Quick Reactions on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5 px-2">
                      {EMOJI_OPTIONS.slice(0, 3).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleMessageReaction(msg.id, emoji)}
                          className="text-xs hover:scale-125 transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => deleteChatMessage(msg.id)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer ml-1"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Attached Task Preview Bar before sending */}
          {selectedTaskToShare && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-t border-amber-200 dark:border-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    Attaching Task:
                  </span>{' '}
                  <span className="text-[#202124] dark:text-white truncate">
                    {selectedTaskToShare.text}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskToShare(null)}
                className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Chat Input Bar (WhatsApp style) */}
          <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#dadce0] dark:border-[#222e35] flex items-center gap-2 select-none">
            {/* Paperclip Task Attachment Icon */}
            <button
              type="button"
              onClick={() => setIsTaskPickerOpen(true)}
              className="p-2 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer transition-colors"
              title="Attach task from board"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Input Field */}
            <input
              ref={chatInputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={`Message ${currentRoomDetails.title}...`}
              className="flex-1 py-2 px-4 bg-white dark:bg-[#2a3942] rounded-lg text-xs sm:text-sm text-[#202124] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] shadow-2xs"
            />

            {/* Send Button */}
            <button
              type="button"
              disabled={isSending || (!inputText.trim() && !selectedTaskToShare)}
              onClick={() => handleSendMessage()}
              className="w-10 h-10 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-40"
              title="Send message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        {/* ====================================================================
            MODAL 1: CREATE NEW GROUP (WHATSAPP-STYLE PARTICIPANTS PICKER)
           ==================================================================== */}
        {isCreatingGroup && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#2a3942] p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#2a3942]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-white">
                    Create New Group
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Group Name & Description */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group Name (e.g. Sales Team, Operations, IT)..."
                  className="w-full px-3 py-2 bg-[#f0f2f5] dark:bg-[#2a3942] rounded-lg text-xs font-bold text-[#202124] dark:text-white border border-[#dadce0] dark:border-[#3c4043] focus:outline-none focus:border-[#1a73e8]"
                  autoFocus
                />
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Optional description / topic..."
                  className="w-full px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#2a3942] rounded-lg text-xs text-[#202124] dark:text-white border border-[#dadce0] dark:border-[#3c4043] focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              {/* Members Checklist */}
              <div>
                <label className="text-xs font-bold text-[#5f6368] dark:text-[#aebac1] block mb-2">
                  Add Members ({selectedGroupMemberNames.length} selected):
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-[#dadce0] dark:border-[#2a3942] p-2 bg-[#f8f9fa] dark:bg-[#111b21]">
                  {teamMembers.map((member) => {
                    const isSelf = member.id === cleanCurrentUserId;
                    const isSelected = selectedGroupMemberNames.includes(member.name);

                    return (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected || isSelf}
                          disabled={isSelf}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMemberNames((prev) => [...prev, member.name]);
                            } else {
                              setSelectedGroupMemberNames((prev) =>
                                prev.filter((name) => name !== member.name)
                              );
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-[#202124] dark:text-white">
                            {member.name}
                          </span>{' '}
                          {isSelf && <span className="text-[10px] text-blue-600 font-bold">(You)</span>}
                          <span className="text-[11px] text-slate-500 block">{member.role}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newGroupName.trim()}
                  onClick={handleCreateGroup}
                  className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 2: START NEW 1-ON-1 CHAT (DM CONTACT PICKER)
           ==================================================================== */}
        {isCreatingDm && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#2a3942] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#2a3942]">
                <h3 className="text-sm font-bold text-[#202124] dark:text-white">
                  Start 1-on-1 Chat
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingDm(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {teamMembers
                  .filter((m) => m.id !== cleanCurrentUserId)
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleStartDm(member)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] text-left transition-colors cursor-pointer"
                    >
                      <div
                        className={`w-9 h-9 rounded-full ${member.avatarBg} text-white font-bold flex items-center justify-center text-xs shrink-0`}
                      >
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#202124] dark:text-white truncate">
                          {member.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {member.role || 'Teammate'}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 3: SELECT TASK TO SHARE INTO CHAT
           ==================================================================== */}
        {isTaskPickerOpen && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#2a3942] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#2a3942]">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#1a73e8]" />
                  <h3 className="text-sm font-bold text-[#202124] dark:text-white">
                    Pick a Task to Share in {currentRoomDetails.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTaskPickerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {notes.filter((n) => !n.completed).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No active tasks on your board</p>
                ) : (
                  notes
                    .filter((n) => !n.completed)
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTaskToShare(task);
                          setIsTaskPickerOpen(false);
                        }}
                        className="p-2.5 rounded-xl border border-[#dadce0] dark:border-[#3c4043] hover:border-[#1a73e8] bg-[#f8f9fa] dark:bg-[#1e1f21] hover:bg-white dark:hover:bg-[#2a3942] cursor-pointer transition-all flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#202124] dark:text-white truncate">
                            {task.text}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="capitalize">{task.cadence}</span>
                            {task.dueDate && <span>• Due: {task.dueDate}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 bg-[#1a73e8] text-white text-[10px] font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          Attach
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
