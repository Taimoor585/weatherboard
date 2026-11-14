import React from 'react';
import { fmtDateLong, fmtTime, insight, relative, utcLabel } from '../lib/format';
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
  const humanInsight = insight(data, units);

  return (
    <div className="card hero-card" role="region" aria-label="Current Weather Conditions">
      <div className="hero-top-row">
        <div>
          <h1 className="hero-city-name">{city.name}</h1>
          <div className="hero-city-meta">
            <span>{[city.region, city.country].filter(Boolean).join(', ')}</span>
            <span>·</span>
            <span>{formattedTime}</span>
            <span>({utcLabel(utcOffsetSec)})</span>
            <span>·</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formattedDate}</span>
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

      <div className="hero-main-stat">
        <div>
          <div className="hero-temp-wrap">
            <span className="hero-temp-num">
              <AnimatedNumber value={currentTemp} duration={600} />
            </span>
            <span className="hero-temp-unit">{units === 'metric' ? '°C' : '°F'}</span>
          </div>
          <div className="hero-condition-lead">{current.description}</div>
          <div className="hero-hilo-wrap">
            <span>
              H: <AnimatedNumber value={highTemp} />°
            </span>
            <span>
              L: <AnimatedNumber value={lowTemp} />°
            </span>
            <span>·</span>
            <span>
              Feels like <AnimatedNumber value={feelsLikeTemp} />°
            </span>
          </div>
        </div>

        <div className="hero-icon-wrap" aria-hidden="true">
          <WeatherIcon condition={current.condition} isDay={current.isDay} size={116} />
        </div>
      </div>

      {humanInsight && (
        <div className="hero-insight-box">
          <div className="hero-insight-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
              <path d="M9 18h6" />
              <path d="M10 22h4" />
            </svg>
          </div>
          <div>{humanInsight}</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)', paddingTop: '4px' }}>
        <span>
          Data provided by <strong>{source}</strong>
          {fromCache && ' (Offline Cache)'}
        </span>
        <span>Updated {relative(fetchedAt)}</span>
      </div>
    </div>
  );
};
