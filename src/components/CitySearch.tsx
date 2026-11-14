import React, { useCallback, useEffect, useRef, useState } from 'react';
import { reverseGeocode, searchCities, type SearchResult } from '../lib/geocode';
import { AppError, type City } from '../lib/types';

interface Props {
  onSelectCity: (city: City) => void;
  currentCity: City | null;
}

export const CitySearch: React.FC<Props> = ({ onSelectCity }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: 'info' | 'error' } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortCtrl = useRef<AbortController | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const searchSeq = useRef<number>(0);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  // Live autocomplete search with 300ms debounce and race-condition prevention
  const performSearch = useCallback(async (val: string) => {
    const q = val.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    abortCtrl.current?.abort();
    const ac = new AbortController();
    abortCtrl.current = ac;

    const currentSeq = ++searchSeq.current;
    setLoading(true);
    setSearchError(null);
    setOpen(true);

    try {
      const res: SearchResult = await searchCities(q, ac.signal);
      if (ac.signal.aborted || currentSeq !== searchSeq.current) return;
      setResults(res.cities);
      setSource(res.source);
      setSelectedIndex(-1);
    } catch (err) {
      if (ac.signal.aborted || currentSeq !== searchSeq.current) return;
      const msg =
        err instanceof AppError
          ? `${err.title} ${err.hint}`
          : 'Unable to reach the search service. Check your connection or try again.';
      setSearchError(msg);
      setResults([]);
    } finally {
      if (!ac.signal.aborted && currentSeq === searchSeq.current) {
        setLoading(false);
      }
    }
  }, []);

  // Handle typing input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    if (!val.trim()) {
      setResults([]);
      setOpen(false);
      setStatusNotice(null);
      setSearchError(null);
      return;
    }

    debounceTimer.current = window.setTimeout(() => {
      void performSearch(val);
    }, 300);
  };

  const handleSelect = (city: City) => {
    setQuery(`${city.name}${city.country ? ', ' + city.country : ''}`);
    setOpen(false);
    setResults([]);
    setStatusNotice(null);
    setSearchError(null);
    onSelectCity(city);
  };

  // Keyboard navigation & selection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (results.length > 0 || query.trim().length === 0)) {
        setOpen(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }

    const totalSelectable = results.length + 1; // +1 for the "Use my location" button

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalSelectable - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalSelectable - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === 0) {
        handleGeolocate();
      } else if (selectedIndex > 0 && selectedIndex - 1 < results.length) {
        handleSelect(results[selectedIndex - 1]);
      } else if (results.length > 0) {
        handleSelect(results[0]);
      } else if (query.trim()) {
        void performSearch(query.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  // "Use my location" GPS feature with graceful permission handling
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setStatusNotice({ message: 'Geolocation is not supported by your browser.', type: 'info' });
      return;
    }

    setLocating(true);
    setStatusNotice(null);
    setOpen(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          handleSelect(city);
        } catch {
          setStatusNotice({
            message: "Couldn't retrieve city name for your coordinates. Please search for your city above.",
            type: 'info',
          });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setStatusNotice({
            message: 'Location access was not granted. You can type any city name in the search bar above.',
            type: 'info',
          });
        } else {
          setStatusNotice({
            message: 'Unable to determine your location. Please search for your city above.',
            type: 'info',
          });
        }
      },
      { timeout: 8000 },
    );
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setStatusNotice(null);
    setSearchError(null);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();

    if (!q) {
      handleGeolocate();
      return;
    }

    if (open && selectedIndex === 0) {
      handleGeolocate();
      return;
    }

    if (open && selectedIndex > 0 && selectedIndex - 1 < results.length) {
      handleSelect(results[selectedIndex - 1]);
      return;
    }

    if (results.length > 0) {
      handleSelect(results[0]);
      return;
    }

    void performSearch(q);
  };

  return (
    <div className="search-section" ref={containerRef}>
      <div className="search-bar-wrap">
        <form className="search-form" onSubmit={handleSubmit} role="search" noValidate>
          <div className={`search-input-shell ${statusNotice?.type === 'error' ? 'has-error' : ''}`}>
            <div className="search-icon-lead" aria-hidden="true">
              {loading ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'wi-spin 1s linear infinite' }}
                >
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              className="search-input"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (query.trim().length >= 2 || results.length > 0) {
                  setOpen(true);
                }
              }}
              placeholder="Search city, state, or country..."
              autoComplete="off"
              spellCheck="false"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="city-autocomplete-list"
              aria-label="Search city name for weather conditions"
            />

            <div className="search-trailing">
              {query && (
                <button
                  type="button"
                  className="btn btn-icon btn-ghost"
                  onClick={handleClear}
                  aria-label="Clear search input"
                  title="Clear"
                  style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={handleGeolocate}
                disabled={locating}
                aria-label="Use my current location"
                title="Use my current location"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={locating ? 'var(--accent-blue)' : 'currentColor'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: locating ? 'wi-spin 1.2s linear infinite' : 'none' }}
                >
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {statusNotice && (
          <div className={`search-notice-msg ${statusNotice.type === 'error' ? 'is-error' : 'is-info'}`} role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ flex: 1 }}>{statusNotice.message}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="search-notice-dismiss"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {open && (
          <div className="autocomplete-menu" id="city-autocomplete-list" role="listbox">
            {/* Quick Action: Use My Current Location */}
            <button
              type="button"
              className={`autocomplete-location-row ${selectedIndex === 0 ? 'is-selected' : ''}`}
              onClick={handleGeolocate}
              role="option"
              aria-selected={selectedIndex === 0}
            >
              <div className="autocomplete-location-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span className="autocomplete-location-title">Use my current location</span>
                <span className="autocomplete-location-desc">Detect weather for where you are</span>
              </div>
              <span className="autocomplete-location-pill">GPS</span>
            </button>

            {loading && results.length === 0 && (
              <div className="autocomplete-state-box">
                <div className="search-state-spinner" />
                <span>Searching cities...</span>
              </div>
            )}

            {!loading && searchError && (
              <div className="autocomplete-state-box">
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Search Busy</p>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {searchError}
                </p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '4px 12px', border: '1px solid var(--border-subtle)' }}
                  onClick={() => void performSearch(query)}
                >
                  Retry Search
                </button>
              </div>
            )}

            {!loading && !searchError && results.length === 0 && query.trim().length >= 2 && (
              <div className="autocomplete-state-box">
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No cities found</p>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Check your spelling or try searching for a nearby major city.
                </p>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="autocomplete-header">
                  <span>Suggestions ({results.length})</span>
                  <span className="autocomplete-source-badge">{source}</span>
                </div>
                {results.map((city, idx) => {
                  const itemIndex = idx + 1; // offset by 1 for GPS option
                  const isSelected = selectedIndex === itemIndex;
                  const locationDetail = [city.region, city.country].filter(Boolean).join(', ');

                  return (
                    <button
                      key={city.id}
                      type="button"
                      className={`autocomplete-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelect(city)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="autocomplete-item-text">
                        <span className="autocomplete-item-name">{city.name}</span>
                        <span className="autocomplete-item-sub">
                          {locationDetail}
                          {city.countryCode && <span className="autocomplete-country-code"> ({city.countryCode})</span>}
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
