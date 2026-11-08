export interface SyncPayload {
  notes: any[];
  importantNotes?: any[];
  userName?: string;
  boardStyle?: string;
  autoLockDuration?: number;
  lastUpdated: number;
  clientVersion?: string;
}

export const SYNC_KEY_STORAGE = 'pinboard_sync_key_v1';
export const AUTO_SYNC_STORAGE = 'pinboard_auto_sync_v1';
export const LAST_SYNCED_STORAGE = 'pinboard_last_synced_v1';
export const DEVICE_ID_STORAGE = 'pinboard_device_id_v1';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_STORAGE);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem(DEVICE_ID_STORAGE, id);
    }
    return id;
  } catch {
    return 'dev-browser';
  }
}

export function getStoredSyncKey(): string {
  try {
    // 1. Check URL query or hash for ?sync=... or #sync=...
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get('sync');
      if (urlKey && urlKey.trim()) {
        const clean = urlKey.trim().toUpperCase();
        localStorage.setItem(SYNC_KEY_STORAGE, clean);
        return clean;
      }

      if (window.location.hash.startsWith('#sync=')) {
        const hashKey = window.location.hash.replace('#sync=', '').trim().toUpperCase();
        if (hashKey) {
          localStorage.setItem(SYNC_KEY_STORAGE, hashKey);
          return hashKey;
        }
      }
    }

    const saved = localStorage.getItem(SYNC_KEY_STORAGE);
    if (saved && saved.trim()) {
      return saved.trim().toUpperCase();
    }

    // Default friendly sync key
    const generated = 'SUMIT-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem(SYNC_KEY_STORAGE, generated);
    return generated;
  } catch {
    return 'SUMIT-DESK';
  }
}

export function saveStoredSyncKey(key: string): void {
  try {
    const clean = key.trim().toUpperCase();
    localStorage.setItem(SYNC_KEY_STORAGE, clean);
  } catch {
    // ignore
  }
}

export function getAutoSyncEnabled(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_SYNC_STORAGE);
    // Enabled by default for seamless multi-device sync
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SYNC_STORAGE, String(enabled));
  } catch {
    // ignore
  }
}

export function getLastSyncedTime(): number {
  try {
    const saved = localStorage.getItem(LAST_SYNCED_STORAGE);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function setLastSyncedTime(time: number): void {
  try {
    localStorage.setItem(LAST_SYNCED_STORAGE, String(time));
  } catch {
    // ignore
  }
}

/**
 * Push local data to the Cloud Sync server
 */
export async function pushSyncData(
  key: string,
  payload: SyncPayload
): Promise<{ success: boolean; updatedAt?: number; error?: string }> {
  try {
    const cleanKey = key.trim().toUpperCase();
    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: cleanKey,
        payload: {
          ...payload,
          deviceId: getDeviceId(),
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Server responded with ${res.status}` };
    }

    const data = await res.json();
    if (data.updatedAt) {
      setLastSyncedTime(data.updatedAt);
    }
    return { success: true, updatedAt: data.updatedAt };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error connecting to sync server' };
  }
}

/**
 * Pull data from Cloud Sync server
 */
export async function pullSyncData(
  key: string
): Promise<{ success: boolean; data?: SyncPayload; notFound?: boolean; error?: string }> {
  try {
    const cleanKey = key.trim().toUpperCase();
    const res = await fetch(`/api/sync/pull?key=${encodeURIComponent(cleanKey)}`);

    if (res.status === 404) {
      return { success: false, notFound: true, error: 'No data exists for this sync key' };
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Server responded with ${res.status}` };
    }

    const resData = await res.json();
    if (resData.data) {
      if (resData.updatedAt) {
        setLastSyncedTime(resData.updatedAt);
      }
      return { success: true, data: resData.data };
    }

    return { success: false, error: 'Empty data received' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error connecting to sync server' };
  }
}

/**
 * Check sync key status and timestamp without pulling entire payload
 */
export async function checkSyncStatus(
  key: string
): Promise<{ exists: boolean; updatedAt?: number; itemCount?: number; userName?: string }> {
  try {
    const cleanKey = key.trim().toUpperCase();
    const res = await fetch(`/api/sync/status?key=${encodeURIComponent(cleanKey)}`);
    if (!res.ok) {
      return { exists: false };
    }
    const data = await res.json();
    return data;
  } catch {
    return { exists: false };
  }
}

/**
 * Export a downloadable JSON backup file
 */
export function exportBackupFile(payload: SyncPayload, customName?: string): void {
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = customName || `task_backup_${dateStr}.json`;
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Error exporting backup file:', e);
  }
}

/**
 * Read and validate an uploaded JSON backup file
 */
export function importBackupFile(file: File): Promise<SyncPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          // Array of notes directly
          resolve({
            notes: parsed,
            lastUpdated: Date.now(),
          });
        } else if (parsed && Array.isArray(parsed.notes)) {
          resolve(parsed);
        } else {
          reject(new Error('Invalid backup file structure: missing notes array'));
        }
      } catch (err) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
}

/**
 * Generate shareable link to open on another device with sync key pre-configured
 */
export function generateShareUrl(key: string): string {
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?sync=${encodeURIComponent(key.trim().toUpperCase())}`;
  } catch {
    return `?sync=${encodeURIComponent(key)}`;
  }
}
