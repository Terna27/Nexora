'use client';

import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { PortfolioCard } from './PortfolioCard';
import { YieldHighlightCard } from './YieldHighlightCard';
import { YieldCalculator } from './YieldCalculator';
import { YieldChart } from './YieldChart';

export const BentoDashboard: React.FC = () => {
  const prefersReduced = useReducedMotion();

  // Container variants with 0.06s stagger delay
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReduced ? 0 : 0.06,
        delayChildren: 0.1,
      },
    },
  };

  // Card entrance variant: { opacity: 0, y: 16 } -> { opacity: 1, y: 0 } with spring(260, 24)
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 260,
        damping: 24,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
    >
      {/* 1. Total Portfolio & Daily Accrual Card (Span 7 on desktop) */}
      <motion.div variants={cardVariants} className="md:col-span-12 lg:col-span-7 flex flex-col">
        <PortfolioCard />
      </motion.div>

      {/* 2. Featured Coral-Orange Highlight Card (Span 5 on desktop) */}
      <motion.div variants={cardVariants} className="md:col-span-12 lg:col-span-5 flex flex-col">
        <YieldHighlightCard />
      </motion.div>

      {/* 3. Total Yield Bar Chart Card (Span 5 on desktop) */}
      <motion.div variants={cardVariants} className="md:col-span-12 lg:col-span-5 flex flex-col">
        <YieldChart />
      </motion.div>

      {/* 4. Interactive 3% Daily Yield Calculator Card (Span 7 on desktop) */}
      <motion.div variants={cardVariants} className="md:col-span-12 lg:col-span-7 flex flex-col">
        <YieldCalculator />
      </motion.div>
    </motion.div>
  );
};
