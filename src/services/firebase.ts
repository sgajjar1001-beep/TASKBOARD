import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TaskNote, ImportantNote } from '../types';

// Operation types for strict Firestore error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Firestore with custom databaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connectivity check test function
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified successfully');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is unreachable');
      return false;
    }
    // Connection still viable even if document is not found
    console.log('Firebase initialized (reachable)');
    return true;
  }
}

// User Record interface for authentication and credentials
export interface UserAccount {
  userId: string; // normalized lowercase username (e.g., "sumit", "rahul")
  displayName: string; // original casing (e.g., "Sumit", "Rahul Kumar")
  passwordHash: string; // stored credentials
  createdAt: string;
  lastLoginAt: string;
  isFirstLogin?: boolean;
}

export interface UserBoardPayload {
  userId: string;
  username: string;
  notes: TaskNote[];
  importantNotes?: ImportantNote[];
  prefs?: Record<string, any>;
  updatedAt: number;
  serverTimestamp?: string;
}

/**
 * Normalizes username to a safe, consistent key for Firestore & LocalStorage
 */
export function normalizeUserId(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'user_default';
}

/**
 * Push user tasks and data to Firebase Firestore
 */
export async function pushUserBoardToFirebase(
  userId: string,
  data: {
    username: string;
    notes: TaskNote[];
    importantNotes?: ImportantNote[];
    prefs?: Record<string, any>;
  }
): Promise<boolean> {
  const cleanId = normalizeUserId(userId);
  const docPath = `users/${cleanId}`;

  try {
    const payload: UserBoardPayload = {
      userId: cleanId,
      username: data.username,
      notes: data.notes,
      importantNotes: data.importantNotes || [],
      prefs: data.prefs || {},
      updatedAt: Date.now(),
      serverTimestamp: new Date().toISOString(),
    };

    const docRef = doc(db, 'users', cleanId);
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.warn(`Firestore sync write error on ${docPath}:`, error);
    // Don't crash client UI if Firestore fails temporarily; local storage handles persistence
    return false;
  }
}

/**
 * Pull user tasks and data from Firebase Firestore
 */
export async function pullUserBoardFromFirebase(
  userId: string
): Promise<UserBoardPayload | null> {
  const cleanId = normalizeUserId(userId);
  const docPath = `users/${cleanId}`;

  try {
    const docRef = doc(db, 'users', cleanId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return snap.data() as UserBoardPayload;
    }
    return null;
  } catch (error) {
    console.warn(`Firestore read error on ${docPath}:`, error);
    return null;
  }
}

/**
 * Subscribe to real-time updates for a user's board
 */
export function subscribeToFirebaseUserBoard(
  userId: string,
  onData: (payload: UserBoardPayload) => void,
  onError?: (err: any) => void
): () => void {
  const cleanId = normalizeUserId(userId);
  const docPath = `users/${cleanId}`;

  try {
    const docRef = doc(db, 'users', cleanId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onData(snapshot.data() as UserBoardPayload);
        }
      },
      (error) => {
        console.warn(`Snapshot listener error on ${docPath}:`, error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`Failed to attach snapshot on ${docPath}:`, err);
    return () => {};
  }
}
