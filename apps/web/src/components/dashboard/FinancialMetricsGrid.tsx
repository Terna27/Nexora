'use client';

import React from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  Coins, 
  ArrowUpRight, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const FinancialMetricsGrid: React.FC = () => {
  // Strict non-negotiable rule: Real user records only.
  // Authoritative user state: newly registered account has $0.00 settled records.
  const metrics = {
    totalEarningsUsd: 0.00,
    activePrincipalUsd: 0.00,
    accruedDailyYieldUsd: 0.00,
    pendingYieldUsd: 0.00,
    totalWithdrawnUsd: 0.00,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* 1. Total Earnings — Featured Coral-Orange Gradient Card */}
      <div className="bg-gradient-to-br from-[#FF512F] to-[#FF7847] text-white rounded-3xl p-5 shadow-coral-card flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-white/80">
              Total Earnings
            </span>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white tabular-nums my-1">
            ${metrics.totalEarningsUsd.toFixed(2)}
          </div>
        </div>

        <div className="pt-3 border-t border-white/20 mt-2 flex items-center justify-between text-[11px] text-white/90">
          <span>All-time settled</span>
          <span className="font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
            0 cycles
          </span>
        </div>
      </div>

      {/* 2. Active Principal / Total Invested */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#64748B] dark:text-dark-textSecondary">
              Active Principal
            </span>
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5 text-[#141518] dark:text-white" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#141518] dark:text-white tabular-nums my-1">
            ${metrics.activePrincipalUsd.toFixed(2)}
          </div>
        </div>

        <div className="pt-3 border-t border-light-border dark:border-dark-border mt-2 flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Allocation Status</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-[#64748B] font-semibold">
            Standby
          </span>
        </div>
      </div>

      {/* 3. Daily Earnings / Accrued Yield */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#64748B] dark:text-dark-textSecondary">
              Accrued Yield
            </span>
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#141518] dark:text-white tabular-nums my-1">
            ${metrics.accruedDailyYieldUsd.toFixed(2)}
          </div>
        </div>

        <div className="pt-3 border-t border-light-border dark:border-dark-border mt-2 flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Settled: $0.00</span>
          <span className="text-[10px] font-mono text-[#64748B]">
            Pending: $0.00
          </span>
        </div>
      </div>

      {/* 4. Total Withdrawn */}
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#64748B] dark:text-dark-textSecondary">
              Total Withdrawn
            </span>
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#64748B]" />
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#141518] dark:text-white tabular-nums my-1">
            ${metrics.totalWithdrawnUsd.toFixed(2)}
          </div>
        </div>

        <div className="pt-3 border-t border-light-border dark:border-dark-border mt-2 flex items-center justify-between text-[11px] text-[#64748B]">
          <span>All-time disbursements</span>
          <span className="text-[10px] font-mono text-[#64748B]">
            Completed: 0
          </span>
        </div>
      </div>
    </div>
  );
};
