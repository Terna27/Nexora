'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminBootstrapStatusResponse } from '@cryptiq/types';
import {
  ShieldCheck,
  Lock,
  Database,
  Key,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  FileText,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminSecurityPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [bootstrapStatus, setBootstrapStatus] = useState<AdminBootstrapStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkSecurityStatus() {
      try {
        const res = await cryptiqApi.getBootstrapStatus();
        if (mounted) {
          setBootstrapStatus(res);
        }
      } catch (err) {
        console.error('Failed to load security status:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkSecurityStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Administrator Account & Security Posture</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Active staff identity credentials, platform security boundaries, and immutable governance controls.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? 'Revoking Session...' : 'Sign Out Administrator'}</span>
        </button>
      </div>

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Administrator Profile Card */}
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{user?.fullName || 'Administrator'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-400 font-mono">{user?.email}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  STAFF ADMIN
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-zinc-800/80 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/40">
              <span className="text-zinc-400">Account ID</span>
              <span className="font-mono text-zinc-200">{user?.id || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/40">
              <span className="text-zinc-400">Identity Verification</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/40">
              <span className="text-zinc-400">Assigned Role</span>
              <span className="font-mono text-amber-400 uppercase font-semibold">{user?.role || 'admin'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/40">
              <span className="text-zinc-400">Session Policy</span>
              <span className="text-zinc-300 font-mono">72-hr rolling / Revocable</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-zinc-400">Account Created</span>
              <span className="text-zinc-300 font-mono">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center justify-between w-full p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 text-xs text-zinc-300 font-medium transition"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>View My Administrative Actions in Audit Trail</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </Link>
          </div>
        </div>

        {/* Platform Security Boundaries & Policies */}
        <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Platform Security Controls</h2>
          </div>

          <div className="space-y-4">
            {/* Bootstrap Status */}
            <div className="p-3.5 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">First Administrator Bootstrap</span>
                {loading ? (
                  <span className="text-zinc-500 animate-pulse font-mono">Checking...</span>
                ) : bootstrapStatus?.hasAdmin ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    LOCKED & SEALED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    OPEN
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                {bootstrapStatus?.hasAdmin
                  ? 'Initial administrative account has been bootstrapped. One-time bootstrap endpoint is permanently disabled.'
                  : 'Bootstrap token is active. No administrator has been provisioned yet.'}
              </p>
            </div>

            {/* PostgreSQL Immutability Trigger */}
            <div className="p-3.5 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Database Immutability Engine</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  ACTIVE
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Trigger <code className="text-emerald-300 font-mono">trg_guard_admin_audit_logs_immutability</code> enforces write-once behavior for all audit and financial ledger records.
              </p>
            </div>

            {/* Session Invalidation System */}
            <div className="p-3.5 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Real-Time Session Revocation</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  ENFORCED
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Suspending a user or signing out instantly revokes session records in the backend database. Cached tokens are rejected on next API request.
              </p>
            </div>

            {/* Pessimistic Locking & Idempotency */}
            <div className="p-3.5 rounded-xl bg-[#090C10] border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Withdrawal Approval Atomicity</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  FOR UPDATE
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Withdrawal review endpoints execute within PostgreSQL row-level locks to prevent double-approval race conditions and verify balance sufficiency.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Governance Standard Notice */}
      <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
        <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Operations Console Access Governance</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Administrative accounts hold elevated privileges for platform operations, account status management, and withdrawal processing.
          All actions—including viewing user profiles, inspecting balances, and approving or rejecting withdrawals—are recorded with IP address,
          timestamp, and actor identity to PostgreSQL audit tables that cannot be deleted or altered.
        </p>
      </div>
    </div>
  );
}
