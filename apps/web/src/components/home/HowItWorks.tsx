'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, Cpu, Clock, ShieldAlert, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Custodial Onboarding',
      subtitle: 'Target Custody Architecture',
      description:
        'Digital asset deposits (BTC, ETH, SOL, USDT) are designed to route through institutional multi-party computation (MPC) cold custody vaults with isolated key-share governance.',
      icon: ArrowDownToLine,
      badge: 'Architecture Phase',
    },
    {
      step: '02',
      title: 'Algorithmic Treasury Trading',
      subtitle: 'Target Execution Framework',
      description:
        'Pooled liquidity is planned to deploy into automated market-neutral strategies, cross-venue arbitrage, and structured liquidity provision governed by strict algorithmic risk budgets.',
      icon: Cpu,
      badge: 'Algorithm Framework',
    },
    {
      step: '03',
      title: 'Performance Settlement',
      subtitle: 'Target Payout Model',
      description:
        'Strategy performance is designed to be calculated and credited on periodic 24-hour cycles. Trading operations can yield positive or negative results depending on market conditions.',
      icon: Clock,
      badge: '24h Cycle Target',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono font-semibold text-brand-coral shadow-sm">
            <span>PROTOCOL LIFECYCLE</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
            How Cryptiq Works
          </h2>
          <p className="text-light-textSecondary dark:text-dark-textSecondary text-sm sm:text-base leading-relaxed">
            The planned three-phase architecture engineered for institutional digital asset liquidity and automated algorithmic performance.
          </p>
        </div>

        {/* 3-Card Bento Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: idx * 0.08 }}
                className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-7 sm:p-8 shadow-card-light dark:shadow-card-dark flex flex-col justify-between group hover:border-brand-coral/40 transition-all duration-300 relative overflow-hidden"
              >
                <div>
                  {/* Top Header with Step Number & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-heading font-black text-4xl text-light-border dark:text-dark-border group-hover:text-brand-coral transition-colors">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary font-semibold">
                      {item.badge}
                    </span>
                  </div>

                  {/* Icon Circle */}
                  <div className="w-12 h-12 rounded-2xl bg-brand-coral/10 text-brand-coral flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-heading font-bold text-xl text-light-textPrimary dark:text-dark-textPrimary mb-1">
                    {item.title}
                  </h3>
                  <div className="text-xs font-mono text-brand-coral mb-3">
                    {item.subtitle}
                  </div>
                  <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Footer Step Indicator */}
                <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs font-mono text-light-textMuted dark:text-dark-textMuted">
                  <span>Phase {item.step} of 03</span>
                  <ArrowRight className="w-4 h-4 text-brand-coral group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mandatory Performance Transparency Notice */}
        <div className="p-4 rounded-2xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border flex items-start gap-3.5 text-xs text-light-textSecondary dark:text-dark-textSecondary max-w-3xl mx-auto shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-light-textPrimary dark:text-dark-textPrimary font-semibold">Performance Transparency Notice:</strong> Investment performance resulting from trading operations is never guaranteed. Capital values fluctuate with market conditions, and trading strategies can experience losses as well as profits.
          </p>
        </div>
      </div>
    </section>
  );
};
