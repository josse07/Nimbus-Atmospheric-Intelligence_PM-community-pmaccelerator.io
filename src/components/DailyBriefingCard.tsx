import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  Bell,
  Clock,
  Droplets,
  Sun,
  Umbrella,
  Flame,
  CloudLightning,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Globe2,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { DailyWeatherBriefing, GeocodeResult, AppLanguage } from '../types';
import { dailyBriefingManager, isNigeriaLocation, DailyBriefingSettings } from '../lib/dailyBriefingManager';
import { voiceAssistant } from '../lib/voiceAssistant';
import { habitReminderManager } from '../lib/habitReminderManager';

interface DailyBriefingCardProps {
  location: GeocodeResult;
  onOpenSettings: () => void;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  location,
  onOpenSettings,
}) => {
  const [briefing, setBriefing] = useState<DailyWeatherBriefing | null>(null);
  const [settings, setSettings] = useState<DailyBriefingSettings>(dailyBriefingManager.getSettings());
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const unsubBriefing = dailyBriefingManager.subscribe((b, s) => {
      setBriefing(b);
      setSettings(s);
    });

    const unsubVoice = voiceAssistant.subscribe((v) => {
      setIsSpeaking(v.status === 'playing' && v.currentLabel?.includes('Briefing'));
    });

    return () => {
      unsubBriefing();
      unsubVoice();
    };
  }, []);

  if (!briefing) return null;

  const isNigeria = isNigeriaLocation(location);

  const handlePlayVoiceBriefing = () => {
    voiceAssistant.speak(briefing.speechText, `Daily Weather Briefing • ${location.name}`, briefing.language);
    habitReminderManager.markHabitCompleted('weatherChecked');
  };

  const handleLanguageSwitch = (newLang: AppLanguage) => {
    if (newLang === 'pcm' && !isNigeria) return;
    dailyBriefingManager.updateSettings({ language: newLang }, location);
  };

  return (
    <section id="daily-weather-briefing-card" className="w-full">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950/25 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-950/40 relative overflow-hidden transition-all">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/3 w-96 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 relative z-10">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/60 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Daily Weather Briefing
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-medium">{briefing.dateStr}</span>

              {/* Geographical Tag */}
              {isNigeria && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                  <span>🇳🇬</span>
                  <span>Nigeria</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">
              {briefing.greeting}
            </h2>
          </div>

          {/* Quick Actions & Language Switcher */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Language Switcher Button (Strictly Nigeria Eligible for Pidgin) */}
            {isNigeria ? (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                <button
                  onClick={() => handleLanguageSwitch('en')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    briefing.language === 'en'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="English (Simple AI)"
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageSwitch('pcm')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                    briefing.language === 'pcm'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Nigerian Pidgin English"
                >
                  <span>🇳🇬</span>
                  <span>Pidgin</span>
                </button>
              </div>
            ) : (
              <div
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400"
                title="Nigerian Pidgin is exclusive to users in Nigeria"
              >
                <Globe2 className="w-3.5 h-3.5 text-slate-500" />
                <span>English (Standard)</span>
              </div>
            )}

            {/* Read Aloud Button */}
            <button
              id="listen-daily-briefing-btn"
              onClick={handlePlayVoiceBriefing}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                isSpeaking
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/60 animate-pulse'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
              }`}
              title="Listen to daily weather briefing via Voice Assistant"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'Playing...' : 'Listen'}</span>
            </button>

            {/* Configure Briefing Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="Configure daily briefing schedule & alerts"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Severe Alert Banner if Triggered */}
        {briefing.severeAlert && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 flex items-start gap-3 relative z-10 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="font-bold text-rose-100">Weather Advisory: </strong>
              <span>{briefing.severeAlert}</span>
            </div>
          </div>
        )}

        {/* Middle Breakdown: Forecast snapshot + Actionable Prep Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-5 relative z-10">
          {/* Left Column: Forecast Breakdown */}
          <div className="md:col-span-5 space-y-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Expected Weather</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60">
                  {briefing.headline}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
                    {briefing.temperatureText}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Feels like <strong className="text-slate-200">{briefing.apparentTempText}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-sky-400 flex items-center justify-end gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <span>{briefing.rainProbabilityText} rain</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {briefing.highLowText}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Schedule Status */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-sky-400" />
                <span>
                  {settings.enabled
                    ? `Briefing scheduled daily at ${settings.preferredTime}`
                    : 'Daily briefing notifications paused'}
                </span>
              </span>
              <button
                onClick={onOpenSettings}
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                Change time
              </button>
            </div>
          </div>

          {/* Right Column: Actionable Recommendations Checklist */}
          <div className="md:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>What to Prepare Today</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {briefing.language === 'pcm' ? 'Simple Naija Advice' : 'Actionable Guidelines'}
              </span>
            </div>

            <div className="space-y-2">
              {briefing.recommendations.map((action, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs text-slate-200 flex items-start gap-2.5 hover:border-slate-700 transition-colors"
                >
                  <span className="w-5 h-5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/60 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-medium">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
