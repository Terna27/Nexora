'use client';

import React from 'react';
import { Flame, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';

export const YieldHighlightCard: React.FC = () => {
  return (
    <div className="rounded-3xl bg-brand-gradient p-6 sm:p-7 text-white shadow-coral-card transition-all duration-300 flex flex-col justify-between relative overflow-hidden min-h-[340px]">
      {/* Background ambient accents */}
      <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-mono text-xs tracking-wider font-semibold">
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>3% Daily — Hypothetical Scenario</span>
          </div>

          <span className="text-[10px] font-mono uppercase tracking-widest text-white/80 font-bold bg-black/20 px-2.5 py-1 rounded-full">
            Hypothetical Model
          </span>
        </div>

        {/* Big ROI Scenario Feature */}
        <div className="my-3">
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            3.00%
            <span className="text-lg sm:text-xl font-medium text-white/85 ml-2">Daily ROI</span>
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-white/80 mt-1">
            Hypothetical Mathematical Modeling Scenario
          </div>
        </div>

        {/* Model Specifications & Honest Status */}
        <div className="mt-5 space-y-2.5 bg-black/15 p-4 rounded-2xl backdrop-blur-sm border border-white/10 text-xs font-mono">
          <div className="flex items-center justify-between text-white/90">
            <span>MODEL PARAMETER:</span>
            <span className="font-bold text-white">0.03 / 24-HOUR CYCLE</span>
          </div>
          <div className="flex items-center justify-between text-white/90">
            <span>CALCULATION TYPE:</span>
            <span className="font-bold text-white">NON-COMPOUNDED LINEAR</span>
          </div>
          <div className="flex items-center justify-between text-white/90">
            <span>DEVELOPMENT STATUS:</span>
            <span className="font-bold text-white">INFRASTRUCTURE PHASE</span>
          </div>
        </div>
      </div>

      {/* Prominent Risk Notice */}
      <div className="mt-5 pt-3 border-t border-white/20 flex items-start gap-2 text-[11px] text-white/80 leading-relaxed font-sans">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-white" />
        <span>
          Important: The 3.00% figure represents a hypothetical mathematical scenario for modeling purposes. It does not represent an actual, historical, or achievable investment return.
        </span>
      </div>
    </div>
  );
};
