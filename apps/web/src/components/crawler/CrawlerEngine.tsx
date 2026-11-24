'use client';

import React from 'react';
import { useCrawlerEngine } from './useCrawlerEngine';
import { Play, Pause, Activity, Zap, Eye, ShieldCheck } from 'lucide-react';

export const CrawlerEngine: React.FC = () => {
  const { canvasRef, snapshot, isPaused, reducedMotion, togglePause, toggleReducedMotion } =
    useCrawlerEngine();

  return (
    <>
      {/* Viewport Overlay Canvas with pointer-events: none */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-20"
        aria-hidden="true"
      />

      {/* Floating Algorithmic Crawler HUD Telemetry Pill (Interactive) */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:flex items-center gap-3 bg-surface/90 backdrop-blur-md border border-border px-3.5 py-2 rounded-full shadow-glow-cyan text-xs font-mono text-text-secondary select-none">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                snapshot.status === 'SCANNING_LOCK' ? 'bg-neon-magenta' : 'bg-electric-cyan'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                snapshot.status === 'SCANNING_LOCK' ? 'bg-neon-magenta' : 'bg-electric-cyan'
              }`}
            />
          </span>
          <span className="text-text-primary font-semibold tracking-wider">CRAWLER.OS</span>
        </div>

        <div className="h-3.5 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">STATE:</span>
          <span
            className={`font-semibold ${
              snapshot.status === 'SCANNING_LOCK'
                ? 'text-neon-magenta animate-pulse'
                : 'text-electric-cyan'
            }`}
          >
            {snapshot.status}
          </span>
        </div>

        {snapshot.targetId && (
          <>
            <div className="h-3.5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber" />
              <span className="text-amber truncate max-w-[100px]">
                {snapshot.targetId.toUpperCase()}
              </span>
            </div>
          </>
        )}

        <div className="h-3.5 w-px bg-border" />

        {/* Crawler Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePause}
            aria-label={isPaused ? 'Resume procedural crawler' : 'Pause procedural crawler'}
            title={isPaused ? 'Resume Crawler' : 'Pause Crawler'}
            className="p-1 hover:text-text-primary text-text-muted transition-colors rounded hover:bg-surface-elevated cursor-pointer"
          >
            {isPaused ? <Play className="w-3 h-3 text-amber" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={toggleReducedMotion}
            aria-label="Toggle reduced animation mode"
            title={reducedMotion ? 'Standard Motion' : 'Reduced Motion'}
            className={`p-1 transition-colors rounded hover:bg-surface-elevated cursor-pointer ${
              reducedMotion ? 'text-amber' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Activity className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
};
