'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Coins, 
  FileText 
} from 'lucide-react';
import { LedgerEntry } from '@cryptiq/types';

interface RecentActivitiesCardProps {
  platformLedgerEntries: LedgerEntry[];
  onViewAllActivity?: () => void;
}

export const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({
  platformLedgerEntries,
  onViewAllActivity,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'PERSONAL' | 'PLATFORM_ATTESTATIONS'>('PERSONAL');

  // Real personal transactions: Currently 0 user-specific transactions exist in the backend
  // Strict non-negotiable rule: Never fabricate fake deposits or fake trading transactions!
  const personalTransactions: any[] = [];

  const filteredPlatformEntries = useMemo(() => {
    return platformLedgerEntries.filter((tx) => {
      const matchesSearch = 
        tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.eventType.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (filterType === 'ALL') return true;
      if (filterType === 'REBALANCE' && tx.eventType.includes('REBALANCE')) return true;
      if (filterType === 'CUSTODY' && tx.eventType.includes('CUSTODY')) return true;
      if (filterType === 'ARBITRAGE' && tx.eventType.includes('ARBITRAGE')) return true;
      return true;
    });
  }, [platformLedgerEntries, searchQuery, filterType]);

  return (
    <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header with Search and Mode Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#141518] dark:text-white uppercase tracking-wider">
                Recent Activities
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-[#64748B]">
                {viewMode === 'PERSONAL' ? 'Personal Account' : 'Network Attestations'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary mt-0.5">
              Verified double-entry transactions and institutional audit records.
            </p>
          </div>

          {/* Toggle between Personal Account and Network Attestations */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-full p-0.5 text-[10px] font-mono font-semibold self-start sm:self-auto">
            <button
              onClick={() => setViewMode('PERSONAL')}
              className={`px-3 py-1 rounded-full transition-colors ${
                viewMode === 'PERSONAL'
                  ? 'bg-white dark:bg-dark-card text-[#141518] dark:text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#141518]'
              }`}
            >
              My Account
            </button>
            <button
              onClick={() => setViewMode('PLATFORM_ATTESTATIONS')}
              className={`px-3 py-1 rounded-full transition-colors ${
                viewMode === 'PLATFORM_ATTESTATIONS'
                  ? 'bg-white dark:bg-dark-card text-[#141518] dark:text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#141518]'
              }`}
            >
              Network Ledger
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, asset, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border text-xs text-[#141518] dark:text-white placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-[#FF512F]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-[10px] font-semibold">
            {['ALL', 'REBALANCE', 'CUSTODY', 'ARBITRAGE'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  filterType === f
                    ? 'bg-[#141518] text-white border-[#141518]'
                    : 'bg-white dark:bg-dark-card text-[#64748B] border-light-border dark:border-dark-border hover:border-slate-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Empty State */}
        {viewMode === 'PERSONAL' ? (
          // Honest empty state for user account
          <div className="py-12 px-4 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-dashed border-light-border dark:border-dark-border flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center text-[#64748B] shadow-sm mb-3">
              <FileText className="w-5 h-5 text-[#FF512F]" />
            </div>
            <h4 className="text-sm font-bold text-[#141518] dark:text-white">
              No Personal Account Transactions
            </h4>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary max-w-sm mt-1 leading-relaxed">
              Personal transaction journal endpoint unavailable • Awaiting user subledger integration. Once personal transactions are initiated and settled, they will appear here with full audit attestations.
            </p>
            <button
              onClick={() => setViewMode('PLATFORM_ATTESTATIONS')}
              className="mt-4 px-4 py-2 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-semibold text-[#141518] dark:text-white hover:border-[#FF512F] transition-colors shadow-xs"
            >
              View Institutional Network Ledger
            </button>
          </div>
        ) : (
          <div>
            {/* Prominent Institutional Ledger Disclaimer */}
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  Institutional Attestation Feed
                </span>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  These records reflect platform-wide rebalancing, custody sweeps, and algorithmic execution on the institutional ledger — <strong className="font-semibold underline">NOT</strong> activity from your personal account.
                </p>
              </div>
            </div>

            {/* Real platform ledger attestations from `/api/v1/ledger/recent` */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-light-border dark:border-dark-border text-[10px] font-mono uppercase text-[#64748B] tracking-wider">
                    <th className="py-2.5 font-semibold">Tx ID</th>
                    <th className="py-2.5 font-semibold">Activity</th>
                    <th className="py-2.5 font-semibold">Asset</th>
                    <th className="py-2.5 font-semibold text-right">Amount</th>
                    <th className="py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold text-right">Attestation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border text-xs">
                  {filteredPlatformEntries.slice(0, 5).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-[11px] font-semibold text-[#141518] dark:text-white">
                        {entry.id}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF512F]" />
                          <span className="font-medium text-[#141518] dark:text-white">
                            {entry.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-mono font-semibold text-[#64748B]">
                        {entry.asset}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#141518] dark:text-white tabular-nums">
                        {entry.amount.toLocaleString()} <span className="text-[10px] font-normal text-[#64748B]">{entry.asset}</span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-[11px] text-[#64748B]">
                        {entry.txHash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-light-border dark:border-dark-border mt-3 flex items-center justify-between text-[11px] text-[#64748B]">
        <span>Immutable double-entry record tracking</span>
        {onViewAllActivity && (
          <button
            onClick={onViewAllActivity}
            className="text-[#FF512F] hover:underline font-semibold flex items-center gap-1 focus:outline-none"
          >
            All Activity
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
