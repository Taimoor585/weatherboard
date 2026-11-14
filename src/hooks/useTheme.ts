import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { KEYS, storage } from '../lib/storage';

export type Theme = 'light' | 'dark';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initial(): { theme: Theme; explicit: boolean } {
  const saved = storage.get<Theme | null>(KEYS.theme, null);
  if (saved === 'light' || saved === 'dark') return { theme: saved, explicit: true };
  return { theme: media().matches ? 'dark' : 'light', explicit: false };
}

function paint(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a1024' : '#eef3fb');
}

/**
 * Light/dark theme with system preference detection. Switching uses the View Transitions API
 * so the new theme is "poured" across the page from the top-left corner with a feathered edge.
 */
export function useTheme() {
  const [{ theme, explicit }, setState] = useState(initial);

  useEffect(() => paint(theme), [theme]);

  // Follow the OS while the user hasn't made an explicit choice.
  useEffect(() => {
    if (explicit) return;
    const mq = media();
    const onChange = () => setState({ theme: mq.matches ? 'dark' : 'light', explicit: false });
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [explicit]);

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set(KEYS.theme, next);
    const commit = () => {
      paint(next);
      setState({ theme: next, explicit: true });
    };
    const root = document.documentElement;
    if (!document.startViewTransition || reduced()) {
      root.classList.add('theme-fade');
      commit();
      window.setTimeout(() => root.classList.remove('theme-fade'), 700);
      return;
    }
    root.classList.add('vt-theme');
    const vt = document.startViewTransition(() => flushSync(commit));
    vt.finished.finally(() => root.classList.remove('vt-theme'));
  }, []);

  const followSystem = useCallback(() => {
    storage.remove(KEYS.theme);
    setState({ theme: media().matches ? 'dark' : 'light', explicit: false });
  }, []);

  return { theme, explicit, toggle, followSystem };
}
