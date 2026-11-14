import React from 'react';
import type { WeatherData } from '../lib/types';
import { beaufort, compass, distance, temp, type Units, wind } from '../lib/units';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  data: WeatherData;
  units: Units;
}

export const MetricsGrid: React.FC<Props> = ({ data, units }) => {
  const { current, air } = data;
  const windInfo = wind(current.windKmh, units);
  const gustInfo = current.gustKmh ? wind(current.gustKmh, units) : null;
  const compassDir = compass(current.windDeg);
  const beaufortDesc = beaufort(current.windKmh);

  const uvLevel = (val?: number) => {
    if (val == null) return 'N/A';
    if (val < 3) return 'Low';
    if (val < 6) return 'Moderate';
    if (val < 8) return 'High';
    if (val < 11) return 'Very High';
    return 'Extreme';
  };

  const aqiLevel = (aqi?: number) => {
    if (aqi == null) return null;
    if (aqi <= 50) return { label: 'Good', color: '#10b981' };
    if (aqi <= 100) return { label: 'Moderate', color: '#f59e0b' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#f97316' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#ef4444' };
    return { label: 'Very Unhealthy', color: '#8b5cf6' };
  };

  const aqiInfo = air ? aqiLevel(air.usAqi) : null;

  return (
    <div className="metrics-grid" role="region" aria-label="Detailed Weather Metrics">
      {/* Wind */}
      <div className="metric-tile">
        <div className="metric-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
          </svg>
          <span>Wind</span>
        </div>
        <div className="metric-value">
          <AnimatedNumber value={windInfo.value} /> <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{windInfo.unit}</span>
        </div>
        <div className="metric-sub">
          {compassDir} ({current.windDeg}°) · {beaufortDesc}
          {gustInfo && ` · Gusts ${gustInfo.value} ${gustInfo.unit}`}
        </div>
      </div>

      {/* Humidity */}
      <div className="metric-tile">
        <div className="metric-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span>Humidity</span>
        </div>
        <div className="metric-value">
          <AnimatedNumber value={current.humidity} />%
        </div>
        <div className="metric-sub">
          {current.dewPoint != null ? `Dew point: ${temp(current.dewPoint, units)}°` : 'Relative humidity'}
        </div>
      </div>

      {/* UV Index */}
      <div className="metric-tile">
        <div className="metric-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>UV Index</span>
        </div>
        <div className="metric-value">
          {current.uv != null ? <AnimatedNumber value={current.uv} format={(n) => n.toFixed(1)} /> : '—'}
        </div>
        <div className="metric-sub">{uvLevel(current.uv)}</div>
      </div>

      {/* Pressure */}
      <div className="metric-tile">
        <div className="metric-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m14 14-4-4" />
            <path d="M12 6v2" />
          </svg>
          <span>Pressure</span>
        </div>
        <div className="metric-value">
          <AnimatedNumber value={current.pressure} /> <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>hPa</span>
        </div>
        <div className="metric-sub">
          {current.pressure > 1013 ? 'High pressure (Fair)' : 'Low pressure (Unsettled)'}
        </div>
      </div>

      {/* Visibility */}
      <div className="metric-tile">
        <div className="metric-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Visibility</span>
        </div>
        <div className="metric-value">
          {current.visibility != null ? (
            <>
              {distance(current.visibility, units).value}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{distance(current.visibility, units).unit}</span>
            </>
          ) : (
            'Clear'
          )}
        </div>
        <div className="metric-sub">
          {current.visibility && current.visibility >= 10000 ? 'Perfect clarity' : 'Reduced visibility'}
        </div>
      </div>

      {/* Cloud Cover or Air Quality */}
      <div className="metric-tile">
        <div className="metric-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
          <span>{air ? 'Air Quality' : 'Cloud Cover'}</span>
        </div>
        {air ? (
          <>
            <div className="metric-value" style={{ color: aqiInfo?.color }}>
              AQI <AnimatedNumber value={air.usAqi} />
            </div>
            <div className="metric-sub">
              {aqiInfo?.label} · PM2.5: {air.pm25.toFixed(1)} µg/m³
            </div>
          </>
        ) : (
          <>
            <div className="metric-value">
              {current.cloudCover != null ? (
                <>
                  <AnimatedNumber value={current.cloudCover} />%
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="metric-sub">Sky opacity</div>
          </>
        )}
      </div>
    </div>
  );
};
