'use client';

import React, { useState } from 'react';
import { Activity, ShieldCheck, Database, Info } from 'lucide-react';

export const PoolActivity: React.FC = () => {
  const [filterAsset, setFilterAsset] = useState<string>('ALL');

  return (
    <section id="pool-activity" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono font-semibold text-brand-coral shadow-sm">
              <Activity className="w-3.5 h-3.5" />
              <span>TREASURY AUDIT FEED</span>
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
              Recent Pool Activity & Payouts
            </h2>
            <p className="text-light-textSecondary dark:text-dark-textSecondary text-sm max-w-2xl">
              Public on-chain ledger feed of verifiable treasury rebalancing events and performance payouts.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm">
            {['ALL', 'BTC', 'ETH', 'SOL', 'USDT'].map((asset) => (
              <button
                key={asset}
                onClick={() => setFilterAsset(asset)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
                  filterAsset === asset
                    ? 'bg-brand-coral text-white font-bold shadow-sm'
                    : 'text-light-textSecondary dark:text-dark-textSecondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary'
                }`}
              >
                {asset}
              </button>
            ))}
          </div>
        </div>

        {/* Minimalist Rounded Activity Card: Honest Production Empty State */}
        <div className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card-light dark:shadow-card-dark p-8 sm:p-14 text-center transition-all duration-300">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-center text-light-textSecondary dark:text-dark-textSecondary mx-auto shadow-sm">
              <Database className="w-6 h-6 text-brand-coral" />
            </div>

            <h3 className="font-heading font-bold text-lg text-light-textPrimary dark:text-dark-textPrimary">
              No Public Pool Transactions Recorded
            </h3>

            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary leading-relaxed font-sans">
              Cryptiq does not display simulated or fabricated transactions. Real-time liquidity events, rebalancing telemetry, and periodic yield distributions will stream here live once platform custody operations are deployed.
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border text-[11px] font-mono text-light-textMuted dark:text-dark-textMuted">
              <ShieldCheck className="w-3.5 h-3.5 text-yield-emerald" />
              <span>Public Ledger Node: Awaiting Custody Deployment</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
