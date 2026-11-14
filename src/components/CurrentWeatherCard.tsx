import React from 'react';
import { fmtDateLong, fmtTime, relative, utcLabel, weatherInsight } from '../lib/format';
import type { City, WeatherData } from '../lib/types';
import { temp, type Units } from '../lib/units';
import { AnimatedNumber } from './AnimatedNumber';
import { WeatherIcon } from './WeatherIcon';

interface Props {
  data: WeatherData;
  units: Units;
  isFavourite: boolean;
  onToggleFavourite: (city: City) => void;
  fromCache?: boolean;
}

export const CurrentWeatherCard: React.FC<Props> = ({
  data,
  units,
  isFavourite,
  onToggleFavourite,
  fromCache,
}) => {
  const { city, current, today, utcOffsetSec, fetchedAt, source } = data;
  const currentTemp = temp(current.temp, units);
  const highTemp = temp(today.max, units);
  const lowTemp = temp(today.min, units);
  const feelsLikeTemp = temp(current.feelsLike, units);
  const timeNow = Math.floor(Date.now() / 1000);
  const formattedTime = fmtTime(timeNow, utcOffsetSec);
  const formattedDate = fmtDateLong(Date.now(), utcOffsetSec);
  const insightInfo = weatherInsight(data, units);

  const locationSubtitle = [city.region, city.country].filter(Boolean).join(', ');

  return (
    <div className="card hero-card" role="region" aria-label="Current Weather Conditions">
      {/* City & Time Header */}
      <div className="hero-top-row">
        <div>
          <h1 className="hero-city-name">{city.name}</h1>
          <div className="hero-city-meta">
            {locationSubtitle && <span className="hero-city-country">{locationSubtitle}</span>}
            {locationSubtitle && <span className="meta-sep">·</span>}
            <span className="hero-city-time">{formattedTime} ({utcLabel(utcOffsetSec)})</span>
            <span className="meta-sep">·</span>
            <span className="hero-city-date">{formattedDate}</span>
          </div>
        </div>

        <button
          type="button"
          className={`hero-fav-btn ${isFavourite ? 'is-active' : ''}`}
          onClick={() => onToggleFavourite(city)}
          aria-label={isFavourite ? `Remove ${city.name} from favourites` : `Save ${city.name} to favourites`}
          title={isFavourite ? 'Saved in favourites' : 'Add to favourites'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isFavourite ? '#f59e0b' : 'none'}
            stroke={isFavourite ? '#f59e0b' : 'currentColor'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>

      {/* Primary Weather Reading */}
      <div className="hero-main-stat">
        <div>
          <div className="hero-temp-wrap">
            <span className="hero-temp-num">
              <AnimatedNumber value={currentTemp} duration={750} />
            </span>
            <span className="hero-temp-unit">{units === 'metric' ? '°C' : '°F'}</span>
          </div>

          <div className="hero-condition-lead">{current.description}</div>

          <div className="hero-hilo-wrap">
            <span className="hero-hilo-chip">
              <span className="hilo-label">High</span>
              <strong><AnimatedNumber value={highTemp} />°</strong>
            </span>
            <span className="hero-hilo-chip">
              <span className="hilo-label">Low</span>
              <strong><AnimatedNumber value={lowTemp} />°</strong>
            </span>
            <span className="hero-feels-chip">
              Feels like <strong><AnimatedNumber value={feelsLikeTemp} />°</strong>
            </span>
          </div>
        </div>

        <div className="hero-icon-wrap" aria-hidden="true">
          <WeatherIcon condition={current.condition} isDay={current.isDay} size={114} />
        </div>
      </div>

      {/* Prominent Actionable Weather Insight & Advice */}
      <div className={`hero-insight-banner is-${insightInfo.tone}`} role="status">
        <div className="hero-insight-icon" aria-hidden="true">
          {insightInfo.tone === 'rain' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
              <path d="M8 19v2" />
              <path d="M8 13v2" />
              <path d="M16 19v2" />
              <path d="M16 13v2" />
              <path d="M12 21v2" />
              <path d="M12 15v2" />
            </svg>
          ) : insightInfo.tone === 'wind' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
        </div>
        <div className="hero-insight-content">
          <div className="hero-insight-header">
            <span className="hero-insight-badge">{insightInfo.badge}</span>
            <span className="hero-insight-title">{insightInfo.headline}</span>
          </div>
          <p className="hero-insight-desc">{insightInfo.recommendation}</p>
        </div>
      </div>

      {/* Subtle Source & Refresh Status */}
      <div className="hero-footer-meta">
        <span>
          Source: {source}
          {fromCache && ' (Cached)'}
        </span>
        <span>Updated {relative(fetchedAt)}</span>
      </div>
    </div>
  );
};
