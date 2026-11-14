import React from 'react';
import { fmtTime } from '../lib/format';

interface Props {
  sunrise: number; // unix timestamp
  sunset: number; // unix timestamp
  utcOffsetSec: number;
}

export const SunArcCard: React.FC<Props> = ({ sunrise, sunset, utcOffsetSec }) => {
  const now = Math.floor(Date.now() / 1000);
  const sunriseStr = fmtTime(sunrise, utcOffsetSec);
  const sunsetStr = fmtTime(sunset, utcOffsetSec);

  // Calculate sun position along the 0..1 curve
  const dayDuration = Math.max(1, sunset - sunrise);
  let progress = (now - sunrise) / dayDuration;
  const isDay = now >= sunrise && now <= sunset;
  progress = Math.max(0, Math.min(1, progress));

  // SVG arc path from x=20, y=90 to x=280, y=90 with peak at y=20
  // Quadratic bezier: M 20,90 Q 150,5 280,90
  // Point along quadratic bezier B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const t = progress;
  const p0 = { x: 25, y: 88 };
  const p1 = { x: 150, y: 15 };
  const p2 = { x: 275, y: 88 };

  const sunX = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const sunY = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

  const daylightHours = Math.floor(dayDuration / 3600);
  const daylightMinutes = Math.floor((dayDuration % 3600) / 60);

  return (
    <div className="card sun-arc-card" role="region" aria-label="Daylight and Sun Position">
      <div className="section-title-wrap" style={{ marginBottom: '8px' }}>
        <h3 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
          </svg>
          Daylight & Sun Position
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {daylightHours}h {daylightMinutes}m daylight
        </span>
      </div>

      <svg viewBox="0 0 300 105" className="sun-arc-svg" aria-hidden="true">
        <defs>
          <linearGradient id="sun-arc-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
          </linearGradient>
          <filter id="sun-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Horizon line */}
        <line x1="15" y1="90" x2="285" y2="90" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Daylight arc */}
        <path d="M 25,88 Q 150,15 275,88" fill="none" stroke="url(#sun-arc-grad)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Sun marker */}
        {isDay ? (
          <g transform={`translate(${sunX}, ${sunY})`}>
            <circle cx="0" cy="0" r="9" fill="#ffb020" filter="url(#sun-glow)" opacity="0.6" />
            <circle cx="0" cy="0" r="6" fill="#ffe066" stroke="#f59e0b" strokeWidth="2" />
          </g>
        ) : (
          <g transform="translate(150, 90)">
            <circle cx="0" cy="0" r="4" fill="var(--text-muted)" opacity="0.5" />
          </g>
        )}
      </svg>

      <div className="sun-times-row">
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Sunrise
          </span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sunriseStr}</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isDay ? 'Sun is currently above horizon' : 'Sun is currently below horizon'}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Sunset
          </span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sunsetStr}</div>
        </div>
      </div>
    </div>
  );
};
