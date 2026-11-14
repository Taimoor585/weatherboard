/**
 * Safe wrapper around localStorage. Private mode, disabled storage, quota errors or
 * sandboxed iframes all fall back to an in-memory map so the app never crashes.
 */
const memory = new Map<string, string>();

function detect(): boolean {
  try {
    const k = '__wb_probe__';
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export const storageAvailable = typeof window !== 'undefined' && detect();

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = storageAvailable ? window.localStorage.getItem(key) : memory.get(key) ?? null;
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): boolean {
    const raw = JSON.stringify(value);
    try {
      if (storageAvailable) window.localStorage.setItem(key, raw);
      else memory.set(key, raw);
      return true;
    } catch {
      memory.set(key, raw);
      return false;
    }
  },
  remove(key: string) {
    try {
      if (storageAvailable) window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    memory.delete(key);
  },
};

export const KEYS = {
  theme: 'wb:theme',
  units: 'wb:units',
  favourites: 'wb:favourites',
  lastCity: 'wb:last-city',
  lastWeather: 'wb:last-weather',
  reminder: 'wb:reminder',
  introSeen: 'wb:intro-seen',
} as const;
