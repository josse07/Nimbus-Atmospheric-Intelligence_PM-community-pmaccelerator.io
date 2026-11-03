// Habit Reminder & Streak Manager
// Duolingo-inspired daily habit engagement for weather check-ins, recommendations, and hydration
import { WeatherData, GeocodeResult, AppLanguage } from '../types';
import { isNigeriaLocation } from './dailyBriefingManager';
import { hydrationManager } from './hydrationManager';

export interface DailyHabitStatus {
  date: string; // YYYY-MM-DD
  weatherChecked: boolean;
  recommendationsViewed: boolean;
  hydrationLogged: boolean;
  completedAtLeastOne: boolean;
  allCompleted: boolean;
}

export interface HabitReminderSettings {
  enabled: boolean;
  preferredMorningTime: string; // e.g. "08:00"
  preferredAfternoonTime: string; // e.g. "14:00"
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  language: AppLanguage;
}

export interface HabitTrackerState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  todayStatus: DailyHabitStatus;
  dismissedUntil: number | null; // Timestamp
  settings: HabitReminderSettings;
}

const HABIT_STORAGE_KEY = 'nimbus_habit_tracker_v2';

export const DEFAULT_HABIT_SETTINGS: HabitReminderSettings = {
  enabled: true,
  preferredMorningTime: '08:00',
  preferredAfternoonTime: '14:00',
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  language: 'en',
};

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type HabitSubscriber = (state: HabitTrackerState) => void;

export interface HabitReminderContent {
  id: string;
  category: 'briefing' | 'hydration' | 'rain' | 'heat' | 'general' | 'complete';
  title: string;
  message: string;
  actionLabel: string;
  actionTarget: 'briefing' | 'hydration' | 'recommendations';
  mascotMood: 'happy' | 'thirsty' | 'rainy' | 'sunny' | 'celebrating' | 'sleepy';
  badgeText: string;
}

class HabitReminderManagerService {
  private state: HabitTrackerState = {
    currentStreak: 1,
    longestStreak: 1,
    lastActiveDate: null,
    todayStatus: {
      date: getTodayDateString(),
      weatherChecked: false,
      recommendationsViewed: false,
      hydrationLogged: false,
      completedAtLeastOne: false,
      allCompleted: false,
    },
    dismissedUntil: null,
    settings: DEFAULT_HABIT_SETTINGS,
  };

  private subscribers: Set<HabitSubscriber> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.listenToHydrationChanges();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(HABIT_STORAGE_KEY);
      const today = getTodayDateString();

      if (stored) {
        const parsed = JSON.parse(stored);
        let currentStreak = parsed.currentStreak ?? 1;
        let longestStreak = parsed.longestStreak ?? 1;
        const lastActiveDate = parsed.lastActiveDate ?? null;

        // Check if today matches stored todayStatus
        let todayStatus: DailyHabitStatus = parsed.todayStatus;
        if (!todayStatus || todayStatus.date !== today) {
          // New day rollover
          const yesterday = getYesterdayDateString();
          if (lastActiveDate !== yesterday && lastActiveDate !== today) {
            // Streak broken if missed yesterday
            currentStreak = 0;
          }

          todayStatus = {
            date: today,
            weatherChecked: false,
            recommendationsViewed: false,
            hydrationLogged: false,
            completedAtLeastOne: false,
            allCompleted: false,
          };
        }

        this.state = {
          currentStreak,
          longestStreak: Math.max(longestStreak, currentStreak),
          lastActiveDate,
          todayStatus,
          dismissedUntil: parsed.dismissedUntil ?? null,
          settings: { ...DEFAULT_HABIT_SETTINGS, ...(parsed.settings || {}) },
        };
      } else {
        // First time initialization: grant a starter streak of 1 to motivate user (standard Duolingo habit pattern)
        this.state.currentStreak = 1;
        this.state.longestStreak = 1;
        this.state.lastActiveDate = today;
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Could not load habit state:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save habit state:', e);
    }
  }

  private notify() {
    this.subscribers.forEach((fn) => {
      try {
        fn({ ...this.state });
      } catch (e) {
        console.error('Error notifying habit subscriber:', e);
      }
    });
  }

  public subscribe(fn: HabitSubscriber): () => void {
    this.subscribers.add(fn);
    fn({ ...this.state });
    return () => this.subscribers.delete(fn);
  }

  public getState(): HabitTrackerState {
    return { ...this.state };
  }

  private listenToHydrationChanges() {
    // When hydration manager logs a drink, auto-mark hydrationLogged
    hydrationManager.subscribe((hState) => {
      if (hState.drinksCount > 0 && !this.state.todayStatus.hydrationLogged) {
        this.markHabitCompleted('hydrationLogged');
      }
    });
  }

  public markHabitCompleted(habit: 'weatherChecked' | 'recommendationsViewed' | 'hydrationLogged') {
    const today = getTodayDateString();
    let currentStreak = this.state.currentStreak;
    const yesterday = getYesterdayDateString();

    const todayStatus: DailyHabitStatus = {
      ...this.state.todayStatus,
      date: today,
      [habit]: true,
    };

    todayStatus.completedAtLeastOne =
      todayStatus.weatherChecked || todayStatus.recommendationsViewed || todayStatus.hydrationLogged;
    todayStatus.allCompleted =
      todayStatus.weatherChecked && todayStatus.recommendationsViewed && todayStatus.hydrationLogged;

    // If this is the first activity of today, increment streak
    if (this.state.lastActiveDate !== today) {
      if (this.state.lastActiveDate === yesterday) {
        currentStreak += 1;
      } else if (!this.state.lastActiveDate) {
        currentStreak = 1;
      } else {
        currentStreak = 1; // Restarted streak
      }
    }

    const longestStreak = Math.max(this.state.longestStreak, currentStreak);

    this.state = {
      ...this.state,
      currentStreak,
      longestStreak,
      lastActiveDate: today,
      todayStatus,
    };

    this.saveToStorage();
    this.notify();
  }

  public dismissReminder(hours: number = 2) {
    const until = Date.now() + hours * 60 * 60 * 1000;
    this.state = {
      ...this.state,
      dismissedUntil: until,
    };
    this.saveToStorage();
    this.notify();
  }

  public resetDismissal() {
    this.state = {
      ...this.state,
      dismissedUntil: null,
    };
    this.saveToStorage();
    this.notify();
  }

  public updateSettings(partial: Partial<HabitReminderSettings>) {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...partial,
      },
    };
    this.saveToStorage();
    this.notify();
  }

  public isWithinQuietHours(): boolean {
    if (!this.state.settings.quietHoursEnabled) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = this.state.settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = this.state.settings.quietHoursEnd.split(':').map(Number);

    const startTotal = startH * 60 + (startM || 0);
    const endTotal = endH * 60 + (endM || 0);

    if (startTotal <= endTotal) {
      return currentMins >= startTotal && currentMins < endTotal;
    } else {
      // Overnight (e.g., 22:00 to 07:00)
      return currentMins >= startTotal || currentMins < endTotal;
    }
  }

  /**
   * Generates dynamic, context-aware habit reminder content based on:
   * 1. Current weather metrics (heat, rain, storms, UV)
   * 2. Time of day
   * 3. Today's completion status
   * 4. App language (English vs Nigerian Pidgin)
   */
  public getContextualReminder(
    weather: WeatherData | null,
    language: AppLanguage,
    location?: GeocodeResult | null
  ): HabitReminderContent | null {
    if (!this.state.settings.enabled) return null;

    // Check if dismissed recently
    if (this.state.dismissedUntil && Date.now() < this.state.dismissedUntil) {
      return null;
    }

    const { todayStatus } = this.state;
    const now = new Date();
    const hour = now.getHours();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isNigeria = isNigeriaLocation(location || weather?.location);
    const isPidgin = language === 'pcm' && isNigeria;

    // If ALL habits are completed today, return celebratory message!
    if (todayStatus.allCompleted) {
      if (isPidgin) {
        return {
          id: 'all-completed-pidgin',
          category: 'complete',
          title: 'You don try well-well today! 🔥',
          message: 'You complete all your weather & hydration habits! Your streak dey burn high.',
          actionLabel: 'View Habits',
          actionTarget: 'briefing',
          mascotMood: 'celebrating',
          badgeText: `${this.state.currentStreak}-Day Streak Active`,
        };
      }
      return {
        id: 'all-completed-en',
        category: 'complete',
        title: 'Daily Goals Crushed! 🔥',
        message: "You've completed your weather check, recommendations, and hydration for today. Keep the momentum going!",
        actionLabel: 'View Summary',
        actionTarget: 'briefing',
        mascotMood: 'celebrating',
        badgeText: `${this.state.currentStreak}-Day Streak Active`,
      };
    }

    const currentTemp = weather?.current?.temperature ?? 24;
    const apparentTemp = weather?.current?.apparentTemperature ?? currentTemp;
    const weatherCode = weather?.current?.weatherCode ?? 0;
    const uvIndex = weather?.current?.uvIndex ?? 2;
    const rainProb = weather?.hourly?.[0]?.precipitationProbability ?? 0;

    const isHot = currentTemp >= 29 || apparentTemp >= 30;
    const isRainy =
      [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode) ||
      weather?.current?.condition?.toLowerCase().includes('rain') ||
      rainProb >= 40;
    const isStormy =
      [95, 96, 99].includes(weatherCode) ||
      weather?.current?.condition?.toLowerCase().includes('thunder');

    // 1. Extreme Weather Alert takes top priority
    if (isStormy && !todayStatus.recommendationsViewed) {
      if (isPidgin) {
        return {
          id: 'storm-pidgin',
          category: 'rain',
          title: 'Heavy Thunderstorm dey come! ⚡',
          message: 'Thunder and storm fit fall now. Check safety tips make you stay safe inside.',
          actionLabel: 'Check Safety Tips',
          actionTarget: 'recommendations',
          mascotMood: 'rainy',
          badgeText: 'Severe Alert',
        };
      }
      return {
        id: 'storm-en',
        category: 'rain',
        title: 'Severe Storm Alert! ⚡',
        message: 'Thunderstorm activity detected in your area. Review safety guidelines now.',
        actionLabel: 'View Safety Tips',
        actionTarget: 'recommendations',
        mascotMood: 'rainy',
        badgeText: 'Severe Weather',
      };
    }

    // 2. High Heat: Prioritize Hydration (like user's Drinkly reference)
    if (isHot && !todayStatus.hydrationLogged) {
      if (isPidgin) {
        return {
          id: 'heat-hydration-pidgin',
          category: 'heat',
          title: 'Sun dey hot well-well today! ☀️',
          message: `E reach ${Math.round(currentTemp)}°C! Sip your water now make your body cool down.`,
          actionLabel: 'Log Water Drink',
          actionTarget: 'hydration',
          mascotMood: 'thirsty',
          badgeText: 'Hot Weather Priority',
        };
      }
      return {
        id: 'heat-hydration-en',
        category: 'heat',
        title: 'Time for a drink! ☀️',
        message: `It's ${Math.round(currentTemp)}°C outside—sip some cold water and stay hydrated through the heat.`,
        actionLabel: 'Log a Drink',
        actionTarget: 'hydration',
        mascotMood: 'thirsty',
        badgeText: 'Heat Advisory Habit',
      };
    }

    // 3. Rain Expected: Prioritize Rain / Umbrella check
    if (isRainy && !todayStatus.recommendationsViewed) {
      if (isPidgin) {
        return {
          id: 'rain-pidgin',
          category: 'rain',
          title: 'Rain dey threaten today! ☔',
          message: 'Clouds don gather! Check the rain forecast before you step outside without umbrella.',
          actionLabel: 'Check Rain Forecast',
          actionTarget: 'recommendations',
          mascotMood: 'rainy',
          badgeText: 'Wet Weather Habit',
        };
      }
      return {
        id: 'rain-en',
        category: 'rain',
        title: 'Rain clouds incoming! ☔',
        message: 'High chance of showers today. Grab your umbrella and check the hourly timeline.',
        actionLabel: 'Check Rain Plan',
        actionTarget: 'recommendations',
        mascotMood: 'rainy',
        badgeText: 'Rain Check Habit',
      };
    }

    // 4. Morning Weather Check Habit (Duolingo style: "Time to practice / Your daily weather check is waiting!")
    if (hour < 12 && !todayStatus.weatherChecked) {
      if (isPidgin) {
        return {
          id: 'morning-briefing-pidgin',
          category: 'briefing',
          title: "How far! You don check today's weather? 🌅",
          message: "Ready to step out? Check morning briefing so you go prepare well for the day's weather.",
          actionLabel: 'Check Daily Briefing',
          actionTarget: 'briefing',
          mascotMood: 'happy',
          badgeText: 'Morning Habit',
        };
      }
      return {
        id: 'morning-briefing-en',
        category: 'briefing',
        title: "Your daily weather check is waiting! 🌅",
        message: `It's ${timeFormatted}—a quick check now will keep you prepared for whatever the sky brings today.`,
        actionLabel: 'Check Daily Briefing',
        actionTarget: 'briefing',
        mascotMood: 'happy',
        badgeText: 'Daily Routine',
      };
    }

    // 5. Afternoon: Hydration & Sun Protection Habit
    if (hour >= 12 && hour < 17 && !todayStatus.hydrationLogged) {
      if (isPidgin) {
        return {
          id: 'afternoon-water-pidgin',
          category: 'hydration',
          title: 'Time for a fresh cup of water! 💧',
          message: 'Afternoon sun dey shine. Drink water make you keep your daily streak alive!',
          actionLabel: 'Log Water Drink',
          actionTarget: 'hydration',
          mascotMood: 'thirsty',
          badgeText: 'Hydration Habit',
        };
      }
      return {
        id: 'afternoon-water-en',
        category: 'hydration',
        title: 'Time for a drink! 💧',
        message: `It's ${timeFormatted}—sip some water and keep your daily streak going.`,
        actionLabel: 'Log a Drink',
        actionTarget: 'hydration',
        mascotMood: 'thirsty',
        badgeText: 'Hydration Routine',
      };
    }

    // 6. Afternoon / Evening: Weather Recommendations Check
    if (!todayStatus.recommendationsViewed) {
      if (isPidgin) {
        return {
          id: 'recom-pidgin',
          category: 'general',
          title: 'Check your personalized tips! 🛡️',
          message: 'See smart dressing and safety tips tailored to current atmospheric conditions.',
          actionLabel: 'View Recommendations',
          actionTarget: 'recommendations',
          mascotMood: 'sunny',
          badgeText: 'Daily Tips',
        };
      }
      return {
        id: 'recom-en',
        category: 'general',
        title: 'Stay one step ahead of the weather! 🛡️',
        message: 'Review personalized dressing, UV, and comfort tips tailored to current conditions.',
        actionLabel: 'View Recommendations',
        actionTarget: 'recommendations',
        mascotMood: 'sunny',
        badgeText: 'Smart Habits',
      };
    }

    // 7. General fallback: Hydration reminder if not logged yet
    if (!todayStatus.hydrationLogged) {
      return {
        id: 'general-hydration',
        category: 'hydration',
        title: isPidgin ? 'Drink water make body strong! 💧' : 'Stay refreshed! 💧',
        message: isPidgin
          ? 'Maintain your hydration goal before the day end.'
          : 'A quick sip of water keeps your focus sharp and your wellness streak intact.',
        actionLabel: isPidgin ? 'Log Water' : 'Log Water',
        actionTarget: 'hydration',
        mascotMood: 'thirsty',
        badgeText: 'Daily Goal',
      };
    }

    // Fallback: Morning / Evening weather check
    return {
      id: 'general-check',
      category: 'briefing',
      title: isPidgin ? "Time to check today's weather!" : "Time for your daily weather check!",
      message: isPidgin
        ? 'Quick look at the forecast will make your day smooth.'
        : 'Take 10 seconds to review the hourly trajectory and prepare for tomorrow.',
      actionLabel: isPidgin ? 'Check Forecast' : 'Check Forecast',
      actionTarget: 'briefing',
      mascotMood: 'happy',
      badgeText: 'Streak Booster',
    };
  }
}

export const habitReminderManager = new HabitReminderManagerService();
