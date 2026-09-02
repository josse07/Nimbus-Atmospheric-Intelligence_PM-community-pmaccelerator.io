import React from 'react';
import {
  Thermometer,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
  Gauge,
  Sun,
  CloudRain,
  MapPin,
  Clock,
  Compass
} from 'lucide-react';
import { CurrentWeather, GeocodeResult, TemperatureUnit } from '../types';
import { formatTemp, formatWindSpeed, getWeatherInterpretation } from '../lib/weatherCodes';
import { WeatherIcon } from './WeatherIcon';

interface CurrentWeatherCardProps {
  location: GeocodeResult;
  current: CurrentWeather;
  unit: TemperatureUnit;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({
  location,
  current,
  unit,
}) => {
  const interp = getWeatherInterpretation(current.weatherCode);

  const getWindDirectionText = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 45) % 8;
    return directions[index];
  };

  return (
    <div id="current-weather-hero" className="w-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 sm:p-6 md:p-8 shadow-xl shadow-slate-950/50 relative overflow-hidden">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800/80 pb-4 sm:pb-5 mb-5 sm:mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-sm font-medium mb-1">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <span id="location-display-name" className="truncate max-w-md font-semibold text-slate-200">
              {location.formattedName || location.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400">
            <span className="font-mono bg-slate-800/70 px-2 py-0.5 rounded text-slate-300">
              GPS: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </span>
            {location.country && <span>{location.country}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Updated: {new Date(current.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Primary Weather Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
        {/* Main Temperature & Condition badge */}
        <div className="lg:col-span-6 flex flex-row items-center gap-4 sm:gap-6">
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-inner shrink-0">
            <WeatherIcon weatherCode={current.weatherCode} isDay={current.isDay} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" />
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span id="current-temp-value" className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-50 tracking-tight">
                {formatTemp(current.temperature, unit)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-slate-300 font-medium">
              <span className="text-sky-300 font-semibold">{interp.label}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs sm:text-sm">
                Feels like <strong className="text-slate-200">{formatTemp(current.apparentTemperature, unit)}</strong>
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {current.isDay ? '☀️ Daytime observation' : '🌙 Nighttime observation'}
            </p>
          </div>
        </div>

        {/* 6 Key Atmospheric Metric Cards */}
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Humidity */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Humidity</span>
              <Droplets className="w-4 h-4 text-sky-400" />
            </div>
            <div id="metric-humidity" className="text-xl font-bold text-slate-100">
              {current.humidity}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {current.humidity > 65 ? 'High moisture' : current.humidity < 35 ? 'Dry air' : 'Comfortable'}
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Wind</span>
              <Wind className="w-4 h-4 text-teal-400" />
            </div>
            <div id="metric-wind" className="text-xl font-bold text-slate-100">
              {formatWindSpeed(current.windSpeed, unit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Compass className="w-3 h-3 text-teal-300" />
              <span>{getWindDirectionText(current.windDirection)} ({current.windDirection}°)</span>
            </div>
          </div>

          {/* Precipitation */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Precipitation</span>
              <CloudRain className="w-4 h-4 text-blue-400" />
            </div>
            <div id="metric-precipitation" className="text-xl font-bold text-slate-100">
              {current.precipitation} mm
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {current.precipitation > 0 ? 'Active rainfall' : 'No rain recorded'}
            </div>
          </div>

          {/* Air Pressure */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Pressure</span>
              <Gauge className="w-4 h-4 text-indigo-400" />
            </div>
            <div id="metric-pressure" className="text-xl font-bold text-slate-100">
              {current.surfacePressure} hPa
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {current.surfacePressure >= 1013 ? 'High pressure' : 'Low pressure'}
            </div>
          </div>

          {/* Sunrise */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Sunrise</span>
              <Sunrise className="w-4 h-4 text-amber-400" />
            </div>
            <div id="metric-sunrise" className="text-lg font-bold text-slate-100">
              {current.sunrise}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-0.5">Dawn</div>
          </div>

          {/* Sunset */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Sunset</span>
              <Sunset className="w-4 h-4 text-orange-400" />
            </div>
            <div id="metric-sunset" className="text-lg font-bold text-slate-100">
              {current.sunset}
            </div>
            <div className="text-[11px] text-orange-300/80 mt-0.5">Dusk</div>
          </div>
        </div>
      </div>
    </div>
  );
};
