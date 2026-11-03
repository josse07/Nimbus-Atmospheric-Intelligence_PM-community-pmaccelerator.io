import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Square,
  Settings2,
  Sparkles,
  Radio,
  Sliders,
  Check,
  ChevronDown
} from 'lucide-react';
import { voiceAssistant, SpeechPlaybackStatus, VoiceAssistantSettings } from '../lib/voiceAssistant';
import { RecommendationAnalysis } from '../lib/recommendationEngine';

interface VoiceAssistantControllerProps {
  analysis: RecommendationAnalysis | null;
  locationName: string;
}

export const VoiceAssistantController: React.FC<VoiceAssistantControllerProps> = ({
  analysis,
  locationName,
}) => {
  const [status, setStatus] = useState<SpeechPlaybackStatus>('idle');
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [settings, setSettings] = useState<VoiceAssistantSettings>(voiceAssistant.getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(voiceAssistant.isSupported());

    const unsubscribe = voiceAssistant.subscribe((s) => {
      setStatus(s.status);
      setCurrentLabel(s.currentLabel);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleEnabled = () => {
    const next = !settings.enabled;
    const updated = { ...settings, enabled: next };
    setSettings(updated);
    voiceAssistant.updateSettings(updated);
    if (!next) {
      voiceAssistant.stop();
    }
  };

  const handlePlaySummary = () => {
    if (!analysis) return;
    voiceAssistant.speak(analysis.weatherSummarySpeechText, `Daily Briefing • ${locationName}`, analysis.language);
  };

  const handlePlayRecommendations = () => {
    if (!analysis) return;
    voiceAssistant.speak(analysis.recommendationsSpeechText, 'Personalized Recommendations', analysis.language);
  };

  const handlePlayHydration = () => {
    if (!analysis) return;
    voiceAssistant.speak(analysis.hydrationPromptSpeechText, 'Hydration Check-in', analysis.language);
  };

  const handlePauseResume = () => {
    if (status === 'playing') {
      voiceAssistant.pause();
    } else if (status === 'paused') {
      voiceAssistant.resume();
    }
  };

  const handleStop = () => {
    voiceAssistant.stop();
  };

  const handleReplay = () => {
    voiceAssistant.replay();
  };

  const handleRateChange = (rate: number) => {
    const updated = { ...settings, speechRate: rate };
    setSettings(updated);
    voiceAssistant.updateSettings(updated);
  };

  if (!isSupported) {
    return null; // Gracefully degrade if browser has no SpeechSynthesis
  }

  const isSpeaking = status === 'playing';
  const isPaused = status === 'paused';

  return (
    <div
      id="voice-assistant-controller"
      className="w-full rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 p-4 sm:p-5 shadow-lg relative overflow-hidden transition-all"
    >
      {/* Background audio glow animation if playing */}
      {isSpeaking && (
        <div className="absolute inset-0 bg-sky-500/5 animate-pulse pointer-events-none" />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Left Side: Voice Assistant Status & Active Announcement */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              !settings.enabled
                ? 'bg-slate-800 text-slate-500 border border-slate-700'
                : isSpeaking
                ? 'bg-sky-500/20 text-sky-400 border border-sky-400/50 shadow-md shadow-sky-500/20 animate-pulse'
                : isPaused
                ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40'
                : 'bg-indigo-950 text-indigo-400 border border-indigo-800/60'
            }`}
          >
            {!settings.enabled ? (
              <VolumeX className="w-5 h-5" />
            ) : isSpeaking ? (
              <Radio className="w-5 h-5 text-sky-400" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                <span>Nimbus Voice Assistant</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                  TTS
                </span>
              </span>

              {/* Status Indicator Pill */}
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  !settings.enabled
                    ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                    : isSpeaking
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800 animate-pulse'
                    : isPaused
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isSpeaking && (
                  <span className="flex items-center gap-0.5 h-2">
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                  </span>
                )}
                <span>
                  {!settings.enabled
                    ? 'Muted'
                    : isSpeaking
                    ? 'Announcing'
                    : isPaused
                    ? 'Paused'
                    : 'Ready'}
                </span>
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {isSpeaking || isPaused
                ? currentLabel || 'Reading atmospheric report'
                : 'Listen to spoken weather summaries, recommendations, and hydration reminders.'}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Triggers & Audio Transport Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* Audio Transport Buttons (If Active or Paused) */}
          {(isSpeaking || isPaused) && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl p-1 shadow-inner">
              <button
                onClick={handlePauseResume}
                className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs transition-colors"
                title={isSpeaking ? 'Pause audio' : 'Resume audio'}
              >
                {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={handleStop}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 text-xs transition-colors"
                title="Stop audio"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={handleReplay}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 text-xs transition-colors"
                title="Replay from start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Speech Triggers */}
          <button
            id="voice-daily-briefing-btn"
            onClick={handlePlaySummary}
            disabled={!settings.enabled || !analysis}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              !settings.enabled || !analysis
                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20 active:scale-95'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Weather Briefing</span>
          </button>

          <button
            id="voice-recommendations-btn"
            onClick={handlePlayRecommendations}
            disabled={!settings.enabled || !analysis}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !settings.enabled || !analysis
                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 active:scale-95'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Advice</span>
          </button>

          {/* Settings & Toggle */}
          <button
            id="voice-settings-toggle-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl text-xs transition-colors border ${
              showSettings
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            }`}
            title="Voice Assistant Preferences"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            id="voice-enable-toggle-btn"
            onClick={handleToggleEnabled}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              settings.enabled
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800'
            }`}
          >
            {settings.enabled ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            <span className="hidden xs:inline">{settings.enabled ? 'Enabled' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Settings Drawer */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-fade-in">
          {/* Speech Speed */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Spoken Speed</label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[0.9, 1.0, 1.15].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                    settings.speechRate === rate
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Harmonic Audio Chime */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Pre-Speech Audio Chime</label>
            <button
              onClick={() => {
                const next = !settings.playChime;
                const updated = { ...settings, playChime: next };
                setSettings(updated);
                voiceAssistant.updateSettings(updated);
                if (next) voiceAssistant.playChime();
              }}
              className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition-colors ${
                settings.playChime
                  ? 'bg-slate-950 border-sky-800 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>Harmonic Chime</span>
              <span className={`w-3.5 h-3.5 rounded-full ${settings.playChime ? 'bg-sky-400' : 'bg-slate-700'}`} />
            </button>
          </div>

          {/* Test Voice Button */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-medium">Assistant Test</label>
            <button
              onClick={() =>
                voiceAssistant.speak(
                  `Hello! Nimbus Voice Assistant is active for ${locationName}. I am ready to announce weather updates and health recommendations.`,
                  'Voice Assistant Test'
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Preview Voice Sample</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
