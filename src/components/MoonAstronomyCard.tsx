import React from 'react';
import type { MoonInfo } from '../lib/astronomy';

interface Props {
  moon?: MoonInfo;
  pressure: number;
}

export const MoonAstronomyCard: React.FC<Props> = ({ moon, pressure }) => {
  const phase = moon?.phaseName ?? 'Waxing Crescent';
  const illum = moon?.illumination ?? 65;
  const age = moon?.ageDays ?? 8.5;

  // Pressure tendency classification
  const isHigh = pressure >= 1013;
  const pressureRating = pressure >= 1022 ? 'Very High (Clear Skies)' : pressure >= 1013 ? 'Normal (Settled)' : pressure >= 1005 ? 'Low (Unsettled)' : 'Very Low (Storm Alert)';

  // Pressure gauge percentage (970 hPa = 0%, 1050 hPa = 100%)
  const gaugePct = Math.max(0, Math.min(100, ((pressure - 970) / 80) * 100));

  return (
    <div className="card astronomy-card" role="region" aria-label="Astronomy & Barometer">
      <div className="section-title-wrap">
        <h3 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          Lunar Phase & Barometer
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{illum}% illumination</span>
      </div>

      <div className="astronomy-grid">
        {/* Moon Phase Column */}
        <div className="moon-box">
          <div className="moon-visual-wrap" aria-hidden="true">
            <svg width="58" height="58" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="moonGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fdfcff" />
                  <stop offset="100%" stopColor="#a5b4fc" />
                </linearGradient>
                <filter id="moonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#818cf8" floodOpacity="0.4" />
                </filter>
              </defs>
              <circle cx="32" cy="32" r="26" fill="#1e293b" stroke="var(--border-subtle)" strokeWidth="1.5" />
              {/* Moon illuminated crescent / gibbous */}
              <circle cx="32" cy="32" r="25" fill="url(#moonGrad)" filter="url(#moonGlow)" />
              {illum < 95 && (
                <path
                  d={
                    illum > 50
                      ? 'M 32,7 A 25,25 0 0,0 32,57 A 14,25 0 0,1 32,7 Z'
                      : 'M 32,7 A 25,25 0 0,1 32,57 A 16,25 0 0,0 32,7 Z'
                  }
                  fill="#0f172a"
                  opacity="0.9"
                />
              )}
            </svg>
          </div>
          <div className="moon-meta">
            <span className="moon-phase-name">{phase}</span>
            <span className="moon-age">Lunar cycle: {age} days</span>
          </div>
        </div>

        {/* Barometer Gauge Column */}
        <div className="barometer-box">
          <div className="barometer-header">
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Barometric Gauge
            </span>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{pressure} hPa</span>
          </div>

          <div className="barometer-track" aria-hidden="true">
            <div className="barometer-fill" style={{ width: `${gaugePct}%` }} />
            <div className="barometer-marker" style={{ left: `${gaugePct}%` }} />
          </div>

          <div className="barometer-footer">
            <span style={{ fontSize: '0.775rem', color: isHigh ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 600 }}>
              {pressureRating}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
