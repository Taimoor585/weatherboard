import { idbGet, idbSet } from './idb';
import { KEYS, storage } from './storage';
import type { ReminderSettings } from './types';

export type { ReminderSettings };

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, time: '07:30' };

export type DeliveryMode = 'background' | 'scheduled' | 'foreground' | 'unsupported';

export interface Capabilities {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  periodicSync: boolean;
  triggers: boolean;
  push: boolean;
  mode: DeliveryMode;
  reason?: string;
}

export function capabilities(): Capabilities {
  const hasN = typeof window !== 'undefined' && 'Notification' in window;
  const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  if (!hasN || !hasSW) {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return {
      supported: false,
      permission: 'unsupported',
      periodicSync: false,
      triggers: false,
      push: false,
      mode: 'unsupported',
      reason: ios
        ? 'On iPhone and iPad, notifications only work after you add WeatherBoard to your Home Screen (Share → Add to Home Screen).'
        : "This browser doesn't support web notifications.",
    };
  }
  const periodicSync = 'periodicSync' in ServiceWorkerRegistration.prototype;
  const triggers = 'showTrigger' in Notification.prototype;
  const push = 'PushManager' in window;
  return {
    supported: true,
    permission: Notification.permission,
    periodicSync,
    triggers,
    push,
    mode: periodicSync ? 'background' : triggers ? 'scheduled' : 'foreground',
  };
}

export function readReminder(): ReminderSettings {
  const r = storage.get<ReminderSettings>(KEYS.reminder, DEFAULT_REMINDER);
  return { ...DEFAULT_REMINDER, ...r };
}

export async function saveReminder(r: ReminderSettings) {
  storage.set(KEYS.reminder, r);
  const prev = await idbGet<ReminderSettings>('reminder');
  // keep lastSent written by the service worker
  await idbSet('reminder', { ...r, lastSent: r.lastSent ?? prev?.lastSent });
}

export function nextOccurrence(time: string, from = new Date()): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

export function validateTime(value: string): string | null {
  if (!value) return 'Choose a time for your morning reminder.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return 'Use a valid 24-hour time, like 07:30.';
  return null;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), 4000)),
    ]);
  } catch {
    return null;
  }
}

/** Arms every background mechanism this browser supports. Returns the strongest one in use. */
export async function armReminder(r: ReminderSettings): Promise<DeliveryMode> {
  const reg = await registration();
  const caps = capabilities();
  if (!reg || !caps.supported) return 'unsupported';

  let mode: DeliveryMode = 'foreground';

  // 1. Periodic Background Sync — wakes the SW even when every tab is closed (installed Chromium PWAs).
  if (caps.periodicSync) {
    try {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
      if (status.state === 'granted') {
        // periodicSync is not in lib.dom yet
        await (reg as any).periodicSync.register('wb-morning', { minInterval: 60 * 60 * 1000 });
        mode = 'background';
      }
    } catch {
      /* not installed / not allowed — try the next mechanism */
    }
  }

  // 2. Notification Triggers — OS-level scheduled notification where available.
  if (caps.triggers) {
    try {
      const existing = await reg.getNotifications({ tag: 'wb-morning-scheduled' });
      existing.forEach((n) => n.close());
      const when = nextOccurrence(r.time).getTime();
      await reg.showNotification('Good morning ☀', {
        tag: 'wb-morning-scheduled',
        body: "Tap to see today's forecast.",
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        // experimental TimestampTrigger
        showTrigger: new (window as any).TimestampTrigger(when),
      } as NotificationOptions);
      if (mode !== 'background') mode = 'scheduled';
    } catch {
      /* ignore */
    }
  }

  reg.active?.postMessage({ type: 'reminder:update', reminder: r });
  return mode;
}

export async function disarmReminder() {
  const reg = await registration();
  if (!reg) return;
  try {
    await (reg as any).periodicSync?.unregister('wb-morning');
  } catch {
    /* ignore */
  }
  try {
    const existing = await reg.getNotifications({ tag: 'wb-morning-scheduled' });
    existing.forEach((n) => n.close());
  } catch {
    /* ignore */
  }
}

/** Asks the service worker to fetch fresh weather and show the reminder right now. */
export async function sendTestNotification(): Promise<boolean> {
  const reg = await registration();
  if (!reg?.active) return false;
  reg.active.postMessage({ type: 'reminder:show', test: true });
  return true;
}
