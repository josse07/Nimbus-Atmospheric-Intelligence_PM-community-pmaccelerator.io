import React from 'react';
import { HourlyForecast, TemperatureUnit } from '../types';
import { formatTemp } from '../lib/weatherCodes';
import { WeatherIcon } from './WeatherIcon';
import { Clock, Droplets } from 'lucide-react';

interface HourlyForecastStripProps {
  hourlyForecasts: HourlyForecast[];
  unit: TemperatureUnit;
}

export const HourlyForecastStrip: React.FC<HourlyForecastStripProps> = ({
  hourlyForecasts,
  unit,
}) => {
  if (!hourlyForecasts || hourlyForecasts.length === 0) return null;

  return (
    <div id="hourly-forecast-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Hourly Trajectory (Next 24 Hours)</h2>
        </div>
        <span className="text-xs text-slate-400">Scroll to explore &rarr;</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin">
        {hourlyForecasts.map((hour, idx) => (
          <div
            key={idx}
            className={`shrink-0 flex flex-col items-center justify-between p-3 rounded-xl border transition-all w-24 text-center ${
              idx === 0
                ? 'bg-slate-800/90 border-sky-500/80 shadow-md shadow-sky-950/30'
                : 'bg-slate-900/60 hover:bg-slate-800/50 border-slate-800'
            }`}
          >
            <span className="text-xs font-semibold text-slate-300">
              {idx === 0 ? 'Now' : hour.time}
            </span>

            <div className="my-2 p-1.5 rounded-lg bg-slate-950/40">
              <WeatherIcon weatherCode={hour.weatherCode} isDay={hour.isDay} className="w-6 h-6" />
            </div>

            <span className="text-sm font-bold text-slate-100">
              {formatTemp(hour.temperature, unit)}
            </span>

            <div className="mt-1.5 flex items-center gap-0.5 text-[10px] text-blue-400 font-medium">
              <Droplets className="w-2.5 h-2.5" />
              <span>{hour.precipitationProbability}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
