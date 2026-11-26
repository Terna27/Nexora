'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminUserSummary } from '@cryptiq/types';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
  Ban,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function AdminUserDirectoryPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Action Modals State
  const [actionModal, setActionModal] = useState<'suspend' | 'reactivate' | 'delete' | null>(null);
  const [targetUser, setTargetUser] = useState<AdminUserSummary | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        search?: string;
        role?: string;
        isActive?: boolean;
        isVerified?: boolean;
      } = { page, pageSize };

      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (activeFilter === 'active') params.isActive = true;
      if (activeFilter === 'inactive') params.isActive = false;
      if (verifiedFilter === 'verified') params.isVerified = true;
      if (verifiedFilter === 'unverified') params.isVerified = false;

      const res = await cryptiqApi.getAdminUsers(params);
      setUsers(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch user directory.' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, activeFilter, verifiedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const openActionModal = (action: 'suspend' | 'reactivate' | 'delete', user: AdminUserSummary) => {
    setTargetUser(user);
    setActionModal(action);
    setActionReason('');
    setConfirmEmailInput('');
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionModal(null);
    setTargetUser(null);
    setActionReason('');
    setConfirmEmailInput('');
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (!actionReason.trim() || actionReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'A substantive suspension reason (at least 3 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.suspendUser(targetUser.id, actionReason.trim());
      setFeedback({ type: 'success', message: res.message });
      closeActionModal();
      await fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to suspend account.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (!actionReason.trim() || actionReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'A substantive reactivation reason (at least 3 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.reactivateUser(targetUser.id, actionReason.trim());
      setFeedback({ type: 'success', message: res.message });
      closeActionModal();
      await fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reactivate account.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnonymizeDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (confirmEmailInput.trim().toLowerCase() !== targetUser.email.trim().toLowerCase()) {
      setFeedback({ type: 'error', message: 'Confirmation email does not match user email. Deletion prevented.' });
      return;
    }
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      setFeedback({ type: 'error', message: 'A substantive removal reason (at least 5 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.anonymizeDeleteUser(targetUser.id, confirmEmailInput.trim(), actionReason.trim());
      setFeedback({ type: 'success', message: res.message });
      closeActionModal();
      await fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to safely remove and anonymize account.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500" />
            <span>User Directory</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Authoritative identity records, account lifecycle management, and financial subledger linkage.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-md ${
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
            className="text-zinc-400 hover:text-white font-mono text-xs ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by full name or email address..."
              className="w-full pl-10 pr-4 py-2 bg-[#090C10] border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-xl transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="">All Roles</option>
            <option value="investor">Investor</option>
            <option value="admin">Staff Admin</option>
            <option value="auditor">Auditor</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#090C10] border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
          >
            <option value="all">All Verification</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>

          {(search || roleFilter || activeFilter !== 'all' || verifiedFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setRoleFilter('');
                setActiveFilter('all');
                setVerifiedFilter('all');
                setPage(1);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">Loading user directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No Users Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No matching user records were returned for the selected filter and query parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-medium">User / Identity</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Verification</th>
                  <th className="py-3 px-4 font-medium">Registered</th>
                  <th className="py-3 px-4 font-medium text-right min-w-[280px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {users.map((u) => {
                  const isCurrentAdmin = currentAdmin?.id === u.id;
                  const isAnonymized = u.email.startsWith('anonymized_');

                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {isCurrentAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.role === 'admin'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                              : u.role === 'auditor'
                              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAnonymized ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                            <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Anonymized</span>
                          </span>
                        ) : u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400/80 font-mono">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Details Action */}
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 text-[11px] font-medium border border-zinc-700/60 transition"
                            title="Open full administrative user details and subledger view"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </Link>

                          {/* Suspend / Reactivate Action */}
                          {!isAnonymized && (
                            u.isActive ? (
                              <button
                                onClick={() => openActionModal('suspend', u)}
                                disabled={isCurrentAdmin || actionLoading}
                                title={isCurrentAdmin ? 'Administrators cannot suspend their own account' : 'Suspend account and revoke active sessions'}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:hover:bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-medium transition"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Suspend</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openActionModal('reactivate', u)}
                                disabled={actionLoading}
                                title="Reactivate user account and restore platform login"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium transition"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Reactivate</span>
                              </button>
                            )
                          )}

                          {/* Anonymize / Delete Action */}
                          {!isAnonymized && (
                            <button
                              onClick={() => openActionModal('delete', u)}
                              disabled={isCurrentAdmin || actionLoading}
                              title={isCurrentAdmin ? 'Administrators cannot delete their own account' : 'Permanently deactive and anonymize user PII'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 hover:bg-red-950/40 disabled:opacity-40 disabled:hover:bg-zinc-800/80 border border-zinc-700/80 hover:border-red-500/40 text-zinc-400 hover:text-red-400 text-[11px] font-medium transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="bg-[#090C10] border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing <span className="font-semibold text-white">{users.length}</span> of{' '}
            <span className="font-semibold text-white">{total}</span> records
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

      {/* MODAL: SUSPEND ACCOUNT */}
      {actionModal === 'suspend' && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <Ban className="w-5 h-5" />
              <span>Confirm Account Suspension</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1">
              <div>Target User: <span className="font-semibold text-white">{targetUser.fullName}</span></div>
              <div>Email: <span className="font-mono text-amber-400">{targetUser.email}</span></div>
              <div>UUID: <span className="font-mono text-zinc-500">{targetUser.id}</span></div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Suspending this account will immediately revoke all active JWT sessions, invalidate pending password reset and email verification tokens, and reject subsequent authentication attempts.
            </p>
            <form onSubmit={handleSuspend} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Suspension Reason (Required)</label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Compliance review or suspected security incident"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={closeActionModal}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || actionReason.trim().length < 3}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>Confirm Suspension</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REACTIVATE ACCOUNT */}
      {actionModal === 'reactivate' && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Account Reactivation</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1">
              <div>Target User: <span className="font-semibold text-white">{targetUser.fullName}</span></div>
              <div>Email: <span className="font-mono text-emerald-400">{targetUser.email}</span></div>
              <div>UUID: <span className="font-mono text-zinc-500">{targetUser.id}</span></div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Reactivating this account will restore normal platform access and permit the user to authenticate and access subledger balances.
            </p>
            <form onSubmit={handleReactivate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Reactivation Reason (Required)</label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Compliance verification completed successfully"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={closeActionModal}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || actionReason.trim().length < 3}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Reactivation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAFELY REMOVE & ANONYMIZE */}
      {actionModal === 'delete' && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Anonymize & Remove Account</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1">
              <div>Target User: <span className="font-semibold text-white">{targetUser.fullName}</span></div>
              <div>Target Email: <span className="font-mono text-amber-400">{targetUser.email}</span></div>
              <div>UUID: <span className="font-mono text-zinc-500">{targetUser.id}</span></div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Safeguards & Regulatory Notice</span>
              </div>
              <p>
                This operation irreversibly deactivates the account and anonymizes personal data. Double-entry financial subledgers and immutable audit logs are preserved.
              </p>
              <p className="text-[11px] text-amber-300/80">
                <strong>Why this action may be blocked:</strong> The backend will strictly reject deletion if this account holds positive settled balances or pending transactions awaiting resolution.
              </p>
            </div>
            <form onSubmit={handleAnonymizeDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">
                  Type <span className="text-amber-400 font-semibold select-all">{targetUser.email}</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmEmailInput}
                  onChange={(e) => setConfirmEmailInput(e.target.value)}
                  placeholder={targetUser.email}
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-400 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Removal Reason (Required)</label>
                <textarea
                  required
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. GDPR right-to-be-forgotten request verified"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={closeActionModal}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    confirmEmailInput.trim().toLowerCase() !== targetUser.email.trim().toLowerCase() ||
                    actionReason.trim().length < 5
                  }
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Permanently Anonymize & Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
