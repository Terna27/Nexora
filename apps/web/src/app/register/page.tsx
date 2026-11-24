'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, Check, X, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function RegisterPage() {
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password requirement checks
  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Valid email address is required.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Please ensure your password meets all complexity requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('You must accept the terms of service and risk disclosure to proceed.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        acceptTerms,
      });
      setSuccessMessage(res.message || 'Account created successfully. Please check your email to verify your address.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-light-bg dark:bg-dark-bg transition-colors duration-300 relative px-4 py-8 sm:p-12 overflow-hidden selection:bg-brand-coral selection:text-white">
      {/* Background Gradient Blobs */}
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
              Investor Onboarding
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-lg mx-auto my-auto z-10 py-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border p-6 sm:p-8 shadow-card-light dark:shadow-card-dark"
        >
          {successMessage ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary mb-2">
                Registration Received
              </h2>
              <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary leading-relaxed max-w-sm mx-auto mb-6">
                {successMessage}
              </p>
              <div className="p-4 rounded-2xl bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-xs text-light-textSecondary dark:text-dark-textSecondary mb-6 text-left">
                <p className="font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1">
                  Next Steps:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Open the email verification message sent to <span className="font-mono font-medium">{email}</span>.</li>
                  <li>Click the single-use verification link within 24 hours.</li>
                  <li>Return to sign in to access your dashboard.</li>
                </ol>
              </div>
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
                  <UserPlus className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-heading font-bold text-light-textPrimary dark:text-dark-textPrimary tracking-tight">
                  Open an Investor Account
                </h1>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
                  Create your institutional-grade digital asset credential
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
                    htmlFor="name-input"
                    className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5"
                  >
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <input
                      id="name-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Satoshi Nakamoto"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                    />
                    <User className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5"
                  >
                    Corporate or Personal Email
                  </label>
                  <div className="relative">
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                    />
                    <Mail className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-pwd"
                    className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-pwd"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                    />
                    <Lock className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
                  </div>

                  {/* Password requirements meter */}
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
                  <label
                    htmlFor="reg-pwd-confirm"
                    className="block text-xs font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-pwd-confirm"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-light-bg dark:bg-dark-borderSubtle/40 border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary placeholder-light-textSecondary/50 dark:placeholder-dark-textSecondary/50 focus:outline-none focus:border-brand-coral dark:focus:border-brand-coral transition-colors"
                    />
                    <Lock className="w-4 h-4 text-light-textSecondary dark:text-dark-textSecondary absolute left-3.5 top-3" />
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`mt-1 text-[10px] ${passwordsMatch ? 'text-emerald-500 font-medium' : 'text-red-500'}`}>
                      {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-light-textSecondary dark:text-dark-textSecondary leading-snug">
                    <input
                      type="checkbox"
                      required
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-light-border dark:border-dark-border text-brand-coral focus:ring-brand-coral/20"
                    />
                    <span>
                      I agree to the <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">Terms of Service</span>, <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">Privacy Notice</span>, and acknowledge the <span className="font-semibold text-brand-coral">Cryptocurrency Risk Disclosure</span>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || !passwordsMatch || !acceptTerms}
                  className="w-full py-3 rounded-full bg-brand-gradient text-white text-xs font-bold tracking-wide shadow-coral-button hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-light-border dark:border-dark-border text-center">
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
                  Already registered?{' '}
                  <Link href="/login" className="font-semibold text-brand-coral hover:underline">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Footer Security Note */}
      <div className="max-w-md mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-light-card/60 dark:bg-dark-card/60 border border-light-border/60 dark:border-dark-border/60 text-[10px] text-light-textSecondary dark:text-dark-textSecondary">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Strict Role Segregation &bull; Public Signups Default to Investor Role</span>
        </div>
      </div>
    </main>
  );
}
