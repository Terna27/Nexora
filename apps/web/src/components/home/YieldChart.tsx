'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Info } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';

interface DayYieldData {
  day: number;
  label: string;
  cumulativeYieldPercent: number;
  dailyYieldPercent: number;
  estimatedReturnUsd: number;
}

export const YieldChart: React.FC = () => {
  const [activeDayIndex, setActiveDayIndex] = useState<number>(6); // Day 7 selected by default

  // Illustrative linear progression for a sample $10,000 principal
  const principal = 10000;
  const days: DayYieldData[] = [
    { day: 1, label: 'Day 1', cumulativeYieldPercent: 3.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 300 },
    { day: 2, label: 'Day 2', cumulativeYieldPercent: 6.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 600 },
    { day: 3, label: 'Day 3', cumulativeYieldPercent: 9.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 900 },
    { day: 4, label: 'Day 4', cumulativeYieldPercent: 12.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 1200 },
    { day: 5, label: 'Day 5', cumulativeYieldPercent: 15.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 1500 },
    { day: 6, label: 'Day 6', cumulativeYieldPercent: 18.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 1800 },
    { day: 7, label: 'Day 7', cumulativeYieldPercent: 21.0, dailyYieldPercent: 3.0, estimatedReturnUsd: 2100 },
  ];

  const selectedDay = days[activeDayIndex] || days[6];

  return (
    <div className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-7 shadow-card-light dark:shadow-card-dark transition-all duration-300 flex flex-col justify-between min-h-[340px]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-center text-brand-coral">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-light-textPrimary dark:text-dark-textPrimary">
                Linear Yield Progression
              </span>
              <span className="block text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted">
                MATHEMATICAL MODEL PROJECTION
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary">
            7-Day Model
          </div>
        </div>

        {/* Selected Day Stats Display */}
        <div className="my-2 p-3.5 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle border border-light-border dark:border-dark-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-light-textSecondary dark:text-dark-textSecondary block">
              {selectedDay.label} Cumulative
            </span>
            <div className="text-xl font-extrabold text-light-textPrimary dark:text-dark-textPrimary">
              +<AnimatedNumber value={selectedDay.cumulativeYieldPercent} suffix="%" decimals={1} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-light-textSecondary dark:text-dark-textSecondary block">
              Illustrative Return ($10K Base)
            </span>
            <div className="text-base font-bold text-yield-emerald tabular-nums">
              +<AnimatedNumber value={selectedDay.estimatedReturnUsd} prefix="$" decimals={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Rounded Bar Chart */}
      <div className="my-6">
        <div className="h-40 flex items-end justify-between gap-2 sm:gap-3 px-2 pt-6">
          {days.map((item, idx) => {
            const isSelected = activeDayIndex === idx;
            const heightPercent = Math.max(15, (item.cumulativeYieldPercent / 21) * 100);

            return (
              <div
                key={item.day}
                onClick={() => setActiveDayIndex(idx)}
                className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
              >
                {/* Bar */}
                <div className="w-full h-28 flex items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                    className={`w-full max-w-[28px] rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'bg-brand-gradient shadow-coral-button'
                        : 'bg-light-border dark:bg-dark-border hover:bg-brand-coral/40'
                    }`}
                  />
                </div>

                {/* Day Label */}
                <span
                  className={`text-[10px] font-mono transition-colors ${
                    isSelected
                      ? 'text-brand-coral font-bold'
                      : 'text-light-textMuted dark:text-dark-textMuted group-hover:text-light-textPrimary dark:group-hover:text-dark-textPrimary'
                  }`}
                >
                  D{item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Footer Note */}
      <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary">
        <span className="flex items-center gap-1.5 text-yield-emerald">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Formula: P &times; 0.03 &times; d</span>
        </span>
        <span className="text-[10px] text-light-textMuted dark:text-dark-textMuted">
          Click bar to inspect day
        </span>
      </div>
    </div>
  );
};
