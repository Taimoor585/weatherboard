import React, { useState } from 'react';
import { sameCity } from '../hooks/useFavourites';
import type { City } from '../lib/types';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  favourites: City[];
  currentCity: City | null;
  onSelectCity: (city: City) => void;
  onRemoveCity: (city: City) => void;
  persistent: boolean;
}

export const FavouriteCities: React.FC<Props> = ({
  favourites,
  currentCity,
  onSelectCity,
  onRemoveCity,
  persistent,
}) => {
  const [cityToRemove, setCityToRemove] = useState<City | null>(null);

  if (favourites.length === 0) {
    return null;
  }

  const handleConfirmRemove = () => {
    if (cityToRemove) {
      onRemoveCity(cityToRemove);
      setCityToRemove(null);
    }
  };

  return (
    <>
      <div className="favourites-bar" role="region" aria-label="Favourite cities">
        <span className="fav-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Saved ({favourites.length}/5)
        </span>

        {favourites.map((city) => {
          const isActive = currentCity ? sameCity(city, currentCity) : false;
          return (
            <div
              key={city.id}
              className={`fav-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectCity(city)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCity(city);
                }
              }}
              aria-label={`View weather for ${city.name}`}
            >
              <span>{city.name}</span>
              <button
                type="button"
                className="fav-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCityToRemove(city);
                }}
                aria-label={`Remove ${city.name} from favourites`}
                title={`Remove ${city.name}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}

        {!persistent && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
            (Storage offline — saved for this session only)
          </span>
        )}
      </div>

      <ConfirmModal
        open={Boolean(cityToRemove)}
        title="Remove favourite city?"
        description={`Are you sure you want to remove "${cityToRemove?.name}" from your quick-access favourites? You can search and add it back at any time.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        danger={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setCityToRemove(null)}
      />
    </>
  );
};
