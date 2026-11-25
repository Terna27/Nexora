'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cryptiqApi } from '@cryptiq/api-client';
import { useAuth } from '@/components/providers/AuthProvider';

interface InitialAdminSetupProps {
  onSuccess?: () => void;
}

export const InitialAdminSetup: React.FC<InitialAdminSetupProps> = ({ onSuccess }) => {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showBootstrapToken, setShowBootstrapToken] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validation
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword || !bootstrapToken.trim()) {
      setErrorMessage('All fields including the private bootstrap token are required.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters long and include uppercase, lowercase, numbers, and symbols.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await cryptiqApi.bootstrapAdmin({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        bootstrapToken: bootstrapToken.trim(),
      });

      if (response.success) {
        setIsCompleted(true);
        await refreshUser();
        if (onSuccess) {
          onSuccess();
        }
        // Redirect to admin portal
        setTimeout(() => {
          router.push('/admin');
        }, 1200);
      } else {
        setErrorMessage(response.message || 'Bootstrap initialization failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete administrator bootstrap. Please check your token and input.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <section id="initial-admin-setup" className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl p-8 sm:p-12 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-light-textPrimary dark:text-dark-textPrimary">
            Administrator Setup Complete
          </h2>
          <p className="text-sm sm:text-base text-light-textSecondary dark:text-dark-textSecondary max-w-lg mx-auto">
            The first administrative account has been securely provisioned and bootstrap access is now permanently closed.
            Redirecting to the Admin Portal...
          </p>
          <div className="pt-4">
            <button
              onClick={() => router.push('/admin')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-coral-button hover:opacity-95 transition-all"
            >
              Enter Admin Portal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="initial-admin-setup" className="py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-2xl mx-auto rounded-3xl border border-amber-500/30 dark:border-amber-500/20 bg-light-card/95 dark:bg-dark-card/95 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden"
      >
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Block */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Initial Administrator Setup
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
            Bootstrap First Administrator
          </h2>
          <p className="text-xs sm:text-sm text-light-textSecondary dark:text-dark-textSecondary leading-relaxed">
            This deployment currently has no administrator account. Use this one-time setup form to create the primary platform administrator.
            Once provisioned, this form closes permanently and further access is strictly via the standard login page.
          </p>
        </div>

        {/* Security Warning Box */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3 text-xs text-amber-700 dark:text-amber-300">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
          <div>
            <span className="font-semibold">Security Requirement:</span> A private bootstrap token (configured in server environment as <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">ADMIN_BOOTSTRAP_TOKEN</code>) is required to prevent unauthorized takeover.
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wider">
              Administrator Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-light-textMuted dark:text-dark-textMuted" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textMuted dark:placeholder:text-dark-textMuted focus:outline-none focus:ring-2 focus:ring-brand-coral/40 focus:border-brand-coral transition-all"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wider">
              Administrator Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-light-textMuted dark:text-dark-textMuted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nexora.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textMuted dark:placeholder:text-dark-textMuted focus:outline-none focus:ring-2 focus:ring-brand-coral/40 focus:border-brand-coral transition-all"
              />
            </div>
          </div>

          {/* Password & Confirm Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wider">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-light-textMuted dark:text-dark-textMuted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textMuted dark:placeholder:text-dark-textMuted focus:outline-none focus:ring-2 focus:ring-brand-coral/40 focus:border-brand-coral transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-light-textMuted dark:text-dark-textMuted hover:text-light-textPrimary dark:hover:text-dark-textPrimary focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-light-textMuted dark:text-dark-textMuted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textMuted dark:placeholder:text-dark-textMuted focus:outline-none focus:ring-2 focus:ring-brand-coral/40 focus:border-brand-coral transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bootstrap Secret Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary uppercase tracking-wider">
                Private Bootstrap Token
              </label>
              <span className="text-[11px] text-light-textMuted dark:text-dark-textMuted">
                Configured via ADMIN_BOOTSTRAP_TOKEN
              </span>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-light-textMuted dark:text-dark-textMuted" />
              <input
                type={showBootstrapToken ? 'text' : 'password'}
                required
                value={bootstrapToken}
                onChange={(e) => setBootstrapToken(e.target.value)}
                placeholder="Enter private server bootstrap token"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-mono text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textMuted dark:placeholder:text-dark-textMuted focus:outline-none focus:ring-2 focus:ring-brand-coral/40 focus:border-brand-coral transition-all"
              />
              <button
                type="button"
                onClick={() => setShowBootstrapToken(!showBootstrapToken)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-light-textMuted dark:text-dark-textMuted hover:text-light-textPrimary dark:hover:text-dark-textPrimary focus:outline-none"
              >
                {showBootstrapToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-brand-gradient text-white text-sm font-bold tracking-wide shadow-coral-button hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating First Administrator...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Provision Administrator Account
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </section>
  );
};
