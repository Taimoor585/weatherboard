import React, { useMemo, useState } from 'react';
import { AtmosphericLoader } from './components/AtmosphericLoader';
import { CitySearch } from './components/CitySearch';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { DailyForecast } from './components/DailyForecast';
import { ErrorCard } from './components/ErrorCard';
import { FavouriteCities } from './components/FavouriteCities';
import { Header } from './components/Header';
import { HourlyForecast } from './components/HourlyForecast';
import { MetricsGrid } from './components/MetricsGrid';
import { MoonAstronomyCard } from './components/MoonAstronomyCard';
import { NotificationModal } from './components/NotificationModal';
import { OfflineBanner } from './components/OfflineBanner';
import { Precipitation } from './components/Precipitation';
import { SkyCanvas } from './components/SkyCanvas';
import { SunArcCard } from './components/SunArcCard';
import { useInstallPrompt, useOnline } from './hooks/useEnv';
import { useFavourites } from './hooks/useFavourites';
import { useTheme } from './hooks/useTheme';
import { useUnits } from './hooks/useUnits';
import { useWeather } from './hooks/useWeather';
import { fmtDay } from './lib/format';
import { readReminder } from './lib/notifications';
import { KEYS, storage } from './lib/storage';
import type { City } from './lib/types';

const DEFAULT_CITY: City = {
  id: 'om-2643743',
  name: 'London',
  country: 'United Kingdom',
  countryCode: 'GB',
  lat: 51.5085,
  lon: -0.1257,
};

export const App: React.FC = () => {
  // Theme & Units
  const { theme, toggle: toggleTheme } = useTheme();
  const { units, toggle: toggleUnits } = useUnits();

  // Environment & Offline
  const online = useOnline();
  const { canInstall, install } = useInstallPrompt();

  // Current City
  const [city, setCity] = useState<City>(() => {
    return storage.get<City>(KEYS.lastCity, DEFAULT_CITY);
  });

  // Weather query hook
  const { status, data, error, fromCache, refreshing, refresh, retry } = useWeather(city, online);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Selected Day Index for 5-Day & Hourly Interactive Link
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Favourites
  const { favourites, add: addFav, remove: removeFav, isFavourite, persistent } = useFavourites();

  // Modals & Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [reminderActive, setReminderActive] = useState(() => readReminder().enabled);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const handleToggleFavourite = (targetCity: City) => {
    if (isFavourite(targetCity)) {
      removeFav(targetCity);
      showToast(`Removed ${targetCity.name} from favourites`);
    } else {
      const res = addFav(targetCity);
      if (res === 'added') {
        showToast(`Saved ${targetCity.name} to favourites (up to 5)`);
      } else if (res === 'full') {
        showToast('Maximum 5 favourite cities reached. Remove one first.');
      } else {
        showToast(`${targetCity.name} is already in favourites.`);
      }
    }
  };

  const handleManualRefresh = () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    showToast('Telemetry updated');
    refresh();
    setTimeout(() => {
      setManualRefreshing(false);
    }, 850);
  };

  // Derive hourly slice for the selected day
  const displayHourly = useMemo(() => {
    if (!data) return [];
    if (selectedDayIndex === 0) return data.hourly;
    const selectedDate = data.daily[selectedDayIndex]?.date;
    if (!selectedDate || !data.allHourly) return data.hourly;

    const dayStart = selectedDate;
    const dayEnd = dayStart + 86400;
    const filtered = data.allHourly.filter((h) => h.time >= dayStart && h.time < dayEnd);
    return filtered.length > 0 ? filtered : data.hourly;
  }, [data, selectedDayIndex]);

  const selectedDayLabel = useMemo(() => {
    if (!data || !data.daily[selectedDayIndex]) return 'Today';
    return selectedDayIndex === 0 ? 'Today' : fmtDay(data.daily[selectedDayIndex].date, data.utcOffsetSec, selectedDayIndex);
  }, [data, selectedDayIndex]);

  const currentCondition = data?.current.condition ?? 'clear';
  const currentWind = data?.current.windKmh ?? 12;

  return (
    <>
      {/* Background WebGL & Canvas Atmospheric Simulation */}
      <SkyCanvas theme={theme} condition={currentCondition} reduced={false} />
      <Precipitation condition={currentCondition} theme={theme} windKmh={currentWind} reduced={false} />

      <div className="app-wrapper">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          units={units}
          onToggleUnits={toggleUnits}
          onRefresh={handleManualRefresh}
          refreshing={manualRefreshing || refreshing}
          onOpenNotifications={() => setNotifOpen(true)}
          reminderEnabled={reminderActive}
          canInstall={canInstall}
          onInstall={() => void install()}
        />

        <main className="container" role="main">
          {/* City Autocomplete Search Bar */}
          <CitySearch
            onSelectCity={(c) => {
              setSelectedDayIndex(0);
              setCity(c);
            }}
            currentCity={city}
          />

          {/* Favourites Quick-Access Bar */}
          <FavouriteCities
            favourites={favourites}
            currentCity={city}
            onSelectCity={(c) => {
              setSelectedDayIndex(0);
              setCity(c);
            }}
            onRemoveCity={removeFav}
            persistent={persistent}
          />

          {/* Offline / Cache Banner */}
          <OfflineBanner
            isOffline={!online}
            fromCache={fromCache}
            fetchedAt={data?.fetchedAt}
            onRefresh={handleManualRefresh}
          />

          {/* Full-Page Atmospheric Loader on initial load or city transition */}
          {status === 'loading' && !data && <AtmosphericLoader cityName={city?.name} />}

          {/* Error State */}
          {status === 'error' && !data && <ErrorCard error={error} onRetry={retry} />}

          {/* Weather Dashboard Core Display */}
          {data && (
            <div className="dashboard-fullscreen-layout">
              {/* TOP ROW: Hero Current Weather & 5-Day Forecast side-by-side */}
              <div className="layout-top-split">
                <CurrentWeatherCard
                  data={data}
                  units={units}
                  isFavourite={isFavourite(city)}
                  onToggleFavourite={handleToggleFavourite}
                  fromCache={fromCache}
                />

                <DailyForecast
                  daily={data.daily}
                  utcOffsetSec={data.utcOffsetSec}
                  units={units}
                  selectedDayIndex={selectedDayIndex}
                  onSelectDay={(idx) => setSelectedDayIndex(idx)}
                />
              </div>

              {/* MIDDLE ROW: Full-Width 24-Hour Forecast Timeline */}
              <HourlyForecast
                hourly={displayHourly}
                utcOffsetSec={data.utcOffsetSec}
                units={units}
                dayLabel={selectedDayLabel}
              />

              {/* BOTTOM ROW: Detailed Weather Metrics, Sun Arc & Lunar Barometer */}
              <div className="layout-bottom-split">
                <MetricsGrid data={data} units={units} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
                  <SunArcCard
                    sunrise={data.today.sunrise}
                    sunset={data.today.sunset}
                    utcOffsetSec={data.utcOffsetSec}
                  />

                  <MoonAstronomyCard
                    moon={data.moon}
                    pressure={data.current.pressure}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <div className="container">
            <div className="footer-inner">
              <div style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                WeatherBoard · Precision Meteorological Telemetry · Continuous Localized Forecasting
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.785rem' }}>
                All systems nominal
              </div>
            </div>
          </div>
        </footer>

        {/* Push Notification & Reminder Settings Modal */}
        <NotificationModal
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          onReminderChange={(en) => setReminderActive(en)}
        />

        {/* Centered Micro-interaction Toast Banner */}
        {toastMessage && (
          <div className="toast-banner" role="status" aria-live="polite">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-blue)' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </>
  );
};
