import React, { useState } from 'react';
import {
  X,
  Smartphone,
  CheckCircle2,
  Share,
  PlusSquare,
  Sparkles,
  Flame,
  Droplets,
  Sun,
  ShieldCheck,
  ChevronRight,
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { widgetManager, WidgetSettings, WidgetPermissionState } from '../lib/widgetManager';
import { WeatherData, GeocodeResult } from '../types';

interface HomeScreenWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherData | null;
  location?: GeocodeResult | null;
}

export const HomeScreenWidgetModal: React.FC<HomeScreenWidgetModalProps> = ({
  isOpen,
  onClose,
  weather,
  location,
}) => {
  const [settings, setSettings] = useState<WidgetSettings>(widgetManager.getSettings());
  const [step, setStep] = useState<'permission' | 'instructions' | 'denied_acknowledged'>('permission');
  const [platform] = useState<'ios' | 'android' | 'desktop'>(() => widgetManager.getDevicePlatform());

  if (!isOpen) return null;

  const handleGrantPermission = async () => {
    const { nativePromptTriggered } = await widgetManager.grantPermission();
    setSettings(widgetManager.getSettings());
    if (nativePromptTriggered) {
      onClose();
    } else {
      setStep('instructions');
    }
  };

  const handleDenyPermission = () => {
    widgetManager.denyPermission();
    setSettings(widgetManager.getSettings());
    setStep('denied_acknowledged');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Smartphone className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                Home Screen Widget
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                  Mobile Companion
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Live weather glances, hydration nudges & streaks on your phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {step === 'permission' && (
            <>
              {/* Purpose & Explanation */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Why Add the Widget?</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Pinning the Nimbus Habit & Weather Widget onto your phone&apos;s home screen allows you to
                  view your local temperature, rain risk, hydration streak, and daily readiness recommendations
                  without needing to open the app or browser.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-300 font-medium">Instant Weather</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-slate-300 font-medium">Hydration Nudges</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-slate-300 font-medium">Streak Buddy</span>
                  </div>
                </div>
              </div>

              {/* Widget Mockup */}
              <div className="relative mx-auto max-w-xs p-4 rounded-3xl bg-gradient-to-b from-sky-900/60 via-slate-900 to-indigo-950/80 border-2 border-sky-500/30 shadow-xl shadow-sky-500/10 text-center space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                    <span>Streak 1</span>
                  </div>
                  <span className="text-[11px] text-sky-300 font-medium">
                    {location?.name || 'Local Weather'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3 py-1">
                  <div className="text-3xl font-extrabold text-slate-50 tracking-tight">
                    {weather?.current?.temperature ?? 22}°C
                  </div>
                  <div className="text-left text-xs">
                    <p className="font-semibold text-slate-200">
                      {weather?.current?.condition || 'Partly Cloudy'}
                    </p>
                    <p className="text-slate-400 text-[11px]">UV {weather?.current?.uvIndex ?? 2} • 💧 Drink Water</p>
                  </div>
                </div>

                <div className="py-1.5 px-3 rounded-xl bg-sky-500/20 border border-sky-500/30 text-[11px] font-semibold text-sky-200 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
                  <span>Carry flask • High humidity today</span>
                </div>
              </div>

              {/* Explicit Permission Request Question */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p>
                  We request your permission to configure and guide the addition of the Nimbus Companion Widget
                  to your mobile home screen. You can revoke this anytime.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleGrantPermission}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Allow & Add to Home Screen</span>
                </button>
                <button
                  type="button"
                  onClick={handleDenyPermission}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-colors"
                >
                  Keep in App Only
                </button>
              </div>
            </>
          )}

          {step === 'instructions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Permission granted! Follow the simple steps below for your phone:</span>
              </div>

              {platform === 'ios' ? (
                /* iOS Safari instructions */
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 text-xs sm:text-sm">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Share className="w-4 h-4 text-sky-400" />
                    <span>Adding on iPhone or iPad (Safari)</span>
                  </h4>

                  <ol className="space-y-3 text-slate-300">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs">
                        1
                      </span>
                      <div>
                        Tap the <strong>Share</strong> button at the bottom of your Safari screen (the square with an arrow pointing up <Share className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" />).
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs">
                        2
                      </span>
                      <div>
                        Scroll down the menu and tap <strong>&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" />).
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs">
                        3
                      </span>
                      <div>
                        Tap <strong>&quot;Add&quot;</strong> in the top-right corner. The Nimbus widget icon is now on your home screen!
                      </div>
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android Chrome instructions */
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 text-xs sm:text-sm">
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-sky-400" />
                    <span>Adding on Android (Chrome)</span>
                  </h4>

                  <ol className="space-y-3 text-slate-300">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs">
                        1
                      </span>
                      <div>
                        Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of Google Chrome.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs">
                        2
                      </span>
                      <div>
                        Tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install App&quot;</strong>.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs">
                        3
                      </span>
                      <div>
                        Confirm by tapping <strong>&quot;Add&quot;</strong>. Place the widget anywhere on your home screen!
                      </div>
                    </li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                Got It! Done
              </button>
            </div>
          )}

          {step === 'denied_acknowledged' && (
            <div className="space-y-4 text-center py-2">
              <div className="h-12 w-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <Check className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base">Preference Saved</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  The widget will remain active exclusively inside the app. You can grant home screen permission at any time in Assistant &amp; Alert Settings.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
