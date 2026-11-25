'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { InitialAdminSetup } from '@/components/home/InitialAdminSetup';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PoolActivity } from '@/components/home/PoolActivity';
import { SecuritySection } from '@/components/home/SecuritySection';
import { Footer } from '@/components/layout/Footer';
import { cryptiqApi } from '@cryptiq/api-client';

export default function HomePage() {
  const [isBootstrapAvailable, setIsBootstrapAvailable] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function checkBootstrap() {
      try {
        const res = await cryptiqApi.getBootstrapStatus();
        if (isMounted) {
          setIsBootstrapAvailable(Boolean(res && res.isAvailable));
        }
      } catch {
        if (isMounted) {
          setIsBootstrapAvailable(false);
        }
      }
    }
    checkBootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-light-bg dark:bg-dark-bg text-light-textPrimary dark:text-dark-textPrimary selection:bg-brand-coral selection:text-white transition-colors duration-300">
      {/* Top Floating Pill Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* Initial Administrator Setup: Only rendered when no administrator exists */}
        {isBootstrapAvailable && (
          <div className="pt-24 sm:pt-28 -mb-16">
            <InitialAdminSetup onSuccess={() => setIsBootstrapAvailable(false)} />
          </div>
        )}

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
