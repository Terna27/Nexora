'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, TrendingUp, ShieldCheck, Calculator } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const quickLinks = [
    { title: '3% Daily Yield Calculator', href: '#calculator', icon: Calculator, badge: 'Tool' },
    { title: 'Algorithmic Treasury Model', href: '#how-it-works', icon: TrendingUp, badge: 'Strategy' },
    { title: 'Institutional MPC Custody', href: '#security', icon: ShieldCheck, badge: 'Security' },
    { title: 'Live Trading Pool Activity', href: '#pool-activity', icon: TrendingUp, badge: 'Ledger' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative w-full max-w-xl rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-5 shadow-2xl z-10"
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-light-border dark:border-dark-border">
            <Search className="w-5 h-5 text-brand-coral" />
            <input
              type="text"
              autoFocus
              placeholder="Search Cryptiq yields, assets, vaults, documentation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textMuted dark:placeholder-dark-textMuted focus:outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-full text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-bg dark:hover:bg-dark-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="pt-4 pb-2 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-light-textSecondary dark:text-dark-textSecondary px-2">
              Suggested Navigation
            </div>
            <div className="space-y-1">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.title}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-light-bg dark:hover:bg-dark-borderSubtle transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-brand-coral/10 text-brand-coral group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-light-textPrimary dark:text-dark-textPrimary">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-light-border dark:bg-dark-border text-light-textSecondary dark:text-dark-textSecondary">
                        {item.badge}
                      </span>
                      <ArrowRight className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary group-hover:text-brand-coral transition-colors" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
