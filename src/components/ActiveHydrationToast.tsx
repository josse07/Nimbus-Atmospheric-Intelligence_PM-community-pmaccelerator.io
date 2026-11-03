import React, { useState, useEffect } from 'react';
import { GlassWater, Flame, Bell, Volume2, X, Clock, Check } from 'lucide-react';
import { hydrationManager, HydrationState } from '../lib/hydrationManager';
import { voiceAssistant } from '../lib/voiceAssistant';

export const ActiveHydrationToast: React.FC = () => {
  const [activeReminder, setActiveReminder] = useState<HydrationState['activeReminder']>(null);

  useEffect(() => {
    const unsub = hydrationManager.subscribe((state) => {
      setActiveReminder(state.activeReminder);
    });
    return () => unsub();
  }, []);

  if (!activeReminder) return null;

  const handleComplete = () => {
    hydrationManager.recordDrink(250, 'Completed Reminder (+250ml)');
  };

  const handleSnooze = () => {
    hydrationManager.snoozeReminder(15);
  };

  const handleDismiss = () => {
    hydrationManager.dismissReminder();
  };

  const handleSpeak = () => {
    voiceAssistant.speak(
      activeReminder.message,
      'Hydration Reminder',
      hydrationManager.getState().settings.language
    );
  };

  return (
    <div
      id="active-hydration-toast"
      className="fixed bottom-5 right-3 sm:right-6 max-w-md w-[calc(100vw-24px)] sm:w-auto z-50 animate-bounce-subtle"
    >
      <div
        className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all ${
          activeReminder.isHeatAlert
            ? 'bg-gradient-to-r from-rose-950/95 via-amber-950/90 to-slate-950/95 border-amber-600/80 text-amber-100 shadow-amber-950/60'
            : 'bg-gradient-to-r from-slate-900/95 via-sky-950/90 to-slate-950/95 border-sky-600/80 text-sky-100 shadow-sky-950/60'
        }`}
      >
        {/* Glow pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                activeReminder.isHeatAlert
                  ? 'bg-amber-900/70 text-amber-300 border border-amber-700 animate-pulse'
                  : 'bg-sky-900/70 text-sky-300 border border-sky-700'
              }`}
            >
              {activeReminder.isHeatAlert ? (
                <Flame className="w-5 h-5 text-amber-400" />
              ) : (
                <GlassWater className="w-5 h-5 text-sky-400" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    activeReminder.isHeatAlert
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-sky-950 text-sky-300 border-sky-700'
                  }`}
                >
                  {activeReminder.isHeatAlert ? 'Heat Hydration Alert' : 'Hydration Reminder'}
                </span>
                <span className="text-[11px] text-slate-400">Just now</span>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-100">
                {activeReminder.message}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              id="mark-hydration-complete-btn"
              onClick={handleComplete}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Drank (+250ml)</span>
            </button>

            <button
              id="snooze-hydration-btn"
              onClick={handleSnooze}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Snooze 15m</span>
            </button>
          </div>

          <button
            onClick={handleSpeak}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 transition-colors"
            title="Listen to reminder"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
