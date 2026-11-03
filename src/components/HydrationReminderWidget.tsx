import React, { useState, useEffect } from 'react';
import {
  GlassWater,
  Droplets,
  Flame,
  Clock,
  Moon,
  Volume2,
  Bell,
  BellOff,
  Settings,
  Plus,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { hydrationManager, HydrationState, HydrationSettings } from '../lib/hydrationManager';
import { voiceAssistant } from '../lib/voiceAssistant';

interface HydrationReminderWidgetProps {
  onOpenSettingsModal?: () => void;
}

export const HydrationReminderWidget: React.FC<HydrationReminderWidgetProps> = () => {
  const [state, setState] = useState<HydrationState>(hydrationManager.getState());
  const [showSettings, setShowSettings] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    const unsub = hydrationManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsub();
  }, []);

  const { settings, currentIntakeMl, drinksCount, currentCalculatedIntervalMinutes, isWithinQuietHours, heatAdvisory } = state;

  const handleLogDrink = (amountMl: number, label: string) => {
    hydrationManager.recordDrink(amountMl, label);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  };

  const handleTestReminder = () => {
    hydrationManager.triggerReminder(true);
  };

  const handleToggleEnabled = () => {
    hydrationManager.updateSettings({ enabled: !settings.enabled });
  };

  const handleModeChange = (mode: 'adaptive' | 'custom') => {
    hydrationManager.updateSettings({ mode });
  };

  const handleIntervalChange = (mins: number) => {
    hydrationManager.updateSettings({ customIntervalMinutes: mins });
  };

  const handleToggleQuietHours = () => {
    hydrationManager.updateSettings({ quietHoursEnabled: !settings.quietHoursEnabled });
  };

  const handleQuietHoursChange = (start: string, end: string) => {
    hydrationManager.updateSettings({ quietHoursStart: start, quietHoursEnd: end });
  };

  const handleToggleVoice = () => {
    hydrationManager.updateSettings({ voiceReminders: !settings.voiceReminders });
  };

  const handleRequestNotifications = async () => {
    await hydrationManager.requestNotificationPermission();
  };

  const progressPercent = Math.min(100, Math.round((currentIntakeMl / settings.dailyGoalMl) * 100));

  return (
    <section id="hydration-reminder-section" className="w-full">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950/20 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-950/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-950 text-sky-400 border border-sky-800/60 shadow-inner">
              <GlassWater className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Smart Hydration Reminders
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    settings.enabled
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {settings.enabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Proactive hourly water prompts that dynamically adjust to local temperatures and heat alerts.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl text-xs transition-colors border flex items-center gap-1.5 ${
                showSettings
                  ? 'bg-sky-950 text-sky-300 border-sky-700'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Hydration Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={handleToggleEnabled}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                settings.enabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-sm'
              }`}
            >
              {settings.enabled ? 'Pause Reminders' : 'Enable Reminders'}
            </button>
          </div>
        </div>

        {/* Middle Body: Adaptive Frequency Banner & Daily Tracker */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-5 relative z-10 items-center">
          {/* Left Column: Adaptive Status */}
          <div className="md:col-span-7 space-y-3">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Current Reminder Interval</span>
                </span>
                <span className="font-mono bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800/60 font-semibold">
                  Every {currentCalculatedIntervalMinutes} Minutes
                </span>
              </div>

              {settings.mode === 'adaptive' ? (
                <div className="text-xs text-slate-300 flex items-start gap-2 pt-1">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-100">Weather-Adaptive Frequency: </span>
                    {heatAdvisory ? (
                      <span className="text-amber-300 font-medium">{heatAdvisory}</span>
                    ) : (
                      <span className="text-slate-300">
                        Optimized for comfortable weather. Standard hourly reminders are active.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fixed custom interval selected ({settings.customIntervalMinutes}m).</span>
                </div>
              )}

              {/* Quiet Hours Status Notice */}
              {settings.quietHoursEnabled && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Quiet hours ({settings.quietHoursStart} - {settings.quietHoursEnd}):{' '}
                    {isWithinQuietHours ? (
                      <strong className="text-indigo-300">Active (Notifications paused)</strong>
                    ) : (
                      <span className="text-slate-400">Quiet mode currently off</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Logging Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Quick Intake Log</span>
                {justLogged && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px] animate-fade-in">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Logged drink!</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="log-drink-250ml-btn"
                  onClick={() => handleLogDrink(250, 'Glass (250ml)')}
                  className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-sky-950 hover:border-sky-700/80 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-sky-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>+250ml Glass</span>
                </button>
                <button
                  id="log-drink-500ml-btn"
                  onClick={() => handleLogDrink(500, 'Flask (500ml)')}
                  className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-sky-950 hover:border-sky-700/80 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-sky-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>+500ml Flask</span>
                </button>
                <button
                  id="log-drink-150ml-btn"
                  onClick={() => handleLogDrink(150, 'Cup (150ml)')}
                  className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-sky-950 hover:border-sky-700/80 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-sky-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>+150ml Cup</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Daily Intake Progress Bar & Indicator */}
          <div className="md:col-span-5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Today's Hydration</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-bold text-slate-100">{currentIntakeMl}</span>
                  <span className="text-xs text-slate-400">/ {settings.dailyGoalMl} ml</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium">Logged</span>
                <div className="text-sm font-bold text-sky-400 mt-0.5">
                  {drinksCount} {drinksCount === 1 ? 'drink' : 'drinks'}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{progressPercent}% of target</span>
              <button
                onClick={handleTestReminder}
                className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition-colors"
                title="Send a sample hydration reminder"
              >
                <Bell className="w-3 h-3" />
                <span>Test Reminder</span>
              </button>
            </div>
          </div>
        </div>

        {/* Responsible Hydration Disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Hydration requirements naturally fluctuate according to body weight, activity level, and climate. Drink steadily and listen to your body’s thirst cues.
          </span>
        </div>

        {/* Expandable Settings Panel */}
        {showSettings && (
          <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs animate-fade-in bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {/* Mode: Adaptive vs Custom */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Reminder Mode</label>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => handleModeChange('adaptive')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    settings.mode === 'adaptive'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚡ Adaptive
                </button>
                <button
                  onClick={() => handleModeChange('custom')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    settings.mode === 'custom'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fixed
                </button>
              </div>
            </div>

            {/* Custom Interval if selected */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">
                Interval {settings.mode === 'adaptive' && <span className="text-slate-500 font-normal">(if fixed)</span>}
              </label>
              <select
                value={settings.customIntervalMinutes}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value={30}>Every 30 minutes</option>
                <option value={45}>Every 45 minutes</option>
                <option value={60}>Every 60 minutes (Hourly)</option>
                <option value={90}>Every 90 minutes</option>
                <option value={120}>Every 120 minutes (2 hrs)</option>
              </select>
            </div>

            {/* Quiet Hours Schedule */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">Quiet Sleep Hours</label>
                <input
                  type="checkbox"
                  checked={settings.quietHoursEnabled}
                  onChange={handleToggleQuietHours}
                  className="rounded text-sky-600 focus:ring-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => handleQuietHoursChange(e.target.value, settings.quietHoursEnd)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 text-xs"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => handleQuietHoursChange(settings.quietHoursStart, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Notifications & Voice Options */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Delivery Channels</label>
              <div className="space-y-1.5">
                <button
                  onClick={handleToggleVoice}
                  className={`w-full py-1.5 px-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                    settings.voiceReminders
                      ? 'bg-indigo-950/60 border-indigo-700 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Announcement</span>
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${settings.voiceReminders ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                </button>

                <button
                  onClick={handleRequestNotifications}
                  className="w-full py-1.5 px-2.5 rounded-lg border bg-slate-900 hover:bg-slate-800 border-slate-800 text-left text-slate-300 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-sky-400" />
                    <span>Browser Alerts</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-medium">Request</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
