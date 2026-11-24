'use client';

import React, { useState } from 'react';
import { INITIAL_ILLUSTRATIVE_LEDGER } from '@cryptiq/api-client';
import { LedgerEntry } from '@cryptiq/types';
import { Terminal, ShieldCheck, RefreshCw, Filter, ExternalLink } from 'lucide-react';

export const LiveLedgerTerminal: React.FC = () => {
  const [filterAsset, setFilterAsset] = useState<string>('ALL');
  const [entries, setEntries] = useState<LedgerEntry[]>(INITIAL_ILLUSTRATIVE_LEDGER);

  const filtered = entries.filter((e) => {
    if (filterAsset === 'ALL') return true;
    return e.asset === filterAsset;
  });

  return (
    <section id="ledger" className="relative py-20 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan font-mono text-xs tracking-wider">
              <Terminal className="w-3.5 h-3.5" />
              <span>CRYPTIQ AUDIT TERMINAL</span>
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-text-primary">
              LIVE LEDGER & TREASURY ACTIVITY
            </h2>
            <p className="text-text-secondary text-sm max-w-2xl">
              Real-time terminal view of algorithmic protocol operations, Merkle audit validations, and liquidity
              sweep confirmations.
            </p>
          </div>

          {/* Asset Filter Tabs */}
          <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-border font-mono text-xs">
            {['ALL', 'BTC', 'ETH', 'SOL', 'USDT'].map((asset) => (
              <button
                key={asset}
                onClick={() => setFilterAsset(asset)}
                className={`px-3 py-1.5 rounded transition-all ${
                  filterAsset === asset
                    ? 'bg-electric-cyan text-background font-bold shadow-glow-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {asset}
              </button>
            ))}
          </div>
        </div>

        {/* Prominent Mandatory Disclosure Label */}
        <div className="mb-4 p-3 rounded-lg bg-surface border border-border/80 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-amber font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber animate-ping" />
            <span>ILLUSTRATIVE DATA — NOT LIVE CUSTOMER TRANSACTIONS</span>
          </div>
          <span className="text-text-muted hidden sm:inline">
            Sample Protocol Telemetry for Architectural Evaluation
          </span>
        </div>

        {/* Terminal Table Panel */}
        <div
          data-crawl-target="ledger-terminal"
          className="rounded-2xl bg-surface/90 border border-border shadow-2xl backdrop-blur-xl overflow-hidden"
        >
          {/* Table Header Bar */}
          <div className="bg-surface-elevated/80 border-b border-border px-6 py-3.5 flex items-center justify-between text-xs font-mono text-text-muted">
            <div className="flex items-center gap-3">
              <span className="text-text-primary font-bold">TERMINAL ID: CRYPTIQ-US-EAST-01</span>
              <span>|</span>
              <span className="text-electric-cyan">STREAMING AUDIT LOG</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-emeraldSuccess">STATUS: SYNCHRONIZED</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-background/80 text-text-muted border-b border-border">
                <tr>
                  <th className="py-3 px-6">TIMESTAMP</th>
                  <th className="py-3 px-6">TX HASH</th>
                  <th className="py-3 px-6">EVENT TYPE</th>
                  <th className="py-3 px-6">ASSET</th>
                  <th className="py-3 px-6 text-right">AMOUNT</th>
                  <th className="py-3 px-6 text-right">VALUATION</th>
                  <th className="py-3 px-6 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-text-secondary">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-4 px-6 text-text-muted text-[11px] whitespace-nowrap">
                      {entry.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-4 px-6 text-electric-cyan font-medium whitespace-nowrap">
                      <span className="cursor-pointer hover:underline flex items-center gap-1">
                        {entry.txHash}
                        <ExternalLink className="w-3 h-3 text-text-muted" />
                      </span>
                    </td>
                    <td className="py-4 px-6 text-text-primary font-medium whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-background border border-border text-[10px]">
                        {entry.eventType}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-electric-blue whitespace-nowrap">
                      {entry.asset}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-text-primary whitespace-nowrap">
                      {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right text-text-secondary whitespace-nowrap">
                      ${entry.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          entry.status === 'VERIFIED'
                            ? 'bg-emeraldSuccess/10 text-emeraldSuccess border border-emeraldSuccess/30'
                            : entry.status === 'CONFIRMED'
                            ? 'bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/30'
                            : 'bg-amber/10 text-amber border border-amber/30'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer of Table */}
          <div className="bg-background/80 border-t border-border px-6 py-3 flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>SHOWING {filtered.length} ILLUSTRATIVE AUDIT ENTRIES</span>
            <span>MERKLE ROOT HASH: 0x884f...c129 (VERIFIED)</span>
          </div>
        </div>
      </div>
    </section>
  );
};
