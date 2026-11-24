'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Loader2, Mail, Send } from 'lucide-react';
import { cryptiqApi } from '@cryptiq/api-client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [token, setToken] = useState(tokenParam || '');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>(tokenParam ? 'idle' : 'idle');
  const [message, setMessage] = useState('');

  const executeVerify = async (tokenToVerify: string) => {
    if (!tokenToVerify) return;
    setIsVerifying(true);
    setStatus('idle');
    try {
      const res = await cryptiqApi.verifyEmail(tokenToVerify);
      setStatus('success');
      setMessage(res.message || 'Email verified successfully! You may now sign in.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Email verification link is invalid or has expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      executeVerify(tokenParam);
    }
  }, [tokenParam]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await cryptiqApi.resendVerification(resendEmail.trim());
      setResendStatus(res.message || 'If an unverified account exists, a new link has been dispatched.');
    } catch {
      setResendStatus('If an unverified account exists, a new link has been dispatched.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-8 shadow-card-light dark:shadow-card-dark text-center"
    >
      {isVerifying ? (
        <div className="py-8">
          <Loader2 className="w-10 h-10 text-brand-coral animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-1">
            Verifying Your Email
          </h2>
          <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
            Validating single-use cryptographic verification token...
          </p>
        </div>
      ) : status === 'success' ? (
        <div className="py-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-2">
            Email Verified
          </h2>
          <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary leading-relaxed max-w-sm mx-auto mb-6">
            {message}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 transition-all"
          >
            <span>Sign In to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : status === 'error' ? (
        <div className="py-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 text-red-500 mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-2">
            Verification Failed
          </h2>
          <p className="text-xs text-red-600 dark:text-red-400 mb-6">
            {message}
          </p>

          {/* Resend Verification Form */}
          <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle/30 border border-light-border dark:border-dark-border text-left mb-6">
            <h3 className="text-xs font-bold text-light-textPrimary dark:text-dark-textPrimary mb-1">
              Request a New Verification Link
            </h3>
            <p className="text-[11px] text-light-textSecondary dark:text-dark-textSecondary mb-3">
              Enter your email address and we will dispatch a fresh single-use activation link.
            </p>
            {resendStatus && (
              <p className="text-xs text-brand-coral font-medium mb-3">{resendStatus}</p>
            )}
            <form onSubmit={handleResend} className="flex gap-2">
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="name@institutional.com"
                className="flex-1 px-3.5 py-2 rounded-full text-xs bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-brand-coral"
              />
              <button
                type="submit"
                disabled={isResending}
                className="px-4 py-2 rounded-full bg-brand-gradient text-white text-xs font-semibold shadow-coral-button flex items-center gap-1.5 hover:opacity-95 disabled:opacity-50"
              >
                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Resend</span>
              </button>
            </form>
          </div>

          <Link
            href="/login"
            className="text-xs font-semibold text-brand-coral hover:underline"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <div className="py-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-coral/10 text-brand-coral mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-2">
            Verify Your Email
          </h2>
          <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mb-4">
            If you received an email verification token, enter it below to activate your account.
          </p>

          <div className="space-y-3 max-w-sm mx-auto text-left">
            <div>
              <label className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1">
                Verification Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your verification token"
                className="w-full px-4 py-2.5 rounded-full text-xs font-mono bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-brand-coral"
              />
            </div>

            <button
              onClick={() => executeVerify(token)}
              disabled={!token.trim()}
              className="w-full py-2.5 rounded-full bg-brand-gradient text-white text-xs font-bold shadow-coral-button hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>Activate Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-light-bg dark:bg-dark-bg transition-colors duration-300 relative px-4 py-8 sm:p-12 overflow-hidden selection:bg-brand-coral selection:text-white">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-coral-button group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
              <path d="M15 9.5a4 4 0 1 0 0 5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <span className="font-heading font-extrabold text-base tracking-wider text-light-textPrimary dark:text-dark-textPrimary">
            CRYPTIQ
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <Suspense fallback={<div className="text-center py-12 text-xs">Loading verification view...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>

      <div className="max-w-md mx-auto text-center z-10 text-[10px] text-light-textSecondary dark:text-dark-textSecondary">
        Tokens expire after 24 hours &bull; Single use cryptographic validation
      </div>
    </main>
  );
}
