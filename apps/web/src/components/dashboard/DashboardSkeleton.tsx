'use client';

import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-dark-bg p-4 sm:p-6 lg:p-8 animate-pulse">
      {/* Top Navigation Skeleton */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-8 h-16 bg-white dark:bg-dark-card rounded-3xl px-6 border border-light-border dark:border-dark-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="hidden md:flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-20 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 h-9 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="w-36 h-11 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Sidebar Skeleton (desktop) */}
        <div className="hidden lg:flex flex-col gap-4 w-16">
          <div className="h-24 bg-white dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border" />
          <div className="h-80 bg-white dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border" />
          <div className="h-24 bg-white dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border" />
        </div>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 space-y-6">
          {/* Greeting Skeleton */}
          <div className="space-y-2">
            <div className="w-64 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-96 h-4 rounded bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Top Row: 3-column Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 bg-white dark:bg-dark-card rounded-3xl border border-light-border dark:border-dark-border" />
            <div className="h-80 bg-white dark:bg-dark-card rounded-3xl border border-light-border dark:border-dark-border" />
            <div className="h-80 bg-white dark:bg-dark-card rounded-3xl border border-light-border dark:border-dark-border" />
          </div>

          {/* Bottom Row: 2-column Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-96 bg-white dark:bg-dark-card rounded-3xl border border-light-border dark:border-dark-border" />
            <div className="lg:col-span-7 h-96 bg-white dark:bg-dark-card rounded-3xl border border-light-border dark:border-dark-border" />
          </div>
        </div>
      </div>
    </div>
  );
};
