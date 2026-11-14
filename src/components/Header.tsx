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
  reminderEnabled: boolean;
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
  reminderEnabled,
  canInstall,
  onInstall,
}) => {
  return (
    <header className="header" role="banner">
      <div className="container">
        <div className="header-inner">
          <a href="/" className="brand-link" aria-label="WeatherBoard Home">
            <div className="brand-logo-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div className="brand-title-wrap">
              <span className="brand-title">WeatherBoard</span>
              <span className="brand-badge">PWA</span>
            </div>
          </a>

          <div className="header-actions">
            {canInstall && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onInstall}
                title="Install WeatherBoard as standalone app"
                aria-label="Install app"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="hide-mobile">Install</span>
              </button>
            )}

            <button
              type="button"
              className={`btn btn-icon btn-ghost ${refreshing ? 'is-refreshing' : ''}`}
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh weather data"
              title="Refresh weather data"
            >
              <svg
                width="18"
                height="18"
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
              className="btn btn-icon btn-ghost"
              onClick={onOpenNotifications}
              aria-label="Morning weather reminder settings"
              title="Morning weather reminder settings"
              style={{ position: 'relative' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {reminderEnabled && (
                <span
                  style={{
                    position: 'absolute',
                    top: '9px',
                    right: '9px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 0 2px var(--surface-base)',
                  }}
                  title="Daily reminder active"
                />
              )}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={onToggleUnits}
              aria-label={`Switch to ${units === 'metric' ? 'Fahrenheit' : 'Celsius'}`}
              title="Toggle temperature unit"
              style={{ padding: '0 10px', minWidth: '44px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
            >
              {units === 'metric' ? '°C' : '°F'}
            </button>

            <button
              type="button"
              className="btn btn-icon btn-ghost"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd49a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
