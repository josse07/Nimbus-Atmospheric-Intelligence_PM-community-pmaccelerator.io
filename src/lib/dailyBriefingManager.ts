// Daily Weather Briefing & Notification Manager
// Provides scheduled morning/daily weather updates, urgent weather alerts,
// concise simple AI communication, and Nigerian Pidgin translation (strictly for Nigeria).

import {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  TemperatureUnit,
  AppLanguage,
  DailyWeatherBriefing,
  GeocodeResult
} from '../types';
import { voiceAssistant } from './voiceAssistant';

export interface DailyBriefingSettings {
  enabled: boolean;
  preferredTime: string; // e.g. "08:00"
  urgentAlertsEnabled: boolean;
  lastBriefingDate: string | null; // "YYYY-MM-DD"
  lastUrgentAlertTime: number | null;
  language: AppLanguage;
}

const BRIEFING_SETTINGS_KEY = 'nimbus_daily_briefing_settings_v1';

export const DEFAULT_BRIEFING_SETTINGS: DailyBriefingSettings = {
  enabled: true,
  preferredTime: '08:00',
  urgentAlertsEnabled: true,
  lastBriefingDate: null,
  lastUrgentAlertTime: null,
  language: 'en',
};

export function isNigeriaLocation(
  loc?: { country?: string; countryCode?: string; formattedName?: string; name?: string } | null
): boolean {
  if (!loc) return false;
  if (loc.countryCode && loc.countryCode.toUpperCase() === 'NG') return true;
  if (loc.country && loc.country.toLowerCase().includes('nigeria')) return true;
  if (loc.formattedName && loc.formattedName.toLowerCase().includes('nigeria')) return true;
  return false;
}

type BriefingSubscriber = (briefing: DailyWeatherBriefing | null, settings: DailyBriefingSettings) => void;

class DailyBriefingService {
  private settings: DailyBriefingSettings = DEFAULT_BRIEFING_SETTINGS;
  private currentBriefing: DailyWeatherBriefing | null = null;
  private subscribers: Set<BriefingSubscriber> = new Set();
  private timerId: any = null;
  private latestWeatherData: {
    current: CurrentWeather;
    daily: DailyForecast[];
    hourly: HourlyForecast[];
    location: GeocodeResult;
    unit: TemperatureUnit;
  } | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
      this.startScheduler();
    }
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem(BRIEFING_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_BRIEFING_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not load briefing settings:', e);
    }
  }

  public saveSettings() {
    try {
      localStorage.setItem(BRIEFING_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save briefing settings:', e);
    }
  }

  public getSettings(): DailyBriefingSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<DailyBriefingSettings>, location?: GeocodeResult) {
    let nextLang = partial.language ?? this.settings.language;
    // Strict geographical verification: if switching to or keeping 'pcm', verify location is in Nigeria
    if (nextLang === 'pcm') {
      const targetLoc = location || this.latestWeatherData?.location;
      if (!isNigeriaLocation(targetLoc)) {
        console.warn('Nigerian Pidgin is strictly available to users in Nigeria.');
        nextLang = 'en';
      }
    }

    this.settings = { ...this.settings, ...partial, language: nextLang };
    this.saveSettings();

    // Recompute briefing if weather data exists
    if (this.latestWeatherData) {
      this.currentBriefing = this.generateBriefing(
        this.latestWeatherData.current,
        this.latestWeatherData.daily,
        this.latestWeatherData.hourly,
        this.latestWeatherData.location,
        this.latestWeatherData.unit,
        this.settings.language
      );
    }

    this.notify();
  }

  public subscribe(cb: BriefingSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.currentBriefing, this.getSettings());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb(this.currentBriefing, this.getSettings()));
  }

  /**
   * Generates a concise, structured Daily Weather Briefing
   */
  public generateBriefing(
    current: CurrentWeather,
    daily: DailyForecast[] = [],
    hourly: HourlyForecast[] = [],
    location: GeocodeResult,
    unit: TemperatureUnit = 'celsius',
    forcedLanguage?: AppLanguage
  ): DailyWeatherBriefing {
    const isNigeria = isNigeriaLocation(location);
    // If user is not in Nigeria, force English
    const language: AppLanguage = (!isNigeria && (forcedLanguage === 'pcm' || this.settings.language === 'pcm'))
      ? 'en'
      : (forcedLanguage || this.settings.language);

    const tempC = current.temperature;
    const apparentTempC = current.apparentTemperature;
    const today = daily[0];
    const rainProb = today?.precipitationProbability ?? (current.precipitation > 0 ? 90 : 10);
    const weatherCode = current.weatherCode;
    const condition = current.condition || 'clear weather';
    const uvIndex = current.uvIndex > 0 ? current.uvIndex : (today?.uvIndexMax ?? 0);

    const formatTemp = (valC: number) =>
      unit === 'fahrenheit' ? `${Math.round((valC * 9) / 5 + 32)}°F` : `${Math.round(valC)}°C`;

    const tempStr = formatTemp(tempC);
    const apparentStr = formatTemp(apparentTempC);
    const maxStr = today ? formatTemp(today.maxTemp) : tempStr;
    const minStr = today ? formatTemp(today.minTemp) : tempStr;

    const isThunderstorm = [95, 96, 99].includes(weatherCode);
    const isRainingNow = current.precipitation > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
    const isExtremeHeat = apparentTempC >= 35 || tempC >= 35;
    const isHot = apparentTempC >= 30 || tempC >= 30;
    const isCold = tempC <= 12;

    const recommendations: string[] = [];
    let severeAlert: string | null = null;
    let headline = '';
    let greeting = '';
    let speechText = '';

    const nowHour = new Date().getHours();
    const timeGreeting = nowHour < 12 ? 'Good Morning' : nowHour < 17 ? 'Good Afternoon' : 'Good Evening';

    // ----------------------------------------------------
    // NIGERIAN PIDGIN ENGLISH (Strictly for Nigerian locations)
    // ----------------------------------------------------
    if (language === 'pcm') {
      greeting = nowHour < 12 ? 'Good Morning! How far!' : nowHour < 17 ? 'Good Afternoon! How body!' : 'Good Evening! How far!';

      if (isThunderstorm) {
        headline = 'Thunder & heavy storm dey strike';
        severeAlert = 'Severe Thunderstorm: Make you stay inside house until breeze and lightning stop.';
        recommendations.push('Stay indoors inside safe house or office.');
        recommendations.push('Disconnect sensitive electronics from socket.');
        recommendations.push('No waka near tall trees or metal poles.');
      } else if (isExtremeHeat) {
        headline = `Sun go hot well well (${tempStr})`;
        severeAlert = `Heavy Heat Advisory: Body go feel like ${apparentStr}.`;
        recommendations.push('Carry chilled water bottle or flask everywhere.');
        recommendations.push('Wear light, free cloth so heat no go hold you.');
        recommendations.push('Try waka under shade and drink water regularly.');
      } else if (isRainingNow) {
        headline = 'Rain dey fall now now';
        recommendations.push('Abeg carry your umbrella or raincoat.');
        recommendations.push('Watch road well well because of water-log.');
        recommendations.push('Wear waterproof shoes if you dey waka outside.');
      } else if (rainProb >= 40) {
        headline = `Rain fit drop today (${rainProb}% chance)`;
        recommendations.push('Hold small umbrella put inside your bag.');
        recommendations.push('Plan your outdoor waka before afternoon showers start.');
      } else if (isHot) {
        headline = `Weather warm and sunny (${tempStr})`;
        recommendations.push('Drink water regularly to keep energy strong.');
        recommendations.push('Wear sunglasses or cap if sun dey bright.');
      } else if (isCold) {
        headline = `Cold breeze dey blow (${tempStr})`;
        recommendations.push('Wear warm jacket or sweater.');
        recommendations.push('Take warm tea or coffee to warm your chest.');
      } else {
        headline = `Weather soft and pleasant (${tempStr})`;
        recommendations.push('Weather fine for outdoor movement and work.');
        recommendations.push('Drink small water to keep hydrated.');
      }

      // Voice Assistant Speech in Pidgin
      speechText = `${greeting} Here na your weather update for ${location.name}. Today weather na ${headline}. Current temperature na ${tempStr}, and e feel like ${apparentStr}. Rain chance na ${rainProb} percent. Advice for you: ${recommendations.slice(0, 2).join(' Also, ')}. Make you have a blessed day!`;
    } else {
      // ----------------------------------------------------
      // SIMPLE CONCISE AI ENGLISH (Everyday, direct, no jargon)
      // ----------------------------------------------------
      greeting = `${timeGreeting}! Here's Your Weather Update.`;

      if (isThunderstorm) {
        headline = 'Severe Thunderstorm Warning';
        severeAlert = 'Active lightning detected. Stay sheltered indoors until the storm clears.';
        recommendations.push('Seek shelter in a sturdy building.');
        recommendations.push('Avoid open outdoor fields and high trees.');
        recommendations.push('Delay unnecessary travel until visibility improves.');
      } else if (isExtremeHeat) {
        headline = `Excessive Heat Warning (${tempStr})`;
        severeAlert = `Extreme heat index: Feels like ${apparentStr}. High dehydration risk.`;
        recommendations.push('Carry a cold water flask and hydrate frequently.');
        recommendations.push('Wear lightweight, light-colored cotton clothing.');
        recommendations.push('Avoid prolonged direct sun between 11 AM and 4 PM.');
      } else if (isRainingNow) {
        headline = 'Rainy Conditions Active';
        recommendations.push('Carry an umbrella or water-resistant jacket.');
        recommendations.push('Wear slip-resistant shoes for wet surfaces.');
        recommendations.push('Allow extra transit time on roads.');
      } else if (rainProb >= 40) {
        headline = `Rain Expected Today (${rainProb}% Chance)`;
        recommendations.push('Pack an umbrella in your bag before leaving.');
        recommendations.push('Plan outdoor errands before afternoon showers.');
      } else if (isHot) {
        headline = `Sunny and Warm (${tempStr})`;
        recommendations.push('Keep a water bottle nearby and stay hydrated.');
        recommendations.push('Apply sunscreen if spending extended time outside.');
      } else if (isCold) {
        headline = `Cool Temperatures (${tempStr})`;
        recommendations.push('Wear an insulating jacket or warm layers.');
        recommendations.push('Keep extremities warm in breezy conditions.');
      } else {
        headline = `Clear and Comfortable (${tempStr})`;
        recommendations.push('Great weather for walks and outdoor activities.');
        recommendations.push('Stay comfortably hydrated throughout the day.');
      }

      // Voice Assistant Speech in Natural Simple English
      speechText = `${greeting} In ${location.name}, conditions are ${headline}, currently ${tempStr} feeling like ${apparentStr}. Rain probability is ${rainProb} percent. Recommended actions: ${recommendations.slice(0, 2).join('. ')}. Have a safe and productive day!`;
    }

    const briefing: DailyWeatherBriefing = {
      id: `briefing_${Date.now()}`,
      dateStr: new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      greeting,
      headline,
      temperatureText: tempStr,
      apparentTempText: apparentStr,
      highLowText: `High ${maxStr} / Low ${minStr}`,
      conditionText: condition,
      rainProbabilityText: `${rainProb}%`,
      recommendations,
      severeAlert,
      speechText,
      isUrgent: isThunderstorm || isExtremeHeat,
      language,
    };

    return briefing;
  }

  /**
   * Called whenever new weather data is fetched
   */
  public updateWeatherData(
    current: CurrentWeather,
    daily: DailyForecast[],
    hourly: HourlyForecast[],
    location: GeocodeResult,
    unit: TemperatureUnit
  ) {
    this.latestWeatherData = { current, daily, hourly, location, unit };

    // Generate latest briefing
    this.currentBriefing = this.generateBriefing(
      current,
      daily,
      hourly,
      location,
      unit,
      this.settings.language
    );

    // Check if an urgent weather alert should be fired immediately
    this.checkUrgentAlert(this.currentBriefing);

    this.notify();
  }

  /**
   * Periodic scheduler: runs every 30 seconds to check if current time matches user's preferred briefing time
   */
  private startScheduler() {
    if (this.timerId) clearInterval(this.timerId);

    this.timerId = setInterval(() => {
      this.checkScheduledBriefing();
    }, 30000);
  }

  private checkScheduledBriefing() {
    if (!this.settings.enabled) return;
    if (!this.currentBriefing || !this.latestWeatherData) return;

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

    // Only send once per calendar day
    if (this.settings.lastBriefingDate === todayDateStr) {
      return;
    }

    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    // If current time matches or just passed user's preferred briefing time
    if (currentTimeStr >= this.settings.preferredTime) {
      this.dispatchBriefingNotification(this.currentBriefing);
      this.settings.lastBriefingDate = todayDateStr;
      this.saveSettings();
    }
  }

  private checkUrgentAlert(briefing: DailyWeatherBriefing) {
    if (!this.settings.urgentAlertsEnabled || !briefing.isUrgent) return;

    const now = Date.now();
    const fourHoursMs = 4 * 60 * 60 * 1000;

    // Do not spam urgent alerts if already sent within 4 hours
    if (this.settings.lastUrgentAlertTime && now - this.settings.lastUrgentAlertTime < fourHoursMs) {
      return;
    }

    this.dispatchBriefingNotification(briefing, true);
    this.settings.lastUrgentAlertTime = now;
    this.saveSettings();
  }

  public dispatchBriefingNotification(briefing: DailyWeatherBriefing, isUrgent: boolean = false) {
    const title = isUrgent ? `⚠️ Urgent Weather Alert: ${briefing.headline}` : briefing.greeting;
    const body = `${briefing.headline} • ${briefing.temperatureText}. ${briefing.recommendations[0] || ''}`;

    // 1. Browser Web Notification (if granted)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('Daily briefing notification dispatch error:', e);
        }
      }
    }

    // 2. If voice assistant is enabled and user prefers auto announcement of urgent alerts
    const voiceSettings = voiceAssistant.getSettings();
    if (voiceSettings.enabled && (isUrgent || voiceSettings.autoAnnounceAlerts)) {
      voiceAssistant.speak(briefing.speechText, isUrgent ? 'Urgent Weather Alert' : 'Daily Weather Briefing');
    }
  }

  /**
   * Trigger immediate test briefing
   */
  public triggerTestBriefing() {
    if (!this.currentBriefing && this.latestWeatherData) {
      this.currentBriefing = this.generateBriefing(
        this.latestWeatherData.current,
        this.latestWeatherData.daily,
        this.latestWeatherData.hourly,
        this.latestWeatherData.location,
        this.latestWeatherData.unit,
        this.settings.language
      );
    }

    if (this.currentBriefing) {
      this.dispatchBriefingNotification(this.currentBriefing, false);
      voiceAssistant.speak(this.currentBriefing.speechText, 'Daily Weather Briefing');
    }
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
}

export const dailyBriefingManager = new DailyBriefingService();
