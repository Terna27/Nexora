'use client';

import React, { useState, useMemo } from 'react';
import { SupportedAsset } from '@cryptiq/types';
import { cryptiqApi } from '@cryptiq/api-client';
import { Calculator, AlertTriangle, TrendingUp, ShieldCheck, Info } from 'lucide-react';

const ASSET_OPTIONS: { symbol: SupportedAsset; name: string; price: number; icon: string }[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 96420.5, icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', price: 3680.15, icon: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', price: 218.4, icon: '◎' },
  { symbol: 'USDT', name: 'Tether USD', price: 1.0, icon: '₮' },
];

export const ReturnCalculator: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>('BTC');
  const [amountStr, setAmountStr] = useState<string>('1.5');
  const [hypotheticalRate, setHypotheticalRate] = useState<number>(0.03); // 3% configurable illustrative scenario

  const currentAsset = useMemo(() => {
    return ASSET_OPTIONS.find((a) => a.symbol === selectedAsset) || ASSET_OPTIONS[0];
  }, [selectedAsset]);

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amountStr);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [amountStr]);

  // Execute scenario calculations respecting non-compounding rules:
  // Daily = P * 0.03
  // 7-day = P * 0.03 * 7
  // 30-day = P * 0.03 * 30
  const scenario = useMemo(() => {
    return cryptiqApi.calculateScenario({
      asset: selectedAsset,
      principalAmount: parsedAmount,
      hypotheticalDailyRate: hypotheticalRate,
    });
  }, [selectedAsset, parsedAmount, hypotheticalRate]);

  // Format currency helpers
  const formatCrypto = (val: number, symbol: string) => {
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${symbol}`;
  };

  const formatUsd = (val: number) => {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <section id="calculator" className="relative py-20 border-t border-border/60 bg-background-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/10 border border-amber/30 text-amber font-mono text-xs tracking-wider">
            <Calculator className="w-3.5 h-3.5" />
            <span>ILLUSTRATIVE SCENARIO ENGINE</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-text-primary">
            INTERACTIVE RETURN SCENARIO MODEL
          </h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            Model hypothetical performance projections based on configurable parameters. This tool allows users to
            examine how a hypothetical 3% daily illustrative model translates across daily, weekly, and monthly horizons.
          </p>
        </div>

        {/* Calculator Main Box */}
        <div
          data-crawl-target="calc-panel"
          className="max-w-4xl mx-auto rounded-2xl bg-surface/90 border border-border p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative"
        >
          {/* Prominent Financial Disclaimer Banner */}
          <div className="mb-8 p-4 rounded-xl bg-amber/10 border border-amber/30 flex items-start gap-3.5 text-xs text-amber leading-relaxed">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber" />
            <div>
              <span className="font-bold uppercase tracking-wider block font-mono mb-1">
                Hypothetical Scenario Assumption — Not A Guaranteed Return
              </span>
              <span>
                A 3% daily return is an illustrative scenario parameter for mathematical modeling only. Real digital
                asset trading cannot reliably generate such returns. Cryptocurrency markets involve substantial risk,
                including the possible total loss of principal. Cryptiq makes no warranty or projection of guaranteed yields.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Controls (Left Column) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Asset Selector */}
              <div>
                <label className="block text-xs font-mono tracking-wider text-text-muted uppercase mb-2">
                  Select Digital Asset
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ASSET_OPTIONS.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset.symbol)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border font-mono text-xs transition-all ${
                        selectedAsset === asset.symbol
                          ? 'bg-electric-cyan/15 border-electric-cyan text-text-primary shadow-glow-cyan'
                          : 'bg-background/60 border-border text-text-secondary hover:border-border-light'
                      }`}
                    >
                      <span className="text-base font-bold text-electric-cyan">{asset.icon}</span>
                      <span className="font-semibold mt-1">{asset.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono tracking-wider text-text-muted uppercase">
                    Investment Amount ({selectedAsset})
                  </label>
                  <span className="text-xs font-mono text-electric-cyan">
                    ≈ {formatUsd(parsedAmount * currentAsset.price)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-background border border-border focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan rounded-lg px-4 py-3 font-mono text-lg text-text-primary focus:outline-none transition-all"
                    placeholder="0.00"
                  />
                  <div className="absolute right-3.5 top-3.5 font-mono text-xs font-bold text-text-muted">
                    {selectedAsset}
                  </div>
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center gap-2 mt-2.5">
                  {(selectedAsset === 'BTC' ? ['0.5', '1.0', '2.5', '5.0'] : ['5', '10', '25', '50']).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmountStr(preset)}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-surface-elevated hover:bg-border text-text-secondary transition-colors"
                    >
                      +{preset} {selectedAsset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurable Scenario Rate Note */}
              <div className="p-3 rounded-lg bg-background/50 border border-border text-xs font-mono text-text-muted space-y-1">
                <div className="flex items-center justify-between text-text-secondary">
                  <span>SCENARIO RATE:</span>
                  <span className="text-amber font-semibold">3.00% / DAY (FIXED SCENARIO)</span>
                </div>
                <div className="text-[10px] text-text-muted leading-relaxed">
                  Formula: Non-compounded simple projection (Principal × 0.03 × Horizon).
                </div>
              </div>
            </div>

            {/* Scenario Outputs (Right Column) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="border border-border rounded-xl p-5 bg-background/60 space-y-4">
                {/* Initial Principal Card */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <span className="text-xs font-mono text-text-muted">INITIAL PRINCIPAL</span>
                    <div className="text-lg font-bold font-mono text-text-primary">
                      {formatCrypto(parsedAmount, selectedAsset)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-text-muted">VALUATION (USD)</span>
                    <div className="text-sm font-mono text-text-secondary font-semibold">
                      {formatUsd(scenario.principalUsdValue)}
                    </div>
                  </div>
                </div>

                {/* Hypothetical Daily Scenario Return */}
                <div
                  data-crawl-target="calc-daily-return"
                  className="p-3.5 rounded-lg bg-surface border border-electric-cyan/40 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-electric-cyan font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>HYPOTHETICAL DAILY SCENARIO (+3%)</span>
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">
                      Single 24h illustrative cycle (Principal × 0.03)
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-base font-bold text-electric-cyan">
                      +{formatCrypto(scenario.dailyScenarioReturn, selectedAsset)}
                    </div>
                    <div className="text-xs text-text-muted">
                      +{formatUsd(scenario.dailyScenarioReturn * currentAsset.price)}
                    </div>
                  </div>
                </div>

                {/* Hypothetical 7-Day Scenario Return */}
                <div className="p-3.5 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-text-secondary font-semibold">
                      HYPOTHETICAL 7-DAY SCENARIO (21%)
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">
                      Seven-day projection (Principal × 0.03 × 7)
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-base font-bold text-text-primary">
                      +{formatCrypto(scenario.weeklyScenarioReturn, selectedAsset)}
                    </div>
                    <div className="text-xs text-text-muted">
                      +{formatUsd(scenario.weeklyScenarioReturn * currentAsset.price)}
                    </div>
                  </div>
                </div>

                {/* Hypothetical 30-Day Scenario Return */}
                <div
                  data-crawl-target="calc-monthly-return"
                  className="p-3.5 rounded-lg bg-surface border border-neon-magenta/40 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-neon-magenta font-semibold">
                      HYPOTHETICAL 30-DAY SCENARIO (90%)
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">
                      Thirty-day projection (Principal × 0.03 × 30)
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-base font-bold text-neon-magenta">
                      +{formatCrypto(scenario.monthlyScenarioReturn, selectedAsset)}
                    </div>
                    <div className="text-xs text-text-muted">
                      +{formatUsd(scenario.monthlyScenarioReturn * currentAsset.price)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono text-text-muted flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-electric-cyan" />
                  Non-compounded calculation model
                </span>
                <button
                  onClick={() => alert('Proceeding to Cryptiq Institutional Onboarding.')}
                  className="px-6 py-2.5 rounded-lg bg-electric-cyan hover:bg-white text-background font-mono text-xs font-bold tracking-wider transition-all shadow-glow-cyan"
                >
                  DEPOSIT & EXECUTE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
