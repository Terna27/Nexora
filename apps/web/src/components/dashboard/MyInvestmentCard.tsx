'use client';

import React from 'react';
import { Briefcase, Calendar, Info, Clock, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserInvestmentRecord } from '@cryptiq/types';

interface MyInvestmentCardProps {
  investmentRecord?: UserInvestmentRecord | null;
  isLoading?: boolean;
}

export const MyInvestmentCard: React.FC<MyInvestmentCardProps> = ({ investmentRecord, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-2" />
        <div className="h-3 w-64 bg-slate-200 dark:bg-zinc-800 rounded-full" />
      </div>
    );
  }

  const hasRecord = Boolean(investmentRecord?.hasRecord && investmentRecord?.amount !== null);
  const amount = investmentRecord?.amount ?? null;
  const currency = investmentRecord?.currency || 'USD';
  const updatedAt = investmentRecord?.updatedAt ? new Date(investmentRecord.updatedAt) : null;

  return (
    <div
      data-testid="my-investment-card"
      className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md"
    >
      {/* Decorative gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF512F] via-[#6366F1] to-[#26A17B]" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#141518] dark:text-white tracking-tight">
                My Investment
              </h2>
              {hasRecord ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Recorded</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Unrecorded</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary mt-0.5">
              Authoritative administrator-managed investment amount for your account
            </p>
          </div>
        </div>

        {updatedAt && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#64748B] dark:text-zinc-400 bg-[#F4F5F7] dark:bg-zinc-800/60 px-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Updated {updatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {hasRecord && amount ? (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#F8F9FA] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] font-semibold block mb-1">
                Recorded Principal Amount
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[#141518] dark:text-white tabular-nums flex items-baseline gap-2">
                <span>
                  {currency === 'USD' || currency === 'USDT'
                    ? `$${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : parseFloat(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </span>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  {currency}
                </span>
              </div>
            </div>

            {updatedAt && (
              <div className="text-right sm:self-end">
                <span className="text-[10px] font-mono text-[#64748B] uppercase block">
                  Last Recorded Timestamp
                </span>
                <span className="text-xs font-mono text-[#141518] dark:text-zinc-300">
                  {updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>
              {investmentRecord?.disclaimer ||
                'Administrator-recorded investment reference. This valuation is recorded administratively for investment tracking and does not alter double-entry wallet balances.'}
            </span>
          </div>
        </div>
      ) : (
        /* Honest empty state when no record is available */
        <div className="p-6 rounded-2xl bg-[#F8F9FA] dark:bg-dark-bg/60 border border-dashed border-slate-300 dark:border-zinc-700 text-center space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141518] dark:text-white">
              No investment amount has been recorded yet.
            </h3>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary max-w-md mx-auto mt-1">
              Your administrative investment record is currently unrecorded. Once an administrator records an investment valuation for your account, it will appear here with currency and timestamp details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
