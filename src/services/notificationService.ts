/**
 * Browser & System Notification Service for Task Reminders
 * Supports Desktop (Chrome, Edge, Safari, Firefox) and Mobile (Android Chrome, PWA)
 */

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationPermissionState;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return Notification.permission as NotificationPermissionState;
  }
}

// Track fired reminder IDs during this session so we don't spam notifications
const firedReminderIds = new Set<string>();

export function hasReminderFired(reminderKey: string): boolean {
  return firedReminderIds.has(reminderKey);
}

export function markReminderFired(reminderKey: string): void {
  firedReminderIds.add(reminderKey);
}

export function clearFiredReminder(reminderKey: string): void {
  firedReminderIds.delete(reminderKey);
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
    onClick?: () => void;
  }
): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body || 'Task Reminder from Board',
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag || 'task-reminder',
      badge: '/favicon.ico',
      silent: false,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      options?.onClick?.();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('Could not display system notification:', err);
    return false;
  }
}

// Play gentle alert chime for task reminder
export function playReminderChime(muted: boolean = false): void {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Friendly 2-tone melodic chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(293.66, now); // D4
    osc2.frequency.setValueAtTime(440, now + 0.15); // A4

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  } catch (e) {
    // AudioContext blocked or unsupported
  }
}
