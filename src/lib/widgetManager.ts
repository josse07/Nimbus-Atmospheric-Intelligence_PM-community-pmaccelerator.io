export type WidgetPermissionState = 'prompt' | 'granted' | 'denied';
export type WidgetViewMode = 'all' | 'weather' | 'hydration' | 'habits';

export interface WidgetSettings {
  permission: WidgetPermissionState;
  enabled: boolean;
  viewMode: WidgetViewMode;
  showMascot: boolean;
  autoRefreshIntervalMinutes: number;
}

const STORAGE_KEY = 'nimbus_home_widget_settings';

const DEFAULT_SETTINGS: WidgetSettings = {
  permission: 'prompt',
  enabled: false,
  viewMode: 'all',
  showMascot: true,
  autoRefreshIntervalMinutes: 30,
};

type Listener = (settings: WidgetSettings) => void;

class WidgetManager {
  private settings: WidgetSettings;
  private listeners: Set<Listener> = new Set();
  private deferredPrompt: any = null;

  constructor() {
    this.settings = this.loadSettings();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
      });
    }
  }

  private loadSettings(): WidgetSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return DEFAULT_SETTINGS;
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (_) {}
    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.settings }));
  }

  public getSettings(): WidgetSettings {
    return { ...this.settings };
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn({ ...this.settings });
    return () => this.listeners.delete(fn);
  }

  public grantPermission(): Promise<{ nativePromptTriggered: boolean }> {
    this.settings.permission = 'granted';
    this.settings.enabled = true;
    this.saveSettings();

    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        return this.deferredPrompt.userChoice.then(() => {
          this.deferredPrompt = null;
          return { nativePromptTriggered: true };
        });
      } catch (_) {
        return Promise.resolve({ nativePromptTriggered: false });
      }
    }
    return Promise.resolve({ nativePromptTriggered: false });
  }

  public denyPermission() {
    this.settings.permission = 'denied';
    this.settings.enabled = false;
    this.saveSettings();
  }

  public resetPermission() {
    this.settings.permission = 'prompt';
    this.settings.enabled = false;
    this.saveSettings();
  }

  public updateSettings(partial: Partial<WidgetSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  public getDevicePlatform(): 'ios' | 'android' | 'desktop' {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      return 'ios';
    }
    if (/android/i.test(ua)) {
      return 'android';
    }
    return 'desktop';
  }

  public hasDeferredPrompt(): boolean {
    return !!this.deferredPrompt;
  }
}

export const widgetManager = new WidgetManager();
