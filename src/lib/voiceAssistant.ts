// Browser SpeechSynthesis & Web Audio chime engine for Nimbus Voice Assistant

export type SpeechPlaybackStatus = 'idle' | 'playing' | 'paused';

export interface VoiceAssistantSettings {
  enabled: boolean;
  autoAnnounceAlerts: boolean;
  speechRate: number; // 0.8 to 1.3 (1.0 default)
  speechPitch: number; // 0.9 to 1.1 (1.0 default)
  selectedVoiceURI: string | null;
  playChime: boolean;
}

const SETTINGS_STORAGE_KEY = 'nimbus_voice_settings_v1';

export const DEFAULT_VOICE_SETTINGS: VoiceAssistantSettings = {
  enabled: true,
  autoAnnounceAlerts: false,
  speechRate: 1.0,
  speechPitch: 1.0,
  selectedVoiceURI: null,
  playChime: true,
};

type StateChangeSubscriber = (status: {
  status: SpeechPlaybackStatus;
  currentText: string | null;
  currentLabel: string | null;
}) => void;

class VoiceAssistantService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private status: SpeechPlaybackStatus = 'idle';
  private currentText: string | null = null;
  private currentLabel: string | null = null;
  private subscribers: Set<StateChangeSubscriber> = new Set();
  private settings: VoiceAssistantSettings = DEFAULT_VOICE_SETTINGS;
  private audioContext: AudioContext | null = null;
  private voicesLoaded: boolean = false;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadSettings();
      this.initVoices();
    }
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not load voice settings from localStorage:', e);
    }
  }

  public getSettings(): VoiceAssistantSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<VoiceAssistantSettings>) {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save voice settings to localStorage:', e);
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const updateVoices = () => {
      this.availableVoices = this.synth?.getVoices() || [];
      if (this.availableVoices.length > 0) {
        this.voicesLoaded = true;
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && this.synth) {
      this.availableVoices = this.synth.getVoices();
    }
    return this.availableVoices;
  }

  public isSupported(): boolean {
    return !!this.synth;
  }

  public getStatus(): { status: SpeechPlaybackStatus; currentText: string | null; currentLabel: string | null } {
    return {
      status: this.status,
      currentText: this.currentText,
      currentLabel: this.currentLabel,
    };
  }

  public subscribe(cb: StateChangeSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.getStatus());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    const current = this.getStatus();
    this.subscribers.forEach((cb) => cb(current));
  }

  /**
   * Plays a subtle, pleasant harmonic chime using the Web Audio API
   */
  public async playChime(): Promise<void> {
    if (!this.settings.playChime) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'suspended') {
        this.audioContext = new AudioCtx();
        await this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);
      gain2.gain.setValueAtTime(0.09, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      // Small delay for chime completion before speech starts
      await new Promise((r) => setTimeout(r, 420));
    } catch (e) {
      // AudioContext might be blocked until gesture, fail silently
    }
  }

  /**
   * Selects the most natural voice available, prioritizing en-NG for Nigerian Pidgin
   */
  private pickBestVoice(lang?: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    if (this.settings.selectedVoiceURI) {
      const match = voices.find((v) => v.voiceURI === this.settings.selectedVoiceURI);
      if (match) return match;
    }

    // If Nigerian Pidgin or Nigerian English requested, check for en-NG voice
    if (lang === 'pcm' || lang === 'en-NG') {
      const ngVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes('en-ng') ||
          v.lang.toLowerCase().includes('en_ng') ||
          v.name.toLowerCase().includes('nigeria')
      );
      if (ngVoice) return ngVoice;
    }

    // Prioritize natural neural/premium voices
    const preferredVoices = [
      'Google US English',
      'Samantha',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Microsoft Guy Online (Natural) - English (United States)',
      'Microsoft Aria Online (Natural)',
      'Karen',
      'Daniel',
      'Alex',
    ];

    for (const name of preferredVoices) {
      const found = voices.find((v) => v.name.includes(name));
      if (found) return found;
    }

    // Next fallback: any English voice
    const anyEn = voices.find((v) => v.lang.startsWith('en') && (v.lang.includes('US') || v.lang.includes('GB')));
    if (anyEn) return anyEn;

    const anyEnGeneral = voices.find((v) => v.lang.startsWith('en'));
    if (anyEnGeneral) return anyEnGeneral;

    return voices[0] || null;
  }

  /**
   * Speak a text string with optional label and language code
   */
  public async speak(text: string, label: string = 'Weather Announcement', lang: string = 'en'): Promise<void> {
    if (!this.synth) return;
    if (!this.settings.enabled) {
      console.info('Nimbus Voice Assistant is disabled in user preferences.');
      return;
    }

    // Stop ongoing speech
    this.stop();

    this.currentText = text;
    this.currentLabel = label;
    this.status = 'playing';
    this.notify();

    // Play chime sound
    await this.playChime();

    // Double check if canceled during chime
    if (this.status !== 'playing') return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      const voice = this.pickBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      // Slightly smoother rate for Pidgin if on standard English voice
      const effectiveRate = lang === 'pcm' ? Math.min(1.0, this.settings.speechRate || 1.0) : (this.settings.speechRate || 1.0);
      utterance.rate = effectiveRate;
      utterance.pitch = this.settings.speechPitch || 1.0;

      utterance.onend = () => {
        this.status = 'idle';
        this.currentUtterance = null;
        this.notify();
      };

      utterance.onerror = (evt) => {
        console.warn('Speech synthesis error:', evt);
        this.status = 'idle';
        this.currentUtterance = null;
        this.notify();
      };

      utterance.onpause = () => {
        this.status = 'paused';
        this.notify();
      };

      utterance.onresume = () => {
        this.status = 'playing';
        this.notify();
      };

      this.synth.speak(utterance);
    } catch (err) {
      console.error('Error starting speech synthesis:', err);
      this.status = 'idle';
      this.notify();
    }
  }

  public pause(): void {
    if (!this.synth || this.status !== 'playing') return;
    this.synth.pause();
    this.status = 'paused';
    this.notify();
  }

  public resume(): void {
    if (!this.synth || this.status !== 'paused') return;
    this.synth.resume();
    this.status = 'playing';
    this.notify();
  }

  public stop(): void {
    if (!this.synth) return;
    this.synth.cancel();
    this.status = 'idle';
    this.currentUtterance = null;
    this.notify();
  }

  public replay(): void {
    if (this.currentText) {
      this.speak(this.currentText, this.currentLabel || 'Replay Announcement');
    }
  }
}

// Global Singleton
export const voiceAssistant = new VoiceAssistantService();
