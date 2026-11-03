import React, { useState, useRef, useEffect } from 'react';
import {
  CloudLightning,
  Calendar,
  Compass,
  Settings2,
  Sun,
  Moon,
  Smartphone,
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { TemperatureUnit } from '../types';
import { useTheme } from '../lib/themeContext';
import { useAuth } from '../lib/authContext';

interface NavbarProps {
  activeTab: 'live' | 'log';
  setActiveTab: (tab: 'live' | 'log') => void;
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  logCount: number;
  onOpenSettings?: () => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unit,
  setUnit,
  logCount,
  onOpenSettings,
  onOpenAuthModal,
}) => {
  const { themeMode, resolvedTheme, setThemeMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        {/* View Switcher Tabs */}
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

        {/* Units + Theme Toggle + Auth + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Temperature Units Switcher */}
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

          {/* Light / Dark Mode Toggle (With phone default support) */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800 transition-colors flex items-center justify-center relative"
            title={`Current theme: ${themeMode === 'system' ? 'System (Phone Default)' : themeMode === 'light' ? 'Light Mode' : 'Dark Mode'}. Click to toggle.`}
            aria-label="Toggle light and dark theme"
          >
            {resolvedTheme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            ) : (
              <Moon className="w-4 h-4 text-sky-300 fill-sky-300/20" />
            )}
            {themeMode === 'system' && (
              <span className="absolute -bottom-1 -right-1 text-[8px] px-1 rounded-full bg-slate-800 text-sky-400 font-bold border border-slate-700">
                A
              </span>
            )}
          </button>

          {/* Email Authentication Section */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                id="user-profile-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors text-xs font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="hidden md:inline max-w-[90px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-xs">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="font-semibold text-slate-100 truncate">
                      {user.displayName || 'Nimbus Member'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>Cloud Sync Active</span>
                    </div>
                  </div>

                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                    >
                      <Settings2 className="w-4 h-4 text-slate-400" />
                      <span>Assistant & Preferences</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await signOut();
                    }}
                    className="w-full px-4 py-2 text-left text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors border-t border-slate-800/80 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                type="button"
                id="navbar-signin-btn"
                onClick={() => onOpenAuthModal('signin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )
          )}

          {/* Settings Modal Button */}
          {onOpenSettings && (
            <button
              id="navbar-settings-btn"
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Assistant & Alert Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
