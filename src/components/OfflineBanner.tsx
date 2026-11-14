import React from 'react';
import { relative } from '../lib/format';

interface Props {
  isOffline: boolean;
  fromCache: boolean;
  fetchedAt?: number;
  onRefresh?: () => void;
}

export const OfflineBanner: React.FC<Props> = ({ isOffline, fetchedAt, onRefresh }) => {
  // Only display the banner when the user is genuinely offline
  if (!isOffline) return null;

  return (
    <div className={`banner ${isOffline ? 'banner-offline' : 'banner-cached'}`} role="status">
      <div className="banner-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {isOffline ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </>
          )}
        </svg>

        <div>
          {isOffline ? (
            <span>
              <strong>Offline Mode</strong> — Reconnect to the internet for live updates. Showing cached weather
              {fetchedAt ? ` from ${relative(fetchedAt)}` : ''}.
            </span>
          ) : (
            <span>
              <strong>Cached Data</strong> — Loaded from local cache
              {fetchedAt ? ` (${relative(fetchedAt)})` : ''}.
            </span>
          )}
        </div>
      </div>

      {!isOffline && onRefresh && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onRefresh}
          style={{ minHeight: '36px', height: '36px', padding: '0 10px', fontSize: '0.8rem' }}
        >
          Check Live
        </button>
      )}
    </div>
  );
};
