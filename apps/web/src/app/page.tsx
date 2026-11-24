'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PoolActivity } from '@/components/home/PoolActivity';
import { SecuritySection } from '@/components/home/SecuritySection';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-light-bg dark:bg-dark-bg text-light-textPrimary dark:text-dark-textPrimary selection:bg-brand-coral selection:text-white transition-colors duration-300">
      {/* Top Floating Pill Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* Hero Section & Bento Dashboard Preview */}
        <HeroSection />

        {/* How Cryptiq Works (3-Card Bento Row) */}
        <HowItWorks />

        {/* Recent Pool Activity & Payouts Table */}
        <PoolActivity />

        {/* Security Architecture & Institutional Governance */}
        <SecuritySection />
      </main>

      {/* Minimalist Footer & Risk Disclosures */}
      <Footer />
    </div>
  );
}
