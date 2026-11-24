'use client';

import React from 'react';
import { Shield, Key, Eye, Lock, FileCheck, CheckCircle2 } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      title: 'Institutional Custody Approach',
      description:
        'Architected for air-gapped cold storage and multi-party computation (MPC) key-share management, eliminating single points of cryptographic failure.',
      icon: Shield,
    },
    {
      title: 'Strict Access Controls',
      description:
        'Role-based access governance with time-locked multisig quorums and hardware security module (HSM) signing requirements.',
      icon: Key,
    },
    {
      title: 'Continuous Transaction Monitoring',
      description:
        'Real-time automated heuristic scanning of all inflows and outflows against known sanctions lists, suspicious patterns, and anomalous velocity.',
      icon: Eye,
    },
    {
      title: 'Algorithmic Safety Controls',
      description:
        'Execution guardrails enforcing hard stop-loss limits, maximum venue exposure ceilings, and circuit breakers against market fragmentation.',
      icon: Lock,
    },
    {
      title: 'Financial & Cryptographic Auditability',
      description:
        'Merkle-tree state proofs and transparent periodic accounting ensuring on-chain liabilities and assets are reconcilable at any epoch.',
      icon: FileCheck,
    },
    {
      title: 'Multi-Signature Withdrawal Authorization',
      description:
        'All outgoing capital distributions mandate multi-party human and algorithmic verification with configurable time delay buffers.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="security" className="relative py-20 border-t border-border/60 bg-background-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan font-mono text-xs tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL DEFENSE ARCHITECTURE</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-text-primary">
            ENGINEERED SECURITY & INTEGRITY
          </h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            Cryptiq implements a rigorous zero-trust security paradigm designed to safeguard institutional digital assets
            through deep cryptographic isolation and strict operational governance.
          </p>
        </div>

        {/* Security Grid */}
        <div
          data-crawl-target="security-panel"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {securityPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-surface/90 border border-border p-7 hover:border-electric-cyan/50 transition-all group backdrop-blur-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mb-5 group-hover:border-electric-cyan transition-colors shadow-sm">
                  <Icon className="w-6 h-6 text-electric-cyan" />
                </div>
                <h3 className="font-heading font-bold text-lg text-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Audit Compliance Verification Notice */}
        <div className="mt-12 p-5 rounded-2xl bg-surface border border-border text-center max-w-3xl mx-auto font-mono text-xs text-text-muted space-y-1">
          <div className="text-text-secondary font-semibold">
            INDEPENDENT CODE VERIFICATION & CONTINUOUS AUDIT CADENCE
          </div>
          <div>
            Formal protocol verification, smart contract audits, and penetration tests are scheduled prior to live custody deployment.
          </div>
        </div>
      </div>
    </section>
  );
};
