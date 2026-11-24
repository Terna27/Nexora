'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        email: email.trim(),
        password,
        rememberMe,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-light-bg dark:bg-dark-bg transition-colors duration-300 relative px-4 py-8 sm:p-12 overflow-hidden selection:bg-brand-coral selection:text-white">
      {/* Background Subtle Gradient Blobs */}
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
              Secure Gateway
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-8 shadow-card-light dark:shadow-card-dark"
        >
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-coral/10 text-brand-coral mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
              Sign In to Cryptiq
            </h1>
            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
              Enter your credentials to access your investor portal
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institutional.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                />
                <Mail className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-brand-coral hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                />
                <Lock className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3 text-light-textSecondary dark:text-dark-textSecondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-light-textSecondary dark:text-dark-textSecondary">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-light-border dark:border-dark-border text-brand-coral focus:ring-brand-coral/20"
                />
                <span>Remember this workstation</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Cryptiq</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-light-border dark:border-dark-border text-center">
            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
              New to Cryptiq?{' '}
              <Link href="/register" className="font-semibold text-brand-coral hover:underline">
                Register an Investor Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer Security Badges */}
      <div className="max-w-md mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-light-card/60 dark:bg-dark-card/60 border border-light-border/60 dark:border-dark-border/60 text-[10px] text-light-textSecondary dark:text-dark-textSecondary">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Argon2id Hashes &bull; HttpOnly Server Cookie &bull; TLS 1.3 Strict</span>
        </div>
      </div>
    </main>
  );
}
