'use client';

import React from 'react';
import { Wallet, ShieldAlert, Lock, Info } from 'lucide-react';

export const PortfolioCard: React.FC = () => {
  return (
    <div className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-7 shadow-card-light dark:shadow-card-dark transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[340px]">
      {/* Subtle ambient sheen */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-coral-glow pointer-events-none opacity-20" />

      <div>
        {/* Header Row: Label & Status Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-center text-light-textSecondary dark:text-dark-textSecondary">
              <Wallet className="w-4 h-4 text-brand-coral" />
            </div>
            <div>
              <span className="text-xs font-bold text-light-textPrimary dark:text-dark-textPrimary block">
                Portfolio Holdings
              </span>
              <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted">
                ACCOUNT STATUS
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary">
            <Lock className="w-3 h-3 text-light-textMuted dark:text-dark-textMuted" />
            <span>Unauthenticated</span>
          </div>
        </div>

        {/* Primary Portfolio State: Honest Unavailable Notice */}
        <div className="my-6 p-5 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-light-textSecondary dark:text-dark-textSecondary">
            <Info className="w-4 h-4 text-brand-coral flex-shrink-0" />
            <span>Portfolio data not available yet</span>
          </div>
          <p className="text-xs text-light-textMuted dark:text-dark-textMuted leading-relaxed pl-6">
            User account authentication and custodial wallet balances will be introduced in a future development milestone. Verified portfolio data will be rendered here once an authenticated account is connected.
          </p>
        </div>

        {/* Asset Allocation: Honest Unavailable State */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-light-textSecondary dark:text-dark-textSecondary">
            <span>Pool Allocation</span>
            <span className="font-mono text-[10px] text-light-textMuted dark:text-dark-textMuted">
              No portfolio data available
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-light-border dark:bg-dark-border opacity-50" />
          <div className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted pt-1">
            Asset distribution metrics require an active authenticated portfolio.
          </div>
        </div>
      </div>

      {/* Footer Info Notice */}
      <div className="pt-4 border-t border-light-border dark:border-dark-border flex items-center gap-2 text-[11px] font-mono text-light-textMuted dark:text-dark-textMuted">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span>Cryptiq does not display unverified or simulated financial balances.</span>
      </div>
    </div>
  );
};
