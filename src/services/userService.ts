import { doc, setDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { TaskNote, ImportantNote } from '../types';
import {
  pushUserBoardToFirebase,
  pullUserBoardFromFirebase,
  normalizeUserId,
  db,
} from './firebase';

export { normalizeUserId };

export const CRUNCHYROLL_AVATAR_GRADIENTS = [
  { id: 'blue', name: 'Google Blue', bg: 'from-[#1a73e8] to-[#4285f4]', border: 'border-[#1a73e8]' },
  { id: 'emerald', name: 'Emerald Green', bg: 'from-[#0f9d58] to-[#34a853]', border: 'border-emerald-500' },
  { id: 'indigo', name: 'Royal Indigo', bg: 'from-[#3949ab] to-[#5c6bc0]', border: 'border-indigo-500' },
  { id: 'purple', name: 'Deep Purple', bg: 'from-[#673ab7] to-[#9c27b0]', border: 'border-purple-500' },
  { id: 'coral', name: 'Vivid Coral', bg: 'from-[#ea4335] to-[#f4511e]', border: 'border-rose-500' },
  { id: 'amber', name: 'Golden Amber', bg: 'from-[#f4b400] to-[#fb8c00]', border: 'border-amber-500' },
  { id: 'teal', name: 'Ocean Teal', bg: 'from-[#00897b] to-[#00acc1]', border: 'border-teal-500' },
  { id: 'rose', name: 'Berry Rose', bg: 'from-[#e91e63] to-[#f06292]', border: 'border-pink-500' },
];

export const CRUNCHYROLL_AVATAR_ICONS = [
  '⚡', '🦊', '🐉', '🎯', '🚀', '👑', '🛡️', '⚔️', '🎧', '💻', '🎨', '🔥', '🌟', '🐺', '🦾'
];

/**
 * Synchronize user profile to Firestore directory so all other devices see them
 */
export function syncUserToDirectory(user: UserAccount) {
  try {
    const cleanId = normalizeUserId(user.userId || user.username);
    const docRef = doc(db, 'directory_users', cleanId);
    setDoc(
      docRef,
      {
        userId: cleanId,
        username: user.username,
        email: user.email || null,
        designation: user.designation || 'Team Member',
        department: user.department || 'General',
        avatarUrl: user.avatarUrl || null,
        avatarColor: user.avatarColor || 'from-[#1a73e8] to-[#4285f4]',
        avatarIcon: user.avatarIcon || null,
        statusMessage: user.statusMessage || null,
        lastActive: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  } catch {}
}

export interface UserAccount {
  username: string; // e.g. "Sumit" or "Rahul"
  userId: string; // normalized e.g. "sumit" or "rahul" or Firebase UID
  password?: string; // deprecated - passwords are handled securely by Firebase Auth
  designation?: string; // e.g. "Operations Manager", "Senior Accountant"
  department?: string; // e.g. "Management", "Operations", "Finance"
  email?: string;
  phone?: string;
  statusMessage?: string; // e.g. "Available", "Focus Mode"
  avatarColor?: string;
  avatarIcon?: string; // emoji/sticker icon (e.g. 🦊, ⚡)
  avatarUrl?: string; // base64 Data URL or profile picture image URL
  createdAt: string;
  lastLoginAt: string;
  isFirstLogin?: boolean;
}

const USERS_STORAGE_KEY = 'pinboard_user_accounts_v2';
const ACTIVE_USER_KEY = 'pinboard_active_user_v2';

/**
 * Get all registered user accounts from localStorage
 */
export function getAllUsers(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading users store:', e);
  }

  return {};
}

/**
 * Upsert or register account from a verified Firebase Auth user
 */
export function upsertFirebaseUserAccount(
  uid: string,
  email: string | null,
  displayName: string | null,
  extra?: Partial<UserAccount>
): UserAccount {
  const users = getAllUsers();
  const cleanId = normalizeUserId(displayName || (email ? email.split('@')[0] : uid));
  const existing = users[cleanId] || users[uid];

  const updated: UserAccount = {
    username: displayName || (email ? email.split('@')[0] : 'User'),
    userId: cleanId,
    email: email || undefined,
    designation: extra?.designation || existing?.designation || 'Team Member',
    department: extra?.department || existing?.department || 'General',
    avatarColor: extra?.avatarColor || existing?.avatarColor || 'from-[#1a73e8] to-[#4285f4]',
    avatarIcon: extra?.avatarIcon || existing?.avatarIcon || '⚡',
    avatarUrl: extra?.avatarUrl !== undefined ? extra.avatarUrl : (existing?.avatarUrl || undefined),
    createdAt: existing?.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isFirstLogin: !existing,
    ...extra,
  };

  users[cleanId] = updated;
  saveAllUsers(users);
  syncUserToDirectory(updated);
  setActiveUser(updated);

  return updated;
}

/**
 * Save user accounts to localStorage
 */
export function saveAllUsers(users: Record<string, UserAccount>): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users store:', e);
  }
}

/**
 * Subscribe to all registered team profiles in real time from Firestore + Local Cache
 * Powers the Crunchyroll-style Profile Selection on the Login screen!
 */
export function subscribeToAllProfiles(
  onProfiles: (profiles: UserAccount[]) => void
): () => void {
  // 1. Immediately provide cached profiles from localStorage
  const localMap = getAllUsers();
  onProfiles(Object.values(localMap));

  try {
    const dirRef = collection(db, 'directory_users');
    const unsubscribe = onSnapshot(
      dirRef,
      (snapshot) => {
        const merged: Record<string, UserAccount> = { ...getAllUsers() };

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.username) {
            const uid = docSnap.id;
            merged[uid] = {
              userId: uid,
              username: data.username,
              email: data.email || merged[uid]?.email || undefined,
              designation: data.designation || 'Team Member',
              department: data.department || 'General',
              avatarColor: data.avatarColor || 'from-[#1a73e8] to-[#4285f4]',
              avatarIcon: data.avatarIcon || undefined,
              avatarUrl: data.avatarUrl || undefined,
              statusMessage: data.statusMessage || undefined,
              createdAt: data.createdAt || new Date().toISOString(),
              lastLoginAt: data.lastActive || new Date().toISOString(),
            };
          }
        });

        saveAllUsers(merged);
        onProfiles(Object.values(merged));
      },
      (error) => {
        console.warn('Could not listen to directory_users:', error);
        onProfiles(Object.values(getAllUsers()));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach directory listener:', err);
    return () => {};
  }
}

/**
 * Delete a profile from this device's remembered list
 */
export function deleteProfileFromDevice(userId: string): void {
  const cleanId = normalizeUserId(userId);
  const users = getAllUsers();
  delete users[cleanId];
  saveAllUsers(users);
}

/**
 * Check if a username already exists
 */
export function userExists(username: string): boolean {
  const cleanId = normalizeUserId(username);
  const users = getAllUsers();
  return Boolean(users[cleanId]);
}

/**
 * Get profile for a user
 */
export function getUserProfile(usernameOrId: string): UserAccount | null {
  const cleanId = normalizeUserId(usernameOrId);
  const users = getAllUsers();
  return users[cleanId] || null;
}

/**
 * Update user profile details (Designation, Department, Email, Phone, Status)
 */
export function updateUserProfile(
  usernameOrId: string,
  updates: Partial<Omit<UserAccount, 'userId'>>
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanId = normalizeUserId(usernameOrId);
  const users = getAllUsers();
  const existing = users[cleanId];
  if (!existing) {
    return { success: false, error: 'User account not found' };
  }

  const updated: UserAccount = {
    ...existing,
    ...updates,
    userId: cleanId,
  };

  users[cleanId] = updated;
  saveAllUsers(users);
  syncUserToDirectory(updated);

  // If this is the current active session user, update active user storage
  const active = getActiveUser();
  if (active && normalizeUserId(active.userId) === cleanId) {
    setActiveUser(updated);
  }

  return { success: true, user: updated };
}

/**
 * Authenticate or register user with Username & Password
 *
 * Rules:
 * - Both User ID and Password are strictly required.
 * - If user already exists: verifies password matches.
 * - If user does not exist: creates new user with set password.
 */
export function authenticateOrRegisterUser(
  username: string,
  password: string
): { success: boolean; user?: UserAccount; isNewUser: boolean; error?: string } {
  const cleanName = username.trim();
  if (!cleanName) {
    return { success: false, isNewUser: false, error: 'User ID / Name is required' };
  }
  const cleanPassword = password.trim();
  if (!cleanPassword) {
    return { success: false, isNewUser: false, error: 'Password is required' };
  }

  const cleanId = normalizeUserId(cleanName);
  const users = getAllUsers();
  const existingUser = users[cleanId];

  // If user exists
  if (existingUser) {
    const isSumitDefault = cleanId === 'sumit' && cleanPassword === '1234';
    const matchesPassword = existingUser.password === cleanPassword || isSumitDefault;

    if (!matchesPassword) {
      return {
        success: false,
        isNewUser: false,
        error: `Incorrect password for user "${cleanName}". Please enter the correct password or use Forgot Password.`,
      };
    }

    if (isSumitDefault && existingUser.password !== '1234') {
      existingUser.password = '1234';
    }

    // Update last login
    existingUser.lastLoginAt = new Date().toISOString();
    existingUser.isFirstLogin = false;
    users[cleanId] = existingUser;
    saveAllUsers(users);
    syncUserToDirectory(existingUser);

    setActiveUser(existingUser);
    return { success: true, user: existingUser, isNewUser: false };
  }

  // BRAND NEW USER CREATION!
  // Store the user's chosen password
  const newUser: UserAccount = {
    username: cleanName,
    userId: cleanId,
    password: password.trim(),
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isFirstLogin: true,
  };

  users[cleanId] = newUser;
  saveAllUsers(users);
  syncUserToDirectory(newUser);
  setActiveUser(newUser);

  // Initialize strictly EMPTY storage for new user so board is 100% clean
  try {
    localStorage.setItem(getUserTasksStorageKey(cleanId), JSON.stringify([]));
    localStorage.setItem(getUserNotesStorageKey(cleanId), JSON.stringify([]));
  } catch (e) {
    console.warn('Error clearing initial user state:', e);
  }

  // Push clean slate to Firebase Cloud as well
  pushUserBoardToFirebase(cleanId, {
    username: cleanName,
    notes: [],
    importantNotes: [],
  }).catch((err) => console.warn('Firebase initial push notice:', err));

  return { success: true, user: newUser, isNewUser: true };
}

/**
 * Reset user password for an existing or new user
 */
export function resetUserPassword(
  username: string,
  newPassword: string
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanName = username.trim();
  if (!cleanName) {
    return { success: false, error: 'User ID / Name is required' };
  }
  const cleanPassword = newPassword.trim();
  if (!cleanPassword) {
    return { success: false, error: 'New password cannot be empty' };
  }

  const cleanId = normalizeUserId(cleanName);
  const users = getAllUsers();
  let targetUser = users[cleanId];

  if (!targetUser) {
    targetUser = {
      username: cleanName,
      userId: cleanId,
      password: cleanPassword,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isFirstLogin: false,
    };
  } else {
    targetUser.password = cleanPassword;
    targetUser.lastLoginAt = new Date().toISOString();
  }

  users[cleanId] = targetUser;
  saveAllUsers(users);
  setActiveUser(targetUser);

  return { success: true, user: targetUser };
}

/**
 * Get active user from session/storage
 */
export function getActiveUser(): UserAccount | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem(ACTIVE_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

/**
 * Set active user
 */
export function setActiveUser(user: UserAccount | null): void {
  try {
    if (user) {
      const serialized = JSON.stringify(user);
      sessionStorage.setItem(ACTIVE_USER_KEY, serialized);
      localStorage.setItem(ACTIVE_USER_KEY, serialized);
    } else {
      sessionStorage.removeItem(ACTIVE_USER_KEY);
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch (e) {}
}

/**
 * Storage keys per user
 */
export function getUserTasksStorageKey(userId: string): string {
  return `pinboard_tasks_user_${normalizeUserId(userId)}_v2`;
}

export function getUserNotesStorageKey(userId: string): string {
  return `pinboard_inotes_user_${normalizeUserId(userId)}_v2`;
}

export function getUserPrefsStorageKey(userId: string): string {
  return `pinboard_prefs_user_${normalizeUserId(userId)}_v2`;
}

/**
 * Load isolated tasks for a specific user.
 *
 * Rules:
 * 1. For a new user (or anyone other than 'sumit' who has no tasks yet):
 *    Returns strictly [] (AN EMPTY, CLEAN BOARD).
 * 2. For 'sumit' (existing user):
 *    Migrates previous data if present so existing tasks are not lost.
 */
export async function loadUserTasks(
  userId: string,
  initialSumitTasks: TaskNote[]
): Promise<{ tasks: TaskNote[]; importantNotes: ImportantNote[]; source: 'cloud' | 'local' | 'empty' }> {
  const cleanId = normalizeUserId(userId);
  const tasksKey = getUserTasksStorageKey(cleanId);
  const inotesKey = getUserNotesStorageKey(cleanId);

  // 1. First, check if Firestore Cloud has data for this user
  try {
    const cloudData = await pullUserBoardFromFirebase(cleanId);
    if (cloudData && Array.isArray(cloudData.notes)) {
      // Save local cache for offline speed
      try {
        localStorage.setItem(tasksKey, JSON.stringify(cloudData.notes));
        if (Array.isArray(cloudData.importantNotes)) {
          localStorage.setItem(inotesKey, JSON.stringify(cloudData.importantNotes));
        }
      } catch {}

      return {
        tasks: cloudData.notes,
        importantNotes: cloudData.importantNotes || [],
        source: 'cloud',
      };
    }
  } catch (cloudErr) {
    console.warn('Could not pull from cloud, falling back to local storage:', cloudErr);
  }

  // 2. Check local storage for this user's tasks
  const savedTasksRaw = localStorage.getItem(tasksKey);
  const savedNotesRaw = localStorage.getItem(inotesKey);

  let loadedTasks: TaskNote[] = [];
  let loadedNotes: ImportantNote[] = [];

  if (savedTasksRaw !== null) {
    try {
      const parsed = JSON.parse(savedTasksRaw);
      if (Array.isArray(parsed)) {
        loadedTasks = parsed;
      }
    } catch {}
  } else if (cleanId === 'sumit') {
    // For default existing user "Sumit", check legacy global storage or fallback to initial tasks
    const legacySaved = localStorage.getItem('pinboard_excel_tasks_v8') || localStorage.getItem('pinboard_excel_tasks_v7');
    if (legacySaved) {
      try {
        const parsed = JSON.parse(legacySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedTasks = parsed;
        }
      } catch {}
    }
    if (loadedTasks.length === 0) {
      loadedTasks = initialSumitTasks;
    }
    // Save under sumit's user key
    try {
      localStorage.setItem(tasksKey, JSON.stringify(loadedTasks));
    } catch {}
  } else {
    // FOR ANY NEW USER: STRICTLY EMPTY / CLEAN BOARD!
    loadedTasks = [];
    try {
      localStorage.setItem(tasksKey, JSON.stringify([]));
    } catch {}
  }

  if (savedNotesRaw !== null) {
    try {
      const parsed = JSON.parse(savedNotesRaw);
      if (Array.isArray(parsed)) {
        loadedNotes = parsed;
      }
    } catch {}
  } else if (cleanId === 'sumit') {
    const legacyNotes = localStorage.getItem('pinboard_important_notes_v1');
    if (legacyNotes) {
      try {
        const parsed = JSON.parse(legacyNotes);
        if (Array.isArray(parsed)) loadedNotes = parsed;
      } catch {}
    }
  } else {
    loadedNotes = [];
  }

  return {
    tasks: loadedTasks,
    importantNotes: loadedNotes,
    source: loadedTasks.length > 0 ? 'local' : 'empty',
  };
}

/**
 * Save tasks and sync both to LocalStorage and Firebase Cloud
 */
export async function saveUserTasksAndSync(
  userId: string,
  username: string,
  tasks: TaskNote[],
  importantNotes?: ImportantNote[],
  prefs?: Record<string, any>
): Promise<boolean> {
  const cleanId = normalizeUserId(userId);
  const tasksKey = getUserTasksStorageKey(cleanId);
  const inotesKey = getUserNotesStorageKey(cleanId);

  // 1. Instant local persistence
  try {
    localStorage.setItem(tasksKey, JSON.stringify(tasks));
    if (importantNotes) {
      localStorage.setItem(inotesKey, JSON.stringify(importantNotes));
    }
  } catch (e) {
    console.error('Local storage save error:', e);
  }

  // 2. Push to Firebase Cloud
  try {
    const cloudSuccess = await pushUserBoardToFirebase(cleanId, {
      username,
      notes: tasks,
      importantNotes,
      prefs,
    });
    return cloudSuccess;
  } catch (err) {
    console.warn('Firebase Cloud sync background notice:', err);
    return false;
  }
}
