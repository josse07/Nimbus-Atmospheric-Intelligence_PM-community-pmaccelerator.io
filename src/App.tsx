import React, { useState, useEffect, useCallback } from 'react';
import { GeocodeResult, WeatherData, TemperatureUnit } from './types';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { FiveDayForecast } from './components/FiveDayForecast';
import { HourlyForecastStrip } from './components/HourlyForecastStrip';
import { WeatherLogPage } from './components/WeatherLogPage';
import { Footer } from './components/Footer';
import { AlertCircle, RefreshCw, Loader2, CloudLightning } from 'lucide-react';
import { db, WEATHER_QUERIES_COLLECTION, collection, getDocs } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'log'>('live');
  const [unit, setUnit] = useState<TemperatureUnit>('celsius');
  const [currentLocation, setCurrentLocation] = useState<GeocodeResult>({
    name: 'New York',
    formattedName: 'New York, New York, United States',
    latitude: 40.7128,
    longitude: -74.0060,
    country: 'United States',
    admin1: 'New York',
    timezone: 'America/New_York',
  });

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [logCount, setLogCount] = useState(0);

  // Sync log count from Firestore
  useEffect(() => {
    async function loadLogCount() {
      try {
        const snap = await getDocs(collection(db, WEATHER_QUERIES_COLLECTION));
        setLogCount(snap.size);
      } catch (err) {
        console.warn('Could not read Firestore initial count:', err);
      }
    }
    loadLogCount();
  }, [activeTab]);

  // Fetch live & forecast weather for selected coordinates
  const fetchWeather = useCallback(async (loc: GeocodeResult) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(
        `/api/weather/current-forecast?lat=${loc.latitude}&lon=${loc.longitude}`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.message || 'We could not retrieve the weather for this location right now.'
        );
      }

      const data = await res.json();
      setWeatherData({
        location: loc,
        current: data.current,
        daily: data.daily,
        hourly: data.hourly,
        timezone: data.timezone,
      });
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setFetchError(
        err.message || 'The meteorological service is temporarily unreachable. Please retry.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial location on mount
  useEffect(() => {
    fetchWeather(currentLocation);
  }, [currentLocation, fetchWeather]);

  const handleLocationSelected = (newLocation: GeocodeResult) => {
    setCurrentLocation(newLocation);
    fetchWeather(newLocation);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Sticky Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unit={unit}
        setUnit={setUnit}
        logCount={logCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {activeTab === 'live' ? (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Search and Geolocation resolution */}
            <section id="location-input-section">
              <SearchBar
                onSelectLocation={handleLocationSelected}
                isLoading={isLoading}
                activeLocationName={currentLocation.formattedName || currentLocation.name}
              />
            </section>

            {/* Error Message with Retry Button */}
            {fetchError && (
              <div
                id="weather-api-error-card"
                className="p-4 sm:p-6 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-fade-in"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-rose-100">Atmospheric Data Unavailable</h3>
                    <p className="text-xs text-rose-300">{fetchError}</p>
                  </div>
                </div>

                <button
                  id="retry-weather-btn"
                  onClick={() => fetchWeather(currentLocation)}
                  className="self-start sm:self-auto px-4 py-2.5 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 border border-rose-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Request</span>
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !weatherData && (
              <div className="p-10 sm:p-16 flex flex-col items-center justify-center space-y-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                  <CloudLightning className="w-5 h-5 text-sky-200 absolute inset-0 m-auto" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-200">Retrieving Atmospheric Metrics...</p>
                  <p className="text-xs text-slate-400">Querying Open-Meteo live endpoints</p>
                </div>
              </div>
            )}

            {/* Current Conditions Card */}
            {weatherData && (
              <section id="current-conditions-section" className="space-y-6 sm:space-y-8">
                <CurrentWeatherCard
                  location={weatherData.location}
                  current={weatherData.current}
                  unit={unit}
                  onRefresh={() => fetchWeather(currentLocation)}
                  isRefreshing={isLoading}
                />

                {/* 24-Hour Hourly Trajectory */}
                <HourlyForecastStrip
                  hourlyForecasts={weatherData.hourly}
                  unit={unit}
                />

                {/* 5-Day Forecast Card Deck */}
                <FiveDayForecast
                  dailyForecasts={weatherData.daily}
                  unit={unit}
                />
              </section>
            )}
          </div>
        ) : (
          /* My Weather Log Page (CRUD, Range Analytics, Bonus Media, Export) */
          <div className="animate-fade-in">
            <WeatherLogPage
              unit={unit}
              onLogsChanged={(count) => setLogCount(count)}
            />
          </div>
        )}
      </main>

      {/* Global Branding & PM Accelerator Footer */}
      <Footer />
    </div>
  );
}
