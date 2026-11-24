'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator, ShieldAlert } from 'lucide-react';
import { BentoDashboard } from './BentoDashboard';

export const HeroSection: React.FC = () => {
  return (
    <section id="overview" className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Hero Top Copy Block */}
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Subtle Tagline Pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-sm text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary"
          >
            <span className="flex h-2 w-2 rounded-full bg-brand-coral" />
            <span className="text-light-textPrimary dark:text-dark-textPrimary font-bold">Cryptiq Protocol</span>
            <span className="text-light-textMuted dark:text-dark-textMuted">|</span>
            <span className="text-brand-coral font-mono">3% Daily — Hypothetical Scenario</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-light-textPrimary dark:text-dark-textPrimary leading-[1.08]"
          >
            Smarter Crypto Yield.{' '}
            <span className="text-transparent bg-clip-text bg-brand-gradient">
              3% Daily, Automated.
            </span>
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="text-base sm:text-xl text-light-textSecondary dark:text-dark-textSecondary max-w-2xl mx-auto leading-relaxed font-sans"
          >
            Cryptiq is an institutional digital asset investment platform concept designed to pool crypto liquidity into automated algorithmic trading strategies.
          </motion.p>

          {/* Genuine Action Navigation Links */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-wrap items-center justify-center gap-3.5 pt-2"
          >
            <a
              href="#calculator"
              className="px-8 py-3.5 rounded-full bg-brand-gradient text-white text-sm font-bold tracking-wide shadow-coral-button hover:opacity-95 hover:shadow-lg transition-all flex items-center gap-2 group"
            >
              <Calculator className="w-4 h-4" />
              <span>Explore 3% Calculator</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <a
              href="#how-it-works"
              className="px-7 py-3.5 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary hover:border-brand-coral/40 text-sm font-semibold tracking-wide transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>Architecture Blueprint</span>
            </a>
          </motion.div>

          {/* Hypothetical Scenario Disclosure */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono text-light-textMuted dark:text-dark-textMuted max-w-xl mx-auto"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>
              3% Daily — Hypothetical Scenario. Not an established or guaranteed return. Cryptocurrency trading involves substantial risk of loss.
            </span>
          </motion.div>
        </div>

        {/* Bento Dashboard Section */}
        <div className="pt-4">
          <BentoDashboard />
        </div>
      </div>
    </section>
  );
};
