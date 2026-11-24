'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Check, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { cryptiqApi } from '@cryptiq/api-client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenParam = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Requirements
  const hasMinLength = newPassword.length >= 10;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('Reset token is required.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password complexity rules.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await cryptiqApi.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed. Token may be expired or invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-8 shadow-card-light dark:shadow-card-dark"
    >
      {success ? (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
            <Check className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-2">
            Password Updated
          </h2>
          <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mb-6">
            Your password has been successfully updated. All previous sessions have been invalidated for security.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 transition-all"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-coral/10 text-brand-coral mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
              Create New Password
            </h1>
            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
              Enter your reset token and new credentials below
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenParam && (
              <div>
                <label className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your reset token"
                  className="w-full px-4 py-2.5 rounded-full text-xs font-mono bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-brand-coral"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full px-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-brand-coral"
              />

              {/* Password Requirements */}
              <div className="mt-2.5 p-3 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle/30 border border-light-border/60 dark:border-dark-border/60 grid grid-cols-2 gap-1.5 text-[10px]">
                <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-semibold' : 'text-light-textSecondary dark:text-dark-textSecondary'}`}>
                  {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-red-400" />}
                  At least 10 characters
                </span>
                <span className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-500 font-semibold' : 'text-light-textSecondary dark:text-dark-textSecondary'}`}>
                  {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-red-400" />}
                  1 uppercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-500 font-semibold' : 'text-light-textSecondary dark:text-dark-textSecondary'}`}>
                  {hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-red-400" />}
                  1 lowercase letter
                </span>
                <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-500 font-semibold' : 'text-light-textSecondary dark:text-dark-textSecondary'}`}>
                  {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-red-400" />}
                  1 number digit
                </span>
                <span className={`col-span-2 flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-500 font-semibold' : 'text-light-textSecondary dark:text-dark-textSecondary'}`}>
                  {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-red-400" />}
                  1 special symbol (!@#$%^&*...)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-brand-coral"
              />
              {confirmPassword.length > 0 && (
                <p className={`mt-1 text-[10px] ${passwordsMatch ? 'text-emerald-500 font-medium' : 'text-red-500'}`}>
                  {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch || !token.trim()}
              className="w-full py-3 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="text-center py-12 text-xs">Loading recovery view...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>

      <div className="max-w-md mx-auto text-center z-10 text-[10px] text-light-textSecondary dark:text-dark-textSecondary">
        Protected by Argon2id password hashing &bull; Session invalidation enforcement
      </div>
    </main>
  );
}
