import React from 'react';
import { CloudLightning, ExternalLink, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="app-footer" className="w-full border-t border-slate-800/80 bg-slate-950 mt-16 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand & Author */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
                <CloudLightning className="w-5 h-5 text-sky-100" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-100 tracking-tight block">Nimbus Atmospheric Intelligence</span>
                <span className="text-[11px] text-sky-400 font-medium">Full-Stack Meteorological Platform</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Engineered as a full-stack weather intelligence platform combining Open-Meteo historical archives & predictive forecast APIs, geocoding resolution, Google Maps, YouTube multimedia streams, and Firebase Firestore persistence.
            </p>

            {/* Author Attribution Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-950 border border-sky-800/80 text-sky-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="text-slate-400">Created & Built by</div>
                <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                  <span className="text-sky-300">Ayoola Balogun</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium">
                    Technical Assessment
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* About PM Accelerator Blurb */}
          <div className="md:col-span-7 space-y-3 bg-slate-900/60 border border-slate-800/90 p-5 sm:p-6 rounded-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>About PM Accelerator</span>
              </h3>
              <a
                href="https://www.linkedin.com/school/pm-accelerator/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors py-1 self-start sm:self-auto"
              >
                <span>PM Accelerator on LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              PM Accelerator is the premier learning hub and career community dedicated to helping ambitious product leaders master real-world AI, technical strategy, and product execution. Through hands-on product builds, industry mentorship, and actionable coaching, PM Accelerator empowers engineers and product managers to transition into top-tier tech roles.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Product Leadership</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">AI Product Execution</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Career Mentorship</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 text-center sm:text-left">
          <div>
            &copy; {new Date().getFullYear()} Nimbus Atmospheric Intelligence. Meteorological datasets courtesy of Open-Meteo.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
            <span>React + TypeScript</span>
            <span className="text-slate-700">•</span>
            <span>Express.js API Engine</span>
            <span className="text-slate-700">•</span>
            <span>Cloud Firestore</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
