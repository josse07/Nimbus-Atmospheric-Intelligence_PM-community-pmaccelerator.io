import React from 'react';
import { CloudLightning, Calendar, Compass } from 'lucide-react';
import { TemperatureUnit } from '../types';

interface NavbarProps {
  activeTab: 'live' | 'log';
  setActiveTab: (tab: 'live' | 'log') => void;
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  logCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unit,
  setUnit,
  logCount,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
            <CloudLightning className="w-5 h-5 text-sky-100" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg text-slate-50 tracking-tight">Nimbus</span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 font-medium">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">Real-Time Forecast & Historical Intelligence</p>
          </div>
        </div>

        {/* View Switcher Tabs - responsive labels & touch targets */}
        <nav className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
          <button
            id="tab-live-forecast"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'live'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Live Weather</span>
            <span className="xs:hidden">Live</span>
          </button>
          <button
            id="tab-weather-log"
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'log'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Weather Log</span>
            <span className="xs:hidden">Log</span>
            {logCount > 0 && (
              <span className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                activeTab === 'log' ? 'bg-sky-800 text-sky-100' : 'bg-slate-800 text-slate-300'
              }`}>
                {logCount}
              </span>
            )}
          </button>
        </nav>

        {/* Units Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              id="unit-celsius"
              onClick={() => setUnit('celsius')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all min-w-[28px] ${
                unit === 'celsius'
                  ? 'bg-slate-800 text-sky-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              °C
            </button>
            <button
              id="unit-fahrenheit"
              onClick={() => setUnit('fahrenheit')}
              className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all min-w-[28px] ${
                unit === 'fahrenheit'
                  ? 'bg-slate-800 text-sky-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              °F
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
