'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Eye, Lock, FileCheck, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      title: 'Institutional MPC Custody Architecture',
      description:
        'Architectural design mandating multi-party computation (MPC) key-share management and air-gapped cold storage vaults to eliminate single points of cryptographic compromise.',
      icon: Shield,
    },
    {
      title: 'Time-Locked Multisig Governance',
      description:
        'Target access governance requiring multi-signature quorums and hardware security module (HSM) signing protocols for treasury authorization.',
      icon: Key,
    },
    {
      title: 'Algorithmic Circuit Breakers',
      description:
        'Pre-programmed risk parameters designed to enforce hard stop-loss thresholds, maximum single-venue liquidity exposure limits, and automated trading pauses.',
      icon: Lock,
    },
    {
      title: 'Continuous Transaction Monitoring Specifications',
      description:
        'Technical requirements for automated heuristic scanning of all inflows and outflows against anomalous velocity and protocol security boundaries.',
      icon: Eye,
    },
    {
      title: 'Verifiable Merkle State Proof Standards',
      description:
        'Planned cryptographic state trees to allow independent mathematical reconciliation of pooled balances, liabilities, and audit checkpoints.',
      icon: FileCheck,
    },
    {
      title: 'Multi-Signature Withdrawal Protection',
      description:
        'Designed distribution workflow requiring multi-party verification and configurable time delay buffers before asset release.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="security" className="py-20 sm:py-28 relative border-t border-light-border dark:border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono font-semibold text-brand-coral shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURITY ARCHITECTURE SPECIFICATIONS</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
            Target Security Architecture & Governance
          </h2>
          <p className="text-light-textSecondary dark:text-dark-textSecondary text-sm sm:text-base leading-relaxed">
            Institutional criteria and security specifications established for Cryptiq platform custody and algorithmic deployment.
          </p>
        </div>

        {/* 6 Security Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: idx * 0.05 }}
                className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-7 shadow-card-light dark:shadow-card-dark hover:border-brand-coral/40 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-center text-brand-coral mb-5 group-hover:scale-110 group-hover:bg-brand-coral group-hover:text-white transition-all shadow-sm">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-lg text-light-textPrimary dark:text-dark-textPrimary mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Honest Disclosure Box */}
        <div className="p-4 rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border flex items-start gap-3 text-xs text-light-textMuted dark:text-dark-textMuted max-w-3xl mx-auto shadow-sm font-mono">
          <AlertCircle className="w-4 h-4 text-brand-coral flex-shrink-0 mt-0.5" />
          <span>
            Development Notice: The specifications above define the mandatory criteria established for Cryptiq custody and trading infrastructure deployment. Institutional custody integrations and smart contract systems are actively being developed under Milestone 2.
          </span>
        </div>
      </div>
    </section>
  );
};
