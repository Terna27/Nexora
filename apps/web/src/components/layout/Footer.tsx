'use client';

import React from 'react';
import { AlertOctagon } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pt-16 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Comprehensive Regulatory & Investment Risk Disclosure Banner */}
        <div className="p-6 sm:p-7 rounded-3xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-textSecondary dark:text-dark-textSecondary space-y-3 leading-relaxed">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold font-mono text-sm">
            <AlertOctagon className="w-4 h-4 text-amber-500" />
            <span>IMPORTANT FINANCIAL & REGULATORY RISK DISCLOSURE</span>
          </div>
          <p className="text-[11px] leading-relaxed text-light-textSecondary dark:text-dark-textSecondary">
            Digital asset trading and cryptocurrency investments involve a high degree of financial risk, market volatility, and liquidity unpredictability. Users may lose some or all of their deposited capital. Past performance and algorithmic modeling simulations do not guarantee or predict future results.
          </p>
          <p className="text-[11px] leading-relaxed text-light-textMuted dark:text-dark-textMuted">
            Any reference to a 3% daily return represents a hypothetical mathematical scenario for modeling purposes. It is not an established, achievable, guaranteed, historical, or expected daily return. Cryptiq does not provide registered investment advisory, banking, or tax services.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs font-sans">
          {/* Col 1: Platform */}
          <div className="space-y-3">
            <div className="font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-wider uppercase">
              Platform
            </div>
            <ul className="space-y-2 text-light-textSecondary dark:text-dark-textSecondary">
              <li>
                <a href="#overview" className="hover:text-brand-coral transition-colors">
                  Overview
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-brand-coral transition-colors">
                  3% Yield Calculator
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-brand-coral transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pool-activity" className="hover:text-brand-coral transition-colors">
                  Live Pool Activity
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-brand-coral transition-colors">
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Supported Assets */}
          <div className="space-y-3">
            <div className="font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-wider uppercase">
              Supported Assets
            </div>
            <ul className="space-y-2 text-light-textSecondary dark:text-dark-textSecondary">
              <li>Bitcoin (BTC)</li>
              <li>Ethereum (ETH)</li>
              <li>Solana (SOL)</li>
              <li>Tether USD (USDT)</li>
              <li>Multi-Asset Institutional Vaults</li>
            </ul>
          </div>

          {/* Col 3: Compliance & Legal */}
          <div className="space-y-3">
            <div className="font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-wider uppercase">
              Legal & Compliance
            </div>
            <ul className="space-y-2 text-light-textSecondary dark:text-dark-textSecondary">
              <li>
                <span className="hover:text-brand-coral transition-colors cursor-pointer">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="hover:text-brand-coral transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-brand-coral transition-colors cursor-pointer">
                  Risk Disclosure
                </span>
              </li>
              <li>
                <span className="hover:text-brand-coral transition-colors cursor-pointer">
                  Custody Framework
                </span>
              </li>
              <li>
                <span className="hover:text-brand-coral transition-colors cursor-pointer">
                  AML / KYC Policy
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform Status */}
          <div className="space-y-3">
            <div className="font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-wider uppercase">
              Development Status
            </div>
            <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-light-textSecondary dark:text-dark-textSecondary">STAGE:</span>
                <span className="text-yield-emerald font-bold">
                  MILESTONE 1 (CORE UI)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-light-textSecondary dark:text-dark-textSecondary">CALCULATOR:</span>
                <span className="text-light-textPrimary dark:text-dark-textPrimary font-semibold">
                  FUNCTIONAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-light-textSecondary dark:text-dark-textSecondary">CUSTODY INTEGRATION:</span>
                <span className="text-brand-coral font-semibold">SCHEDULED (M2)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Brand & Copyright Bar */}
        <div className="pt-8 border-t border-light-border dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-light-textMuted dark:text-dark-textMuted">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-gradient flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 9.5a4 4 0 1 0 0 5" />
              </svg>
            </div>
            <span className="font-heading font-extrabold text-light-textPrimary dark:text-dark-textPrimary tracking-wider">
              CRYPTIQ
            </span>
            <span>&copy; 2026 Cryptiq Inc. All rights reserved.</span>
          </div>

          <div className="text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary">
            INSTITUTIONAL CRYPTO LIQUIDITY PLATFORM CONCEPT
          </div>
        </div>
      </div>
    </footer>
  );
};
