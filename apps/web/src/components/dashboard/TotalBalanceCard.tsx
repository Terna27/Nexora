'use client';

import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  ExternalLink, 
  Info, 
  Coins, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { AssetInfo, SupportedAsset, UserPortfolioResponse } from '@cryptiq/types';

interface TotalBalanceCardProps {
  quotes: Record<SupportedAsset, AssetInfo> | null;
  portfolio?: UserPortfolioResponse | null;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

export const TotalBalanceCard: React.FC<TotalBalanceCardProps> = ({
  quotes,
  portfolio,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [valuationCurrency, setValuationCurrency] = useState<'USD' | 'BTC' | 'ETH'>('USD');

  // Authoritative financial balance from backend portfolio endpoint
  const isPortfolioBalanceAvailable = Boolean(portfolio?.isAvailable && portfolio?.totalBalanceUsd !== null);
  const userBalanceUsd: number | null = isPortfolioBalanceAvailable && portfolio?.totalBalanceUsd
    ? parseFloat(portfolio.totalBalanceUsd)
    : null;

  // Conversion for display based on live quotes
  const displayBalance = React.useMemo(() => {
    if (userBalanceUsd === null) {
      return '—';
    }
    const balance: number = userBalanceUsd;
    if (valuationCurrency === 'USD') {
      return `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (valuationCurrency === 'BTC') {
      const btcPrice = quotes?.BTC?.unitPriceUsd || 1;
      return `${(balance / btcPrice).toFixed(8)} BTC`;
    }
    if (valuationCurrency === 'ETH') {
      const ethPrice = quotes?.ETH?.unitPriceUsd || 1;
      return `${(balance / ethPrice).toFixed(6)} ETH`;
    }
    return '—';
  }, [valuationCurrency, quotes, userBalanceUsd]);

  const supportedAssets: { symbol: SupportedAsset; name: string; decimals: number }[] = [
    { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
    { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { symbol: 'SOL', name: 'Solana', decimals: 9 },
  ];

  return (
    <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#141518] dark:text-white uppercase tracking-wider">
              Total Balance
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-[#64748B] dark:text-dark-textSecondary">
              Primary Ledger
            </span>
          </div>

          {/* Currency / Asset Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-full p-0.5 text-[10px] font-mono font-semibold">
            {(['USD', 'BTC', 'ETH'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setValuationCurrency(curr)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  valuationCurrency === curr
                    ? 'bg-white dark:bg-dark-card text-[#141518] dark:text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#141518]'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Large Balance Display */}
        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#141518] dark:text-white font-mono tracking-tight tabular-nums">
              {displayBalance}
            </span>
            {isPortfolioBalanceAvailable && valuationCurrency === 'USD' && (
              <span className="text-xs font-mono font-semibold text-[#64748B]">USD</span>
            )}
            {!isPortfolioBalanceAvailable && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-semibold">
                Unavailable
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-dark-textSecondary mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-[#FF512F]" />
            {isPortfolioBalanceAvailable
              ? 'Authoritative double-entry NAV balance • Synchronized'
              : 'Portfolio balance endpoint unavailable • Awaiting subledger sync'}
          </p>
        </div>

        {/* Primary Action Buttons (Deposit & Withdraw) */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <button
            onClick={onOpenDeposit}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#141518] hover:bg-[#252830] text-white text-xs font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF512F]"
          >
            <ArrowDownLeft className="w-4 h-4 text-[#FF512F]" />
            Deposit
          </button>

          <button
            onClick={onOpenWithdraw}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#141518] dark:text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <ArrowUpRight className="w-4 h-4 text-[#64748B]" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Subsection: Crypto Wallets */}
      <div className="pt-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#141518] dark:text-white flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#FF512F]" />
            Custodial Wallets
          </span>
          <span className="text-[10px] font-mono text-[#64748B]">
            MPC Multi-Sig
          </span>
        </div>

        {/* Asset List */}
        <div className="space-y-2">
          {supportedAssets.map((asset) => {
            const quote = quotes ? quotes[asset.symbol] : null;
            const userAcct = portfolio?.accounts?.find((a) => a.asset === asset.symbol);
            return (
              <div
                key={asset.symbol}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center text-[10px] font-mono font-bold text-[#141518] dark:text-white">
                    {asset.symbol}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#141518] dark:text-white leading-tight">
                      {asset.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#64748B]">
                      {quote ? `$${quote.unitPriceUsd.toLocaleString()}` : 'Connecting...'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {userAcct ? (
                    <>
                      <div className="text-xs font-mono font-bold text-[#141518] dark:text-white tabular-nums">
                        {userAcct.settledBalance} <span className="text-[10px] text-[#64748B]">{asset.symbol}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        ${parseFloat(userAcct.functionalUsdBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Strict truth: subledger balance unavailable */}
                      <div className="text-xs font-mono font-bold text-[#141518] dark:text-white tabular-nums">
                        — <span className="text-[10px] text-[#64748B]">{asset.symbol}</span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                        Sync pending
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
