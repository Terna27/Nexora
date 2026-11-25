'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cryptiqApi } from '@cryptiq/api-client';
import {
  AdminUserDetail,
  AdminUserAccountsResponse,
  UserTransactionsListResponse,
  UserTransactionItem,
} from '@cryptiq/types';
import {
  Users,
  ArrowLeft,
  Shield,
  ShieldCheck,
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
} from 'lucide-react';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [accounts, setAccounts] = useState<AdminUserAccountsResponse | null>(null);
  const [transactions, setTransactions] = useState<UserTransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'security'>('accounts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const [userDetail, userAccts, userTxs] = await Promise.all([
          cryptiqApi.getAdminUserDetail(userId),
          cryptiqApi.getAdminUserAccounts(userId),
          cryptiqApi.getAdminUserTransactions(userId),
        ]);

        if (mounted) {
          if (!userDetail) {
            setError('User was not found or access was denied.');
          } else {
            setUser(userDetail);
            setAccounts(userAccts);
            setTransactions(userTxs?.items || []);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load user details.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [userId]);

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

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Directory</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-400">UUID: {user.id}</span>
      </div>

      {/* Profile Header Card */}
      <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">{user.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.isActive ? (
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
                <span>Email Verified</span>
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
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Active Sessions</div>
            <div className="font-medium text-emerald-400 mt-0.5 font-mono">
              {user.activeSessionsCount} active ({user.totalSessionsCount} total)
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Two-Factor MFA</div>
            <div className="font-medium text-zinc-300 mt-0.5">
              {user.mfaEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

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
          {/* Total Valuation Header */}
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

          {/* Accounts Table */}
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

          {/* Architectural Protection Banner */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Architectural Policy:</strong> Direct balance adjustments, simulated deposits, and manual transaction injections are strictly disabled. Financial balances are solely derived from double-entry journal postings.
            </p>
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
    </div>
  );
}
