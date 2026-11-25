'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminOverviewMetrics, AdminAuditLog } from '@cryptiq/types';
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
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [overviewRes, logsRes] = await Promise.all([
          cryptiqApi.getAdminOverview(),
          cryptiqApi.getAdminAuditLogs({ pageSize: 5 }),
        ]);
        if (mounted) {
          setMetrics(overviewRes);
          setRecentLogs(logsRes?.items || []);
        }
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Administrative Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Operational statistics derived strictly from authoritative database records.
        </p>
      </div>

      {/* Scope Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-300">Authoritative Milestone Notice</div>
          <p className="leading-relaxed">
            Platform metrics below reflect live database records. Aggregate fund AUM and automated yield accrual are pending subsequent milestone implementation; unsupported metrics remain uncalculated to preserve data integrity.
          </p>
        </div>
      </div>

      {/* Operational KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.totalUsers ?? 0}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span className="text-emerald-400 font-medium">{metrics?.activeUsers ?? 0} active</span>
            <span>•</span>
            <span className="text-zinc-400">{metrics?.verifiedUsers ?? 0} verified</span>
          </div>
        </div>

        {/* Investor Accounts */}
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Investor Roles</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.investorUsers ?? 0}
          </div>
          <div className="text-xs text-zinc-500">
            Staff Admins: <span className="text-amber-400 font-semibold">{metrics?.adminUsers ?? 0}</span>
          </div>
        </div>

        {/* Subledger Accounts */}
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Subledger Accounts</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.totalAccounts ?? 0}
          </div>
          <div className="text-xs text-zinc-500">
            Double-entry accounts provisioned
          </div>
        </div>

        {/* Financial Transactions */}
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Ledger Transactions</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {loading ? <span className="text-zinc-600 animate-pulse">...</span> : metrics?.totalTransactions ?? 0}
          </div>
          <div className="text-xs text-zinc-500">
            Authoritative journal events
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="group bg-[#0D1117] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="font-semibold text-white group-hover:text-amber-400 transition flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>User Directory</span>
            </div>
            <p className="text-xs text-zinc-400">
              Browse users, filter by verification status, inspect subledger balances and transaction history.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
        </Link>

        <Link
          href="/admin/audit-logs"
          className="group bg-[#0D1117] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="font-semibold text-white group-hover:text-amber-400 transition flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Durable Audit Trail</span>
            </div>
            <p className="text-xs text-zinc-400">
              Inspect database-immutable audit events, staff access logs, and security telemetry.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>

      {/* Recent Durable Audit Activity Table */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Administrative Audit Events</h2>
            <p className="text-xs text-zinc-400">Protected by database-enforced immutability trigger</p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500">Loading audit trail...</div>
        ) : recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No administrative events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-mono uppercase text-zinc-500 border-b border-zinc-800/80">
                <tr>
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Outcome</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 font-mono">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 text-zinc-400">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 font-semibold text-zinc-200">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-400 max-w-[150px] truncate">
                      {log.adminEmail || log.adminUserId || 'system'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-red-400 bg-red-500/10'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-400 max-w-xs truncate text-[11px] font-sans">
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
