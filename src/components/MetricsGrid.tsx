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
    <div className="metrics-wrapper" role="region" aria-label="Detailed Weather Metrics">
      {/* Group 1: Primary Weather Essentials */}
      <div className="metrics-group">
        <div className="metrics-group-header">
          <span className="metrics-group-title">Primary Conditions</span>
          <span className="metrics-group-hint">Key daily factors</span>
        </div>
        <div className="metrics-grid">
          {/* Wind */}
          <div className="metric-tile">
            <div className="metric-header">
              <div className="metric-title-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
                  <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                  <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
                </svg>
                <span>Wind</span>
              </div>
              <span className="metric-badge">{compassDir}</span>
            </div>
            <div className="metric-value">
              <AnimatedNumber value={windInfo.value} /> <span className="metric-unit">{windInfo.unit}</span>
            </div>
            <div className="metric-sub">
              {beaufortDesc}
              {gustInfo && <span className="metric-sub-highlight"> · Gusts {gustInfo.value} {gustInfo.unit}</span>}
            </div>
          </div>

          {/* Humidity */}
          <div className="metric-tile">
            <div className="metric-header">
              <div className="metric-title-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
                <span>Humidity</span>
              </div>
              <span className="metric-badge">
                {current.humidity < 40 ? 'Dry' : current.humidity > 70 ? 'Humid' : 'Comfortable'}
              </span>
            </div>
            <div className="metric-value">
              <AnimatedNumber value={current.humidity} /><span className="metric-unit">%</span>
            </div>
            <div className="metric-sub">
              {current.dewPoint != null ? `Dew point: ${temp(current.dewPoint, units)}°` : 'Relative humidity'}
            </div>
          </div>

          {/* UV Index */}
          <div className="metric-tile">
            <div className="metric-header">
              <div className="metric-title-wrap">
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
              <span className="metric-badge is-uv">{uvLevel(current.uv)}</span>
            </div>
            <div className="metric-value">
              {current.uv != null ? <AnimatedNumber value={current.uv} format={(n) => n.toFixed(1)} /> : '—'}
            </div>
            <div className="metric-sub">
              {current.uv != null && current.uv >= 6 ? 'Sun protection advised' : 'Low risk from sun'}
            </div>
          </div>
        </div>
      </div>

      {/* Group 2: Atmospheric & Environmental Context */}
      <div className="metrics-group">
        <div className="metrics-group-header">
          <span className="metrics-group-title">Atmospheric Environment</span>
          <span className="metrics-group-hint">Air & visibility</span>
        </div>
        <div className="metrics-grid">
          {/* Visibility */}
          <div className="metric-tile">
            <div className="metric-header">
              <div className="metric-title-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Visibility</span>
              </div>
              <span className="metric-badge">
                {current.visibility && current.visibility >= 10000 ? 'Clear' : 'Moderate'}
              </span>
            </div>
            <div className="metric-value">
              {current.visibility != null ? (
                <>
                  {distance(current.visibility, units).value}{' '}
                  <span className="metric-unit">{distance(current.visibility, units).unit}</span>
                </>
              ) : (
                'Clear'
              )}
            </div>
            <div className="metric-sub">
              {current.visibility && current.visibility >= 10000 ? 'Good optical clarity' : 'Slight haze in air'}
            </div>
          </div>

          {/* Pressure */}
          <div className="metric-tile">
            <div className="metric-header">
              <div className="metric-title-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m14 14-4-4" />
                  <path d="M12 6v2" />
                </svg>
                <span>Pressure</span>
              </div>
              <span className="metric-badge">
                {current.pressure >= 1013 ? 'Steady' : 'Low'}
              </span>
            </div>
            <div className="metric-value">
              <AnimatedNumber value={current.pressure} /> <span className="metric-unit">hPa</span>
            </div>
            <div className="metric-sub">
              {current.pressure >= 1013 ? 'Fair & settled weather' : 'Unsettled weather system'}
            </div>
          </div>

          {/* Air Quality or Cloud Cover */}
          <div className="metric-tile">
            <div className="metric-header">
              <div className="metric-title-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
                <span>{air ? 'Air Quality' : 'Cloud Cover'}</span>
              </div>
              {air ? (
                <span className="metric-badge" style={{ color: aqiInfo?.color, borderColor: aqiInfo?.color }}>
                  {aqiInfo?.label}
                </span>
              ) : (
                <span className="metric-badge">
                  {current.cloudCover == null || current.cloudCover < 20 ? 'Clear' : current.cloudCover < 60 ? 'Partly' : 'Overcast'}
                </span>
              )}
            </div>
            {air ? (
              <>
                <div className="metric-value" style={{ color: aqiInfo?.color }}>
                  <span className="metric-unit" style={{ fontSize: '1rem', color: 'inherit', fontWeight: 600 }}>AQI </span>
                  <AnimatedNumber value={air.usAqi} />
                </div>
                <div className="metric-sub">
                  PM2.5: {air.pm25.toFixed(1)} µg/m³
                </div>
              </>
            ) : (
              <>
                <div className="metric-value">
                  {current.cloudCover != null ? (
                    <>
                      <AnimatedNumber value={current.cloudCover} /><span className="metric-unit">%</span>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="metric-sub">Sky cloud coverage</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
