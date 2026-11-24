'use client';

import React from 'react';
import { 
  PieChart, 
  Layers, 
  Calendar, 
  Info, 
  ArrowRight, 
  ShieldCheck,
  Building
} from 'lucide-react';

interface InvestmentOverviewCardProps {
  onExplorePools?: () => void;
}

export const InvestmentOverviewCard: React.FC<InvestmentOverviewCardProps> = ({ onExplorePools }) => {
  // Authoritative target architecture: 40/25/15/15/5 allocation approved in specifications
  const portfolioWeights = [
    { asset: 'BTC', label: 'Bitcoin Vault', percent: 40, color: 'bg-[#FF512F]' },
    { asset: 'ETH', label: 'Ethereum Layer 1', percent: 25, color: 'bg-[#627EEA]' },
    { asset: 'SOL', label: 'Solana High-Throughput', percent: 15, color: 'bg-[#14F195]' },
    { asset: 'USDT', label: 'Tether Cash Reserve', percent: 15, color: 'bg-[#26A17B]' },
    { asset: 'USD', label: 'Operational Clearing', percent: 5, color: 'bg-[#64748B]' },
  ];

  return (
    <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#141518] dark:text-white uppercase tracking-wider">
              Investment Allocation
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
              Platform Target Strategy
            </span>
          </div>

          <span className="text-[11px] font-mono text-[#64748B]">
            Cycle: Weekly
          </span>
        </div>

        {/* User Allocation Summary */}
        <div className="my-3 p-4 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
            <span>Your Active Units</span>
            <span className="font-mono font-bold text-[#141518] dark:text-white">
              — UNITS
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Subscription Value</span>
            <span className="font-mono font-bold text-[#141518] dark:text-white">
              — USD
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-[#64748B] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#FF512F] shrink-0" />
            User subledger sync pending • Subscriptions settle on weekly NAV cycle cut-off.
          </div>
        </div>

        {/* Target Asset Allocation (40/25/15/15/5 Architecture) */}
        <div className="my-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-[#141518] dark:text-white mb-2 gap-1">
            <span>Platform Target Allocation (Fund Strategy Model)</span>
            <span className="text-[10px] font-mono font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full self-start sm:self-auto">
              Vehicle Target • Not Personal Portfolio
            </span>
          </div>

          {/* Progress Multi-Bar */}
          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-3">
            {portfolioWeights.map((w) => (
              <div
                key={w.asset}
                style={{ width: `${w.percent}%` }}
                className={`${w.color} h-full transition-all duration-300`}
                title={`${w.asset}: ${w.percent}%`}
              />
            ))}
          </div>

          {/* Allocation Breakdown List */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {portfolioWeights.map((w) => (
              <div key={w.asset} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${w.color}`} />
                  <span className="font-medium text-[#141518] dark:text-white">
                    {w.asset}
                  </span>
                </div>
                <span className="font-mono text-[#64748B] font-semibold">
                  {w.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between text-[11px] text-[#64748B]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Segregated Vehicle Custody
        </span>
        <button
          onClick={onExplorePools}
          className="text-[#FF512F] hover:underline font-semibold flex items-center gap-1 focus:outline-none"
        >
          Program Specs
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
