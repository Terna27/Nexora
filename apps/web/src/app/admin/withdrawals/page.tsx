'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminWithdrawalSummary } from '@cryptiq/types';
import {
  ArrowUpRight,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  AlertCircle,
  ExternalLink,
  Lock,
  Info,
} from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Action Modals State
  const [activeAction, setActiveAction] = useState<{
    type: 'approve' | 'reject' | 'settle';
    withdrawal: AdminWithdrawalSummary;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [payoutReference, setPayoutReference] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cryptiqApi.getAdminWithdrawals({
        page,
        pageSize,
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setWithdrawals(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || activeAction.type !== 'approve') return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.approveWithdrawal(
        activeAction.withdrawal.id,
        actionNotes.trim() || undefined
      );
      setFeedback({ type: 'success', message: res.message });
      setActiveAction(null);
      setActionNotes('');
      await fetchWithdrawals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve withdrawal' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || activeAction.type !== 'reject') return;
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      setFeedback({ type: 'error', message: 'A substantive rejection reason (at least 5 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.rejectWithdrawal(
        activeAction.withdrawal.id,
        actionReason.trim()
      );
      setFeedback({ type: 'success', message: res.message });
      setActiveAction(null);
      setActionReason('');
      await fetchWithdrawals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject withdrawal' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || activeAction.type !== 'settle') return;
    if (!payoutReference.trim() || payoutReference.trim().length < 4) {
      setFeedback({ type: 'error', message: 'A substantive payout confirmation reference (min 4 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.settleWithdrawal(activeAction.withdrawal.id, {
        payoutReference: payoutReference.trim(),
        notes: actionNotes.trim() || undefined,
      });
      setFeedback({ type: 'success', message: res.message });
      setActiveAction(null);
      setPayoutReference('');
      setActionNotes('');
      await fetchWithdrawals();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to settle withdrawal' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Withdrawal Operations</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Authoritative review queue, subledger balance verification, and approval/rejection workflows.
          </p>
        </div>
        <button
          onClick={fetchWithdrawals}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Governance & Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-300">Approval & Payout Policy</div>
          <p className="leading-relaxed">
            Approving a withdrawal verifies settled balance sufficiency and moves the lifecycle state to <code className="font-mono text-amber-300">POSTED</code> in the double-entry subledger. Automated on-chain or fiat disbursement rail integration is not integrated; institutional disbursement reconciliation is required before external settlement.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white font-mono text-xs"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by transaction reference (TX-WTH-...), user email, or asset..."
              className="w-full bg-[#090C10] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition"
          >
            Filter
          </button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60 text-xs">
          <span className="text-[10px] font-mono uppercase text-zinc-500 mr-2">Status:</span>
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'POSTED', label: 'Approved (Awaiting Payout)' },
            { id: 'SETTLED', label: 'Settled / Completed' },
            { id: 'VOIDED', label: 'Rejected / Voided' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">Loading withdrawal records...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <ArrowUpRight className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-semibold text-white">No Withdrawal Records</div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No withdrawal requests matched the selected status and search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Reference</th>
                  <th className="py-3 px-4 font-medium">User Account</th>
                  <th className="py-3 px-4 font-medium">Amount</th>
                  <th className="py-3 px-4 font-medium">USD Value</th>
                  <th className="py-3 px-4 font-medium">Destination (Masked)</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-200">{w.transactionRef}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {w.userId ? (
                        <Link
                          href={`/admin/users/${w.userId}`}
                          className="hover:text-amber-400 transition"
                        >
                          <div className="font-medium text-white">{w.userFullName || 'Investor'}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{w.userEmail}</div>
                        </Link>
                      ) : (
                        <span className="text-zinc-500 font-mono">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">
                      {w.amount} {w.asset}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      ${Number(w.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {w.destinationMasked || 'Institutional Rail'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {new Date(w.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.status === 'SETTLED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : w.status === 'POSTED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : w.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {w.status === 'POSTED' ? 'APPROVED' : w.status === 'VOIDED' ? 'REJECTED' : w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {w.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setActiveAction({ type: 'approve', withdrawal: w });
                              setActionNotes('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setActiveAction({ type: 'reject', withdrawal: w });
                              setActionReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[11px] font-semibold transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : w.status === 'POSTED' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setActiveAction({ type: 'settle', withdrawal: w });
                              setPayoutReference('');
                              setActionNotes('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Settle Payout</span>
                          </button>
                        </div>
                      ) : w.status === 'SETTLED' ? (
                        <span className="text-[11px] text-emerald-400/90 font-mono" title={w.payoutReference || 'Settled'}>
                          {w.payoutReference ? `Ref: ${w.payoutReference.slice(0, 12)}...` : 'Settled'}
                        </span>
                      ) : w.rejectionReason ? (
                        <span className="text-[11px] text-red-400/80 truncate max-w-[120px] inline-block" title={w.rejectionReason}>
                          {w.rejectionReason}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">—</span>
                      )}
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
              <span className="text-white font-semibold">{totalPages}</span> ({total} total requests)
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

      {/* APPROVAL MODAL */}
      {activeAction?.type === 'approve' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Approve Withdrawal Request</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1 font-mono">
              <div>Ref: <span className="text-white">{activeAction.withdrawal.transactionRef}</span></div>
              <div>Amount: <span className="text-emerald-400 font-bold">{activeAction.withdrawal.amount} {activeAction.withdrawal.asset}</span> (${activeAction.withdrawal.amountUsd} USD)</div>
              <div>User: <span className="text-zinc-300">{activeAction.withdrawal.userEmail || 'Investor'}</span></div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Approval will verify settled balance sufficiency and mark the withdrawal as <code className="font-mono text-emerald-400">POSTED</code> in the double-entry ledger. Note: Automatic payout integration is not configured; manual disbursement reconciliation is required.
            </p>
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Administrative Notes (Optional)</label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Verified against institutional cold storage"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAction(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Authorize & Post to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {activeAction?.type === 'reject' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <XCircle className="w-5 h-5" />
              <span>Reject Withdrawal Request</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1 font-mono">
              <div>Ref: <span className="text-white">{activeAction.withdrawal.transactionRef}</span></div>
              <div>Amount: <span className="text-red-400 font-bold">{activeAction.withdrawal.amount} {activeAction.withdrawal.asset}</span> (${activeAction.withdrawal.amountUsd} USD)</div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Rejecting this request will mark the transaction as <code className="font-mono text-red-400">VOIDED</code> and immediately release any pending balance hold on the user's account.
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Rejection Reason (Required, min 5 chars)</label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Incompatible withdrawal address or requested by user"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAction(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || actionReason.trim().length < 5}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Reject & Release Funds</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL */}
      {activeAction?.type === 'settle' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Settle Payout & Reconcile Ledger</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1 font-mono">
              <div>Ref: <span className="text-white">{activeAction.withdrawal.transactionRef}</span></div>
              <div>Amount: <span className="text-cyan-400 font-bold">{activeAction.withdrawal.amount} {activeAction.withdrawal.asset}</span> (${activeAction.withdrawal.amountUsd} USD)</div>
              <div>Target: <span className="text-zinc-300">{activeAction.withdrawal.destinationMasked || 'Custodial Target'}</span></div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Authoritatively confirms that the external payout has executed. Transitions status to <code className="font-mono text-cyan-400">SETTLED</code>, permanently deducts the materialized balance from the user's subledger account, and releases the reserved balance hold.
            </p>
            <form onSubmit={handleSettle} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">External Payout Reference (Required, min 4 chars)</label>
                <input
                  type="text"
                  required
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="e.g. On-chain Tx Hash 0x... or Bank Wire Reference"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Administrative Settlement Notes (Optional)</label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Broadcast via Fireblocks vault node #3"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActiveAction(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || payoutReference.trim().length < 4}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Settle & Deduct Balance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
