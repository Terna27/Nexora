'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { cryptiqApi } from '@cryptiq/api-client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const res = await cryptiqApi.forgotPassword(email.trim());
      setMessage(res.message || 'If an account exists with this email, a password reset link has been dispatched.');
    } catch {
      setMessage('If an account exists with this email, a password reset link has been dispatched.');
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-light-bg dark:bg-dark-bg transition-colors duration-300 relative px-4 py-8 sm:p-12 overflow-hidden selection:bg-brand-coral selection:text-white">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-brand-coral/5 dark:bg-brand-coral/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-brand-orange/5 dark:bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-coral-button group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
              <path d="M15 9.5a4 4 0 1 0 0 5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-base tracking-wider text-light-textPrimary dark:text-dark-textPrimary">
              CRYPTIQ
            </span>
            <span className="text-[9px] font-mono tracking-widest text-brand-coral uppercase font-semibold -mt-0.5">
              Account Recovery
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Center Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-8 shadow-card-light dark:shadow-card-dark"
        >
          {submitted ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-2">
                Check Your Inbox
              </h2>
              <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary leading-relaxed mb-6">
                {message}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-light-bg dark:bg-dark-borderSubtle/60 border border-light-border dark:border-dark-border text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-border/40 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-coral/10 text-brand-coral mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
                  Reset Password
                </h1>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
                  Enter your registered email to receive recovery instructions
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@institutional.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                    />
                    <Mail className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-light-border dark:border-dark-border text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-coral hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="max-w-md mx-auto text-center z-10 text-[10px] text-light-textSecondary dark:text-dark-textSecondary">
        Single-use tokens expire after 1 hour &bull; SHA-256 token hashing
      </div>
    </main>
  );
}
