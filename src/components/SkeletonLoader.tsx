import React from 'react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="dashboard-fullscreen-layout" aria-busy="true" aria-label="Loading weather forecast">
      {/* Top Split */}
      <div className="layout-top-split">
        {/* Hero Card Skeleton */}
        <div className="card hero-card" style={{ minHeight: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '220px', height: '42px' }} className="skeleton" />
            <div style={{ width: '44px', height: '44px', borderRadius: '50%' }} className="skeleton" />
          </div>
          <div style={{ width: '160px', height: '18px', marginTop: '6px' }} className="skeleton" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0' }}>
            <div>
              <div style={{ width: '140px', height: '80px' }} className="skeleton" />
              <div style={{ width: '120px', height: '22px', marginTop: '10px' }} className="skeleton" />
            </div>
            <div style={{ width: '110px', height: '110px', borderRadius: '50%' }} className="skeleton" />
          </div>
          <div style={{ width: '100%', height: '54px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
        </div>

        {/* Daily Forecast Skeleton */}
        <div className="card daily-section" style={{ minHeight: '320px' }}>
          <div style={{ width: '150px', height: '24px', marginBottom: '18px' }} className="skeleton" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ width: '100%', height: '46px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
            ))}
          </div>
        </div>
      </div>

      {/* Middle Full-Width Hourly Skeleton */}
      <div className="card full-width-hourly" style={{ height: '210px' }}>
        <div style={{ width: '180px', height: '24px', marginBottom: '18px' }} className="skeleton" />
        <div style={{ display: 'flex', gap: '12px' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: '84px', height: '120px', borderRadius: 'var(--radius-md)', flexShrink: 0 }} className="skeleton" />
          ))}
        </div>
      </div>

      {/* Bottom Split */}
      <div className="layout-bottom-split">
        <div className="metrics-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '110px', borderRadius: 'var(--radius-md)' }} className="skeleton" />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card skeleton" style={{ height: '150px' }} />
          <div className="card skeleton" style={{ height: '150px' }} />
        </div>
      </div>
    </div>
  );
};
