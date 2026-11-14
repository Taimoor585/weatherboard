import React from 'react';
import type { AppError } from '../lib/types';

interface Props {
  error: AppError | Error | null;
  onRetry: () => void;
}

export const ErrorCard: React.FC<Props> = ({ error, onRetry }) => {
  const isAppError = error && 'kind' in error;
  const title = isAppError ? (error as AppError).title : 'Weather data could not be retrieved.';
  const hint = isAppError
    ? (error as AppError).hint
    : 'Check your internet connection, or try searching for another city.';

  return (
    <div className="card" style={{ padding: '36px', textAlign: 'center', maxWidth: '580px', margin: '40px auto' }} role="alert">
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-rose-soft)',
          color: 'var(--accent-rose)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
        {hint}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          Try Again
        </button>
      </div>
    </div>
  );
};
