import { useId } from 'react';
import type { Condition } from '../lib/conditions';

interface Props {
  condition: Condition;
  isDay?: boolean;
  size?: number;
  className?: string;
  title?: string;
  /** static = no looping animation (dense lists) */
  still?: boolean;
}

const CLOUD = 'M19 48H46A9 9 0 0 0 47.5 30.1A13 13 0 0 0 23.6 27.4A10.5 10.5 0 0 0 19 48Z';

/**
 * Hand-built animated SVG weather icons. Every part animates with CSS
 * (transform/opacity only, so it stays on the compositor).
 */
export function WeatherIcon({ condition, isDay = true, size = 64, className = '', title, still }: Props) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${uid}`;

  const precip = condition === 'rain' || condition === 'drizzle' || condition === 'storm' || condition === 'snow';
  const showSun = isDay && (condition === 'clear' || condition === 'partly');
  const showMoon = !isDay && (condition === 'clear' || condition === 'partly');
  const showCloud = condition !== 'clear';
  const cloudTone =
    condition === 'storm' ? 'storm' : condition === 'rain' || condition === 'drizzle' ? 'rain' : 'soft';

  const sunTransform = condition === 'partly' ? 'translate(-9 -9) scale(0.78)' : undefined;
  const sunOrigin = condition === 'partly' ? undefined : undefined;
  const cloudTransform = precip ? 'translate(0 -7)' : condition === 'partly' ? 'translate(3 3)' : condition === 'fog' ? 'translate(0 -6)' : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`wi ${still ? 'wi--still' : ''} ${className}`}
      role="img"
      aria-label={title ?? condition}
    >
      <defs>
        <radialGradient id={id('sun')} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffe9a3" />
          <stop offset="55%" stopColor="#ffc35c" />
          <stop offset="100%" stopColor="#ff9142" />
        </radialGradient>
        <radialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcf73" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffcf73" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('moon')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f6ff" />
          <stop offset="100%" stopColor="#b9c6f4" />
        </linearGradient>
        <linearGradient id={id('cloud-soft')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d9e3f3" />
        </linearGradient>
        <linearGradient id={id('cloud-rain')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2f8" />
          <stop offset="100%" stopColor="#a8b6cb" />
        </linearGradient>
        <linearGradient id={id('cloud-storm')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4ccda" />
          <stop offset="100%" stopColor="#6c7891" />
        </linearGradient>
        <linearGradient id={id('drop')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fb2ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4c86f0" />
        </linearGradient>
        <linearGradient id={id('bolt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3a8" />
          <stop offset="100%" stopColor="#ffb22e" />
        </linearGradient>
        <mask id={id('crescent')}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="40" cy="23" r="11" fill="#000" />
        </mask>
        <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#2a3d66" floodOpacity="0.18" />
        </filter>
      </defs>

      {showSun && (
        <g transform={sunTransform} style={{ transformOrigin: sunOrigin }}>
          <circle cx="32" cy="32" r="24" fill={`url(#${id('glow')})`} className="wi-glow" />
          <g className="wi-rays">
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1="32"
                y1="9"
                x2="32"
                y2="13.5"
                stroke="#ffb547"
                strokeWidth="2.6"
                strokeLinecap="round"
                transform={`rotate(${i * 45} 32 32)`}
              />
            ))}
          </g>
          <circle cx="32" cy="32" r="11.5" fill={`url(#${id('sun')})`} className="wi-sun-core" />
        </g>
      )}

      {showMoon && (
        <g transform={condition === 'partly' ? 'translate(-8 -9) scale(0.8)' : undefined}>
          <circle cx="32" cy="32" r="22" fill="#9fb3ff" opacity="0.12" className="wi-glow" />
          <circle cx="32" cy="30" r="14" fill={`url(#${id('moon')})`} mask={`url(#${id('crescent')})`} className="wi-moon" />
          <circle className="wi-star" cx="48" cy="38" r="1.3" fill="#fff" />
          <circle className="wi-star wi-star--2" cx="14" cy="18" r="1" fill="#fff" />
          <circle className="wi-star wi-star--3" cx="50" cy="14" r="0.9" fill="#fff" />
        </g>
      )}

      {showCloud && (
        <g transform={cloudTransform}>
          {condition === 'cloudy' && (
            <path d={CLOUD} transform="translate(9 -7) scale(0.72)" fill={`url(#${id('cloud-rain')})`} opacity="0.85" className="wi-cloud wi-cloud--back" />
          )}
          <path d={CLOUD} fill={`url(#${id('cloud-' + cloudTone)})`} filter={`url(#${id('shadow')})`} className="wi-cloud" />
        </g>
      )}

      {(condition === 'rain' || condition === 'storm') && (
        <g>
          {[22, 31, 40].map((x, i) => (
            <line
              key={x}
              x1={x}
              y1="45"
              x2={x - 2.5}
              y2="52"
              stroke={`url(#${id('drop')})`}
              strokeWidth="2.6"
              strokeLinecap="round"
              className="wi-drop"
              style={{ animationDelay: `${i * 0.28}s` }}
            />
          ))}
        </g>
      )}

      {condition === 'drizzle' &&
        [21, 28, 35, 42].map((x, i) => (
          <circle key={x} cx={x} cy={47 + (i % 2) * 3} r="1.5" fill="#5b8ff2" className="wi-drop wi-drop--fine" style={{ animationDelay: `${i * 0.22}s` }} />
        ))}

      {condition === 'snow' &&
        [22, 32, 42].map((x, i) => (
          <g key={x} className="wi-flake" style={{ animationDelay: `${i * 0.6}s` }}>
            <g transform={`translate(${x} 48)`}>
              {[0, 60, 120].map((r) => (
                <line key={r} x1="0" y1="-3.2" x2="0" y2="3.2" stroke="#8fb2ee" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${r})`} />
              ))}
            </g>
          </g>
        ))}

      {condition === 'storm' && (
        <path d="M34 36 L26 48 H32 L28.5 59 L39.5 44.5 H33.5 L37 36 Z" fill={`url(#${id('bolt')})`} className="wi-bolt" />
      )}

      {condition === 'fog' &&
        [44, 50, 56].map((y, i) => (
          <line
            key={y}
            x1={14 + i * 3}
            y1={y}
            x2={50 - i * 2}
            y2={y}
            stroke="#a9b6c9"
            strokeWidth="2.6"
            strokeLinecap="round"
            className="wi-fogline"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
    </svg>
  );
}
