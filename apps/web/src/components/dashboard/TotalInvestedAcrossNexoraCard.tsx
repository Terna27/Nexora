'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Coins,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  TrendingUp,
  Info,
} from 'lucide-react';
import { cryptiqApi } from '@cryptiq/api-client';
import { PlatformInvestmentTotal } from '@cryptiq/types';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD - US Dollar', symbol: '$', type: 'Fiat' },
  { code: 'EUR', label: 'EUR - Euro', symbol: '€', type: 'Fiat' },
  { code: 'GBP', label: 'GBP - British Pound', symbol: '£', type: 'Fiat' },
  { code: 'NGN', label: 'NGN - Nigerian Naira', symbol: '₦', type: 'Fiat' },
  { code: 'USDT', label: 'USDT - Tether USD', symbol: 'USDT', type: 'Stablecoin' },
  { code: 'BTC', label: 'BTC - Bitcoin', symbol: 'BTC', type: 'Crypto' },
  { code: 'ETH', label: 'ETH - Ethereum', symbol: 'ETH', type: 'Crypto' },
  { code: 'SOL', label: 'SOL - Solana', symbol: 'SOL', type: 'Crypto' },
];

export const TotalInvestedAcrossNexoraCard: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [data, setData] = useState<PlatformInvestmentTotal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Initialize selected currency from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexora_preferred_currency');
      if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
        setSelectedCurrency(saved);
      }
    } catch {
      // localStorage may not be accessible in all browser contexts
    }
  }, []);

  const fetchGlobalTotal = async (currency: string, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await cryptiqApi.getPlatformInvestmentTotal(currency);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load global platform investment total:', err);
      setError(err?.message || 'Failed to load platform investment aggregate.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalTotal(selectedCurrency);
  }, [selectedCurrency]);

  const handleCurrencyChange = (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    try {
      localStorage.setItem('nexora_preferred_currency', newCurrency);
    } catch {
      // Ignore storage errors
    }
  };

  const isAvailable = Boolean(data?.isAvailable && data?.convertedAmount !== null);
  const valuationDate = data?.valuationTimestamp ? new Date(data.valuationTimestamp) : null;

  return (
    <div
      data-testid="total-invested-across-nexora-card"
      className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md"
    >
      {/* Decorative gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF512F] via-[#6366F1] to-[#26A17B]" />

      {/* Header with Title and Currency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF512F]/15 to-[#6366F1]/15 text-[#FF512F] flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-[#FF512F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#141518] dark:text-white tracking-tight">
                Total Invested Across Nexora
              </h2>
              {isAvailable ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Reported Platform Total</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Unconfigured</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary mt-0.5">
              Verified aggregate investment value across all platform participants
            </p>
          </div>
        </div>

        {/* Currency Selector & Manual Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <label htmlFor="currency-selector" className="sr-only">
              Select Display Currency
            </label>
            <select
              id="currency-selector"
              data-testid="platform-currency-selector"
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={loading && !data}
              className="appearance-none bg-[#F4F5F7] dark:bg-zinc-800/80 hover:bg-[#EBEEF2] dark:hover:bg-zinc-700/80 border border-light-border dark:border-dark-border text-xs font-semibold font-mono text-[#141518] dark:text-white rounded-xl pl-3 pr-8 py-2 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[#FF512F]/40"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} ({curr.type})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            data-testid="refresh-platform-investment-btn"
            onClick={() => fetchGlobalTotal(selectedCurrency, true)}
            disabled={isRefreshing || loading}
            title="Refresh verified total"
            className="p-2 rounded-xl bg-[#F4F5F7] dark:bg-zinc-800/80 hover:bg-[#EBEEF2] dark:hover:bg-zinc-700/80 text-[#64748B] dark:text-zinc-300 border border-light-border dark:border-dark-border transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF512F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Metric Display */}
      {loading && !data ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 w-64 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to calculate platform investment total</p>
              <p className="text-[11px] opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchGlobalTotal(selectedCurrency)}
            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold text-red-600 dark:text-red-200 transition"
          >
            Retry
          </button>
        </div>
      ) : isAvailable ? (
        <div className="space-y-4">
          {/* Amount Card Container */}
          <div className="p-5 rounded-2xl bg-[#F8F9FA] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] font-semibold block mb-1">
                Global Platform Invested Total ({selectedCurrency})
              </span>
              <div
                data-testid="platform-converted-display"
                className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-[#141518] dark:text-white tabular-nums flex items-baseline gap-2 flex-wrap"
              >
                <span>{data?.formattedDisplay || data?.convertedAmount}</span>
              </div>

              {/* Base amount note if converted to a different currency */}
              {selectedCurrency !== (data?.baseCurrency || 'USD') && (data?.baseAmount || data?.baseAmountUsd) && (
                <div className="text-xs text-[#64748B] dark:text-zinc-400 font-mono mt-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Configured Base: {Number(data.baseAmount || data.baseAmountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })} {data.baseCurrency || 'USD'}
                  </span>
                </div>
              )}
            </div>

            {/* Valuation Metadata & Rate Details */}
            <div className="text-left md:text-right space-y-1">
              {data?.exchangeRate && (
                <div className="text-xs font-mono font-medium text-[#141518] dark:text-zinc-200">
                  {data.exchangeRate}
                </div>
              )}
              {data?.rateSource && (
                <div className="text-[10px] text-[#64748B] dark:text-zinc-500 max-w-xs md:ml-auto">
                  Source: {data.rateSource}
                </div>
              )}
              {valuationDate && (
                <div className="text-[10px] font-mono text-[#64748B] dark:text-zinc-500 flex items-center md:justify-end gap-1 pt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    Valued {valuationDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                    {valuationDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Disclaimer Footer */}
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-light-border dark:border-dark-border text-xs text-[#64748B] dark:text-zinc-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#FF512F] flex-shrink-0 mt-0.5" />
            <span>
              {data?.disclaimer ||
                'Verified platform-wide investment total across all platform participants. Derived strictly from settled unit allocations in the authoritative double-entry subledger.'}
            </span>
          </div>
        </div>
      ) : (
        /* Honest Unavailable State when no settled issuances exist on the platform */
        <div className="p-6 rounded-2xl bg-[#F8F9FA] dark:bg-dark-bg/60 border border-dashed border-slate-300 dark:border-zinc-700 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500">
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#141518] dark:text-white">
              Platform Investment Reporting Unconfigured
            </h3>
            <p className="text-xs text-[#64748B] dark:text-dark-textSecondary max-w-lg mx-auto">
              {data?.statusMessage ||
                'No global platform investment amount has been configured yet by the administration. Once an administrator configures the global figure, it will appear here converted into your preferred display currency.'}
            </p>
          </div>
          {valuationDate && (
            <div className="text-[10px] font-mono text-[#64748B] dark:text-zinc-500 pt-1">
              Last checked: {valuationDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} UTC
            </div>
          )}
        </div>
      )}
    </div>
  );
};
