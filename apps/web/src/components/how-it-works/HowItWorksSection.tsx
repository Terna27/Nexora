'use client';

import React from 'react';
import { ArrowDownToLine, Cpu, BarChart3, ShieldAlert } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'DEPOSIT DIGITAL ASSETS',
      subtitle: 'Institutional Custody Onboarding',
      description:
        "Users deposit supported cryptocurrencies (BTC, ETH, SOL, USDT) through Cryptiq's multi-party computation (MPC) and cold storage custody infrastructure.",
      icon: ArrowDownToLine,
      badge: 'ISOLATED VAULTS',
      badgeColor: 'border-electric-cyan text-electric-cyan',
    },
    {
      step: '02',
      title: 'TRADING OPERATIONS',
      subtitle: 'Controlled Algorithmic Infrastructure',
      description:
        'Authorized algorithmic trading models operate across vetted liquidity venues under strict risk budgets, real-time stop controls, and automated parameter guards.',
      icon: Cpu,
      badge: 'ALGORITHMIC ENGINE',
      badgeColor: 'border-neon-magenta text-neon-magenta',
    },
    {
      step: '03',
      title: 'PORTFOLIO PERFORMANCE',
      subtitle: 'Audited Intelligence & Settlement',
      description:
        'Users monitor actual performance, cryptographic transaction logs, and asset allocations through live portfolio reporting dashboards.',
      icon: BarChart3,
      badge: 'CRYSTALLINE AUDIT',
      badgeColor: 'border-amber text-amber',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan font-mono text-xs tracking-wider">
            <span>ARCHITECTURE WORKFLOW</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-text-primary">
            HOW CRYPTIQ WORKS
          </h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            A three-tier institutional execution framework combining cold-storage security, multi-venue algorithmic
            liquidity, and real-time verifiable settlement.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                data-crawl-target={`hiw-step-${idx + 1}`}
                className="relative rounded-2xl bg-surface/90 border border-border p-8 shadow-xl backdrop-blur-xl flex flex-col justify-between hover:border-electric-cyan/40 transition-all group"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-4xl font-extrabold text-border-light group-hover:text-electric-cyan transition-colors">
                      {item.step}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded border ${item.badgeColor} bg-background/50`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  {/* Step Title */}
                  <h3 className="font-heading font-bold text-xl text-text-primary mb-1">
                    {item.title}
                  </h3>
                  <div className="font-mono text-xs text-electric-cyan mb-4">
                    {item.subtitle}
                  </div>

                  {/* Step Description */}
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Graphic Accent */}
                <div className="mt-8 pt-4 border-t border-border flex items-center justify-between text-xs font-mono text-text-muted">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-electric-cyan" />
                    <span>PHASE_{item.step}</span>
                  </div>
                  <span className="text-[10px]">VERIFIED STEP</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mandatory Transparency Disclaimer */}
        <div className="mt-12 p-4 rounded-xl bg-surface border border-border/80 flex items-start gap-3.5 text-xs text-text-muted max-w-4xl mx-auto">
          <ShieldAlert className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-text-primary">Performance Transparency Notice:</strong> Investment returns
            generated by trading operations can be positive or negative and are not guaranteed. Past performance or
            algorithmic simulations do not guarantee future performance. Cryptiq operates under strict risk management
            mandates to protect digital capital.
          </p>
        </div>
      </div>
    </section>
  );
};
