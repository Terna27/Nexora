'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calculator, Menu, X, User as UserIcon, LogOut, LogIn } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';
import { useAuth } from '@/components/providers/AuthProvider';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', href: '/#overview' },
  { id: 'calculator', label: '3% Yield', href: '/#calculator' },
  { id: 'how-it-works', label: 'How It Works', href: '/#how-it-works' },
  { id: 'pool-activity', label: 'Live Pool', href: '/#pool-activity' },
  { id: 'security', label: 'Security', href: '/#security' },
];

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const item of NAV_ITEMS) {
        const id = item.id;
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveTab(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className="fixed top-4 inset-x-0 z-40 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-2 sm:p-2.5 rounded-full bg-light-card/90 dark:bg-dark-card/90 backdrop-blur-xl border border-light-border dark:border-dark-border shadow-pill-nav dark:shadow-pill-nav-dark transition-all duration-300 pointer-events-auto">
          {/* Left: Brand Emblem + Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-3 pl-2 sm:pl-3 group focus:outline-none"
          >
            <div className="relative w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-coral-button group-hover:scale-105 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
                <path d="M15 9.5a4 4 0 1 0 0 5" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-base tracking-wider text-light-textPrimary dark:text-dark-textPrimary">
                CRYPTIQ
              </span>
              <span className="text-[9px] font-mono tracking-widest text-brand-coral uppercase font-semibold -mt-0.5">
                Yield Platform
              </span>
            </div>
          </Link>

          {/* Center: Floating Pill Navigation with Framer Motion layoutId */}
          <nav className="hidden md:flex items-center p-1 rounded-full bg-light-bg/80 dark:bg-dark-borderSubtle/60 border border-light-border/60 dark:border-dark-border/60">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    isActive
                      ? 'text-light-textPrimary dark:text-dark-textPrimary'
                      : 'text-light-textSecondary dark:text-dark-textSecondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {item.label}
                    {item.id === 'calculator' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
                    )}
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Right: Search, ThemeToggle, Auth Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search Cryptiq"
              className="p-2.5 rounded-full bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:text-brand-coral dark:hover:text-brand-orange transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Light / Dark Mode Switcher */}
            <ThemeToggle />

            {/* Auth Actions */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-xs">
                  <div className="w-5 h-5 rounded-full bg-brand-coral/15 text-brand-coral flex items-center justify-center font-bold text-[10px]">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary max-w-[100px] truncate">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-2.5 rounded-full bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-full text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 transition-all"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-full bg-light-bg dark:bg-dark-card border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Pill Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="md:hidden mt-2 max-w-sm mx-auto rounded-3xl bg-light-card/95 dark:bg-dark-card/95 backdrop-blur-2xl border border-light-border dark:border-dark-border p-4 shadow-xl space-y-3 pointer-events-auto"
            >
              <div className="flex flex-col space-y-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-brand-coral/10 text-brand-coral font-bold'
                        : 'text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-bg dark:hover:bg-dark-borderSubtle'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="pt-2 border-t border-light-border dark:border-dark-border flex flex-col gap-2">
                {user ? (
                  <div className="flex items-center justify-between p-2 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle/40">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-coral/20 text-brand-coral flex items-center justify-center font-bold text-xs">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                          {user.fullName}
                        </span>
                        <span className="text-[10px] text-light-textSecondary dark:text-dark-textSecondary">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="p-2 text-light-textSecondary dark:text-dark-textSecondary hover:text-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 rounded-full border border-light-border dark:border-dark-border text-center text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary flex items-center justify-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 rounded-full bg-brand-gradient text-white text-center text-xs font-bold shadow-coral-button flex items-center justify-center gap-1.5"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Register</span>
                    </Link>
                  </div>
                )}

                <a
                  href="/#calculator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-full bg-light-bg dark:bg-dark-borderSubtle/50 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Calculator className="w-3.5 h-3.5 text-brand-coral" />
                  <span>3% Calculator</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Global Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
