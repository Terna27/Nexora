'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  User as UserIcon, 
  ShieldCheck, 
  LogOut, 
  Settings,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from '@cryptiq/types';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export type DashboardTab = 'Overview' | 'Activity' | 'Manage' | 'Program' | 'Account' | 'Reports';

interface DashboardHeaderProps {
  user: User;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenSearch: () => void;
  onLogout: () => Promise<void>;
  onOpenSettings?: () => void;
  onOpenSecurity?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenSearch,
  onLogout,
  onOpenSettings,
  onOpenSecurity,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const tabs: DashboardTab[] = ['Overview', 'Activity', 'Manage', 'Program', 'Account', 'Reports'];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute initials
  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'NX';

  return (
    <header className="w-full mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Nexora Brand Identity */}
        <Link 
          href="/dashboard" 
          className="flex items-center gap-3 group focus:outline-none shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF512F] to-[#FF7847] flex items-center justify-center text-white shadow-coral-button group-hover:scale-105 transition-transform duration-300">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
              <path d="M15 9.5a4 4 0 1 0 0 5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-lg tracking-wider text-[#141518] dark:text-white leading-none">
              NEXORA
            </span>
            <span className="text-[10px] font-mono tracking-widest text-[#FF512F] uppercase font-semibold mt-0.5">
              Capital Markets
            </span>
          </div>
        </Link>

        {/* Center: Floating Horizontal Pill Navigation */}
        <nav 
          aria-label="Dashboard Primary Navigation" 
          className="hidden md:flex items-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full p-1.5 shadow-sm"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelectTab(tab)}
                className={`relative px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 z-10 focus:outline-none ${
                  isActive
                    ? 'text-white'
                    : 'text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[#141518] rounded-full z-[-1]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {tab}
              </button>
            );
          })}
        </nav>

        {/* Right: Utility Pill & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Utility Pill */}
          <div className="flex items-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full p-1 shadow-sm">
            {/* Search Button */}
            <button
              onClick={onOpenSearch}
              aria-label="Search dashboard"
              className="p-2 text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary dark:hover:text-white rounded-full transition-colors focus:outline-none"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications Button with real indicator */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                aria-label="View notifications"
                className="relative p-2 text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary dark:hover:text-white rounded-full transition-colors focus:outline-none"
              >
                <Bell className="w-4 h-4" />
                {/* Genuine indicator: unverified email notice if applicable */}
                {!user.isVerified && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF512F] ring-2 ring-white dark:ring-dark-card" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-xl p-4 z-50 text-left"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border mb-3">
                      <span className="text-xs font-semibold text-[#141518] dark:text-white uppercase tracking-wider">
                        Notifications
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        {!user.isVerified ? '1 Unread' : '0 Unread'}
                      </span>
                    </div>

                    {!user.isVerified ? (
                      <div className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Verify your email address</p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-0.5">
                            Check your inbox at <span className="font-mono">{user.email}</span> to confirm your account identity.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-[#64748B]">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                        No unread notifications. Account in good standing.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle Button */}
            <div className="pl-1">
              <ThemeToggle />
            </div>
          </div>

          {/* User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full py-1.5 pl-2 pr-3.5 shadow-sm hover:border-[#FF512F]/40 transition-colors focus:outline-none"
              aria-expanded={isProfileOpen}
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF512F] to-[#FF7847] flex items-center justify-center text-white text-xs font-bold font-mono shadow-sm shrink-0">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col text-left max-w-[120px]">
                <span className="text-xs font-bold text-[#141518] dark:text-white truncate">
                  {user.fullName || 'Investor'}
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-dark-textSecondary truncate">
                  {user.email}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] transition-transform duration-200" />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-xl p-2 z-50 text-left"
                >
                  {/* Account Summary Header */}
                  <div className="p-3 border-b border-light-border dark:border-dark-border mb-1">
                    <p className="text-xs font-bold text-[#141518] dark:text-white truncate">
                      {user.fullName}
                    </p>
                    <p className="text-[11px] text-[#64748B] truncate font-mono">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold uppercase text-[#141518] dark:text-white">
                        {user.role}
                      </span>
                      {user.isVerified ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenSettings ? onOpenSettings() : onSelectTab('Account');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#141518] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#64748B]" />
                      Profile Settings
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenSecurity ? onOpenSecurity() : onSelectTab('Manage');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#141518] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#64748B]" />
                      Security & 2FA
                    </button>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        Staff Admin Portal
                      </Link>
                    )}

                    <div className="my-1 border-t border-light-border dark:border-dark-border" />

                    <button
                      onClick={async () => {
                        setIsProfileOpen(false);
                        await onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Pill Navigation Bar */}
      <div className="flex md:hidden mt-3 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-full p-1 shadow-sm shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelectTab(tab)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#141518] text-white'
                    : 'text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
