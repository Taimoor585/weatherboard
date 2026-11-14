import React, { useEffect, useState } from 'react';

interface Props {
  cityName?: string;
}

const MESSAGES = [
  'Checking local weather conditions...',
  'Loading 24-hour hourly forecast & precipitation...',
  'Updating 5-day outlook & air quality...',
  'Preparing your live dashboard...',
];

export const AtmosphericLoader: React.FC<Props> = ({ cityName }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="atmospheric-loader" role="status" aria-live="polite">
      <div className="loader-halo-wrap">
        <div className="loader-ring loader-ring-1" />
        <div className="loader-ring loader-ring-2" />
        <div className="loader-center-orb">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
        </div>
      </div>

      <div className="loader-text-wrap">
        <h3 className="loader-heading">Loading {cityName ? `Weather for ${cityName}` : 'Forecast'}</h3>
        <p className="loader-subtext">{MESSAGES[msgIndex]}</p>
        <div className="loader-progress-bar">
          <div className="loader-progress-thumb" />
        </div>
      </div>
    </div>
  );
};
