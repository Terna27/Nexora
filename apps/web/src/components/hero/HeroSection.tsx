'use client';

import React from 'react';
import { ArrowUpRight, Terminal, Cpu, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            {/* Technical Node Badge */}
            <div
              data-crawl-target="hero-node-badge"
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface border border-electric-cyan/30 text-electric-cyan text-xs font-mono tracking-wider shadow-glow-cyan"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-cyan opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-cyan" />
              </span>
              <span>CRYPTIQ PROTOCOL // v1.0.4 ONLINE</span>
              <span className="text-text-muted">|</span>
              <span className="text-text-secondary text-[11px]">AUDITED CUSTODY PIPELINE</span>
            </div>

            {/* Kinetic / High-Contrast Technical Headline */}
            <h1
              data-crawl-target="hero-headline"
              className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-text-primary leading-[1.08]"
            >
              ALGORITHMIC LIQUIDITY.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan via-white to-electric-blue">
                BUILT FOR THE DIGITAL ASSET ERA.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-text-secondary text-base sm:text-lg max-w-2xl font-sans leading-relaxed">
              Explore Cryptiq&apos;s digital asset investment platform, portfolio intelligence and algorithmic trading
              infrastructure designed for institutional performance and crystalline auditability.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#calculator"
                data-crawl-target="hero-cta-launch"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-electric-cyan text-background font-mono text-xs sm:text-sm font-bold tracking-wider hover:bg-white transition-all shadow-glow-cyan cursor-pointer"
              >
                <span>LAUNCH APP</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-surface hover:bg-surface-elevated text-text-primary font-mono text-xs sm:text-sm tracking-wider border border-border hover:border-border-light transition-all cursor-pointer"
              >
                <span>EXPLORE PLATFORM</span>
                <Terminal className="w-4 h-4 text-electric-cyan" />
              </a>
            </div>

            {/* Prominent Mandatory Risk Notice */}
            <div className="pt-4 flex items-start gap-2.5 text-xs text-text-muted font-mono leading-relaxed max-w-xl">
              <ShieldAlert className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
              <span>
                Important Disclosure: Cryptocurrency investments are speculative, highly volatile, and carry substantial
                risk of loss. Returns are never guaranteed and capital is at risk.
              </span>
            </div>
          </div>

          {/* Right Column: Advanced Algorithmic Terminal HUD */}
          <div className="lg:col-span-5 w-full">
            <div
              data-crawl-target="hero-terminal"
              className="relative rounded-2xl bg-surface/90 border border-border p-6 shadow-2xl backdrop-blur-xl overflow-hidden"
            >
              {/* Terminal Frame Top Bar */}
              <div className="flex items-center justify-between border-b border-border pb-3.5 mb-5 font-mono text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-crimsonAlert/80" />
                  <span className="w-3 h-3 rounded-full bg-amber/80" />
                  <span className="w-3 h-3 rounded-full bg-emeraldSuccess/80" />
                  <span className="ml-2 text-text-primary font-medium">CRYPTIQ_CORE // TELEMETRY</span>
                </div>
                <div className="flex items-center gap-1.5 text-electric-cyan text-[11px]">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>0.4ms P99</span>
                </div>
              </div>

              {/* Terminal Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-5 font-mono">
                <div className="p-3.5 rounded-lg bg-background/60 border border-border">
                  <div className="text-[10px] text-text-muted tracking-wider">EXECUTION LATENCY</div>
                  <div className="text-xl font-bold text-electric-cyan mt-1">1.24 ms</div>
                  <div className="text-[9px] text-emeraldSuccess mt-0.5">OPTIMAL DIRECT DMA</div>
                </div>

                <div className="p-3.5 rounded-lg bg-background/60 border border-border">
                  <div className="text-[10px] text-text-muted tracking-wider">ACTIVE STRATEGIES</div>
                  <div className="text-xl font-bold text-text-primary mt-1">16 VAULTS</div>
                  <div className="text-[9px] text-electric-blue mt-0.5">MULTI-VENUE ARBITRAGE</div>
                </div>

                <div className="p-3.5 rounded-lg bg-background/60 border border-border">
                  <div className="text-[10px] text-text-muted tracking-wider">PROOF PROTOCOL</div>
                  <div className="text-sm font-bold text-neon-magenta mt-1">MERKLE-ZK v3</div>
                  <div className="text-[9px] text-text-muted mt-0.5">100% AUDITABLE</div>
                </div>

                <div className="p-3.5 rounded-lg bg-background/60 border border-border">
                  <div className="text-[10px] text-text-muted tracking-wider">CUSTODY HEALTH</div>
                  <div className="text-sm font-bold text-emeraldSuccess mt-1">ISOLATED COLD</div>
                  <div className="text-[9px] text-text-muted mt-0.5">MPC MULTI-PARTY</div>
                </div>
              </div>

              {/* Streaming Synthetic Log HUD */}
              <div className="rounded-lg bg-background/80 border border-border/80 p-3 font-mono text-[11px] space-y-1.5 text-text-secondary">
                <div className="flex items-center justify-between text-text-muted text-[10px] border-b border-border/50 pb-1">
                  <span>SYSTEM LOG (SYNTHETIC FEED)</span>
                  <span className="text-amber">SIMULATED DATA</span>
                </div>
                <div className="text-emeraldSuccess/90 flex items-center justify-between">
                  <span>[SYNC] BTC-USDT Depth Book re-indexed</span>
                  <span className="text-text-muted text-[9px]">10:18:21</span>
                </div>
                <div className="text-electric-cyan/90 flex items-center justify-between">
                  <span>[ORACLE] SOL TWAP feed confirmed (0.01s)</span>
                  <span className="text-text-muted text-[9px]">10:18:20</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between">
                  <span>[MERKLE] Epoch #21849103 Root verified</span>
                  <span className="text-text-muted text-[9px]">10:18:18</span>
                </div>
              </div>

              {/* Decorative Corner Scanner Elements */}
              <div className="absolute bottom-1 right-2 text-[9px] font-mono text-text-muted/40 pointer-events-none">
                HUD_LOC: [34.12, -118.49]
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
