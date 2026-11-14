import React, { useRef, useState } from 'react';
import { fmtHour } from '../lib/format';
import type { HourPoint } from '../lib/types';
import { temp, type Units } from '../lib/units';
import { AnimatedNumber } from './AnimatedNumber';
import { WeatherIcon } from './WeatherIcon';

interface Props {
  hourly: HourPoint[];
  utcOffsetSec: number;
  units: Units;
  dayLabel?: string;
}

export const HourlyForecast: React.FC<Props> = ({ hourly, utcOffsetSec, units, dayLabel = 'Today' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [viewMode, setViewMode] = useState<'ribbon' | 'grid' | 'chart'>('ribbon');

  if (!hourly || hourly.length === 0) return null;

  // Arrow button navigation
  const scrollByAmount = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Mouse drag-to-scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  // Wheel to horizontal scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY * 0.9;
    }
  };

  // Split into AM (first 12) and PM (next 12) for the 24-Hour Grid View
  const amHours = hourly.slice(0, 12);
  const pmHours = hourly.slice(12, 24);

  // Chart data calculations
  const temps = hourly.map((h) => temp(h.temp, units));
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(1, maxT - minT);

  const chartW = Math.max(880, hourly.length * 48);
  const chartH = 140;
  const paddingX = 32;
  const paddingY = 28;

  const points = hourly.map((h, i) => {
    const x = paddingX + (i / Math.max(1, hourly.length - 1)) * (chartW - paddingX * 2);
    const t = temp(h.temp, units);
    const y = chartH - paddingY - ((t - minT) / range) * (chartH - paddingY * 2);
    return { x, y, t, hour: h };
  });

  const pathD = points.reduce((acc, p, i, a) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = a[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${p.y} ${p.x},${p.y}`;
  }, '');

  const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x},${chartH} L ${points[0].x},${chartH} Z` : '';

  return (
    <div className="card hourly-section full-width-hourly" role="region" aria-label="Hourly Forecast Timeline">
      <div className="section-title-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            24-Hour Forecast Timeline
          </h3>
          <span className="hourly-day-badge">{dayLabel}</span>
          <span className="hourly-count-pill">{hourly.length} Hours</span>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === 'ribbon' ? 'is-active' : ''}`}
              onClick={() => setViewMode('ribbon')}
              title="Panoramic scrolling ribbon"
            >
              <span>Ribbon</span>
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="All 24 hours at once (AM / PM)"
            >
              <span>All 24h Grid</span>
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === 'chart' ? 'is-active' : ''}`}
              onClick={() => setViewMode('chart')}
              title="Temperature & Rain curve"
            >
              <span>Curve</span>
            </button>
          </div>

          {viewMode === 'ribbon' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-icon btn-ghost nav-arrow-btn"
                onClick={() => scrollByAmount(-320)}
                aria-label="Scroll left"
                title="Scroll earlier hours"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="btn btn-icon btn-ghost nav-arrow-btn"
                onClick={() => scrollByAmount(320)}
                aria-label="Scroll right"
                title="Scroll later hours"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: PANORAMIC SCROLLING RIBBON */}
      {viewMode === 'ribbon' && (
        <div className="ribbon-wrap">
          <div
            ref={scrollRef}
            className={`hourly-scroll full-screen-scroll ${isDragging ? 'is-dragging' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            onWheel={handleWheel}
            tabIndex={0}
            role="region"
            aria-label="Scrollable 24-hour weather forecast cards"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {hourly.map((hour, idx) => {
              const t = temp(hour.temp, units);
              const isNow = idx === 0 && dayLabel.toLowerCase().includes('today');
              const timeStr = isNow ? 'Now' : fmtHour(hour.time, utcOffsetSec);

              return (
                <div key={hour.time} className={`hourly-tile ${isNow ? 'is-current-hour' : ''}`}>
                  <span className="hourly-time">{timeStr}</span>
                  <WeatherIcon condition={hour.condition} isDay={hour.isDay} size={40} still={false} />
                  <span className="hourly-temp">
                    <AnimatedNumber value={t} duration={400} />°
                  </span>
                  <div className="hourly-pop">
                    {hour.pop > 10 ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                        </svg>
                        <span>{hour.pop}%</span>
                      </>
                    ) : (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: ALL 24 HOURS SIMULTANEOUS GRID (NO SCROLLING NEEDED!) */}
      {viewMode === 'grid' && (
        <div className="all-24h-grid-container" role="region" aria-label="All 24 hours grid view">
          {/* AM ROW */}
          <div className="grid-row-wrap">
            <span className="grid-row-tag">AM</span>
            <div className="all-24h-row">
              {amHours.map((hour, idx) => {
                const t = temp(hour.temp, units);
                const isNow = idx === 0 && dayLabel.toLowerCase().includes('today');
                const timeStr = isNow ? 'Now' : fmtHour(hour.time, utcOffsetSec);
                return (
                  <div key={hour.time} className={`hourly-tile-compact ${isNow ? 'is-current-hour' : ''}`}>
                    <span className="compact-time">{timeStr}</span>
                    <WeatherIcon condition={hour.condition} isDay={hour.isDay} size={28} still={true} />
                    <span className="compact-temp">{t}°</span>
                    <span className="compact-pop">{hour.pop > 10 ? `${hour.pop}%` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PM ROW */}
          {pmHours.length > 0 && (
            <div className="grid-row-wrap" style={{ marginTop: '12px' }}>
              <span className="grid-row-tag">PM</span>
              <div className="all-24h-row">
                {pmHours.map((hour) => {
                  const t = temp(hour.temp, units);
                  const timeStr = fmtHour(hour.time, utcOffsetSec);
                  return (
                    <div key={hour.time} className="hourly-tile-compact">
                      <span className="compact-time">{timeStr}</span>
                      <WeatherIcon condition={hour.condition} isDay={hour.isDay} size={28} still={true} />
                      <span className="compact-temp">{t}°</span>
                      <span className="compact-pop">{hour.pop > 10 ? `${hour.pop}%` : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: FULL WIDTH TEMPERATURE & RAIN CURVE */}
      {viewMode === 'chart' && (
        <div
          ref={scrollRef}
          className="hourly-chart-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', overflowX: 'auto' }}
        >
          <svg width={chartW} height={chartH} className="hourly-svg-chart">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {areaD && <path d={areaD} fill="url(#chartGrad)" />}
            {pathD && <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.8" strokeLinecap="round" />}

            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)">
                  {p.t}°
                </text>
                <text x={p.x} y={chartH - 6} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--text-muted)">
                  {fmtHour(p.hour.time, utcOffsetSec)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
