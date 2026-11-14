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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortCtrl = useRef<AbortController | null>(null);
  const debounceTimer = useRef<number | null>(null);

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

  // Live autocomplete search with 300ms debounce
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

    setLoading(true);
    setErrorMessage(null);

    try {
      const res: SearchResult = await searchCities(q, ac.signal);
      if (ac.signal.aborted) return;
      setResults(res.cities);
      setSource(res.source);
      setOpen(true);
      setSelectedIndex(-1);
      if (res.cities.length === 0) {
        setErrorMessage(`No cities found matching "${q}". Check spelling or try a nearby major city.`);
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      if (err instanceof AppError) {
        setErrorMessage(`${err.title} ${err.hint}`);
      } else {
        setErrorMessage('Unable to reach the city search service. Check your connection or try again.');
      }
      setResults([]);
    } finally {
      if (!ac.signal.aborted) {
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
      setErrorMessage(null);
      return;
    }

    debounceTimer.current = window.setTimeout(() => {
      void performSearch(val);
    }, 300);
  };

  // Form submission (Enter key or search click)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();

    // If empty: take current location as requested!
    if (!q) {
      setErrorMessage(null);
      handleGeolocate();
      return;
    }

    // If an item is highlighted via arrow keys
    if (open && selectedIndex >= 0 && selectedIndex < results.length) {
      handleSelect(results[selectedIndex]);
      return;
    }

    if (results.length > 0) {
      handleSelect(results[0]);
      return;
    }

    void performSearch(q);
  };

  const handleSelect = (city: City) => {
    setQuery(`${city.name}${city.country ? ', ' + city.country : ''}`);
    setOpen(false);
    setResults([]);
    setErrorMessage(null);
    onSelectCity(city);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setOpen(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  // "Use my location" GPS feature
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by this browser.');
      return;
    }

    setLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          handleSelect(city);
        } catch {
          setErrorMessage("Couldn't retrieve city for your coordinates. Please enter a city name.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          // If denied, provide gentle non-blocking hint
          setErrorMessage('Location permission was denied. Type your city or enable location in browser settings.');
        } else {
          setErrorMessage('Unable to determine location. Please search for your city.');
        }
      },
      { timeout: 7000 },
    );
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  return (
    <div className="search-section" ref={containerRef}>
      <div className="search-bar-wrap">
        <form className="search-form" onSubmit={handleSubmit} role="search" noValidate>
          <div className={`search-input-shell ${errorMessage ? 'has-error' : ''}`}>
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
              placeholder="Search any city or leave blank to use your location..."
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
                aria-label="Detect current location"
                title="Detect current location"
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

        {errorMessage && (
          <div className="search-error-msg" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ flex: 1 }}>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px 4px' }}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {open && results.length > 0 && (
          <div className="autocomplete-menu" id="city-autocomplete-list" role="listbox">
            <div className="autocomplete-header">
              <span>City Suggestions</span>
              <span className="autocomplete-source-badge">{source}</span>
            </div>
            {results.map((city, idx) => (
              <button
                key={city.id}
                type="button"
                className={`autocomplete-item ${idx === selectedIndex ? 'is-selected' : ''}`}
                onClick={() => handleSelect(city)}
                role="option"
                aria-selected={idx === selectedIndex}
              >
                <div>
                  <span className="autocomplete-item-name">{city.name}</span>
                  <span className="autocomplete-item-sub">
                    {[city.region, city.country].filter(Boolean).join(', ')}
                  </span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
