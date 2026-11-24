'use client';

import React from 'react';
import Link from 'next/link';
import { AlertOctagon, Shield, Terminal, ArrowUpRight } from 'lucide-react';

export const FooterSection: React.FC = () => {
  return (
    <footer className="relative border-t border-border bg-background pt-16 pb-12 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Comprehensive Financial Risk Disclosure Banner */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border/90 text-xs text-text-secondary space-y-3 leading-relaxed">
          <div className="flex items-center gap-2 text-amber font-bold text-sm">
            <AlertOctagon className="w-4 h-4 text-amber" />
            <span>IMPORTANT REGULATORY & INVESTMENT RISK DISCLOSURE</span>
          </div>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Trading and investing in digital assets, cryptocurrencies, and algorithmic strategies involve a high degree
            of risk. Digital asset prices are highly volatile and subject to substantial fluctuations, sudden liquidity
            events, and technological disruptions. An investor may lose some or all of their invested capital.
          </p>
          <p className="text-text-muted text-[11px] leading-relaxed">
            No guaranteed yields or risk-free returns exist in digital asset markets. Any reference to hypothetical
            performance, return models (including the illustrative 3% daily mathematical scenario), or algorithmic
            projections is provided solely for educational and design evaluation purposes and does not reflect actual,
            historical, or guaranteed outcomes. Cryptiq does not provide financial, investment, legal, or tax advice.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <div className="font-bold text-text-primary tracking-wider uppercase">Platform</div>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="#how-it-works" className="hover:text-electric-cyan transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-electric-cyan transition-colors">
                  3% Yield Calculator
                </a>
              </li>
              <li>
                <a href="#ledger" className="hover:text-electric-cyan transition-colors">
                  Live Ledger Activity
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-electric-cyan transition-colors">
                  Security Architecture
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-text-primary tracking-wider uppercase">Supported Assets</div>
            <ul className="space-y-2 text-text-muted">
              <li>Bitcoin (BTC)</li>
              <li>Ethereum (ETH)</li>
              <li>Solana (SOL)</li>
              <li>Tether USD (USDT)</li>
              <li>Institutional Multi-Token Vaults</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-text-primary tracking-wider uppercase">Legal & Compliance</div>
            <ul className="space-y-2 text-text-muted">
              <li>
                <span className="cursor-pointer hover:text-electric-cyan">Terms of Service</span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-electric-cyan">Privacy Policy</span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-electric-cyan">Risk Disclosure</span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-electric-cyan">Custody Agreement</span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-electric-cyan">AML & KYC Framework</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-text-primary tracking-wider uppercase">System Telemetry</div>
            <div className="p-3 rounded-lg bg-surface border border-border space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span>GATEWAY:</span>
                <span className="text-emeraldSuccess font-bold">ONLINE</span>
              </div>
              <div className="flex items-center justify-between">
                <span>CONSENSUS:</span>
                <span className="text-electric-cyan font-bold">EPOCH #21849</span>
              </div>
              <div className="flex items-center justify-between">
                <span>ENGINE:</span>
                <span className="text-text-primary">v1.0.4-PHASE1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Brand Bar */}
        <div className="pt-8 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-3">
            <span className="font-bold text-text-primary font-heading tracking-widest">CRYPTIQ</span>
            <span>© 2026 CRYPTIQ INC. ALL RIGHTS RESERVED.</span>
          </div>
          <div className="text-[11px] text-text-secondary">
            ENGINEERED FOR INSTITUTIONAL DIGITAL ASSET MANAGEMENT
          </div>
        </div>
      </div>
    </footer>
  );
};
