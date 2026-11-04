import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  GlassWater,
  Volume2,
  Globe2,
  Check,
  ShieldAlert,
  Flame,
  Moon,
  Sun,
  VolumeX,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  Lock,
  MapPin,
  RotateCcw,
  Smartphone,
  Palette,
  User as UserIcon,
  LogOut,
  Mail,
  Share,
  PlusSquare
} from 'lucide-react';
import { GeocodeResult, AppLanguage } from '../types';
import { dailyBriefingManager, isNigeriaLocation, DailyBriefingSettings } from '../lib/dailyBriefingManager';
import { hydrationManager, HydrationState, HydrationSettings } from '../lib/hydrationManager';
import { voiceAssistant, VoiceAssistantSettings } from '../lib/voiceAssistant';
import { habitReminderManager, HabitTrackerState } from '../lib/habitReminderManager';
import { widgetManager, WidgetSettings } from '../lib/widgetManager';
import { useTheme } from '../lib/themeContext';
import { useAuth } from '../lib/authContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: GeocodeResult;
  onOpenWidgetModal?: () => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onOpenWidgetModal,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'briefing' | 'hydration' | 'habits' | 'widget' | 'theme' | 'account' | 'voice' | 'language'
  >('briefing');

  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const { user, userPreferences, signOut } = useAuth();
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(widgetManager.getSettings());

  // Briefing state
  const [briefingSettings, setBriefingSettings] = useState<DailyBriefingSettings>(
    dailyBriefingManager.getSettings()
  );

  // Hydration state
  const [hydrationState, setHydrationState] = useState<HydrationState>(hydrationManager.getState());

  // Habit & Streak state
  const [habitState, setHabitState] = useState<HabitTrackerState>(habitReminderManager.getState());

  // Voice state
  const [voiceSettings, setVoiceSettings] = useState<VoiceAssistantSettings>(voiceAssistant.getSettings());

  // Notification permissions state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const [testSent, setTestSent] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubBriefing = dailyBriefingManager.subscribe((_, s) => setBriefingSettings(s));
    const unsubHydration = hydrationManager.subscribe((s) => setHydrationState(s));
    const unsubHabit = habitReminderManager.subscribe((s) => setHabitState(s));
    const unsubWidget = widgetManager.subscribe((s) => setWidgetSettings(s));

    return () => {
      unsubBriefing();
      unsubHydration();
      unsubHabit();
      unsubWidget();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isNigeria = isNigeriaLocation(currentLocation);

  // Request browser notifications
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        hydrationManager.updateSettings({ systemNotifications: true });
        dailyBriefingManager.updateSettings({ enabled: true }, currentLocation);
      }
    }
  };

  // Language change with strict geo-restriction
  const handleLanguageChange = (lang: AppLanguage) => {
    if (lang === 'pcm' && !isNigeria) {
      return;
    }
    dailyBriefingManager.updateSettings({ language: lang }, currentLocation);
    hydrationManager.updateSettings({ language: lang });
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="settings-modal-dialog"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-slate-950/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-950 text-sky-400 border border-sky-800/60">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">Assistant Preferences</h2>
              <p className="text-xs text-slate-400">Configure daily briefings, hydration alerts & voice</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('briefing')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'briefing'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Daily Briefing</span>
          </button>

          <button
            onClick={() => setActiveTab('hydration')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'hydration'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GlassWater className="w-4 h-4" />
            <span>Hydration</span>
          </button>

          <button
            onClick={() => setActiveTab('habits')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'habits'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Habits & Streak</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
              {habitState.currentStreak}d
            </span>
          </button>

          <button
            onClick={() => setActiveTab('widget')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'widget'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Home Widget</span>
            {widgetSettings.permission === 'granted' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Widget Active" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'theme'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme & Display</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'account'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Account & Sync</span>
            {user && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Logged in" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Voice Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'language'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>Language</span>
            {isNigeria && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Nigerian Pidgin Available" />
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* TAB 1: DAILY BRIEFING */}
          {activeTab === 'briefing' && (
            <div className="space-y-5 animate-fade-in">
              {/* Master Briefing Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Daily Weather Briefing</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Receive one personalized morning or daily summary of weather and required actions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={briefingSettings.enabled}
                  onChange={(e) =>
                    dailyBriefingManager.updateSettings({ enabled: e.target.checked }, currentLocation)
                  }
                  className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Notification Preferred Time */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">Preferred Briefing Time</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your daily weather update will trigger at this hour.
                    </p>
                  </div>
                  <input
                    type="time"
                    value={briefingSettings.preferredTime}
                    onChange={(e) =>
                      dailyBriefingManager.updateSettings({ preferredTime: e.target.value }, currentLocation)
                    }
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Urgent Weather Alerts Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Urgent Severe Weather Alerts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Receive immediate notifications for thunderstorms, sudden heat spikes, or heavy downpours.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={briefingSettings.urgentAlertsEnabled}
                  onChange={(e) =>
                    dailyBriefingManager.updateSettings(
                      { urgentAlertsEnabled: e.target.checked },
                      currentLocation
                    )
                  }
                  className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Browser Permission & Test Button */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Browser Permissions:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                      notificationPermission === 'granted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : notificationPermission === 'denied'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {notificationPermission}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={handleRequestNotificationPermission}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Allow Notifications
                    </button>
                  )}

                  <button
                    onClick={() => {
                      dailyBriefingManager.triggerTestBriefing();
                      setTestSent('briefing');
                      setTimeout(() => setTestSent(null), 2500);
                    }}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{testSent === 'briefing' ? 'Test Dispatched!' : 'Send Test Briefing'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HYDRATION */}
          {activeTab === 'hydration' && (
            <div className="space-y-5 animate-fade-in">
              {/* Master Hydration Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Hourly Hydration Reminders</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Regular reminders to drink water, automatically accelerated during heat waves.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hydrationState.settings.enabled}
                  onChange={(e) => hydrationManager.updateSettings({ enabled: e.target.checked })}
                  className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Mode: Adaptive vs Custom */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Reminder Frequency Mode</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adaptive mode automatically shortens intervals to 30-45 minutes in high heat.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => hydrationManager.updateSettings({ mode: 'adaptive' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      hydrationState.settings.mode === 'adaptive'
                        ? 'bg-sky-950/60 border-sky-600 text-sky-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Weather-Adaptive (Recommended)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Calculates interval (30m to 75m) using live temperature & heat index.
                    </div>
                  </button>

                  <button
                    onClick={() => hydrationManager.updateSettings({ mode: 'custom' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      hydrationState.settings.mode === 'custom'
                        ? 'bg-sky-950/60 border-sky-600 text-sky-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Fixed Custom Interval</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Always remind every {hydrationState.settings.customIntervalMinutes} minutes.
                    </div>
                  </button>
                </div>

                {hydrationState.settings.mode === 'custom' && (
                  <div className="pt-2">
                    <label className="text-xs text-slate-400 font-medium block mb-1">
                      Custom Interval
                    </label>
                    <select
                      value={hydrationState.settings.customIntervalMinutes}
                      onChange={(e) =>
                        hydrationManager.updateSettings({ customIntervalMinutes: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value={30}>Every 30 minutes</option>
                      <option value={45}>Every 45 minutes</option>
                      <option value={60}>Every 60 minutes (Hourly)</option>
                      <option value={90}>Every 90 minutes</option>
                      <option value={120}>Every 120 minutes (2 hours)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Quiet Sleep Hours */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Quiet Hours & Sleep Schedule</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Silences hydration prompts overnight or while sleeping.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hydrationState.settings.quietHoursEnabled}
                    onChange={(e) =>
                      hydrationManager.updateSettings({ quietHoursEnabled: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {hydrationState.settings.quietHoursEnabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-400 mb-1 block">Quiet Starts</label>
                      <input
                        type="time"
                        value={hydrationState.settings.quietHoursStart}
                        onChange={(e) =>
                          hydrationManager.updateSettings({ quietHoursStart: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 text-xs"
                      />
                    </div>
                    <span className="text-slate-500 mt-5">to</span>
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-400 mb-1 block">Quiet Ends</label>
                      <input
                        type="time"
                        value={hydrationState.settings.quietHoursEnd}
                        onChange={(e) =>
                          hydrationManager.updateSettings({ quietHoursEnd: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Goal & Test Button */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Daily Intake Goal:</span>
                  <select
                    value={hydrationState.settings.dailyGoalMl}
                    onChange={(e) =>
                      hydrationManager.updateSettings({ dailyGoalMl: Number(e.target.value) })
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                  >
                    <option value={1500}>1,500 ml</option>
                    <option value={2000}>2,000 ml (Standard)</option>
                    <option value={2500}>2,500 ml</option>
                    <option value={3000}>3,000 ml</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    hydrationManager.triggerReminder(true);
                    setTestSent('hydration');
                    setTimeout(() => setTestSent(null), 2500);
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <GlassWater className="w-3.5 h-3.5 text-sky-400" />
                  <span>{testSent === 'hydration' ? 'Reminder Triggered!' : 'Test Hydration Prompt'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: HABITS & STREAKS (Duolingo-inspired) */}
          {activeTab === 'habits' && (
            <div className="space-y-5 animate-fade-in">
              {/* Streak Showcase Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-orange-950/40 border border-amber-500/40 shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/30">
                    <Flame className="w-7 h-7 fill-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-black text-slate-100">
                        {habitState.currentStreak} {habitState.currentStreak === 1 ? 'Day' : 'Days'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Current Streak
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Personal Best: <strong className="text-amber-400">{habitState.longestStreak} days</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold text-slate-400 block">Today's Progress</span>
                  <span className="text-sm font-bold text-amber-300">
                    {[
                      habitState.todayStatus.weatherChecked,
                      habitState.todayStatus.recommendationsViewed,
                      habitState.todayStatus.hydrationLogged,
                    ].filter(Boolean).length} / 3 Habits
                  </span>
                </div>
              </div>

              {/* Enable / Disable Habit Reminder Widget */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Interactive Habit Reminder Widget</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Duolingo-inspired friendly prompts for weather checks, recommendations, and hydration.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={habitState.settings.enabled}
                  onChange={(e) =>
                    habitReminderManager.updateSettings({ enabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded text-amber-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Quiet Hours for Habits */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-sky-400" />
                    <h3 className="font-bold text-slate-100 text-sm">Habit Quiet Hours</h3>
                  </div>
                  <input
                    type="checkbox"
                    checked={habitState.settings.quietHoursEnabled}
                    onChange={(e) =>
                      habitReminderManager.updateSettings({
                        quietHoursEnabled: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Silence habit alerts and notifications during sleeping hours.
                </p>

                {habitState.settings.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Sleep Start
                      </label>
                      <input
                        type="time"
                        value={habitState.settings.quietHoursStart}
                        onChange={(e) =>
                          habitReminderManager.updateSettings({
                            quietHoursStart: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Wake Up
                      </label>
                      <input
                        type="time"
                        value={habitState.settings.quietHoursEnd}
                        onChange={(e) =>
                          habitReminderManager.updateSettings({
                            quietHoursEnd: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions / Reset Buttons */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-100 text-sm">Widget Management</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      habitReminderManager.resetDismissal();
                      setTestSent('habit_reset');
                      setTimeout(() => setTestSent(null), 2500);
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {testSent === 'habit_reset' ? 'Widget Restored!' : 'Restore Snoozed Widget'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      habitReminderManager.markHabitCompleted('weatherChecked');
                      setTestSent('habit_check');
                      setTimeout(() => setTestSent(null), 2500);
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-300 rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {testSent === 'habit_check' ? 'Checked!' : 'Mark Weather Check Done'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HOME SCREEN WIDGET */}
          {activeTab === 'widget' && (
            <div className="space-y-5 animate-fade-in">
              {/* Permission & Status Card */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-sky-400" />
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">Home Screen Widget Permission</h3>
                      <p className="text-xs text-slate-400">
                        Displays the Nimbus companion directly on your mobile device home screen.
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    widgetSettings.permission === 'granted'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : widgetSettings.permission === 'denied'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {widgetSettings.permission === 'granted'
                      ? 'Permission Granted'
                      : widgetSettings.permission === 'denied'
                      ? 'Kept in App Only'
                      : 'Not Configured'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {widgetSettings.permission === 'granted'
                    ? 'The companion widget is authorized to be added to your home screen with real-time weather and hydration habit streaks.'
                    : widgetSettings.permission === 'denied'
                    ? 'You chose to keep the widget exclusively inside the app. You can grant home screen permission at any time below.'
                    : 'Get quick atmospheric condition glances and hydration reminders on your phone without opening the browser.'}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onOpenWidgetModal && (
                    <button
                      type="button"
                      onClick={onOpenWidgetModal}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/25 flex items-center gap-2 transition-all"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>{widgetSettings.permission === 'granted' ? 'View Setup Instructions' : 'Request Home Screen Permission'}</span>
                    </button>
                  )}

                  {widgetSettings.permission !== 'prompt' && (
                    <button
                      type="button"
                      onClick={() => {
                        widgetManager.resetPermission();
                        setTestSent('widget_reset');
                        setTimeout(() => setTestSent(null), 2500);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{testSent === 'widget_reset' ? 'Reset Done' : 'Reset Permission Choice'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Widget Preferences */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h3 className="font-bold text-slate-100 text-sm">Widget Display Preferences</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Widget Focus
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All Routines', desc: 'Weather + Hydration + Streak' },
                      { id: 'weather', label: 'Weather Focus', desc: 'Temperature, rain & tips' },
                      { id: 'hydration', label: 'Hydration Focus', desc: 'Water intake & goals' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => widgetManager.updateSettings({ viewMode: opt.id as any })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          widgetSettings.viewMode === opt.id
                            ? 'bg-sky-950/50 border-sky-600 text-sky-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <p className="font-bold text-xs text-slate-100">{opt.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-xs">Expressive Mascot Buddy</h4>
                    <p className="text-[11px] text-slate-400">Display Nimbus companion illustrations on the widget</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={widgetSettings.showMascot}
                    onChange={(e) => widgetManager.updateSettings({ showMascot: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: THEME & DISPLAY */}
          {activeTab === 'theme' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-100 text-sm">Appearance Mode</h3>
                <p className="text-xs text-slate-400">
                  Choose between light and dark palettes or automatically follow your phone's operating system theme.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: System / Phone Default */}
                <div
                  onClick={() => setThemeMode('system')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    themeMode === 'system'
                      ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        themeMode === 'system' ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-700'
                      }`}>
                        {themeMode === 'system' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm">System Default</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Matches your phone's schedule automatically (light by day, dark by night).
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-sky-300 font-semibold">
                    Current Phone Mode: {resolvedTheme === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </div>
                </div>

                {/* Option 2: Light Mode */}
                <div
                  onClick={() => setThemeMode('light')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    themeMode === 'light'
                      ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        themeMode === 'light' ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-700'
                      }`}>
                        {themeMode === 'light' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm">Light Mode</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Clean white and soft slate backgrounds with crisp, high-contrast readability.
                    </p>
                  </div>
                </div>

                {/* Option 3: Dark Mode */}
                <div
                  onClick={() => setThemeMode('dark')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    themeMode === 'dark'
                      ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        themeMode === 'dark' ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-700'
                      }`}>
                        {themeMode === 'dark' && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm">Dark Mode</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Deep obsidian and cosmic navy palette optimized for low light and battery conservation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT & CLOUD SYNC */}
          {activeTab === 'account' && (
            <div className="space-y-5 animate-fade-in">
              {user ? (
                /* Logged in state */
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-sky-500/20">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                            {user.displayName || 'Nimbus Member'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>Cloud Synced</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-slate-200">Cloud Sync Features Active:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                      <li>Personalized hydration reminders and daily water intake log</li>
                      <li>Duolingo-inspired daily habit streak and completion milestones</li>
                      <li>Home screen widget preferences and notification schedules</li>
                      <li>No social media, tracking, or phone number required</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                /* Logged out state */
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                        Direct Email Sign-Up &amp; Cloud Sync
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Sign up or log in directly with your email address — no passwords to remember or reset.
                        Preserves your hydration streak across devices, saves your home screen widget configuration, and syncs your daily weather briefing schedule.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Direct Email only • No password required</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>No phone numbers or social media</span>
                    </div>
                  </div>

                  {onOpenAuthModal && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => onOpenAuthModal('signup')}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/25 flex items-center gap-2 transition-all"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Sign Up with Email</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAuthModal('signin')}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors"
                      >
                        Sign In Directly
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VOICE ASSISTANT */}
          {activeTab === 'voice' && (
            <div className="space-y-5 animate-fade-in">
              {/* Voice Enable Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Voice Assistance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verbally reads daily briefings, recommendations, and hydration check-ins.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.enabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    voiceAssistant.updateSettings({ enabled: next });
                    setVoiceSettings(voiceAssistant.getSettings());
                    if (!next) voiceAssistant.stop();
                  }}
                  className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Speech Speed */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-100 text-sm">Speech Rate</h3>
                <p className="text-xs text-slate-400">Select spoken cadence for announcements.</p>
                <div className="flex items-center gap-1.5 pt-1">
                  {[0.85, 0.95, 1.0, 1.15, 1.25].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        voiceAssistant.updateSettings({ speechRate: rate });
                        setVoiceSettings(voiceAssistant.getSettings());
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                        voiceSettings.speechRate === rate
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Pre-Speech Harmonic Chime */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Audio Announcement Chime</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plays a gentle harmonic chime before voice announcements begin.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.playChime}
                  onChange={(e) => {
                    const next = e.target.checked;
                    voiceAssistant.updateSettings({ playChime: next });
                    setVoiceSettings(voiceAssistant.getSettings());
                    if (next) voiceAssistant.playChime();
                  }}
                  className="w-5 h-5 rounded text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Voice Sample Preview */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Test speech synthesis in current language ({briefingSettings.language === 'pcm' ? 'Nigerian Pidgin' : 'English'}).
                </div>
                <button
                  onClick={() => {
                    const phrase = briefingSettings.language === 'pcm'
                      ? `How far! Nimbus Voice Assistant dey ready for ${currentLocation.name}. I go read weather update and health advice for you.`
                      : `Hello! Nimbus Voice Assistant is active for ${currentLocation.name}. I am ready to announce your daily weather updates.`;
                    voiceAssistant.speak(phrase, 'Voice Assistant Preview', briefingSettings.language);
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Preview Voice</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LANGUAGE & GEOGRAPHICAL NIGERIAN PIDGIN RESTRICTION */}
          {activeTab === 'language' && (
            <div className="space-y-5 animate-fade-in">
              {/* Location Verification Status */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isNigeria
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Current Detected Location</div>
                    <div className="font-bold text-slate-100 text-sm">
                      {currentLocation.formattedName || currentLocation.name}
                    </div>
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  {isNigeria ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Nigeria Location Verified</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>International Location</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Language Selection Grid */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-100 text-sm">Select Assistant Language</h3>
                <p className="text-xs text-slate-400">
                  Controls the language of AI weather recommendations, daily briefings, voice assistant, and hydration prompts.
                </p>

                {/* Option 1: Standard Simple AI English */}
                <div
                  onClick={() => handleLanguageChange('en')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    briefingSettings.language === 'en'
                      ? 'bg-sky-950/40 border-sky-600 shadow-md shadow-sky-950/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-200 mt-0.5">
                      <Globe2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">English (Simple AI)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                          Worldwide Default
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Clear, short sentences without complicated weather jargon. Direct and actionable recommendations.
                      </p>
                    </div>
                  </div>

                  <div className="p-1">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        briefingSettings.language === 'en'
                          ? 'border-sky-500 bg-sky-600 text-white'
                          : 'border-slate-700'
                      }`}
                    >
                      {briefingSettings.language === 'en' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>

                {/* Option 2: Nigerian Pidgin English (Strictly Gated to Nigeria) */}
                <div
                  onClick={() => isNigeria && handleLanguageChange('pcm')}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    !isNigeria
                      ? 'bg-slate-950/30 border-slate-800/60 opacity-60 cursor-not-allowed'
                      : briefingSettings.language === 'pcm'
                      ? 'bg-emerald-950/40 border-emerald-600 shadow-md shadow-emerald-950/30 cursor-pointer'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/80 mt-0.5">
                      <span className="text-base leading-none">🇳🇬</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">Nigerian Pidgin English</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Naija
                        </span>
                        {!isNigeria && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Available in Nigeria Only</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Authentic, natural Nigerian Pidgin translations (e.g., "Today go hot well well. No forget your water bottle, and try drink water.").
                      </p>

                      {!isNigeria && (
                        <div className="mt-2 text-[11px] text-amber-400/90 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Geographical restriction: Nigerian Pidgin is exclusive to users located in Nigeria.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-1">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        briefingSettings.language === 'pcm'
                          ? 'border-emerald-500 bg-emerald-600 text-white'
                          : 'border-slate-700'
                      }`}
                    >
                      {briefingSettings.language === 'pcm' && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Preferences are automatically saved to your browser session.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-sky-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
