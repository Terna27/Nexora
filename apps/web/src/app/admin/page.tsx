'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminOverviewMetrics, AdminAuditLog } from '@cryptiq/types';
import { GlobalPlatformInvestmentSection } from '@/components/admin/GlobalPlatformInvestmentSection';
import {
  Users,
  CheckCircle2,
  Database,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowLeftRight,
  XCircle,
  HelpCircle,
  Banknote,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, logsRes] = await Promise.all([
        cryptiqApi.getAdminOverview(),
        cryptiqApi.getAdminAuditLogs({ pageSize: 5 }),
      ]);
      setMetrics(overviewRes);
      setRecentLogs(logsRes?.items || []);
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      setError(err?.message || 'Failed to load administrative overview metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Operations Console</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Authoritative operational statistics and financial reporting derived strictly from database records.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-200">Failed to load platform statistics</div>
              <div className="mt-0.5 text-red-300/90">{error}</div>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Scope & Financial Integrity Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-300">Financial Integrity Standard</div>
          <p className="leading-relaxed">
            All metrics are computed from authoritative double-entry subledgers and verified database models.
            Synthetic growth figures, simulated deposits, and unverified yields are strictly prohibited.
          </p>
        </div>
      </div>

      {/* SECTION 1: USER LIFECYCLE & IDENTITY */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">User Identity & Account Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered Users */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Registered Users</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.totalUsers ?? 0}
            </div>
            <div className="text-[11px] text-zinc-400">
              Investors: <span className="text-zinc-200 font-semibold">{metrics?.investorUsers ?? 0}</span> • Staff: <span className="text-amber-400 font-semibold">{metrics?.adminUsers ?? 0}</span>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Active Accounts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 tracking-tight">
              {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.activeUsers ?? 0}
            </div>
            <div className="text-[11px] text-zinc-400">
              Permitted to log in and transact
            </div>
          </div>

          {/* Suspended Users */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Suspended Accounts</span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400 tracking-tight">
              {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.suspendedUsers ?? 0}
            </div>
            <div className="text-[11px] text-zinc-400">
              Session-revoked / blocked access
            </div>
          </div>

          {/* Verified Users */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Verified Identity</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-400 tracking-tight">
              {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.verifiedUsers ?? 0}
            </div>
            <div className="text-[11px] text-zinc-400">
              Confirmed email verification
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: FINANCIAL OPERATIONS & SETTLEMENT */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Capital Flow & Financial Ledger</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Invested Capital */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Total Invested Capital</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              {loading ? (
                <span className="text-zinc-600 animate-pulse">...</span>
              ) : metrics?.totalInvestedCapitalUsd ? (
                `$${Number(metrics.totalInvestedCapitalUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
              ) : (
                <span className="text-sm font-normal text-zinc-400 italic">Not yet available</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500">
              {metrics?.investedCapitalStatusMessage || 'Investment reporting is not yet available.'}
            </div>
          </div>

          {/* Total Successfully Withdrawn Capital */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Total Withdrawn</span>
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? (
                <span className="text-zinc-600 animate-pulse">...</span>
              ) : (
                `$${Number(metrics?.totalWithdrawnCapitalUsd ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <div className="text-[11px] text-zinc-500">
              Settled ledger debit records
            </div>
          </div>

          {/* Pending Withdrawals Queue */}
          <Link
            href="/admin/withdrawals?status=PENDING"
            className="group bg-[#0D1117] border border-amber-500/30 hover:border-amber-400 rounded-2xl p-5 space-y-2 transition block"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-300">Pending Withdrawals</span>
              <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl font-bold text-amber-400 tracking-tight flex items-center justify-between">
              <span>{loading ? '...' : metrics?.pendingWithdrawalsCount ?? 0}</span>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition" />
            </div>
            <div className="text-[11px] text-amber-300/80">
              Awaiting administrator review & approval
            </div>
          </Link>

          {/* Completed vs Voided Withdrawals */}
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Disbursement Status</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {loading ? <span className="text-zinc-600">...</span> : `${metrics?.completedWithdrawalsCount ?? 0} settled`}
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-2">
              <span className="text-emerald-400">{metrics?.completedWithdrawalsCount ?? 0} settled</span>
              <span>•</span>
              <span className="text-red-400">{metrics?.failedWithdrawalsCount ?? 0} rejected</span>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED SECTION: GLOBAL PLATFORM INVESTMENT MANAGEMENT */}
      <GlobalPlatformInvestmentSection />

      {/* SECTION 3: QUICK OPERATIONS NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="group bg-[#0D1117] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="font-semibold text-white group-hover:text-amber-400 transition flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>User Management</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Search identity records, manage account suspension, reactivate users, and perform controlled PII anonymization.
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-500 flex items-center gap-1 group-hover:text-amber-400 transition">
            <span>Manage Users</span> <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/withdrawals"
          className="group bg-[#0D1117] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="font-semibold text-white group-hover:text-amber-400 transition flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
              <span>Withdrawal Operations</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Inspect pending payout requests, verify subledger balances, and execute review/approval or rejection workflows.
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-500 flex items-center gap-1 group-hover:text-amber-400 transition">
            <span>Review Queue ({metrics?.pendingWithdrawalsCount ?? 0})</span> <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/transactions"
          className="group bg-[#0D1117] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="font-semibold text-white group-hover:text-amber-400 transition flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
              <span>Financial Ledger</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Explore global platform double-entry transactions across {metrics?.totalAccounts ?? 0} provisioned accounts with immutable audit records.
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-500 flex items-center gap-1 group-hover:text-amber-400 transition">
            <span>Inspect Transactions ({metrics?.totalTransactions ?? 0})</span> <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* SECTION 4: RECENT AUDIT TRAIL */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Recent Administrative Audit Logs</h3>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No administrative audit events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Admin Actor</th>
                  <th className="py-3 px-4 font-medium">Target</th>
                  <th className="py-3 px-4 font-medium">Outcome</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-zinc-200 font-semibold">{log.action}</td>
                    <td className="py-3 px-4 text-zinc-400 font-sans">{log.adminEmail || log.adminUserId || 'System'}</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {log.targetEntity ? `${log.targetEntity}${log.targetId ? `:${log.targetId.slice(0, 8)}` : ''}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 font-sans max-w-xs truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
