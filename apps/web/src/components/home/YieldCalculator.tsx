'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, Info, AlertTriangle } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';

type Asset = 'BTC' | 'ETH' | 'USDT' | 'SOL';

interface AssetReference {
  symbol: Asset;
  name: string;
  referencePriceUsd: number;
  icon: string;
}

// Fixed illustrative reference prices used solely for mathematical conversion modeling
const ASSET_REFERENCES: AssetReference[] = [
  { symbol: 'BTC', name: 'Bitcoin', referencePriceUsd: 96420.5, icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', referencePriceUsd: 3680.15, icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether USD', referencePriceUsd: 1.0, icon: '₮' },
  { symbol: 'SOL', name: 'Solana', referencePriceUsd: 218.4, icon: '◎' },
];

export const YieldCalculator: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<Asset>('BTC');
  const [principalUsd, setPrincipalUsd] = useState<number>(5000);

  const currentAsset = useMemo(() => {
    return ASSET_REFERENCES.find((a) => a.symbol === selectedAsset) || ASSET_REFERENCES[0];
  }, [selectedAsset]);

  // Pure non-compounded mathematical scenario calculations:
  // Daily Scenario Return = Principal * 0.03
  // 7-Day Scenario Return = Principal * 0.03 * 7
  // 30-Day Scenario Profit = Principal * 0.03 * 30
  // 30-Day Total Hypothetical Value = Principal + (Principal * 0.03 * 30)
  const dailyProfitUsd = useMemo(() => principalUsd * 0.03, [principalUsd]);
  const sevenDayProfitUsd = useMemo(() => principalUsd * 0.03 * 7, [principalUsd]);
  const thirtyDayProfitUsd = useMemo(() => principalUsd * 0.03 * 30, [principalUsd]);
  const thirtyDayTotalUsd = useMemo(() => principalUsd + thirtyDayProfitUsd, [principalUsd, thirtyDayProfitUsd]);

  // Crypto conversion equivalents based on calculation reference price
  const principalCrypto = useMemo(() => principalUsd / currentAsset.referencePriceUsd, [principalUsd, currentAsset.referencePriceUsd]);
  const dailyProfitCrypto = useMemo(() => dailyProfitUsd / currentAsset.referencePriceUsd, [dailyProfitUsd, currentAsset.referencePriceUsd]);
  const thirtyDayTotalCrypto = useMemo(() => thirtyDayTotalUsd / currentAsset.referencePriceUsd, [thirtyDayTotalUsd, currentAsset.referencePriceUsd]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) {
      setPrincipalUsd(0);
    } else {
      setPrincipalUsd(Math.min(100000, Math.max(100, val)));
    }
  };

  return (
    <div id="calculator" className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-8 shadow-card-light dark:shadow-card-dark transition-all duration-300 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-light-border dark:border-dark-border gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-coral/10 text-brand-coral flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-xl text-light-textPrimary dark:text-dark-textPrimary">
              Hypothetical 3% Yield Calculator
            </h3>
            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary font-sans">
              Mathematical modeling calculator illustrating non-compounded daily, weekly, and monthly projection scenarios.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-brand-coral" />
          <span>Formula: Principal &times; 0.03 &times; Days</span>
        </div>
      </div>

      {/* Calculator Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Inputs Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Asset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-light-textSecondary dark:text-dark-textSecondary">
                Select Asset
              </label>
              <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted">
                Static calculation reference price
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ASSET_REFERENCES.map((asset) => {
                const isSelected = selectedAsset === asset.symbol;
                return (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset.symbol)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-mono flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-brand-coral/10 border-brand-coral text-brand-coral font-bold shadow-sm'
                        : 'bg-light-bg dark:bg-dark-borderSubtle border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:border-brand-coral/40'
                    }`}
                  >
                    <span className="text-sm font-bold">{asset.icon}</span>
                    <span className="mt-0.5">{asset.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Slider & Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-light-textSecondary dark:text-dark-textSecondary">
                Modeled Principal Amount (USD)
              </label>
              <span className="text-xs font-mono text-brand-coral font-semibold">
                &asymp; {principalCrypto.toFixed(4)} {selectedAsset} (Ref)
              </span>
            </div>

            {/* Input Box */}
            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-bold text-light-textSecondary dark:text-dark-textSecondary">
                $
              </span>
              <input
                type="number"
                min="100"
                max="100000"
                step="100"
                value={principalUsd}
                onChange={handleAmountChange}
                className="w-full pl-9 pr-20 py-3 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border focus:border-brand-coral focus:ring-1 focus:ring-brand-coral text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary tabular-nums focus:outline-none transition-colors"
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono text-light-textMuted dark:text-dark-textMuted font-semibold uppercase">
                USD
              </span>
            </div>

            {/* Range Slider */}
            <div className="pt-2">
              <input
                type="range"
                min="100"
                max="100000"
                step="100"
                value={principalUsd}
                onChange={(e) => setPrincipalUsd(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg bg-light-border dark:bg-dark-border accent-brand-coral"
              />
              <div className="flex justify-between text-[11px] font-mono text-light-textMuted dark:text-dark-textMuted mt-1">
                <span>$100 Min</span>
                <span>$50,000</span>
                <span>$100,000 Max</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              {[500, 2500, 10000, 50000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPrincipalUsd(preset)}
                  className="flex-1 py-1.5 rounded-xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border hover:border-brand-coral/50 text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary transition-colors"
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Mathematical Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-start gap-2.5 text-xs text-light-textSecondary dark:text-dark-textSecondary">
            <Info className="w-4 h-4 text-brand-coral flex-shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">
              Mathematical Scenario Engine: Demonstrates the theoretical result of a fixed 3% daily rate. Digital asset market yields cannot be guaranteed, and past performance or mathematical projections do not represent actual outcomes.
            </span>
          </div>
        </div>

        {/* Results Output Column */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Daily Scenario */}
            <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary block">
                  DAILY HYPOTHETICAL PROFIT (3%)
                </span>
                <span className="text-[11px] text-light-textMuted dark:text-dark-textMuted">
                  Single 24h calculation cycle
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-yield-emerald tabular-nums">
                  +<AnimatedNumber value={dailyProfitUsd} prefix="$" decimals={2} />
                </div>
                <div className="text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary">
                  +<AnimatedNumber value={dailyProfitCrypto} decimals={4} /> {selectedAsset}
                </div>
              </div>
            </div>

            {/* 7-Day Scenario */}
            <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary block">
                  7-DAY HYPOTHETICAL PROFIT (21%)
                </span>
                <span className="text-[11px] text-light-textMuted dark:text-dark-textMuted">
                  Seven-day linear projection
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-light-textPrimary dark:text-dark-textPrimary tabular-nums">
                  +<AnimatedNumber value={sevenDayProfitUsd} prefix="$" decimals={2} />
                </div>
                <div className="text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary">
                  +<AnimatedNumber value={sevenDayProfitUsd / currentAsset.referencePriceUsd} decimals={4} /> {selectedAsset}
                </div>
              </div>
            </div>

            {/* 30-Day Total Scenario Value */}
            <div className="p-5 rounded-2xl bg-brand-coral/5 border border-brand-coral/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-brand-coral font-bold block">
                  30-DAY TOTAL HYPOTHETICAL VALUE
                </span>
                <span className="text-[11px] text-light-textSecondary dark:text-dark-textSecondary">
                  Original Principal (${principalUsd.toLocaleString()}) + Scenario Profit
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-brand-coral tabular-nums">
                  <AnimatedNumber value={thirtyDayTotalUsd} prefix="$" decimals={2} />
                </div>
                <div className="text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary">
                  &asymp; <AnimatedNumber value={thirtyDayTotalCrypto} decimals={4} /> {selectedAsset}
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Summary Card */}
          <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary flex items-center justify-between">
            <span>ANNUALIZED UNCOMPOUNDED RATE:</span>
            <span className="font-bold text-light-textPrimary dark:text-dark-textPrimary">
              1,095% (3% &times; 365 Days)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
