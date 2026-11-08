import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage, ChatGroup, SharedTaskAssignment, TeamMember, TaskNote } from '../types';
import { getAllUsers, saveAllUsers, normalizeUserId, getUserProfile, UserAccount } from './userService';

const CHAT_STORAGE_KEY = 'pinboard_team_chat_messages_v3';
const SHARED_TASKS_STORAGE_KEY = 'pinboard_shared_tasks_v3';
const CHAT_GROUPS_STORAGE_KEY = 'pinboard_chat_groups_v1';

// Distinct colors for user avatar bubbles
const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-teal-600',
];

/**
 * Generate deterministic DM Room ID for 1-on-1 private conversation
 */
export function getDmRoomId(user1: string, user2: string): string {
  const clean1 = normalizeUserId(user1);
  const clean2 = normalizeUserId(user2);
  return `dm_${[clean1, clean2].sort().join('__')}`;
}

/**
 * Get all real registered team members (no dummy fake accounts)
 */
export function getAvailableTeamMembers(currentUserName?: string): TeamMember[] {
  const registeredUsers = getAllUsers();
  const members: TeamMember[] = [];
  let colorIndex = 0;

  Object.values(registeredUsers).forEach((acc) => {
    const isSelf = currentUserName && acc.username.toLowerCase() === currentUserName.toLowerCase();
    const roleTitle = acc.designation
      ? acc.designation
      : isSelf
      ? 'Owner / Admin'
      : 'Team Member';

    members.push({
      id: acc.userId,
      name: acc.username,
      role: roleTitle,
      status: 'online',
      avatarBg: acc.avatarColor || AVATAR_COLORS[colorIndex % AVATAR_COLORS.length],
      avatarUrl: acc.avatarUrl,
    });
    colorIndex++;
  });

  return members;
}

/**
 * Subscribe to team members in real-time from Firestore directory & local storage
 */
export function subscribeToTeamMembers(
  currentUserName: string,
  onMembers: (members: TeamMember[]) => void
): () => void {
  // 1. Initial local load
  onMembers(getAvailableTeamMembers(currentUserName));

  try {
    const dirColl = collection(db, 'directory_users');
    const unsubscribe = onSnapshot(dirColl, (snapshot) => {
      if (!snapshot.empty) {
        const users = getAllUsers();
        let changed = false;
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.username) {
            const uid = docSnap.id;
            if (!users[uid]) {
              users[uid] = {
                username: d.username,
                userId: uid,
                password: '••••',
                designation: d.designation || 'Team Member',
                department: d.department || 'General',
                avatarUrl: d.avatarUrl || undefined,
                avatarColor: d.avatarColor || 'bg-blue-600',
                createdAt: d.createdAt || new Date().toISOString(),
                lastLoginAt: d.lastActive || new Date().toISOString(),
              };
              changed = true;
            } else {
              if (d.avatarUrl !== undefined && users[uid].avatarUrl !== d.avatarUrl) {
                users[uid].avatarUrl = d.avatarUrl || undefined;
                changed = true;
              }
              if (d.designation && users[uid].designation !== d.designation) {
                users[uid].designation = d.designation;
                changed = true;
              }
            }
          }
        });

        if (changed) {
          saveAllUsers(users);
        }
      }
      onMembers(getAvailableTeamMembers(currentUserName));
    }, (err) => {
      console.warn('Directory users subscription notice:', err);
      onMembers(getAvailableTeamMembers(currentUserName));
    });

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Register a new real teammate into the app with designation & department
 */
export function registerNewTeammate(name: string, role?: string, department?: string): TeamMember {
  const cleanName = name.trim();
  const cleanId = normalizeUserId(cleanName);
  const users = getAllUsers();

  if (!users[cleanId]) {
    const newUser: UserAccount = {
      username: cleanName,
      userId: cleanId,
      password: '1234', // default password
      designation: role?.trim() || 'Team Member',
      department: department?.trim() || 'General',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isFirstLogin: false,
    };
    users[cleanId] = newUser;
    saveAllUsers(users);
  } else if (role || department) {
    if (role) users[cleanId].designation = role.trim();
    if (department) users[cleanId].department = department.trim();
    saveAllUsers(users);
  }

  // Push to Firestore directory_users
  try {
    const userToSync = users[cleanId];
    const docRef = doc(db, 'directory_users', cleanId);
    setDoc(docRef, {
      userId: cleanId,
      username: cleanName,
      designation: userToSync.designation || 'Team Member',
      department: userToSync.department || 'General',
      avatarUrl: userToSync.avatarUrl || null,
      avatarColor: userToSync.avatarColor || 'bg-blue-600',
      lastActive: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
  } catch {}

  return {
    id: cleanId,
    name: cleanName,
    role: users[cleanId].designation || role?.trim() || 'Team Member',
    status: 'online',
    avatarBg: users[cleanId].avatarColor || AVATAR_COLORS[Object.keys(users).length % AVATAR_COLORS.length],
    avatarUrl: users[cleanId].avatarUrl,
  };
}

/**
 * Read local cached chat messages
 */
export function getLocalChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local chat:', e);
  }
  return [];
}

/**
 * Save local cached chat messages
 */
export function saveLocalChatMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving local chat:', e);
  }
}

/**
 * Subscribe to real-time chat messages from Firestore with LocalStorage fallback
 */
export function subscribeToChatMessages(
  onMessages: (msgs: ChatMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  onMessages(getLocalChatMessages());

  try {
    const chatColl = collection(db, 'chat_messages');
    const q = query(chatColl, orderBy('createdAtMs', 'asc'), limit(200));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              senderId: data.senderId || 'user',
              senderName: data.senderName || 'Team Member',
              text: data.text || '',
              timestamp: data.timestamp || '',
              createdAtMs: Number(data.createdAtMs) || Date.now(),
              roomId: data.roomId || 'team',
              recipientId: data.recipientId,
              recipientName: data.recipientName,
              isPrivate: Boolean(data.isPrivate),
              taskId: data.taskId,
              taskTitle: data.taskTitle,
              taskCadence: data.taskCadence,
              taskPriority: data.taskPriority,
              taskDueDate: data.taskDueDate,
              reaction: data.reaction,
            });
          });
          saveLocalChatMessages(list);
          onMessages(list);
        } else {
          onMessages(getLocalChatMessages());
        }
      },
      (error) => {
        console.warn('Firestore chat snapshot notice:', error);
        if (onError) onError(error);
        onMessages(getLocalChatMessages());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach chat snapshot:', err);
    return () => {};
  }
}

/**
 * Send a new chat message (General Team or 1-on-1 Private)
 */
export async function sendChatMessage(
  message: {
    senderId: string;
    senderName: string;
    text: string;
    roomId?: string; // 'team' or 'dm_user1__user2'
    recipientId?: string;
    recipientName?: string;
    isPrivate?: boolean;
    taskId?: string;
    taskTitle?: string;
    taskCadence?: any;
    taskPriority?: any;
    taskDueDate?: string;
  }
): Promise<ChatMessage> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const generatedId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

  const senderProfile = getUserProfile(message.senderName || message.senderId);

  const newMsg: ChatMessage = {
    id: generatedId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: senderProfile?.designation,
    senderAvatar: senderProfile?.avatarUrl,
    text: message.text.trim(),
    timestamp: timeStr,
    createdAtMs: Date.now(),
    roomId: message.roomId || 'team',
    recipientId: message.recipientId,
    recipientName: message.recipientName,
    isPrivate: Boolean(message.isPrivate),
    taskId: message.taskId,
    taskTitle: message.taskTitle,
    taskCadence: message.taskCadence,
    taskPriority: message.taskPriority,
    taskDueDate: message.taskDueDate,
  };

  // 1. Save to local storage right away
  const current = getLocalChatMessages();
  const updated = [...current, newMsg];
  saveLocalChatMessages(updated);

  // 2. Push to Firestore
  try {
    const docRef = doc(db, 'chat_messages', generatedId);
    await setDoc(docRef, newMsg);
  } catch (error) {
    console.warn('Could not push message to Firestore, stored in local storage:', error);
  }

  return newMsg;
}

/**
 * Add reaction to a chat message
 */
export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const current = getLocalChatMessages();
  const updated = current.map((m) =>
    m.id === messageId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
  );
  saveLocalChatMessages(updated);

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    const target = updated.find((m) => m.id === messageId);
    await updateDoc(docRef, { reaction: target?.reaction || null });
  } catch (e) {
    console.warn('Firestore update reaction error:', e);
  }
}

/**
 * Delete a chat message
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
  const current = getLocalChatMessages();
  const updated = current.filter((m) => m.id !== messageId);
  saveLocalChatMessages(updated);

  try {
    const docRef = doc(db, 'chat_messages', messageId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore delete message error:', e);
  }
}

// ============================================================================
// SHARED & ASSIGNED TASKS (MULTI-USER TASK SHARE)
// ============================================================================

export function getLocalSharedTasks(): SharedTaskAssignment[] {
  try {
    const raw = localStorage.getItem(SHARED_TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading shared tasks:', e);
  }
  return [];
}

export function saveLocalSharedTasks(tasks: SharedTaskAssignment[]): void {
  try {
    localStorage.setItem(SHARED_TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Error saving shared tasks:', e);
  }
}

export function subscribeToSharedTasks(
  onTasks: (tasks: SharedTaskAssignment[]) => void,
  onError?: (err: any) => void
): () => void {
  onTasks(getLocalSharedTasks());

  try {
    const sharedColl = collection(db, 'shared_tasks');
    const unsubscribe = onSnapshot(
      sharedColl,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: SharedTaskAssignment[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              taskId: data.taskId || docSnap.id,
              text: data.text || '',
              notesDetail: data.notesDetail,
              cadence: data.cadence || 'daily',
              priority: data.priority || 'medium',
              assignedBy: data.assignedBy || 'Team',
              assignedTo: data.assignedTo || 'All',
              shareNote: data.shareNote,
              status: data.status || 'pending',
              createdAt: data.createdAt || new Date().toISOString(),
              assignedDate: data.assignedDate,
              dueDate: data.dueDate,
              subtasks: data.subtasks,
              color: data.color,
            });
          });
          saveLocalSharedTasks(list);
          onTasks(list);
        } else {
          onTasks(getLocalSharedTasks());
        }
      },
      (error) => {
        console.warn('Firestore shared tasks snapshot notice:', error);
        if (onError) onError(error);
        onTasks(getLocalSharedTasks());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach shared tasks snapshot:', err);
    return () => {};
  }
}

export async function assignTaskToUser(assignment: {
  taskId: string;
  text: string;
  notesDetail?: string;
  cadence: any;
  priority?: any;
  assignedBy: string;
  assignedTo: string;
  shareNote?: string;
  dueDate?: string;
  subtasks?: any[];
  color?: any;
  alsoShareInChat?: boolean;
  isPrivateAnnouncement?: boolean;
}): Promise<SharedTaskAssignment> {
  const generatedId = 'share-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const record: SharedTaskAssignment = {
    id: generatedId,
    taskId: assignment.taskId,
    text: assignment.text,
    notesDetail: assignment.notesDetail,
    cadence: assignment.cadence,
    priority: assignment.priority || 'medium',
    assignedBy: assignment.assignedBy,
    assignedTo: assignment.assignedTo,
    shareNote: assignment.shareNote,
    status: 'pending',
    createdAt: dateFormatted,
    assignedDate: assignment.dueDate || now.toISOString().split('T')[0],
    dueDate: assignment.dueDate,
    subtasks: assignment.subtasks,
    color: assignment.color || 'yellow',
  };

  const current = getLocalSharedTasks();
  const updated = [record, ...current.filter((item) => item.id !== record.id)];
  saveLocalSharedTasks(updated);

  try {
    const docRef = doc(db, 'shared_tasks', generatedId);
    await setDoc(docRef, record);
  } catch (error) {
    console.warn('Error saving shared task to Firestore:', error);
  }

  // If announcement in chat is selected
  if (assignment.alsoShareInChat) {
    try {
      const msgText = `🎯 Task Assigned to @${assignment.assignedTo}: "${assignment.text}"${
        assignment.shareNote ? `\nNote: ${assignment.shareNote}` : ''
      }`;

      const roomId = assignment.isPrivateAnnouncement
        ? getDmRoomId(assignment.assignedBy, assignment.assignedTo)
        : 'team';

      await sendChatMessage({
        senderId: normalizeUserId(assignment.assignedBy),
        senderName: assignment.assignedBy,
        text: msgText,
        roomId,
        recipientId: normalizeUserId(assignment.assignedTo),
        recipientName: assignment.assignedTo,
        isPrivate: Boolean(assignment.isPrivateAnnouncement),
        taskId: assignment.taskId,
        taskTitle: assignment.text,
        taskCadence: assignment.cadence,
        taskPriority: assignment.priority,
        taskDueDate: assignment.dueDate,
      });
    } catch (e) {
      console.warn('Error sending chat announcement:', e);
    }
  }

  return record;
}

export async function updateSharedTaskStatus(
  shareId: string,
  status: 'pending' | 'accepted' | 'completed' | 'declined'
): Promise<void> {
  const current = getLocalSharedTasks();
  const updated = current.map((item) => (item.id === shareId ? { ...item, status } : item));
  saveLocalSharedTasks(updated);

  try {
    const docRef = doc(db, 'shared_tasks', shareId);
    await updateDoc(docRef, { status });
  } catch (e) {
    console.warn('Firestore update shared task status error:', e);
  }
}

// ============================================================================
// CHAT GROUPS (WHATSAPP-STYLE GROUP COLLABORATION)
// ============================================================================

const DEFAULT_INITIAL_GROUPS: ChatGroup[] = [
  {
    id: 'grp_ops_general',
    name: 'General Operations',
    description: 'All members group for task coordination & updates',
    createdBy: 'System',
    createdAt: new Date().toISOString(),
    memberNames: [],
    color: 'bg-emerald-600',
  },
];

export function getLocalChatGroups(): ChatGroup[] {
  try {
    const raw = localStorage.getItem(CHAT_GROUPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading chat groups:', e);
  }
  return DEFAULT_INITIAL_GROUPS;
}

export function saveLocalChatGroups(groups: ChatGroup[]): void {
  try {
    localStorage.setItem(CHAT_GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.warn('Error saving chat groups:', e);
  }
}

export function subscribeToChatGroups(
  onGroups: (groups: ChatGroup[]) => void,
  onError?: (err: any) => void
): () => void {
  onGroups(getLocalChatGroups());

  try {
    const groupsColl = collection(db, 'chat_groups');
    const unsubscribe = onSnapshot(
      groupsColl,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ChatGroup[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              name: data.name || 'Group',
              description: data.description || '',
              createdBy: data.createdBy || '',
              createdAt: data.createdAt || new Date().toISOString(),
              memberNames: Array.isArray(data.memberNames) ? data.memberNames : [],
              color: data.color || 'bg-blue-600',
            });
          });
          saveLocalChatGroups(list);
          onGroups(list);
        } else {
          onGroups(getLocalChatGroups());
        }
      },
      (error) => {
        console.warn('Firestore chat_groups snapshot notice:', error);
        if (onError) onError(error);
        onGroups(getLocalChatGroups());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach chat_groups snapshot:', err);
    return () => {};
  }
}

export async function createChatGroup(group: {
  name: string;
  description?: string;
  createdBy: string;
  memberNames: string[];
  color?: string;
}): Promise<ChatGroup> {
  const generatedId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const GROUP_COLORS = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-teal-600',
  ];
  const chosenColor = group.color || GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];

  // Ensure creator is in members
  const allMembers = Array.from(new Set([group.createdBy, ...group.memberNames])).filter(Boolean);

  const newGroup: ChatGroup = {
    id: generatedId,
    name: group.name.trim(),
    description: group.description?.trim() || '',
    createdBy: group.createdBy,
    createdAt: new Date().toISOString(),
    memberNames: allMembers,
    color: chosenColor,
  };

  const current = getLocalChatGroups();
  const updated = [newGroup, ...current.filter((g) => g.id !== generatedId)];
  saveLocalChatGroups(updated);

  try {
    const docRef = doc(db, 'chat_groups', generatedId);
    await setDoc(docRef, newGroup);
  } catch (e) {
    console.warn('Could not save group to Firestore:', e);
  }

  // Send an automated greeting message in group
  try {
    await sendChatMessage({
      senderId: normalizeUserId(group.createdBy),
      senderName: group.createdBy,
      text: `🎉 Group "${newGroup.name}" created by @${group.createdBy}. Members: ${allMembers.join(', ')}`,
      roomId: generatedId,
      isPrivate: false,
    });
  } catch (e) {}

  return newGroup;
}

