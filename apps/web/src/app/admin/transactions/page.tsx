'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminTransactionItem } from '@cryptiq/types';
import {
  ArrowLeftRight,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
  Activity,
  RotateCcw,
  Info,
} from 'lucide-react';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cryptiqApi.getAdminTransactions({
        page,
        pageSize,
        transactionType: typeFilter !== 'ALL' ? typeFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setTransactions(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch admin transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financial Transactions Ledger</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Global double-entry journal records across all operating and custodial accounts.
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by reference (TX-...) or description..."
              className="w-full bg-[#090C10] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition"
          >
            Search
          </button>
        </form>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-zinc-800/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Type:</span>
            {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'SPOT_TRADE', 'REVERSAL'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  typeFilter === t
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Status:</span>
            {['ALL', 'PENDING', 'POSTED', 'SETTLED', 'VOIDED'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                  statusFilter === s
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">Loading ledger records...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <ArrowLeftRight className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-semibold text-white">No Ledger Transactions Found</div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No financial records matched the specified filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Ref / Identifier</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Lifecycle Status</th>
                  <th className="py-3 px-4 font-medium">Initiator / User</th>
                  <th className="py-3 px-4 font-medium">Direction</th>
                  <th className="py-3 px-4 font-medium text-right">Native Amount</th>
                  <th className="py-3 px-4 font-medium text-right">USD Valuation</th>
                  <th className="py-3 px-4 font-medium text-right">Date Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <span>{tx.transactionRef}</span>
                        {tx.isReversal && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 uppercase">
                            Reversal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.status === 'SETTLED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.status === 'POSTED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-zinc-400">
                      {tx.initiatorUserId ? (
                        <Link
                          href={`/admin/users/${tx.initiatorUserId}`}
                          className="hover:text-amber-400 transition"
                        >
                          <span className="text-zinc-300">{tx.initiatorEmail || 'User'}</span>
                        </Link>
                      ) : (
                        <span className="text-zinc-500">System / Protocol</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-zinc-300'
                        }`}
                      >
                        {tx.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-semibold">
                      {tx.amount} {tx.asset}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-200">
                      ${Number(tx.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400 text-[11px]">
                      {new Date(tx.settledAt || tx.postedAt || tx.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 bg-[#090C10] flex items-center justify-between text-xs">
            <div className="text-zinc-500">
              Page <span className="text-white font-semibold">{page}</span> of{' '}
              <span className="text-white font-semibold">{totalPages}</span> ({total} transactions)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
