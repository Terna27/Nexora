'use client';

import React, { useMemo } from 'react';

// Generates synthetic deterministic data streams for the Ledger Wall
function generateColumnData(columnIndex: number, rowsCount: number = 30) {
  const assets = ['BTC', 'ETH', 'SOL', 'USDT', 'AVAX', 'LINK'];
  const eventTypes = [
    'MERKLE_PROOF',
    'LIQUIDITY_ADD',
    'ALGO_REBALANCE',
    'ORDER_MATCH',
    'STATE_SYNC',
    'ORACLE_ATTEST',
    'VAULT_SWEEP',
    'BLOCK_PROPOSAL',
  ];

  const items = [];
  for (let i = 0; i < rowsCount; i++) {
    const seed = (columnIndex * 100 + i * 17) % 10000;
    const block = 21849000 + ((seed * 7) % 500);
    const hash = `0x${((seed * 99991) >>> 0).toString(16).padStart(8, '0')}...${((seed * 31337) >>> 0).toString(16).slice(-4)}`;
    const asset = assets[(columnIndex + i) % assets.length];
    const event = eventTypes[(columnIndex * 3 + i) % eventTypes.length];
    const spread = (0.01 + ((seed % 15) * 0.002)).toFixed(3);
    const latency = 12 + (seed % 45);
    const time = `10:${((i * 2 + 10) % 60).toString().padStart(2, '0')}:${((seed % 60)).toString().padStart(2, '0')}.${(seed % 999).toString().padStart(3, '0')}`;

    items.push({
      id: `${columnIndex}-${i}`,
      time,
      block,
      hash,
      asset,
      event,
      spread,
      latency,
    });
  }
  return items;
}

export const LedgerWall: React.FC = () => {
  // Precompute columns of technical metadata
  const columns = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((colIdx) => generateColumnData(colIdx, 32));
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none opacity-20 sm:opacity-25"
      aria-hidden="true"
    >
      {/* Radial vignette mask for high contrast and readability of foreground content */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(8,9,13,0.85)_65%,#08090D_100%)]" />

      {/* Grid Scanline Overlay */}
      <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem]" />

      {/* Synthetic Ledger disclaimer badge in watermark style */}
      <div className="absolute top-2 left-4 z-10 text-[9px] font-mono tracking-widest text-text-muted/60 uppercase">
        [SYS_BACKGROUND_LAYER // SYNTHETIC_TELEMETRY_STREAM // ILLUSTRATIVE_DATA_ONLY]
      </div>

      {/* Multi-column scrolling data stream */}
      <div className="flex justify-between w-full h-[200%] gap-4 px-4 font-mono text-[11px] leading-relaxed text-text-muted">
        {columns.map((col, colIdx) => {
          // Alternate scroll speeds and subtle directional flow
          const animClass = colIdx % 2 === 0 ? 'animate-drift' : 'animate-[drift_55s_linear_infinite]';

          return (
            <div
              key={colIdx}
              className={`flex-1 flex flex-col space-y-3.5 transform-gpu ${animClass}`}
              style={{ animationDelay: `-${colIdx * 7}s` }}
            >
              {/* Repeated twice for seamless infinite loop */}
              {[...col, ...col].map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-center justify-between border-b border-border/30 pb-1.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-electric-cyan/70 text-[10px]">#{item.block}</span>
                    <span className="text-slate-400">{item.hash}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-electric-blue/80 font-semibold">{item.asset}</span>
                    <span className="text-slate-500 hidden md:inline text-[10px]">{item.event}</span>
                    <span className="text-text-muted/70 text-[9px]">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
