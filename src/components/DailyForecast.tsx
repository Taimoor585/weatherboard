import React from 'react';
import { fmtDay, fmtDayDate } from '../lib/format';
import type { DayPoint } from '../lib/types';
import { temp, type Units } from '../lib/units';
import { AnimatedNumber } from './AnimatedNumber';
import { WeatherIcon } from './WeatherIcon';

interface Props {
  daily: DayPoint[];
  utcOffsetSec: number;
  units: Units;
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
}

export const DailyForecast: React.FC<Props> = ({
  daily,
  utcOffsetSec,
  units,
  selectedDayIndex,
  onSelectDay,
}) => {
  if (!daily || daily.length === 0) return null;

  const allMins = daily.map((d) => d.min);
  const allMaxs = daily.map((d) => d.max);
  const overallMin = Math.min(...allMins);
  const overallMax = Math.max(...allMaxs);
  const span = Math.max(1, overallMax - overallMin);

  return (
    <div className="card daily-section" role="region" aria-label="5-Day Forecast">
      <div className="section-title-wrap">
        <h3 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          5-Day Forecast
        </h3>
        <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>Click a day to inspect hours</span>
      </div>

      <div className="daily-list" role="listbox" aria-label="Selectable forecast days">
        {daily.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          const dayName = fmtDay(day.date, utcOffsetSec, idx);
          const dayDate = fmtDayDate(day.date, utcOffsetSec);
          const minT = temp(day.min, units);
          const maxT = temp(day.max, units);

          const leftPercent = Math.max(0, Math.min(100, ((day.min - overallMin) / span) * 100));
          const rightPercent = Math.max(0, Math.min(100, ((overallMax - day.max) / span) * 100));

          return (
            <div
              key={day.date}
              className={`daily-row ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectDay(idx)}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDay(idx);
                }
              }}
              title={`Click to view hourly forecast for ${dayName}`}
            >
              <div className="daily-day-wrap">
                <span className="daily-day-name">
                  {dayName}
                  {isSelected && <span className="daily-active-dot" aria-hidden="true" />}
                </span>
                <span className="daily-day-date">{dayDate}</span>
              </div>

              <div className="daily-weather-col">
                <div className="daily-icon-wrap" aria-hidden="true">
                  <WeatherIcon condition={day.condition} size={30} still={false} />
                </div>
                <span className="daily-condition-text">{day.description}</span>
              </div>

              <div className="daily-bar-container" aria-hidden="true">
                <div className="daily-temp-bar-bg">
                  <div
                    className="daily-temp-bar-fill"
                    style={{
                      left: `${leftPercent}%`,
                      right: `${rightPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className="daily-minmax">
                <span className="daily-lo" title={`Low: ${minT}°`}>
                  <AnimatedNumber value={minT} />°
                </span>
                <span className="daily-divider">/</span>
                <span className="daily-hi" title={`High: ${maxT}°`}>
                  <AnimatedNumber value={maxT} />°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
