import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GeocodeResult, WeatherData, TemperatureUnit, AppLanguage } from './types';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { FiveDayForecast } from './components/FiveDayForecast';
import { HourlyForecastStrip } from './components/HourlyForecastStrip';
import { WeatherLogPage } from './components/WeatherLogPage';
import { Footer } from './components/Footer';
import { SmartRecommendationsCard } from './components/SmartRecommendationsCard';
import { VoiceAssistantController } from './components/VoiceAssistantController';
import { DailyBriefingCard } from './components/DailyBriefingCard';
import { SettingsModal } from './components/SettingsModal';
import { HydrationReminderWidget } from './components/HydrationReminderWidget';
import { HabitReminderWidget } from './components/HabitReminderWidget';
import { ActiveHydrationToast } from './components/ActiveHydrationToast';
import { HomeScreenWidgetModal } from './components/HomeScreenWidgetModal';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './lib/authContext';
import { generateSmartRecommendations } from './lib/recommendationEngine';
import { hydrationManager } from './lib/hydrationManager';
import { dailyBriefingManager, isNigeriaLocation } from './lib/dailyBriefingManager';
import { habitReminderManager } from './lib/habitReminderManager';
import { AlertCircle, RefreshCw, Loader2, CloudLightning, MapPin, Navigation } from 'lucide-react';
import { db, WEATHER_QUERIES_COLLECTION, collection, getDocs } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'log'>('live');
  const [unit, setUnit] = useState<TemperatureUnit>('celsius');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);

  const { user, userPreferences, updatePreferences } = useAuth();

  // Sync temperature unit from cloud user preferences
  useEffect(() => {
    if (userPreferences?.temperatureUnit && userPreferences.temperatureUnit !== unit) {
      setUnit(userPreferences.temperatureUnit);
    }
  }, [userPreferences?.temperatureUnit]);

  const handleUnitChange = (newUnit: TemperatureUnit) => {
    setUnit(newUnit);
    if (user) {
      updatePreferences({ temperatureUnit: newUnit });
    }
  };
  const [currentLocation, setCurrentLocation] = useState<GeocodeResult>(() => {
    // Attempt to initialize from previously saved location
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nimbus_user_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.latitude && parsed.longitude) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not read cached location on init:', e);
      }
    }
    return {
      name: 'Detecting Location...',
      formattedName: 'Detecting local weather...',
      latitude: 51.5074,
      longitude: -0.1278,
      country: '',
      admin1: '',
      timezone: 'auto',
    };
  });

  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | 'search' | 'cached' | 'default'>('default');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [logCount, setLogCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => dailyBriefingManager.getSettings().language);

  // Sync language preferences from DailyBriefingManager
  useEffect(() => {
    const unsub = dailyBriefingManager.subscribe((_, s) => {
      setAppLanguage(s.language);
    });
    return () => unsub();
  }, []);

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

    // Enforce Nigeria geographical restriction:
    // If user navigates to an international location, Pidgin is disabled
    if (!isNigeriaLocation(loc) && dailyBriefingManager.getSettings().language === 'pcm') {
      dailyBriefingManager.updateSettings({ language: 'en' }, loc);
      hydrationManager.updateSettings({ language: 'en' });
    }

    try {
      const res = await fetch(
        `/api/weather/current-forecast?lat=${loc.latitude}&lon=${loc.longitude}`
      );

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.message || 'Atmospheric service is currently busy. Please click retry.'
        );
      }

      if (!data || !data.current) {
        throw new Error(
          'Received incomplete atmospheric telemetry. Please click retry.'
        );
      }

      setWeatherData({
        location: loc,
        current: data.current,
        daily: data.daily || [],
        hourly: data.hourly || [],
        timezone: data.timezone || 'auto',
      });

      // Update daily briefing manager
      dailyBriefingManager.updateWeatherData(
        data.current,
        data.daily || [],
        data.hourly || [],
        loc,
        unit
      );
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setFetchError(
        err.message || 'The meteorological service is temporarily unreachable. Please retry.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [unit]);

  // Compute smart recommendations & briefings
  const smartAnalysis = useMemo(() => {
    if (!weatherData) return null;
    return generateSmartRecommendations(
      weatherData.current,
      weatherData.daily,
      weatherData.hourly,
      weatherData.location.name,
      unit,
      appLanguage
    );
  }, [weatherData, unit, appLanguage]);

  // Sync hydration manager with current thermal conditions
  useEffect(() => {
    if (weatherData) {
      const tempDisplay = unit === 'fahrenheit'
        ? `${Math.round((weatherData.current.temperature * 9) / 5 + 32)}°F`
        : `${Math.round(weatherData.current.temperature)}°C`;
      hydrationManager.updateWeatherMetrics(
        weatherData.current.temperature,
        weatherData.current.apparentTemperature,
        weatherData.current.humidity,
        tempDisplay
      );
    }
  }, [weatherData, unit]);

  // Dual-stage Automatic Location Detection (GPS first, IP fallback)
  const detectLocalLocation = useCallback(async (force = false) => {
    setIsLocating(true);
    setLocationNotice(null);

    const tryIpLocation = async () => {
      try {
        const res = await fetch('/api/ip-location');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const ipLoc: GeocodeResult | null = await res.json().catch(() => null);
          if (ipLoc && ipLoc.latitude && ipLoc.longitude) {
            setCurrentLocation(ipLoc);
            setLocationSource('ip');
            localStorage.setItem('nimbus_user_location', JSON.stringify(ipLoc));
            localStorage.setItem('nimbus_location_source', 'ip');
            setLocationNotice(`Detected via local network: ${ipLoc.formattedName || ipLoc.name}`);
            await fetchWeather(ipLoc);
            return true;
          }
        }
      } catch (err) {
        console.warn('IP location fetch error:', err);
      }
      return false;
    };

    // 1. Try Browser Geolocation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const gpsPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4500,
          maximumAge: 120000,
          enableHighAccuracy: false,
        });
      });

      try {
        const position = await gpsPromise;
        const { latitude, longitude } = position.coords;
        const revRes = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
        let finalLoc: GeocodeResult | null = null;
        if (revRes.ok && revRes.headers.get('content-type')?.includes('application/json')) {
          finalLoc = await revRes.json().catch(() => null);
        }
        if (!finalLoc || !finalLoc.latitude) {
          finalLoc = {
            name: `Current Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
            formattedName: `Current Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
            latitude,
            longitude,
            timezone: 'auto',
          };
        }
        setCurrentLocation(finalLoc);
        setLocationSource('gps');
        localStorage.setItem('nimbus_user_location', JSON.stringify(finalLoc));
        localStorage.setItem('nimbus_location_source', 'gps');
        setLocationNotice(`Device location detected: ${finalLoc.formattedName || finalLoc.name}`);
        await fetchWeather(finalLoc);
        setIsLocating(false);
        return;
      } catch (gpsError) {
        console.info('GPS not accessible, using IP-based location fallback...');
      }
    }

    // 2. IP-based location fallback
    const ipSuccess = await tryIpLocation();
    if (ipSuccess) {
      setIsLocating(false);
      return;
    }

    // 3. Fallback to cached or default
    const saved = localStorage.getItem('nimbus_user_location');
    if (saved) {
      try {
        const cachedLoc: GeocodeResult = JSON.parse(saved);
        setCurrentLocation(cachedLoc);
        setLocationSource('cached');
        await fetchWeather(cachedLoc);
        setIsLocating(false);
        return;
      } catch {}
    }

    // Default safe fallback if network unreachable
    const defaultLoc: GeocodeResult = {
      name: 'London',
      formattedName: 'London, England, United Kingdom',
      latitude: 51.5074,
      longitude: -0.1278,
      country: 'United Kingdom',
      admin1: 'England',
      timezone: 'Europe/London',
    };
    setCurrentLocation(defaultLoc);
    setLocationSource('default');
    await fetchWeather(defaultLoc);
    setIsLocating(false);
  }, [fetchWeather]);

  // Initial location detection on mount
  useEffect(() => {
    const saved = localStorage.getItem('nimbus_user_location');
    const savedSource = (localStorage.getItem('nimbus_location_source') || 'cached') as any;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.latitude && parsed.longitude) {
          setCurrentLocation(parsed);
          setLocationSource(savedSource);
          fetchWeather(parsed);
          return;
        }
      } catch (e) {
        console.warn('Failed parsing cached location:', e);
      }
    }

    // Automatically detect user's local weather!
    detectLocalLocation();
  }, [detectLocalLocation, fetchWeather]);

  const handleLocationSelected = (newLocation: GeocodeResult) => {
    setCurrentLocation(newLocation);
    setLocationSource('search');
    setLocationNotice(null);
    localStorage.setItem('nimbus_user_location', JSON.stringify(newLocation));
    localStorage.setItem('nimbus_location_source', 'search');
    fetchWeather(newLocation);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Sticky Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unit={unit}
        setUnit={handleUnitChange}
        logCount={logCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {activeTab === 'live' ? (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Search and Geolocation resolution */}
            <section id="location-input-section" className="space-y-2">
              <SearchBar
                onSelectLocation={handleLocationSelected}
                isLoading={isLoading}
                activeLocationName={currentLocation.formattedName || currentLocation.name}
              />

              {/* Location Status & One-Click Detect Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">
                    Current area:{' '}
                    <span className="font-semibold text-slate-200">
                      {currentLocation.formattedName || currentLocation.name}
                    </span>
                  </span>
                  {locationSource === 'gps' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shrink-0">
                      GPS Active
                    </span>
                  )}
                  {locationSource === 'ip' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/80 shrink-0">
                      Auto Local
                    </span>
                  )}
                  {locationSource === 'search' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      Searched
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  id="detect-my-location-pill-btn"
                  onClick={() => detectLocalLocation(true)}
                  disabled={isLocating || isLoading}
                  className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50 font-medium shrink-0 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg"
                  title="Detect your real device or network location"
                >
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{isLocating ? 'Detecting Local Weather...' : 'Detect My Location'}</span>
                </button>
              </div>

              {locationNotice && (
                <div className="text-[11px] text-emerald-400/90 px-1 flex items-center gap-1.5 animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{locationNotice}</span>
                </div>
              )}
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

            {/* Live Weather Display */}
            {weatherData && (
              <section id="current-conditions-section" className="space-y-6 sm:space-y-8">
                {/* Voice Assistant Controller Bar */}
                <VoiceAssistantController
                  analysis={smartAnalysis}
                  locationName={currentLocation.formattedName || currentLocation.name}
                />

                {/* Duolingo-Inspired Habit Reminder & Streak Widget */}
                <HabitReminderWidget
                  weather={weatherData}
                  language={appLanguage}
                  location={currentLocation}
                  onOpenWidgetModal={() => setIsWidgetModalOpen(true)}
                  onNavigateToBriefing={() => {
                    habitReminderManager.markHabitCompleted('weatherChecked');
                    const el = document.getElementById('daily-weather-briefing-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onNavigateToHydration={() => {
                    const el = document.getElementById('hydration-reminder-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onNavigateToRecommendations={() => {
                    habitReminderManager.markHabitCompleted('recommendationsViewed');
                    const el = document.getElementById('smart-recommendations-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* Proactive Daily Weather Briefing & Action Checklist */}
                <DailyBriefingCard
                  location={weatherData.location}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />

                {/* Primary Hero Weather Card */}
                <CurrentWeatherCard
                  location={weatherData.location}
                  current={weatherData.current}
                  unit={unit}
                  onRefresh={() => fetchWeather(currentLocation)}
                  isRefreshing={isLoading}
                />

                {/* Smart Weather Recommendations */}
                {smartAnalysis && (
                  <SmartRecommendationsCard
                    analysis={smartAnalysis}
                    onOpenHydrationModal={() => {
                      const el = document.getElementById('hydration-reminder-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onLogDrink={(amount) => hydrationManager.recordDrink(amount, `Quick Log (${amount}ml)`)}
                  />
                )}

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

                {/* Smart Hourly Hydration Reminders & Tracker */}
                <HydrationReminderWidget />
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

      {/* Global In-App Proactive Hydration Notification Toast */}
      <ActiveHydrationToast />

      {/* Global Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLocation={currentLocation}
        onOpenWidgetModal={() => setIsWidgetModalOpen(true)}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Home Screen Mobile Widget Permission & Walkthrough Modal */}
      <HomeScreenWidgetModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        weather={weatherData}
        location={currentLocation}
      />

      {/* Email-Based Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Global Branding & PM Accelerator Footer */}
      <Footer />
    </div>
  );
}
