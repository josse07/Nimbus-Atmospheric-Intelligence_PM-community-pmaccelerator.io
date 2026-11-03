import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  Circle,
  X,
  Droplets,
  Sun,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Clock,
  ChevronRight,
  Trophy,
  Smile,
  Volume2,
  Smartphone
} from 'lucide-react';
import { WeatherData, GeocodeResult, AppLanguage } from '../types';
import {
  habitReminderManager,
  HabitTrackerState,
  HabitReminderContent,
} from '../lib/habitReminderManager';
import { hydrationManager } from '../lib/hydrationManager';
import { dailyBriefingManager } from '../lib/dailyBriefingManager';
import { voiceAssistant } from '../lib/voiceAssistant';

interface HabitReminderWidgetProps {
  weather: WeatherData | null;
  language: AppLanguage;
  location?: GeocodeResult | null;
  onNavigateToBriefing?: () => void;
  onNavigateToHydration?: () => void;
  onNavigateToRecommendations?: () => void;
  onOpenWidgetModal?: () => void;
}

export const HabitReminderWidget: React.FC<HabitReminderWidgetProps> = ({
  weather,
  language,
  location,
  onNavigateToBriefing,
  onNavigateToHydration,
  onNavigateToRecommendations,
  onOpenWidgetModal,
}) => {
  const [habitState, setHabitState] = useState<HabitTrackerState>(habitReminderManager.getState());
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [mascotBounce, setMascotBounce] = useState(false);

  useEffect(() => {
    const unsub = habitReminderManager.subscribe((st) => {
      setHabitState(st);
    });
    return () => unsub();
  }, []);

  const reminder: HabitReminderContent | null = habitReminderManager.getContextualReminder(
    weather,
    language,
    location
  );

  // If user disabled or quiet hours are active and not forced
  if (!habitState.settings.enabled) {
    return null;
  }

  // If widget is currently dismissed and no celebration is showing
  if (!reminder && !celebrationMessage) {
    return null;
  }

  const { todayStatus, currentStreak } = habitState;

  const handleAction = () => {
    if (!reminder) return;

    if (reminder.actionTarget === 'briefing') {
      habitReminderManager.markHabitCompleted('weatherChecked');
      if (onNavigateToBriefing) {
        onNavigateToBriefing();
      } else {
        const el = document.getElementById('daily-weather-briefing-card');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (reminder.actionTarget === 'hydration') {
      // Quick-log 250ml or open hydration section
      hydrationManager.recordDrink(250, 'Habit Widget Drink');
      habitReminderManager.markHabitCompleted('hydrationLogged');
      triggerCelebration('💧 Logged 250ml water! Hydration streak maintained.');
      if (onNavigateToHydration) {
        onNavigateToHydration();
      } else {
        const el = document.getElementById('hydration-reminder-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (reminder.actionTarget === 'recommendations') {
      habitReminderManager.markHabitCompleted('recommendationsViewed');
      if (onNavigateToRecommendations) {
        onNavigateToRecommendations();
      } else {
        const el = document.getElementById('smart-recommendations-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleMarkCurrentDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reminder) return;

    if (reminder.actionTarget === 'briefing') {
      habitReminderManager.markHabitCompleted('weatherChecked');
      triggerCelebration('☀️ Weather check completed! Streak protected.');
    } else if (reminder.actionTarget === 'hydration') {
      hydrationManager.recordDrink(250, 'Habit Check');
      habitReminderManager.markHabitCompleted('hydrationLogged');
      triggerCelebration('💧 Drink marked! Great hydration routine.');
    } else {
      habitReminderManager.markHabitCompleted('recommendationsViewed');
      triggerCelebration('🛡️ Recommendations verified! Well prepared.');
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    habitReminderManager.dismissReminder(2); // Snooze for 2 hours
  };

  const triggerCelebration = (msg: string) => {
    setMascotBounce(true);
    setCelebrationMessage(msg);
    setTimeout(() => setMascotBounce(false), 800);
    setTimeout(() => setCelebrationMessage(null), 4000);
  };

  // Play voice readout of habit reminder
  const handleVoiceReadout = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reminder) return;
    voiceAssistant.speak(
      `${reminder.title}. ${reminder.message}`,
      `Habit Reminder: ${reminder.badgeText}`,
      language
    );
  };

  // Render Mascot SVG according to mood
  const renderMascot = (mood: string) => {
    return (
      <div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 cursor-pointer select-none transition-transform duration-300 ${
          mascotBounce ? 'scale-125 rotate-6' : 'hover:scale-105'
        }`}
        onClick={() => {
          setMascotBounce(true);
          setTimeout(() => setMascotBounce(false), 500);
        }}
        title="Nimbus Habit Buddy"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Sun peek background */}
          <circle cx="70" cy="30" r="18" fill="url(#sunGrad)" />

          {/* Cloud Body */}
          <path
            d="M 28 65 C 18 65 14 55 20 45 C 18 35 30 25 40 30 C 48 20 66 22 72 32 C 82 30 88 42 84 52 C 88 60 82 65 72 65 Z"
            fill="url(#cloudGrad)"
          />

          {/* Cute Eyes */}
          {mood === 'celebrating' ? (
            <>
              {/* Joyful arched closed eyes */}
              <path d="M 38 46 Q 43 40 48 46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 58 46 Q 63 40 68 46" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : mood === 'sunny' ? (
            <>
              {/* Cool sunglasses */}
              <rect x="36" y="42" width="14" height="9" rx="3" fill="#0f172a" />
              <rect x="56" y="42" width="14" height="9" rx="3" fill="#0f172a" />
              <line x1="50" y1="46" x2="56" y2="46" stroke="#0f172a" strokeWidth="2.5" />
            </>
          ) : (
            <>
              {/* Bright expressive round eyes with catchlights */}
              <circle cx="43" cy="45" r="4.5" fill="#0f172a" />
              <circle cx="41.5" cy="43.5" r="1.5" fill="#ffffff" />
              <circle cx="63" cy="45" r="4.5" fill="#0f172a" />
              <circle cx="61.5" cy="43.5" r="1.5" fill="#ffffff" />
            </>
          )}

          {/* Cheerful Mouth */}
          {mood === 'thirsty' ? (
            // Small open mouth sip
            <ellipse cx="53" cy="54" rx="3" ry="4" fill="#0f172a" />
          ) : (
            // Big friendly smile
            <path
              d="M 45 52 Q 53 60 61 52"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Pink Cheeks */}
          <ellipse cx="36" cy="51" rx="3.5" ry="2" fill="#fda4af" opacity="0.8" />
          <ellipse cx="70" cy="51" rx="3.5" ry="2" fill="#fda4af" opacity="0.8" />

          {/* Extra Accessory based on mood */}
          {mood === 'thirsty' && (
            // Mini Water Droplet / Cup icon on side
            <g transform="translate(68, 48) scale(0.65)">
              <path
                d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth="1.5"
              />
            </g>
          )}

          {mood === 'rainy' && (
            // Mini playful umbrella handle
            <g transform="translate(68, 20) scale(0.6)">
              <path
                d="M 0 20 Q 15 0 30 20 Z"
                fill="#ec4899"
              />
              <line x1="15" y1="20" x2="15" y2="35" stroke="#cbd5e1" strokeWidth="2" />
            </g>
          )}

          {mood === 'celebrating' && (
            // Sparkles around head
            <g fill="#fde047">
              <polygon points="50,14 52,18 56,20 52,22 50,26 48,22 44,20 48,18" />
              <polygon points="26,22 27,24 30,25 27,26 26,29 25,26 22,25 25,24" />
            </g>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div
      id="habit-reminder-widget-card"
      className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/30 p-4 sm:p-5 shadow-lg shadow-amber-500/5 transition-all duration-300 hover:border-amber-500/50"
    >
      {/* Duolingo-style Subtle Warm Accent Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Top Banner Row: Streak Badge + Category Pill + Controls */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Duolingo-inspired Streak Flame Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-md shadow-orange-500/20 tracking-wide select-none"
            title="Daily Habit Streak"
          >
            <Flame className="w-4 h-4 fill-slate-950 animate-pulse" />
            <span>{currentStreak}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
              {currentStreak === 1 ? 'Day' : 'Days'} Streak
            </span>
          </div>

          {/* Contextual Badge */}
          {reminder && (
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-800/90 text-amber-300 border border-amber-500/20">
              {reminder.badgeText}
            </span>
          )}
        </div>

        {/* Right side controls: Home Widget + Voice + Dismiss */}
        <div className="flex items-center gap-1.5">
          {onOpenWidgetModal && (
            <button
              type="button"
              id="open-home-widget-modal-btn"
              onClick={onOpenWidgetModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 transition-colors"
              title="Add widget to mobile home screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Home Screen Widget</span>
              <span className="sm:hidden">Widget</span>
            </button>
          )}
          {reminder && (
            <button
              type="button"
              onClick={handleVoiceReadout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
              title="Listen to reminder"
              aria-label="Listen to reminder"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Snooze for 2 hours"
            aria-label="Snooze reminder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Celebration Feedback Toast when user completes habit */}
      {celebrationMessage && (
        <div className="my-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{celebrationMessage}</span>
        </div>
      )}

      {/* Main Body: Mascot + Engaging Message */}
      {reminder && (
        <div className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {renderMascot(reminder.mascotMood)}

            <div className="space-y-1 min-w-0">
              <h4 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2 tracking-tight">
                <span>{reminder.title}</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {reminder.message}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              id="habit-cta-btn"
              onClick={handleAction}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <span>{reminder.actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="habit-mark-done-btn"
              onClick={handleMarkCurrentDone}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
              title="Mark this routine completed"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Done</span>
            </button>
          </div>
        </div>
      )}

      {/* Habit Progress Tracker Dots for Today (Briefing, Recommendations, Hydration) */}
      <div className="pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] font-medium text-slate-400">
          Today's Daily Routines:
        </span>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Habit 1: Weather Briefing */}
          <button
            type="button"
            onClick={() => {
              habitReminderManager.markHabitCompleted('weatherChecked');
              triggerCelebration('☀️ Weather check completed!');
              if (onNavigateToBriefing) onNavigateToBriefing();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all font-medium ${
              todayStatus.weatherChecked
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 font-semibold'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            {todayStatus.weatherChecked ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Weather Check</span>
          </button>

          {/* Habit 2: Recommendations */}
          <button
            type="button"
            onClick={() => {
              habitReminderManager.markHabitCompleted('recommendationsViewed');
              triggerCelebration('🛡️ Recommendations viewed!');
              if (onNavigateToRecommendations) onNavigateToRecommendations();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all font-medium ${
              todayStatus.recommendationsViewed
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 font-semibold'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            {todayStatus.recommendationsViewed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>Daily Tips</span>
          </button>

          {/* Habit 3: Hydration Routine */}
          <button
            type="button"
            onClick={() => {
              hydrationManager.recordDrink(250, 'Quick Tap');
              habitReminderManager.markHabitCompleted('hydrationLogged');
              triggerCelebration('💧 Water intake logged!');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all font-medium ${
              todayStatus.hydrationLogged
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 font-semibold'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            {todayStatus.hydrationLogged ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>Hydration Log</span>
          </button>
        </div>
      </div>
    </div>
  );
};
