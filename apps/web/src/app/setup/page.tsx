'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Loader2, Lock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InitialAdminSetup } from '@/components/home/InitialAdminSetup';
import { cryptiqApi } from '@cryptiq/api-client';

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await cryptiqApi.getBootstrapStatus();
        if (isMounted) {
          setIsAvailable(Boolean(res && res.isAvailable));
        }
      } catch {
        if (isMounted) {
          setIsAvailable(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-light-bg dark:bg-dark-bg text-light-textPrimary dark:text-dark-textPrimary selection:bg-brand-coral selection:text-white transition-colors duration-300 flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-coral" />
            <p className="text-sm text-light-textMuted dark:text-dark-textMuted">Checking system status...</p>
          </div>
        ) : isAvailable ? (
          <div className="w-full max-w-3xl">
            <InitialAdminSetup onSuccess={() => setIsAvailable(false)} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full rounded-3xl border border-light-border dark:border-dark-border bg-light-card/90 dark:bg-dark-card/90 backdrop-blur-xl p-8 sm:p-10 text-center shadow-xl space-y-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand-coral/10 text-brand-coral flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-light-textPrimary dark:text-dark-textPrimary">
              Administrator Setup Closed
            </h1>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary leading-relaxed">
              Initial administrator bootstrap is not available. An administrator account already exists or bootstrap is disabled.
              Subsequent access is available exclusively through the standard login portal.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-coral-button hover:opacity-95 transition-all"
              >
                Go to Login Portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
