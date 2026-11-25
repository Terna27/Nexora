'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  LayoutDashboard,
  FileText,
  LogOut,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm font-mono text-zinc-400">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state (unauthenticated or non-admin)
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0D1117] border border-red-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Administrative Privileges Required</h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Access to the Nexora administrative console is restricted to authorized staff. Every access attempt is logged with client telemetry to the durable audit trail.
          </p>
          <div className="bg-[#090C10] border border-zinc-800 rounded-xl p-3 mb-6 text-xs font-mono text-zinc-400 text-left">
            <div>Status: <span className="text-red-400 font-semibold">403 Forbidden</span></div>
            <div>User: <span className="text-zinc-300">{user?.email || 'Anonymous'}</span></div>
            <div>Assigned Role: <span className="text-amber-400 font-semibold">{user?.role || 'None'}</span></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition text-center"
            >
              Return to Dashboard
            </Link>
            {!user && (
              <Link
                href="/login"
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition text-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/admin/users', label: 'User Directory', icon: Users, exact: false },
    { href: '/admin/audit-logs', label: 'Audit Trail', icon: FileText, exact: false },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-zinc-100 flex flex-col antialiased">
      {/* Top Banner & Security Chrome */}
      <header className="border-b border-zinc-800/80 bg-[#0A0D14]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-bold text-black text-base shadow-lg shadow-amber-500/20">
                N
              </div>
              <span className="font-semibold tracking-tight text-white group-hover:text-amber-400 transition">
                NEXORA
              </span>
            </Link>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>STAFF ADMIN</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 transition"
            >
              <span>Investor Portal</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </Link>

            <ThemeToggle />

            <div className="h-4 w-px bg-zinc-800" />

            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-semibold">
                {user.fullName?.charAt(0) || 'A'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <div className="font-medium text-white truncate max-w-[120px]">{user.fullName}</div>
                <div className="text-[10px] text-zinc-400 font-mono">admin role</div>
              </div>
            </div>

            <button
              onClick={() => logout().then(() => router.push('/login'))}
              title="Sign Out"
              className="p-1.5 text-zinc-400 hover:text-red-400 transition rounded-lg hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl p-4 sticky top-24 space-y-6">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-3 mb-2">
                Console Navigation
              </div>
              <nav className="space-y-1">
                {navLinks.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Immutability & Safety Badge */}
            <div className="pt-4 border-t border-zinc-800/80">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Database className="w-3.5 h-3.5" />
                  <span>PostgreSQL Immutability</span>
                </div>
                <p className="text-[10px] leading-relaxed text-zinc-500">
                  Audit records and settled transactions are guarded by database triggers. Balance manipulation is prohibited.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
