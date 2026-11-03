// Hydration Manager: Adaptive frequency, sleep schedule, logging & proactive alerts
import { AppLanguage } from '../types';

export interface HydrationSettings {
  enabled: boolean;
  mode: 'adaptive' | 'custom';
  customIntervalMinutes: number; // 30, 45, 60, 90, 120
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "07:00"
  voiceReminders: boolean;
  systemNotifications: boolean;
  dailyGoalMl: number; // default 2000 ml
  language: AppLanguage;
}

export interface HydrationLogEntry {
  id: string;
  timestamp: number;
  amountMl: number;
  label: string;
}

export interface HydrationState {
  settings: HydrationSettings;
  currentIntakeMl: number;
  drinksCount: number;
  history: HydrationLogEntry[];
  lastDrinkTime: number | null;
  lastReminderTime: number | null;
  activeReminder: {
    id: string;
    message: string;
    isHeatAlert: boolean;
    temperatureText?: string;
    timestamp: number;
  } | null;
  currentCalculatedIntervalMinutes: number;
  isWithinQuietHours: boolean;
  heatAdvisory: string | null;
}

const HYDRATION_SETTINGS_KEY = 'nimbus_hydration_settings_v1';
const HYDRATION_DATA_KEY = 'nimbus_hydration_data_v1';

export const DEFAULT_HYDRATION_SETTINGS: HydrationSettings = {
  enabled: true,
  mode: 'adaptive',
  customIntervalMinutes: 60,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  voiceReminders: false,
  systemNotifications: false,
  dailyGoalMl: 2000,
  language: 'en',
};

type HydrationSubscriber = (state: HydrationState) => void;

class HydrationManagerService {
  private settings: HydrationSettings = DEFAULT_HYDRATION_SETTINGS;
  private currentIntakeMl: number = 0;
  private drinksCount: number = 0;
  private history: HydrationLogEntry[] = [];
  private lastDrinkTime: number | null = null;
  private lastReminderTime: number | null = null;
  private activeReminder: HydrationState['activeReminder'] = null;
  private subscribers: Set<HydrationSubscriber> = new Set();
  private timerId: any = null;

  // Cached weather metrics for adaptive calculation
  private latestTempC: number = 22;
  private latestApparentTempC: number = 22;
  private latestHumidity: number = 50;
  private latestTempDisplay: string = '22°C';

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
      this.startScheduler();
    }
  }

  private loadFromStorage() {
    try {
      const storedSettings = localStorage.getItem(HYDRATION_SETTINGS_KEY);
      if (storedSettings) {
        this.settings = { ...DEFAULT_HYDRATION_SETTINGS, ...JSON.parse(storedSettings) };
      }

      const storedData = localStorage.getItem(HYDRATION_DATA_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        // Check if date changed (reset daily tally if it's a new calendar day)
        const todayStr = new Date().toDateString();
        if (parsed.savedDate === todayStr) {
          this.currentIntakeMl = parsed.currentIntakeMl || 0;
          this.drinksCount = parsed.drinksCount || 0;
          this.history = parsed.history || [];
          this.lastDrinkTime = parsed.lastDrinkTime || null;
          this.lastReminderTime = parsed.lastReminderTime || null;
        } else {
          // New day - start fresh
          this.currentIntakeMl = 0;
          this.drinksCount = 0;
          this.history = [];
          this.lastDrinkTime = null;
          this.lastReminderTime = null;
          this.saveData();
        }
      }
    } catch (e) {
      console.warn('Could not load hydration data from localStorage:', e);
    }
  }

  private saveData() {
    try {
      const todayStr = new Date().toDateString();
      const dataToSave = {
        savedDate: todayStr,
        currentIntakeMl: this.currentIntakeMl,
        drinksCount: this.drinksCount,
        history: this.history.slice(-30), // keep recent 30 entries
        lastDrinkTime: this.lastDrinkTime,
        lastReminderTime: this.lastReminderTime,
      };
      localStorage.setItem(HYDRATION_DATA_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Could not save hydration data to localStorage:', e);
    }
  }

  private saveSettingsToStorage() {
    try {
      localStorage.setItem(HYDRATION_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save hydration settings to localStorage:', e);
    }
  }

  public updateWeatherMetrics(tempC: number, apparentTempC: number, humidity: number, tempDisplay: string) {
    this.latestTempC = tempC;
    this.latestApparentTempC = apparentTempC;
    this.latestHumidity = humidity;
    this.latestTempDisplay = tempDisplay;
    this.notify();
  }

  /**
   * Calculates interval in minutes based on thermal conditions
   */
  public getEffectiveIntervalMinutes(): number {
    if (!this.settings.enabled) return 60;
    if (this.settings.mode === 'custom') {
      return this.settings.customIntervalMinutes || 60;
    }

    // Adaptive Mode:
    // Extreme heat (apparent temp >= 35°C or temp >= 36°C) -> 30 min
    if (this.latestApparentTempC >= 35 || this.latestTempC >= 36) {
      return 30;
    }
    // High heat (apparent temp >= 30°C or temp >= 30°C) -> 45 min
    if (this.latestApparentTempC >= 30 || this.latestTempC >= 30) {
      return 45;
    }
    // Muggy conditions (humidity >= 70% with temp >= 22°C) -> 45 min
    if (this.latestHumidity >= 70 && this.latestTempC >= 22) {
      return 45;
    }
    // Cold conditions (< 10°C) -> 75 min (still need fluids, but slower thirst drive)
    if (this.latestTempC < 10) {
      return 75;
    }
    // Normal / mild conditions -> 60 min (standard hourly)
    return 60;
  }

  /**
   * Evaluates if current local time falls into quiet hours
   */
  public isCurrentTimeInQuietHours(): boolean {
    if (!this.settings.quietHoursEnabled) return false;

    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = this.settings.quietHoursStart.split(':').map(Number);
      const [endH, endM] = this.settings.quietHoursEnd.split(':').map(Number);

      const startMinutes = (startH || 22) * 60 + (startM || 0);
      const endMinutes = (endH || 7) * 60 + (endM || 0);

      // Overnight schedule (e.g., 22:00 to 07:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
      // Same day schedule (e.g. 13:00 to 15:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } catch {
      return false;
    }
  }

  public getState(): HydrationState {
    const isQuiet = this.isCurrentTimeInQuietHours();
    const intervalMin = this.getEffectiveIntervalMinutes();

    let heatAdvisory: string | null = null;
    if (this.latestApparentTempC >= 34 || this.latestTempC >= 34) {
      heatAdvisory = `Extreme Heat (${this.latestTempDisplay}) — High dehydration risk. Sip water frequently.`;
    } else if (this.latestApparentTempC >= 29 || this.latestTempC >= 29) {
      heatAdvisory = `Warm Weather (${this.latestTempDisplay}) — Keep your water flask nearby.`;
    } else if (this.latestHumidity >= 72 && this.latestTempC >= 22) {
      heatAdvisory = `Humid Air (${this.latestHumidity}%) — Increased perspiration. Remember to hydrate.`;
    }

    return {
      settings: { ...this.settings },
      currentIntakeMl: this.currentIntakeMl,
      drinksCount: this.drinksCount,
      history: [...this.history],
      lastDrinkTime: this.lastDrinkTime,
      lastReminderTime: this.lastReminderTime,
      activeReminder: this.activeReminder,
      currentCalculatedIntervalMinutes: intervalMin,
      isWithinQuietHours: isQuiet,
      heatAdvisory,
    };
  }

  public subscribe(cb: HydrationSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.getState());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    const state = this.getState();
    this.subscribers.forEach((cb) => cb(state));
  }

  /**
   * Start interval check loop (every 30 seconds)
   */
  private startScheduler() {
    if (this.timerId) clearInterval(this.timerId);

    this.timerId = setInterval(() => {
      this.checkAndTriggerReminder();
    }, 30000);
  }

  public checkAndTriggerReminder() {
    if (!this.settings.enabled) return;
    if (this.isCurrentTimeInQuietHours()) return;
    if (this.activeReminder) return; // Already showing a reminder banner

    const now = Date.now();
    const intervalMs = this.getEffectiveIntervalMinutes() * 60 * 1000;

    // Base the next reminder on either the last drink or the last reminder, whichever is later
    const lastEventTime = Math.max(this.lastDrinkTime || 0, this.lastReminderTime || 0);

    // If never drank or reminded today, wait until first interval from load, or if > interval has passed
    if (lastEventTime === 0) {
      // Initialize reference point to prevent immediate blast on startup
      this.lastReminderTime = now;
      this.saveData();
      return;
    }

    if (now - lastEventTime >= intervalMs) {
      this.triggerReminder();
    }
  }

  public triggerReminder(isManualTest: boolean = false) {
    const isHot = this.latestApparentTempC >= 30 || this.latestTempC >= 30;
    const isVeryHot = this.latestApparentTempC >= 35 || this.latestTempC >= 35;
    const isHumid = this.latestHumidity >= 70 && this.latestTempC >= 22;

    const isPidgin = this.settings.language === 'pcm';

    let message = isPidgin
      ? "Time don reach to drink water! Grab cup of water drink now."
      : "Time to hydrate! Take a moment to drink some water.";

    if (isVeryHot) {
      message = isPidgin
        ? `Sun dey burn ground today (${this.latestTempDisplay})! Keep your water bottle close, drink water well well!`
        : `Extreme heat today (${this.latestTempDisplay})! Keep your water flask close and take frequent sips.`;
    } else if (isHot) {
      message = isPidgin
        ? `Weather dey hot outside (${this.latestTempDisplay}). No let dry throat catch you, drink cold water now.`
        : `It's getting hot outside (${this.latestTempDisplay}). Remember to drink some cool water.`;
    } else if (isHumid) {
      message = isPidgin
        ? `Air dey heavy with sweat (${this.latestHumidity}%). Drink fresh water make your body cool down.`
        : `High humidity (${this.latestHumidity}%) increases fluid loss. Rehydrate with a glass of water.`;
    }

    this.activeReminder = {
      id: `rem_${Date.now()}`,
      message,
      isHeatAlert: isHot || isVeryHot,
      temperatureText: this.latestTempDisplay,
      timestamp: Date.now(),
    };

    this.lastReminderTime = Date.now();
    this.saveData();
    this.notify();

    // Trigger System Web Notification if permitted
    if (this.settings.systemNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification('Nimbus Hydration Reminder', {
            body: message,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('Web notification dispatch failed:', e);
        }
      }
    }

    // Trigger voice assistant announcement if enabled
    if (this.settings.voiceReminders && typeof window !== 'undefined') {
      import('./voiceAssistant').then(({ voiceAssistant }) => {
        voiceAssistant.speak(message, 'Hydration Reminder');
      });
    }
  }

  public recordDrink(amountMl: number = 250, label: string = 'Glass of Water') {
    this.currentIntakeMl += amountMl;
    this.drinksCount += 1;
    this.lastDrinkTime = Date.now();
    this.activeReminder = null; // Clears any pending reminder

    const entry: HydrationLogEntry = {
      id: `drink_${Date.now()}`,
      timestamp: Date.now(),
      amountMl,
      label,
    };
    this.history.unshift(entry);
    this.saveData();
    this.notify();
  }

  public snoozeReminder(minutes: number = 15) {
    this.activeReminder = null;
    // Push last reminder time ahead so it triggers after snooze duration
    this.lastReminderTime = Date.now() - (this.getEffectiveIntervalMinutes() - minutes) * 60 * 1000;
    this.saveData();
    this.notify();
  }

  public dismissReminder() {
    this.activeReminder = null;
    this.lastReminderTime = Date.now();
    this.saveData();
    this.notify();
  }

  public resetDailyIntake() {
    this.currentIntakeMl = 0;
    this.drinksCount = 0;
    this.history = [];
    this.lastDrinkTime = null;
    this.activeReminder = null;
    this.saveData();
    this.notify();
  }

  public updateSettings(partial: Partial<HydrationSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettingsToStorage();
    this.notify();
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      if (granted) {
        this.updateSettings({ systemNotifications: true });
      } else {
        this.updateSettings({ systemNotifications: false });
      }
      return granted;
    } catch {
      return false;
    }
  }
}

export const hydrationManager = new HydrationManagerService();
