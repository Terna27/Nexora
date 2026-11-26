'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminAuditLog } from '@cryptiq/types';
import {
  FileText,
  Shield,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Database,
  Lock,
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        action?: string;
      } = { page, pageSize };

      if (actionFilter) params.action = actionFilter;

      const res = await cryptiqApi.getAdminAuditLogs(params);
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Administrative Audit Trail</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Durable log of all staff console access, inspections, and authorization attempts.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Database Immutability Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 flex items-start gap-3">
        <Database className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-emerald-300">Database-Enforced Immutability</div>
          <p className="leading-relaxed text-zinc-400">
            Audit entries are inserted directly into PostgreSQL and protected by trigger{' '}
            <code className="text-emerald-300 font-mono">trg_guard_admin_audit_logs_immutability</code>.
            Modification or deletion by any staff member, application role, or administrative interface is strictly prevented by the database engine.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400 font-medium">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="">All Actions</option>
            <option value="ADMIN_OVERVIEW_VIEW">ADMIN_OVERVIEW_VIEW</option>
            <option value="ADMIN_USER_LIST_VIEW">ADMIN_USER_LIST_VIEW</option>
            <option value="ADMIN_USER_DETAIL_VIEW">ADMIN_USER_DETAIL_VIEW</option>
            <option value="ADMIN_USER_ACCOUNTS_VIEW">ADMIN_USER_ACCOUNTS_VIEW</option>
            <option value="ADMIN_USER_TRANSACTIONS_VIEW">ADMIN_USER_TRANSACTIONS_VIEW</option>
            <option value="ADMIN_USER_SUSPEND">ADMIN_USER_SUSPEND</option>
            <option value="ADMIN_USER_REACTIVATE">ADMIN_USER_REACTIVATE</option>
            <option value="ADMIN_USER_ANONYMIZE_DELETE">ADMIN_USER_ANONYMIZE_DELETE</option>
            <option value="ADMIN_WITHDRAWAL_APPROVE">ADMIN_WITHDRAWAL_APPROVE</option>
            <option value="ADMIN_WITHDRAWAL_REJECT">ADMIN_WITHDRAWAL_REJECT</option>
            <option value="ADMIN_UNAUTHORIZED_ACCESS_ATTEMPT">ADMIN_UNAUTHORIZED_ACCESS_ATTEMPT</option>
          </select>
        </div>

        {actionFilter && (
          <button
            onClick={() => {
              setActionFilter('');
              setPage(1);
            }}
            className="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Audit Records Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No matching administrative audit records were found for the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Timestamp (UTC)</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Actor</th>
                  <th className="py-3 px-4 font-medium">Target</th>
                  <th className="py-3 px-4 font-medium">Outcome</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                  <th className="py-3 px-4 font-medium text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-200 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 max-w-[150px] truncate">
                      {log.adminEmail || log.adminUserId || 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {log.targetEntity ? (
                        <span>
                          {log.targetEntity} {log.targetId ? `(${log.targetId.slice(0, 8)}...)` : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-red-400 bg-red-500/10 border border-red-500/20'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 max-w-xs font-sans text-xs">
                      <div>{log.details || '—'}</div>
                      {log.reason && (
                        <div className="text-[11px] text-amber-300/80 font-mono mt-0.5">
                          Reason: {log.reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500 text-[10px]">
                      {log.ipAddress || 'unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="bg-[#090C10] border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing <span className="font-semibold text-white">{logs.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> audit records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition text-zinc-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition text-zinc-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
