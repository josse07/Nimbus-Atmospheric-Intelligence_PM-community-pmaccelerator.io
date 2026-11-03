import React, { useState } from 'react';
import {
  Flame,
  Sun,
  Umbrella,
  ThermometerSnowflake,
  CloudLightning,
  Droplets,
  Wind,
  Sparkles,
  ShieldAlert,
  GlassWater,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { RecommendationAnalysis, SmartRecommendation } from '../lib/recommendationEngine';
import { voiceAssistant } from '../lib/voiceAssistant';
import { habitReminderManager } from '../lib/habitReminderManager';

interface SmartRecommendationsCardProps {
  analysis: RecommendationAnalysis;
  onOpenHydrationModal?: () => void;
  onLogDrink?: (amountMl: number) => void;
}

export const SmartRecommendationsCard: React.FC<SmartRecommendationsCardProps> = ({
  analysis,
  onOpenHydrationModal,
  onLogDrink,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [completedRecs, setCompletedRecs] = useState<Record<string, boolean>>({});

  const {
    recommendations,
    heatAlertLevel,
    heatAdvisoryText,
    recommendedHydrationIntervalMinutes,
    recommendationsSpeechText,
  } = analysis;

  const toggleCompleted = (id: string) => {
    setCompletedRecs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    habitReminderManager.markHabitCompleted('recommendationsViewed');
  };

  const handlePlayAudioRecommendations = () => {
    voiceAssistant.speak(recommendationsSpeechText, 'Personalized Recommendations', analysis.language);
    habitReminderManager.markHabitCompleted('recommendationsViewed');
  };

  const categories = [
    { id: 'all', label: 'All Advice', count: recommendations.length },
    { id: 'heat_cold', label: 'Thermal & UV', count: recommendations.filter((r) => ['heat', 'cold', 'uv'].includes(r.category)).length },
    { id: 'weather_gear', label: 'Attire & Gear', count: recommendations.filter((r) => ['rain', 'storm', 'wind'].includes(r.category)).length },
    { id: 'wellness', label: 'Hydration & Comfort', count: recommendations.filter((r) => ['hydration', 'humidity', 'comfort'].includes(r.category)).length },
  ];

  const filteredRecommendations = recommendations.filter((rec) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'heat_cold') return ['heat', 'cold', 'uv'].includes(rec.category);
    if (selectedCategory === 'weather_gear') return ['rain', 'storm', 'wind'].includes(rec.category);
    if (selectedCategory === 'wellness') return ['hydration', 'humidity', 'comfort'].includes(rec.category);
    return true;
  });

  const renderIcon = (iconName: SmartRecommendation['iconName'], className: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className={className} />;
      case 'Sun':
        return <Sun className={className} />;
      case 'Umbrella':
        return <Umbrella className={className} />;
      case 'ThermometerSnowflake':
        return <ThermometerSnowflake className={className} />;
      case 'CloudLightning':
        return <CloudLightning className={className} />;
      case 'Droplets':
        return <Droplets className={className} />;
      case 'Wind':
        return <Wind className={className} />;
      case 'GlassWater':
        return <GlassWater className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'ShieldAlert':
      default:
        return <ShieldAlert className={className} />;
    }
  };

  const getSeverityStyles = (severity: SmartRecommendation['severity']) => {
    switch (severity) {
      case 'alert':
        return {
          cardBg: 'bg-rose-950/30 border-rose-800/60 hover:border-rose-700',
          iconBg: 'bg-rose-900/60 text-rose-300 border border-rose-700/60',
          badgeBg: 'bg-rose-900/80 text-rose-200 border-rose-700',
        };
      case 'warning':
        return {
          cardBg: 'bg-amber-950/20 border-amber-800/50 hover:border-amber-700',
          iconBg: 'bg-amber-900/50 text-amber-300 border border-amber-700/50',
          badgeBg: 'bg-amber-900/70 text-amber-200 border-amber-700',
        };
      case 'tip':
        return {
          cardBg: 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700',
          iconBg: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
          badgeBg: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
        };
      case 'info':
      default:
        return {
          cardBg: 'bg-slate-900/70 border-slate-800 hover:border-slate-700',
          iconBg: 'bg-sky-950 text-sky-300 border border-sky-800/60',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  return (
    <section id="smart-recommendations-section" className="w-full space-y-4">
      {/* Heat Alert Banner if active */}
      {heatAdvisoryText && (
        <div
          id="heat-alert-banner"
          className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg border transition-all ${
            heatAlertLevel === 'extreme'
              ? 'bg-gradient-to-r from-rose-950/90 to-amber-950/80 border-rose-700/80 text-rose-100 shadow-rose-950/40'
              : 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-700/60 text-amber-100 shadow-amber-950/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-900/60 text-rose-300 shrink-0 mt-0.5">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-900/90 text-rose-200 border border-rose-700">
                  {heatAlertLevel === 'extreme' ? 'Extreme Heat Advisory' : 'Heat Warning'}
                </span>
                <span className="text-xs text-amber-200/80">Adaptive Hydration Triggered</span>
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 text-slate-100">
                {heatAdvisoryText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onOpenHydrationModal && (
              <button
                onClick={onOpenHydrationModal}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/30"
              >
                <GlassWater className="w-3.5 h-3.5" />
                <span>Hydration Reminders ({recommendedHydrationIntervalMinutes}m)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Recommendations Container */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-950/40 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-40 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/60">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
                Smart Weather Recommendations
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Proactive guidance adapted to current temperature, rain likelihood, UV index, and atmospheric humidity.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="voice-read-recommendations-btn"
              onClick={handlePlayAudioRecommendations}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-sky-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm group"
              title="Listen to verbal recommendations via Voice Assistant"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Read Aloud</span>
            </button>
          </div>
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-4 pb-2 relative z-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.id ? 'bg-sky-800 text-sky-100' : 'bg-slate-900 text-slate-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-3 relative z-10">
          {filteredRecommendations.map((rec) => {
            const styles = getSeverityStyles(rec.severity);
            const isDone = completedRecs[rec.id];

            return (
              <div
                key={rec.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  styles.cardBg
                } ${isDone ? 'opacity-50 grayscale-[40%]' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl shrink-0 ${styles.iconBg}`}>
                        {renderIcon(rec.iconName, 'w-4 h-4')}
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${styles.badgeBg}`}>
                        {rec.badge}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleCompleted(rec.id)}
                      title={isDone ? 'Mark as active' : 'Mark completed'}
                      className={`p-1 rounded-md text-xs transition-colors ${
                        isDone ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className={`text-sm font-bold text-slate-100 mb-1 ${isDone ? 'line-through text-slate-400' : ''}`}>
                    {rec.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {rec.description}
                  </p>
                </div>

                {/* Card Action footer if applicable */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  {rec.category === 'hydration' ? (
                    <button
                      onClick={() => onLogDrink ? onLogDrink(250) : onOpenHydrationModal?.()}
                      className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <GlassWater className="w-3.5 h-3.5" />
                      <span>Log 250ml Water</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3 text-slate-500" />
                      <span>Actionable Advisory</span>
                    </span>
                  )}

                  <button
                    onClick={() => voiceAssistant.speak(`${rec.title}. ${rec.description}`, rec.title, analysis.language)}
                    className="p-1 text-slate-400 hover:text-sky-300 transition-colors"
                    title="Speak this tip"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
