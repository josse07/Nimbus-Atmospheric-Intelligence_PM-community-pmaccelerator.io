import React, { useState } from 'react';
import { DailyForecast, TemperatureUnit } from '../types';
import { formatTemp, getWeatherInterpretation } from '../lib/weatherCodes';
import { WeatherIcon } from './WeatherIcon';
import { Calendar, Droplets, Wind, ChevronRight } from 'lucide-react';

interface FiveDayForecastProps {
  dailyForecasts: DailyForecast[];
  unit: TemperatureUnit;
}

export const FiveDayForecast: React.FC<FiveDayForecastProps> = ({
  dailyForecasts,
  unit,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Take the 5-day forecast slice as requested in requirement #1
  const forecastDays = dailyForecasts.slice(0, 5);

  // Calculate overall min and max for consistent temperature gradient bars
  const globalMax = Math.max(...forecastDays.map(d => d.maxTemp), 30);
  const globalMin = Math.min(...forecastDays.map(d => d.minTemp), 0);
  const range = globalMax - globalMin || 1;

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div id="five-day-forecast-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-slate-100">5-Day Atmospheric Forecast</h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">Daily High / Low Predictions</span>
      </div>

      {/* Row of cards: scroll horizontally on mobile/narrow screens, grid on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-thin">
        {forecastDays.map((day, idx) => {
          const interp = getWeatherInterpretation(day.weatherCode);
          const isSelected = selectedDayIndex === idx;

          // Compute bar positions
          const leftPercent = Math.max(0, Math.min(100, ((day.minTemp - globalMin) / range) * 100));
          const widthPercent = Math.max(15, Math.min(100 - leftPercent, ((day.maxTemp - day.minTemp) / range) * 100));

          return (
            <div
              key={day.date}
              id={`forecast-card-day-${idx}`}
              onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
              className={`flex-shrink-0 cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-sky-500 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500'
                  : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{day.dayName}</h3>
                  <p className="text-xs text-slate-400">{formatDateLabel(day.date)}</p>
                </div>
                {idx === 0 && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                    Today
                  </span>
                )}
              </div>

              {/* Weather Icon & Condition */}
              <div className="my-2 flex flex-col items-center text-center">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 mb-2">
                  <WeatherIcon weatherCode={day.weatherCode} className="w-10 h-10" />
                </div>
                <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                  {interp.label}
                </span>
                {day.precipitationProbability !== undefined && day.precipitationProbability > 0 && (
                  <span className="text-[11px] text-blue-400 flex items-center gap-1 mt-1 font-medium">
                    <Droplets className="w-3 h-3" />
                    {day.precipitationProbability}% precip
                  </span>
                )}
              </div>

              {/* High / Low Temperatures */}
              <div className="mt-3 pt-3 border-t border-slate-800/70">
                <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
                  <span className="text-slate-400 text-xs font-normal">
                    Low <strong className="text-slate-300 font-semibold">{formatTemp(day.minTemp, unit)}</strong>
                  </span>
                  <span className="text-slate-100">
                    <strong className="text-sky-400">{formatTemp(day.maxTemp, unit)}</strong>
                  </span>
                </div>

                {/* Visual comparative temperature bar */}
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-amber-400"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                  />
                </div>
              </div>

              {/* Expanded details toggle */}
              {isSelected && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] space-y-1 text-slate-400 animate-fade-in">
                  <div className="flex justify-between">
                    <span>Max Wind:</span>
                    <span className="text-slate-200">{day.windSpeedMax} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rain sum:</span>
                    <span className="text-slate-200">{day.precipitationSum} mm</span>
                  </div>
                  {day.sunrise && (
                    <div className="flex justify-between">
                      <span>Sun:</span>
                      <span className="text-slate-200">{day.sunrise} - {day.sunset}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
