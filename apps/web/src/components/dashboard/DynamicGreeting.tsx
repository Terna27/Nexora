'use client';

import React, { useMemo } from 'react';
import { User } from '@cryptiq/types';
import { ShieldCheck, AlertCircle, Clock, Building2 } from 'lucide-react';

interface DynamicGreetingProps {
  user: User;
}

export const DynamicGreeting: React.FC<DynamicGreetingProps> = ({ user }) => {
  // Determine greeting based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-mono font-medium text-[#64748B] dark:text-dark-textSecondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#FF512F]" />
            {formattedDate}
          </span>
          <span className="text-[#64748B]">•</span>
          <span className="text-xs font-mono text-[#64748B] dark:text-dark-textSecondary">
            USD Functional Currency
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141518] dark:text-white tracking-tight">
          {greeting}, {user.fullName || 'Investor'}
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-dark-textSecondary mt-1 max-w-2xl">
          Your financial overview, account activity, and investment information — all in one place.
        </p>
      </div>

      {/* Account Verification & Tier Badges */}
      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono font-semibold text-[#141518] dark:text-white shadow-sm">
          <Building2 className="w-3.5 h-3.5 text-[#FF512F]" />
          <span>Tier 1 Account</span>
        </div>

        {user.isVerified ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Identity Confirmed</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Email Pending</span>
          </div>
        )}
      </div>
    </div>
  );
};
