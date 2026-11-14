import { useEffect, useRef } from 'react';
import type { Condition } from '../lib/conditions';
import { fx } from '../lib/sky';
import type { Theme } from '../hooks/useTheme';

interface Props {
  condition: Condition;
  theme: Theme;
  windKmh: number;
  reduced: boolean;
}

interface Drop {
  x: number;
  y: number;
  z: number; // depth 0..1 (near = 1)
  v: number;
  len: number;
  phase: number;
}

const DENSITY: Partial<Record<Condition, number>> = { drizzle: 0.35, rain: 1, storm: 1.5, snow: 0.75 };

/** Rain / drizzle / snow particles with depth, wind slant and storm lightning. */
export function Precipitation({ condition, theme, windKmh, reduced }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ condition, theme, windKmh });
  live.current = { condition, theme, windKmh };

  const active = !reduced && DENSITY[condition] != null;

  useEffect(() => {
    if (!active) return;
    const el = ref.current!;
    const ctx = el.getContext('2d')!;
    let w = 0;
    let h = 0;
    let drops: Drop[] = [];
    const dpr = Math.min(window.devicePixelRatio, 1.5);

    const spawn = (anyY: boolean): Drop => {
      const z = Math.random() ** 1.6;
      return {
        x: Math.random() * (w + 200) - 100,
        y: anyY ? Math.random() * h : -30 - Math.random() * 80,
        z,
        v: 0,
        len: 10 + z * 18,
        phase: Math.random() * Math.PI * 2,
      };
    };
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(((w * h) / 9000) * (DENSITY[live.current.condition] ?? 0));
      drops = Array.from({ length: Math.min(target, 420) }, () => spawn(true));
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let nextBolt = performance.now() + 3000 + Math.random() * 5000;
    let boltSeq: number[] = [];

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { condition: c, theme: th, windKmh: wind } = live.current;
      const snow = c === 'snow';
      const slant = Math.max(-0.45, Math.min(0.45, wind / 90)) + 0.08;
      ctx.clearRect(0, 0, w, h);

      const dark = th === 'dark';
      ctx.lineCap = 'round';
      for (const d of drops) {
        if (snow) {
          const speed = 26 + d.z * 60;
          d.y += speed * dt;
          d.phase += dt * (0.8 + d.z);
          d.x += (Math.sin(d.phase) * 18 + slant * 40) * dt;
          const r = 0.8 + d.z * 2.6;
          ctx.globalAlpha = 0.35 + d.z * 0.55;
          ctx.fillStyle = dark ? '#e8eeff' : '#ffffff';
          ctx.beginPath();
          ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const speed = (c === 'drizzle' ? 520 : 900) + d.z * 700;
          d.y += speed * dt;
          d.x += speed * slant * dt;
          const len = c === 'drizzle' ? d.len * 0.55 : d.len;
          ctx.globalAlpha = (c === 'drizzle' ? 0.18 : 0.22) + d.z * 0.35;
          ctx.strokeStyle = dark ? '#aebfe6' : '#5d7396';
          ctx.lineWidth = 0.6 + d.z * 0.9;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - slant * len, d.y - len);
          ctx.stroke();
        }
        if (d.y - 30 > h || d.x < -120 || d.x > w + 120) Object.assign(d, spawn(false));
      }
      ctx.globalAlpha = 1;

      // lightning: double/triple flicker every 5–12 s
      if (c === 'storm') {
        if (now > nextBolt && boltSeq.length === 0) {
          boltSeq = [now, now + 90, now + 260];
          nextBolt = now + 5000 + Math.random() * 7000;
        }
        if (boltSeq.length && now >= boltSeq[0]) {
          fx.flash = 0.6 + Math.random() * 0.4;
          boltSeq.shift();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active, condition]);

  if (!active) return null;
  return <canvas ref={ref} className="precip-canvas" aria-hidden="true" />;
}
