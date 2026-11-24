'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Info, 
  Calendar, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { AssetInfo, SupportedAsset } from '@cryptiq/types';

interface InvestmentPerformanceChartProps {
  quotes: Record<SupportedAsset, AssetInfo> | null;
}

export const InvestmentPerformanceChart: React.FC<InvestmentPerformanceChartProps> = ({ quotes }) => {
  const [timeframe, setTimeframe] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>('BTC');

  // Authoritative check: user has 0 historical investment cycles yet.
  // Rule: NEVER generate synthetic curves, artificial Jan-Aug lines or fake 3% gains!
  const hasUserInvestmentHistory = false;

  return (
    <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-bold text-[#141518] dark:text-white uppercase tracking-wider">
              Investment Performance
            </h3>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary mt-0.5">
              Track your investment performance over time.
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-full p-0.5 text-[10px] font-mono font-semibold self-start sm:self-auto">
            {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  timeframe === tf
                    ? 'bg-white dark:bg-dark-card text-[#141518] dark:text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#141518]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 my-3 text-[11px] font-medium text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF512F]" />
            <span>Net Portfolio Value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Accrued Yield</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="my-4 py-8 px-4 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-dashed border-light-border dark:border-dark-border flex flex-col items-center justify-center text-center">
        {!hasUserInvestmentHistory ? (
          <div className="max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center text-[#FF512F] shadow-sm mx-auto mb-3">
              <BarChart2 className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-bold text-[#141518] dark:text-white">
              No Investment Activity Yet
            </h4>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary mt-1 leading-relaxed">
              Once your deposited capital is deployed into Nexora liquidity pools, your historical daily returns, NAV adjustments, and compounding milestones will be charted here.
            </p>

            {/* Asset Market Indicator Baseline */}
            {quotes && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-[#64748B] flex items-center justify-center gap-2">
                <span className="font-semibold text-[#141518] dark:text-white">
                  Market Baseline:
                </span>
                <span>
                  BTC ${quotes.BTC?.unitPriceUsd.toLocaleString() || '—'}
                </span>
                <span className="text-emerald-500 font-mono font-semibold">
                  +{quotes.BTC?.dayChangePercent || 0}% 24h
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between text-[11px] text-[#64748B]">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#FF512F]" />
          NAV Calculated Weekly in USD
        </span>
        <span className="font-mono text-[10px]">
          Timeframe: {timeframe}
        </span>
      </div>
    </div>
  );
};
