import React from 'react';
import type { Theme } from '../hooks/useTheme';
import type { Units } from '../lib/units';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  units: Units;
  onToggleUnits: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenNotifications: () => void;
  canInstall: boolean;
  onInstall: () => void;
}

export const Header: React.FC<Props> = ({
  theme,
  onToggleTheme,
  units,
  onToggleUnits,
  onRefresh,
  refreshing,
  onOpenNotifications,
  canInstall,
  onInstall,
}) => {
  return (
    <header className="header" role="banner">
      <div className="container">
        <div className="header-inner">
          <a href="/" className="brand-link" aria-label="WeatherBoard Home">
            <div className="brand-logo-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
                <defs>
                  <linearGradient id="brand-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b8def" />
                    <stop offset="100%" stopColor="#ffd9c2" />
                  </linearGradient>
                  <radialGradient id="brand-sun" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#ffe9a3" />
                    <stop offset="100%" stopColor="#ff9142" />
                  </radialGradient>
                  <linearGradient id="brand-cloud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#d9e3f3" />
                  </linearGradient>
                </defs>
                <rect width="64" height="64" rx="14" fill="url(#brand-sky)" />
                <circle cx="38" cy="26" r="13" fill="url(#brand-sun)" />
                <path d="M20 48h26a9 9 0 0 0 1.5-17.9A13 13 0 0 0 23.6 27.4 10.5 10.5 0 0 0 20 48z" fill="url(#brand-cloud)" />
              </svg>
            </div>
            <div className="brand-title-wrap">
              <span className="brand-title">WeatherBoard</span>
            </div>
          </a>

          <div className="header-actions">
            {canInstall && (
              <button
                type="button"
                className="btn btn-primary header-action-btn"
                onClick={onInstall}
                title="Install WeatherBoard as standalone app"
                aria-label="Install app"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="hide-mobile">Install</span>
              </button>
            )}

            <button
              type="button"
              className={`btn btn-icon btn-ghost header-action-btn ${refreshing ? 'is-refreshing' : ''}`}
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh weather data"
              title="Refresh weather data"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'is-spinning' : ''}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>

            <button
              type="button"
              className="btn btn-icon btn-ghost header-action-btn"
              onClick={onOpenNotifications}
              aria-label="Morning weather reminder settings"
              title="Morning weather reminder settings"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>

            <button
              type="button"
              className="btn btn-ghost header-action-btn"
              onClick={onToggleUnits}
              aria-label={`Switch to ${units === 'metric' ? 'Fahrenheit' : 'Celsius'}`}
              title="Toggle temperature unit"
              style={{ padding: '0 8px', minWidth: '38px', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            >
              {units === 'metric' ? '°C' : '°F'}
            </button>

            <button
              type="button"
              className="btn btn-icon btn-ghost header-action-btn"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffd49a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
