import type { Condition } from './conditions';
import type { Theme } from '../hooks/useTheme';

export interface SkyPalette {
  top: string;
  horizon: string;
  bottom: string;
  cloud: string;
  shadow: string;
  cover: number; // 0..1 cloud coverage
  speed: number; // drift multiplier
  stars: number; // 0..1
  sun: string; // glow colour (sun or moon)
  sunStrength: number;
}

type Table = Record<Condition, SkyPalette>;

const light: Table = {
  clear: { top: '#7fa3d6', horizon: '#b8cde8', bottom: '#dbe5f2', cloud: '#f0f4fa', shadow: '#9db6d8', cover: 0.18, speed: 0.7, stars: 0, sun: '#fcd396', sunStrength: 0.65 },
  partly: { top: '#8aa8d6', horizon: '#bcd1e8', bottom: '#dde6f2', cloud: '#f2f6fa', shadow: '#9fb5d4', cover: 0.42, speed: 0.85, stars: 0, sun: '#fadba7', sunStrength: 0.5 },
  cloudy: { top: '#9eb0c6', horizon: '#c2cedd', bottom: '#d9e1ec', cloud: '#edf2f7', shadow: '#96a6ba', cover: 0.74, speed: 0.8, stars: 0, sun: '#f7e7d2', sunStrength: 0.2 },
  fog: { top: '#b2bcc9', horizon: '#cdd5df', bottom: '#dfe4eb', cloud: '#ecf0f5', shadow: '#a7b2bf', cover: 0.6, speed: 0.4, stars: 0, sun: '#f7ecde', sunStrength: 0.18 },
  drizzle: { top: '#94a5bd', horizon: '#bac7d7', bottom: '#d2dce8', cloud: '#e5ecf5', shadow: '#8a9bb3', cover: 0.7, speed: 1.0, stars: 0, sun: '#f7ecde', sunStrength: 0.14 },
  rain: { top: '#8295ae', horizon: '#a8b9cc', bottom: '#c5d2e0', cloud: '#dce5ef', shadow: '#7688a0', cover: 0.84, speed: 1.25, stars: 0, sun: '#ffffff', sunStrength: 0.06 },
  snow: { top: '#8fa5c4', horizon: '#b5cae2', bottom: '#d4e2f0', cloud: '#ffffff', shadow: '#8fa8c7', cover: 0.82, speed: 0.6, stars: 0, sun: '#e2edfc', sunStrength: 0.1 },
  storm: { top: '#6a778e', horizon: '#8f9dae', bottom: '#b0bcc9', cloud: '#b8c3d0', shadow: '#505d73', cover: 0.92, speed: 1.7, stars: 0, sun: '#ffffff', sunStrength: 0 },
};

const dark: Table = {
  clear: { top: '#04070f', horizon: '#0c1530', bottom: '#1d1a44', cloud: '#26315a', shadow: '#0a1022', cover: 0.14, speed: 0.6, stars: 1, sun: '#8fa8ff', sunStrength: 0.42 },
  partly: { top: '#060a14', horizon: '#0f1833', bottom: '#1c1e42', cloud: '#2a3358', shadow: '#0b1122', cover: 0.4, speed: 0.8, stars: 0.65, sun: '#8fa8ff', sunStrength: 0.32 },
  cloudy: { top: '#090d18', horizon: '#141b2e', bottom: '#1d2236', cloud: '#2a3149', shadow: '#0d111d', cover: 0.75, speed: 0.8, stars: 0.12, sun: '#8fa8ff', sunStrength: 0.1 },
  fog: { top: '#0c1019', horizon: '#191e2b', bottom: '#232836', cloud: '#2d3344', shadow: '#151922', cover: 0.62, speed: 0.4, stars: 0.05, sun: '#8fa8ff', sunStrength: 0.08 },
  drizzle: { top: '#070b14', horizon: '#121a2b', bottom: '#1a2334', cloud: '#273147', shadow: '#0a0f19', cover: 0.74, speed: 1, stars: 0.05, sun: '#8fa8ff', sunStrength: 0.05 },
  rain: { top: '#060912', horizon: '#0f1727', bottom: '#172030', cloud: '#232c42', shadow: '#080c15', cover: 0.86, speed: 1.3, stars: 0, sun: '#8fa8ff', sunStrength: 0 },
  snow: { top: '#050c18', horizon: '#0d182e', bottom: '#18243c', cloud: '#2a3a5e', shadow: '#080e1c', cover: 0.80, speed: 0.6, stars: 0.1, sun: '#a9bcff', sunStrength: 0.1 },
  storm: { top: '#03050b', horizon: '#0a0e1a', bottom: '#131929', cloud: '#1e2437', shadow: '#04060c', cover: 0.92, speed: 1.8, stars: 0, sun: '#8fa8ff', sunStrength: 0 },
};

export function palette(theme: Theme, condition: Condition): SkyPalette {
  return (theme === 'dark' ? dark : light)[condition];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Shared, mutable effect state so the precipitation layer can trigger lightning in the sky shader. */
export const fx = { flash: 0 };
