/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';
import { idbGet, idbSet } from './lib/idb';
import { fromWmo } from './lib/conditions';
import type { City, ReminderSettings } from './lib/types';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

/* ─────────────── App shell ─────────────── */
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
if (import.meta.env.PROD) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));
}

/* ─────────────── Weather data (network first, cache fallback for offline) ─────────────── */
registerRoute(
  ({ url }) => /(^|\.)open-meteo\.com$|(^|\.)openweathermap\.org$/.test(url.hostname),
  new NetworkFirst({
    cacheName: 'wb-weather',
    networkTimeoutSeconds: 8,
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 48 })],
  }),
);
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({ cacheName: 'wb-fonts', plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
);

/* ─────────────── Morning reminder ─────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function buildSummary(): Promise<{ title: string; body: string }> {
  const city = await idbGet<City>('lastCity');
  const units = (await idbGet<'metric' | 'imperial'>('units')) ?? 'metric';
  if (!city) return { title: 'Good morning', body: 'Open WeatherBoard to check today’s weather.' };
  try {
    const params = new URLSearchParams({
      latitude: String(city.lat),
      longitude: String(city.lon),
      current: 'temperature_2m,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: '1',
      temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    const w = fromWmo(d.current.weather_code);
    const t = Math.round(d.current.temperature_2m);
    const hi = Math.round(d.daily.temperature_2m_max[0]);
    const lo = Math.round(d.daily.temperature_2m_min[0]);
    const pop = d.daily.precipitation_probability_max?.[0] ?? 0;
    const tip =
      pop >= 60 ? 'Take an umbrella.' : pop >= 30 ? 'Maybe pack a light jacket.' : w.condition === 'clear' ? 'Enjoy the sunshine.' : '';
    return {
      title: `${city.name} · ${t}° ${w.description}`,
      body: `High ${hi}° · Low ${lo}° · ${pop}% chance of rain. ${tip}`.trim(),
    };
  } catch {
    return { title: `Good morning, ${city.name}`, body: 'Tap to see today’s forecast.' };
  }
}

async function showReminder(test = false) {
  const { title, body } = await buildSummary();
  await self.registration.showNotification(test ? `Test · ${title}` : title, {
    body,
    tag: test ? 'wb-test' : 'wb-morning',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  });
}

/** Fires the daily reminder once per day, any time within 4h after the chosen time. */
async function maybeRemind() {
  const r = await idbGet<ReminderSettings>('reminder');
  if (!r?.enabled || Notification.permission !== 'granted') return;
  const now = new Date();
  const [h, m] = r.time.split(':').map(Number);
  const due = new Date(now);
  due.setHours(h, m, 0, 0);
  const late = now.getTime() - due.getTime();
  if (late < 0 || late > 4 * 3600 * 1000) return;
  if (r.lastSent === todayKey(now)) return;
  await idbSet('reminder', { ...r, lastSent: todayKey(now) });
  await showReminder(false);
}

self.addEventListener('message', (event) => {
  const msg = event.data as { type?: string; test?: boolean };
  if (msg?.type === 'reminder:show') event.waitUntil(showReminder(!!msg.test));
  if (msg?.type === 'reminder:due') event.waitUntil(maybeRemind());
});

// Periodic Background Sync — runs even when no tab is open (installed Chromium PWAs).
self.addEventListener('periodicsync' as keyof ServiceWorkerGlobalScopeEventMap, (event: Event) => {
  const e = event as ExtendableEvent & { tag: string };
  if (e.tag === 'wb-morning') e.waitUntil(maybeRemind());
});

// Ready for a real Web Push backend (VAPID) — see README.
self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() as { title?: string; body?: string } | undefined;
  event.waitUntil(
    payload?.title
      ? self.registration.showNotification(payload.title, { body: payload.body, icon: '/icon-192.png', badge: '/icon-192.png' })
      : showReminder(false),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = all.find((c) => 'focus' in c) as WindowClient | undefined;
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })(),
  );
});
