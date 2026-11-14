import { useCallback, useEffect, useRef, useState } from 'react';
import { idbSet } from '../lib/idb';
import { KEYS, storage } from '../lib/storage';
import { AppError, type City, type WeatherData } from '../lib/types';
import { fetchWeather } from '../lib/weather';

type Cache = Record<string, WeatherData>;
const CACHE_LIMIT = 12;
const REFRESH_MS = 10 * 60 * 1000;

function readCache(): Cache {
  const c = storage.get<Cache>(KEYS.lastWeather, {});
  return c && typeof c === 'object' ? c : {};
}

function writeCache(data: WeatherData) {
  const cache = readCache();
  cache[data.city.id] = data;
  const entries = Object.values(cache)
    .sort((a, b) => b.fetchedAt - a.fetchedAt)
    .slice(0, CACHE_LIMIT);
  storage.set(KEYS.lastWeather, Object.fromEntries(entries.map((e) => [e.city.id, e])));
}

export interface WeatherState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: WeatherData | null;
  error: AppError | null;
  /** data shown came from the offline cache */
  fromCache: boolean;
  refreshing: boolean;
}

export function useWeather(city: City | null, online: boolean) {
  const [state, setState] = useState<WeatherState>(() => {
    const cached = city ? readCache()[city.id] : undefined;
    return { status: cached ? 'success' : 'idle', data: cached ?? null, error: null, fromCache: !!cached, refreshing: false };
  });
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(
    async (target: City, mode: 'switch' | 'refresh') => {
      ctrl.current?.abort();
      const ac = new AbortController();
      ctrl.current = ac;
      const cached = readCache()[target.id];

      if (mode === 'switch') {
        if (cached) {
          // Render cached data cleanly without triggering offline alert banners
          setState({
            status: 'success',
            data: cached,
            error: null,
            fromCache: false,
            refreshing: true, // background silent revalidation
          });
        } else {
          // Cold switch: immediately clear old city data so user gets instant loading feedback!
          setState({
            status: 'loading',
            data: null,
            error: null,
            fromCache: false,
            refreshing: false,
          });
        }
      } else {
        setState((s) => ({ ...s, refreshing: true, error: null }));
      }

      try {
        const data = await fetchWeather(target, ac.signal);
        if (ac.signal.aborted) return;
        writeCache(data);
        storage.set(KEYS.lastCity, target);
        void idbSet('lastCity', target);
        setState({ status: 'success', data, error: null, fromCache: false, refreshing: false });
      } catch (err) {
        if (ac.signal.aborted) return;
        const e =
          err instanceof AppError
            ? err
            : new AppError('server', 'Weather data could not be loaded.', 'Try again in a moment.');
        if (cached) {
          // Show the last good copy and explain why it's not live.
          storage.set(KEYS.lastCity, target);
          setState({ status: 'success', data: cached, error: e, fromCache: true, refreshing: false });
        } else {
          setState((s) => ({ status: 'error', data: mode === 'refresh' ? s.data : null, error: e, fromCache: false, refreshing: false }));
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (city) void load(city, 'switch');
    return () => ctrl.current?.abort();
  }, [city, load]);

  // Coming back online: refresh silently.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current && city) void load(city, 'refresh');
    wasOnline.current = online;
  }, [online, city, load]);

  // Keep it fresh while the tab is visible.
  useEffect(() => {
    if (!city) return;
    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void load(city, 'refresh');
    };
    const id = window.setInterval(tick, REFRESH_MS);
    const onVis = () => {
      const age = Date.now() - (state.data?.fetchedAt ?? 0);
      if (document.visibilityState === 'visible' && age > REFRESH_MS) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [city, load, state.data?.fetchedAt]);

  const refresh = useCallback(() => {
    if (city) void load(city, 'refresh');
  }, [city, load]);

  const retry = useCallback(() => {
    if (city) void load(city, 'switch');
  }, [city, load]);

  return { ...state, refresh, retry };
}

export function getCachedCities(): string[] {
  return Object.keys(readCache());
}
