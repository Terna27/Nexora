'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cryptiqApi } from '@cryptiq/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  AdminUserDetail,
  AdminUserAccountsResponse,
  UserTransactionsListResponse,
  UserTransactionItem,
  AdminInvestmentRecord,
} from '@cryptiq/types';
import {
  Users,
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Database,
  Layers,
  Activity,
  Lock,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Ban,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const { user: currentAdmin } = useAuth();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [accounts, setAccounts] = useState<AdminUserAccountsResponse | null>(null);
  const [transactions, setTransactions] = useState<UserTransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'security'>('accounts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action Modals State
  const [actionModal, setActionModal] = useState<'suspend' | 'reactivate' | 'delete' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Investment Management State
  const [investmentRecord, setInvestmentRecord] = useState<AdminInvestmentRecord | null>(null);
  const [editInvestmentOpen, setEditInvestmentOpen] = useState(false);
  const [investAmountInput, setInvestAmountInput] = useState('');
  const [investCurrencyInput, setInvestCurrencyInput] = useState('USD');
  const [investReasonInput, setInvestReasonInput] = useState('');
  const [investConfirmStep, setInvestConfirmStep] = useState(false);
  const [investLoading, setInvestLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [userDetail, userAccts, userTxs, userInv] = await Promise.all([
        cryptiqApi.getAdminUserDetail(userId),
        cryptiqApi.getAdminUserAccounts(userId),
        cryptiqApi.getAdminUserTransactions(userId),
        cryptiqApi.getAdminUserInvestmentRecord(userId),
      ]);

      if (!userDetail) {
        setError('User was not found or access was denied.');
      } else {
        setUser(userDetail);
        setAccounts(userAccts);
        setTransactions(userTxs?.items || []);
        setInvestmentRecord(userInv);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action Handlers
  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReason.trim() || actionReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'A substantive suspension reason (at least 3 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.suspendUser(userId, actionReason.trim());
      setFeedback({ type: 'success', message: res.message });
      setActionModal(null);
      setActionReason('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to suspend account.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReason.trim() || actionReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'A substantive reason for reactivation (at least 3 characters) is required.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await cryptiqApi.reactivateUser(userId, actionReason.trim());
      setFeedback({ type: 'success', message: res.message });
      setActionModal(null);
      setActionReason('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reactivate account.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnonymizeDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmEmailInput.trim().toLowerCase() !== user?.email.trim().toLowerCase()) {
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
      const res = await cryptiqApi.anonymizeDeleteUser(userId, confirmEmailInput.trim(), actionReason.trim());
      setFeedback({ type: 'success', message: res.message });
      setActionModal(null);
      setActionReason('');
      setConfirmEmailInput('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to safely remove and anonymize account.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditInvestment = () => {
    setInvestAmountInput(investmentRecord?.hasRecord && investmentRecord.amount ? investmentRecord.amount : '');
    setInvestCurrencyInput(investmentRecord?.currency || 'USD');
    setInvestReasonInput('');
    setInvestConfirmStep(false);
    setEditInvestmentOpen(true);
  };

  const handleSaveInvestmentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(investAmountInput);
    if (isNaN(num) || num < 0) {
      setFeedback({ type: 'error', message: 'Investment amount must be a valid number greater than or equal to 0.' });
      return;
    }
    if (!investReasonInput.trim() || investReasonInput.trim().length < 3) {
      setFeedback({ type: 'error', message: 'A substantive audit reason (at least 3 characters) is required.' });
      return;
    }

    if (!investConfirmStep) {
      setInvestConfirmStep(true);
      return;
    }

    setInvestLoading(true);
    setFeedback(null);
    try {
      const updated = await cryptiqApi.updateAdminUserInvestmentRecord(userId, {
        amount: investAmountInput.trim(),
        currency: investCurrencyInput,
        reason: investReasonInput.trim(),
      });
      setInvestmentRecord(updated);
      setFeedback({ type: 'success', message: `Investment amount successfully recorded as ${updated.amount} ${updated.currency}.` });
      setEditInvestmentOpen(false);
      setInvestConfirmStep(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update investment amount.' });
    } finally {
      setInvestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-zinc-400">Loading user profile and financial subledgers...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-[#0D1117] border border-red-500/20 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-white">Inspection Error</h2>
        <p className="text-xs text-zinc-400">{error || 'Unable to retrieve user record.'}</p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to User Directory</span>
        </Link>
      </div>
    );
  }

  const isCurrentAdmin = currentAdmin?.id === user.id;
  const isAnonymized = user.email.startsWith('anonymized_');
  const hasPositiveBalance = accounts?.totalBalanceUsd && parseFloat(accounts.totalBalanceUsd) > 0.01;
  const pendingTxCount = transactions.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="space-y-6">
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

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Directory</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="text-[11px] font-mono text-zinc-500">UUID: {user.id}</span>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
              {user.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.fullName}</h1>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    user.role === 'admin'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                      : user.role === 'auditor'
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                  }`}
                >
                  {user.role}
                </span>
                {isCurrentAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Your Account
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">{user.email}</div>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAnonymized ? (
              <span className="px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium inline-flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Anonymized Account</span>
              </span>
            ) : user.isActive ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Account</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium inline-flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Suspended</span>
              </span>
            )}

            {user.isVerified ? (
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                Unverified
              </span>
            )}
          </div>
        </div>

        {/* Quick Identity Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800/60 text-xs">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Registration Date</div>
            <div className="font-medium text-zinc-200 mt-0.5">
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Last Login</div>
            <div className="font-medium text-zinc-200 mt-0.5">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'No recorded login'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Active Sessions</div>
            <div className="font-medium text-emerald-400 mt-0.5">
              {user.activeSessionsCount} active
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">MFA Status</div>
            <div className="font-medium text-zinc-300 mt-0.5">
              {user.mfaEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROMINENT ACCOUNT MANAGEMENT SECTION (ADMIN OPERATIONS ONLY)               */}
      {/* ========================================================================= */}
      <section className="bg-[#0D1117] border-2 border-amber-500/30 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500" />
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Account Management</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                Staff Administrator Control
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Authoritative identity lifecycle controls, session invalidation, and regulatory account anonymization.
            </p>
          </div>

          {/* Current Account Status Indicator */}
          <div className="flex items-center gap-2 bg-[#090C10] border border-zinc-800 px-3.5 py-2 rounded-xl text-xs">
            <span className="text-zinc-400 font-mono text-[11px] uppercase">Account Status:</span>
            {isAnonymized ? (
              <span className="font-semibold text-zinc-400 inline-flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Anonymized / Inactive</span>
              </span>
            ) : user.isActive ? (
              <span className="font-semibold text-emerald-400 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active (Full Privileges)</span>
              </span>
            ) : (
              <span className="font-semibold text-red-400 inline-flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Suspended (Sessions Revoked)</span>
              </span>
            )}
          </div>
        </div>

        {/* Self-Account Safeguard Notice */}
        {isCurrentAdmin && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Self-Protection Safeguard:</strong> You are viewing your own administrative account. To prevent platform lockout, administrators cannot suspend or delete their own accounts.
            </div>
          </div>
        )}

        {/* Anonymized Notice */}
        {isAnonymized && (
          <div className="p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Account Anonymized:</strong> Personal identifiable information has been permanently scrubbed. Financial records and double-entry ledger journals remain preserved for audit compliance.
            </div>
          </div>
        )}

        {/* Action Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1: Suspension / Reactivation */}
          <div className="p-4 rounded-xl bg-[#090C10] border border-zinc-800 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Ban className="w-4 h-4 text-amber-400" />
                <span>Authentication & Session Access</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {user.isActive
                  ? 'Suspending this account immediately revokes all active JWT sessions, invalidates pending password reset and email verification tokens, and prevents subsequent sign-ins.'
                  : 'Reactivating this account restores the user’s ability to authenticate, receive notifications, and access their subledger assets.'}
              </p>
            </div>

            <div>
              {user.isActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionModal('suspend');
                    setActionReason('');
                  }}
                  disabled={isCurrentAdmin || actionLoading || isAnonymized}
                  title={isCurrentAdmin ? 'Administrators cannot suspend their own account' : 'Suspend account'}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 disabled:opacity-40 disabled:hover:bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-semibold transition inline-flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>Suspend Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActionModal('reactivate');
                    setActionReason('');
                  }}
                  disabled={actionLoading || isAnonymized}
                  title="Reactivate account"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 disabled:hover:bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Reactivate Account</span>
                </button>
              )}
            </div>
          </div>

          {/* Action 2: Anonymization / Deletion */}
          <div className="p-4 rounded-xl bg-[#090C10] border border-zinc-800 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Account Anonymization & Deletion</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Permanently deactivates the account and scrubs PII (full name, email, credentials) while preserving financial ledger entries and audit records to maintain database referential integrity.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setActionModal('delete');
                  setActionReason('');
                  setConfirmEmailInput('');
                }}
                disabled={isCurrentAdmin || isAnonymized || actionLoading}
                title={
                  isCurrentAdmin
                    ? 'Administrators cannot delete their own account'
                    : isAnonymized
                    ? 'Account has already been anonymized'
                    : 'Permanently anonymize and delete user account'
                }
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-red-950/40 disabled:opacity-40 disabled:hover:bg-zinc-800 border border-zinc-700 hover:border-red-500/40 text-zinc-300 hover:text-red-300 text-xs font-semibold transition inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Anonymize/Delete Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Safeguards Summary Footer */}
        <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 space-y-1 leading-relaxed">
          <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Platform Safeguards & Regulatory Rules</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-400 pl-1">
            <li><strong>Balance Check:</strong> Deletion is rejected if user possesses positive settled balances (current balance: ${accounts?.totalBalanceUsd || '0.00'} USD).</li>
            <li><strong>Pending Transactions:</strong> Deletion is rejected if unresolved pending transactions exist (pending count: {pendingTxCount}).</li>
            <li><strong>Audit Logging:</strong> All administrative lifecycle changes are permanently logged to the PostgreSQL audit trail with admin attribution and reason.</li>
          </ul>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PROMINENT INVESTMENT MANAGEMENT SECTION                                   */}
      {/* ========================================================================= */}
      <section className="bg-[#0D1117] border-2 border-indigo-500/30 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Investment Management</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                Staff Administrator Control
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Manage the investment amount recorded for this user and displayed on their dashboard. Changes require an audit reason and do not alter double-entry ledger balances.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenEditInvestment}
            disabled={actionLoading || isAnonymized}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white transition inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Sliders className="w-4 h-4" />
            <span>{investmentRecord?.hasRecord ? 'Edit Investment Amount' : 'Record Investment Amount'}</span>
          </button>
        </div>

        {/* Current Investment Record Display */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Recorded Investment Amount</div>
            {investmentRecord?.hasRecord && investmentRecord.amount !== null ? (
              <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5 mt-1">
                <span>{investmentRecord.amount}</span>
                <span className="text-xs font-mono text-indigo-400 font-semibold">{investmentRecord.currency}</span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic mt-2">
                No investment amount has been recorded yet.
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Currency</div>
            <div className="text-sm font-semibold text-zinc-200 mt-1">
              {investmentRecord?.hasRecord && investmentRecord.currency ? investmentRecord.currency : '—'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Last Updated Date</div>
            <div className="text-xs font-mono text-zinc-300 mt-1">
              {investmentRecord?.updatedAt ? new Date(investmentRecord.updatedAt).toLocaleString() : 'Never'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1">
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Administrator Responsible</div>
            <div className="text-xs font-mono text-indigo-300 truncate mt-1" title={investmentRecord?.updatedByAdminEmail || ''}>
              {investmentRecord?.updatedByAdminEmail || (investmentRecord?.hasRecord ? 'System Admin' : '—')}
            </div>
          </div>
        </div>

        {investmentRecord?.lastReason && (
          <div className="p-3.5 rounded-xl bg-[#090C10] border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-zinc-300">Latest Recorded Reason:</strong> {investmentRecord.lastReason}
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 px-3 text-xs font-medium transition flex items-center gap-2 border-b-2 ${
            activeTab === 'accounts'
              ? 'border-amber-400 text-amber-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Subledger Accounts & Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-3 text-xs font-medium transition flex items-center gap-2 border-b-2 ${
            activeTab === 'transactions'
              ? 'border-amber-400 text-amber-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Financial Transactions ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-3 text-xs font-medium transition flex items-center gap-2 border-b-2 ${
            activeTab === 'security'
              ? 'border-amber-400 text-amber-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Security & Immutability Attestation</span>
        </button>
      </div>

      {/* TAB 1: ACCOUNTS & BALANCES */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0D1117] border border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Authoritative Portfolio Valuation
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {accounts?.hasAccounts && accounts.totalBalanceUsd ? (
                  <span>${Number(accounts.totalBalanceUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-zinc-400 font-mono">USD</span></span>
                ) : (
                  <span className="text-zinc-500">— Unprovisioned Subledger</span>
                )}
              </div>
            </div>
            <div className="text-xs text-zinc-400 max-w-sm">
              Derived directly from double-entry <code className="text-amber-400 font-mono">account_balances</code>. Read-only inspection.
            </div>
          </div>

          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden">
            {!accounts?.hasAccounts || accounts.accounts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="text-xs font-semibold text-white">No Subledger Accounts Provisioned</div>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  This user has registered but has not yet established subledger deposit or equity accounts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 font-medium">Account Number</th>
                      <th className="py-3 px-4 font-medium">Asset</th>
                      <th className="py-3 px-4 font-medium">Category / Type</th>
                      <th className="py-3 px-4 font-medium text-right">Settled Balance</th>
                      <th className="py-3 px-4 font-medium text-right">Available Balance</th>
                      <th className="py-3 px-4 font-medium text-right">Pending</th>
                      <th className="py-3 px-4 font-medium text-right">USD Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {accounts.accounts.map((acct) => (
                      <tr key={acct.accountId} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4 text-zinc-300 font-semibold">{acct.accountNumber}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white">{acct.asset}</span>{' '}
                          <span className="text-[10px] text-zinc-400 font-sans">({acct.assetName})</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-sans text-[11px]">
                          {acct.accountType} / {acct.accountCategory}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-semibold">{acct.settledBalance}</td>
                        <td className="py-3 px-4 text-right text-emerald-400">{acct.availableBalance}</td>
                        <td className="py-3 px-4 text-right text-amber-400/80">{acct.pendingBalance}</td>
                        <td className="py-3 px-4 text-right text-zinc-200 font-semibold">
                          ${Number(acct.functionalUsdBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Activity className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-xs font-semibold text-white">No Financial Transactions</div>
              <p className="text-xs text-zinc-400">
                No double-entry financial transactions recorded for this user.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090C10] text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-medium">Ref / ID</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">Lifecycle Status</th>
                    <th className="py-3 px-4 font-medium">Direction</th>
                    <th className="py-3 px-4 font-medium text-right">Native Amount</th>
                    <th className="py-3 px-4 font-medium text-right">USD Valuation</th>
                    <th className="py-3 px-4 font-medium text-right">Settled / Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 px-4 text-zinc-300 font-semibold">{tx.transactionRef}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
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
                        {new Date(tx.settledAt || tx.createdAt).toLocaleString(undefined, {
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
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Identity Security & Sensitive Field Exclusion</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            In compliance with strict security requirements, administrative endpoints and interfaces never retrieve or display password hashes (<code className="font-mono text-zinc-300">password_hash</code>), multi-factor secrets (<code className="font-mono text-zinc-300">mfa_secret</code>), or active session token digests (<code className="font-mono text-zinc-300">session_token_hash</code>).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Authentication Hashing</div>
              <div className="text-zinc-200 font-medium">Argon2id (Memory-hardened 64 MiB, 3 iterations)</div>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Audit Immutability</div>
              <div className="text-emerald-400 font-medium">Guarded by PostgreSQL DB triggers</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUSPEND ACCOUNT */}
      {actionModal === 'suspend' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <Ban className="w-5 h-5" />
              <span>Confirm Account Suspension</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1">
              <div>Target User: <span className="font-semibold text-white">{user.fullName}</span></div>
              <div>Email: <span className="font-mono text-amber-400">{user.email}</span></div>
              <div>UUID: <span className="font-mono text-zinc-500">{user.id}</span></div>
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
                  placeholder="e.g. Compliance hold pending KYC re-verification"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActionModal(null)}
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
      {actionModal === 'reactivate' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Account Reactivation</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1">
              <div>Target User: <span className="font-semibold text-white">{user.fullName}</span></div>
              <div>Email: <span className="font-mono text-emerald-400">{user.email}</span></div>
              <div>UUID: <span className="font-mono text-zinc-500">{user.id}</span></div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Reactivating this account will restore platform access and allow the user to authenticate and manage their custodial assets normally.
            </p>
            <form onSubmit={handleReactivate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Reactivation Reason (Required)</label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. KYC verification completed successfully"
                  className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setActionModal(null)}
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
      {actionModal === 'delete' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Controlled Account Removal & Anonymization</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1">
              <div>Target User: <span className="font-semibold text-white">{user.fullName}</span></div>
              <div>Target Email: <span className="font-mono text-amber-400">{user.email}</span></div>
              <div>UUID: <span className="font-mono text-zinc-500">{user.id}</span></div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Safeguards & Regulatory Notice</span>
              </div>
              <p>
                This operation irreversibly deactivates the account and anonymizes personal data. Double-entry financial subledgers and immutable audit logs are preserved for regulatory compliance.
              </p>
              <p className="text-[11px] text-amber-300/80">
                <strong>Why this action may be blocked:</strong> The backend will strictly reject deletion if this account holds positive settled balances (current: ${accounts?.totalBalanceUsd || '0.00'} USD) or pending unresolved transactions (current: {pendingTxCount}).
              </p>
            </div>
            <form onSubmit={handleAnonymizeDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-400">
                  Type <span className="text-amber-400 font-semibold select-all">{user.email}</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmEmailInput}
                  onChange={(e) => setConfirmEmailInput(e.target.value)}
                  placeholder={user.email}
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
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    actionLoading ||
                    confirmEmailInput.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
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

      {/* MODAL: EDIT INVESTMENT AMOUNT */}
      {editInvestmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1117] border border-indigo-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Sliders className="w-5 h-5" />
              <span>{investmentRecord?.hasRecord ? 'Edit User Investment Amount' : 'Record User Investment Amount'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090C10] border border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Target User:</span>
                <span className="font-semibold text-white">{user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Email:</span>
                <span className="font-mono text-amber-400">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Valuation:</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {investmentRecord?.hasRecord && investmentRecord.amount !== null
                    ? `${investmentRecord.amount} ${investmentRecord.currency}`
                    : 'None (Unrecorded)'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200/90 space-y-1 leading-relaxed">
              <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Financial Integrity Notice</span>
              </div>
              <p>
                This administrative reference value will be displayed directly on the user’s investor dashboard under <strong>My Investment</strong>. It does not alter wallet balances, pending withdrawals, or authoritative double-entry journal entries.
              </p>
            </div>

            <form onSubmit={handleSaveInvestmentRecord} className="space-y-4">
              {!investConfirmStep ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">Investment Amount (&ge; 0)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={investAmountInput}
                        onChange={(e) => setInvestAmountInput(e.target.value)}
                        placeholder="e.g. 250000.00"
                        className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">Currency</label>
                      <select
                        value={investCurrencyInput}
                        onChange={(e) => setInvestCurrencyInput(e.target.value)}
                        className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
                      >
                        <option value="USD">USD</option>
                        <option value="USDT">USDT</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="SOL">SOL</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-zinc-400">Reason for Entry / Change (Required)</label>
                    <textarea
                      required
                      rows={2}
                      value={investReasonInput}
                      onChange={(e) => setInvestReasonInput(e.target.value)}
                      placeholder="e.g. Institutional subscription agreement tranche #A-4819 verified by custodian"
                      className="w-full bg-[#090C10] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Confirm Administrative Record Change</span>
                  </div>
                  <p>
                    Are you sure you want to record an investment amount of{' '}
                    <strong className="text-white font-mono">{investAmountInput} {investCurrencyInput}</strong> for{' '}
                    <strong className="text-white">{user.email}</strong>?
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Audit Reason: &quot;{investReasonInput}&quot;
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={investLoading}
                  onClick={() => {
                    if (investConfirmStep) {
                      setInvestConfirmStep(false);
                    } else {
                      setEditInvestmentOpen(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  {investConfirmStep ? 'Back to Edit' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={
                    investLoading ||
                    !investAmountInput ||
                    parseFloat(investAmountInput) < 0 ||
                    isNaN(parseFloat(investAmountInput)) ||
                    investReasonInput.trim().length < 3
                  }
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  {investLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{investConfirmStep ? 'Confirm & Save Investment Record' : 'Review & Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
