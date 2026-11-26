'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Coins,
  Calendar,
  User,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { cryptiqApi } from '@cryptiq/api-client';
import { AdminPlatformInvestmentConfig } from '@cryptiq/types';

export const GlobalPlatformInvestmentSection: React.FC = () => {
  const [config, setConfig] = useState<AdminPlatformInvestmentConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [amountInput, setAmountInput] = useState<string>('');
  const [currencyInput, setCurrencyInput] = useState<string>('USD');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cryptiqApi.getAdminPlatformInvestmentConfig();
      setConfig(data);
      if (data.isConfigured && data.amount) {
        setAmountInput(data.amount);
        setCurrencyInput(data.currency || 'USD');
      }
    } catch (err: any) {
      console.error('Failed to load platform investment configuration:', err);
      setError(err?.message || 'Failed to load platform investment configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid numeric amount greater than or equal to 0.');
      return;
    }

    if (!reasonInput || reasonInput.trim().length < 5) {
      setError('A comprehensive audit reason of at least 5 characters is required.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await cryptiqApi.updateAdminPlatformInvestmentConfig({
        amount: parseFloat(amountInput),
        currency: currencyInput.toUpperCase(),
        reason: reasonInput.trim(),
      });
      setConfig(updated);
      setShowConfirmModal(false);
      setSuccessMsg(
        `Successfully updated global platform investment to ${parseFloat(amountInput).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} ${currencyInput.toUpperCase()}.`
      );
      setReasonInput('');
    } catch (err: any) {
      console.error('Failed to update platform investment configuration:', err);
      setError(err?.message || 'Failed to update platform investment configuration.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportedList = config?.supportedCurrencies || ['USD', 'EUR', 'GBP', 'NGN', 'USDT', 'BTC', 'ETH', 'SOL'];
  const updatedAtDate = config?.updatedAt ? new Date(config.updatedAt) : null;

  return (
    <section
      data-testid="global-platform-investment-management-section"
      className="bg-[#0D1117] border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Global Platform Investment Management
              </h2>
              {config?.isConfigured ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Configured</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Unconfigured</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Set the authoritative platform-wide investment figure displayed across all investor dashboards
            </p>
          </div>
        </div>

        <button
          onClick={loadConfiguration}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Operation Error</p>
            <p className="text-red-300/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-200">Configuration Saved</p>
            <p className="text-emerald-300/90 mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Grid: Left Column Current Configuration Overview; Right Column Update Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Currently Configured Status (5 Cols) */}
        <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Global Configuration</span>
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] text-zinc-500 block">Reported Global Amount</span>
              <div className="text-2xl font-bold font-mono text-white tracking-tight mt-0.5">
                {loading ? (
                  <span className="text-zinc-600 animate-pulse">Loading...</span>
                ) : config?.isConfigured && config.amount ? (
                  <span>
                    ${Number(config.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-sm font-semibold text-amber-400 font-mono">{config.currency}</span>
                  </span>
                ) : (
                  <span className="text-sm font-normal text-zinc-500 italic">No amount configured yet</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Last Updated</span>
                </span>
                <span className="font-mono text-zinc-200">
                  {updatedAtDate ? updatedAtDate.toLocaleString() : 'Never'}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <User className="w-3.5 h-3.5" />
                  <span>Updated By</span>
                </span>
                <span className="font-mono text-zinc-200 truncate max-w-[180px]">
                  {config?.updatedByAdminEmail || 'N/A'}
                </span>
              </div>

              {config?.lastReason && (
                <div className="pt-2 text-[11px]">
                  <span className="text-zinc-500 block">Audit Reason:</span>
                  <p className="text-zinc-300 italic mt-0.5 bg-black/40 p-2 rounded-lg border border-zinc-800">
                    "{config.lastReason}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This amount is broadcast to every investor's dashboard as the global platform investment total, converted automatically into their preferred display currency.
            </p>
          </div>
        </div>

        {/* Right Column: Update Form (7 Cols) */}
        <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-4 flex items-center gap-2">
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Configure Global Amount</span>
          </h3>

          <form onSubmit={handleOpenConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Amount input */}
              <div className="sm:col-span-2">
                <label htmlFor="global-amount-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Platform Investment Amount *
                </label>
                <div className="relative">
                  <input
                    id="global-amount-input"
                    data-testid="admin-global-amount-input"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5000000.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    required
                    className="w-full bg-[#0D1117] border border-zinc-700 text-white text-sm font-mono rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition"
                  />
                </div>
              </div>

              {/* Base Currency Selector */}
              <div>
                <label htmlFor="global-currency-select" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Base Currency *
                </label>
                <select
                  id="global-currency-select"
                  data-testid="admin-global-currency-select"
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  className="w-full bg-[#0D1117] border border-zinc-700 text-white text-sm font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition cursor-pointer"
                >
                  {supportedList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audit Reason */}
            <div>
              <label htmlFor="global-reason-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Audit Reason / Justification *
              </label>
              <textarea
                id="global-reason-input"
                data-testid="admin-global-reason-input"
                rows={2}
                placeholder="Explain the operational basis or mandate for this global platform figure (e.g., Q4 Institutional Capital Call Close #REF-9021)"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                required
                className="w-full bg-[#0D1117] border border-zinc-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Recorded immutably to the administrator audit logs for regulatory traceability.
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                data-testid="admin-save-global-investment-btn"
                disabled={isSubmitting || loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Global Investment</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          data-testid="admin-confirm-global-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-[#0D1117] border border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Confirm Global Investment Update
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Platform-wide reporting configuration
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-zinc-500">New Global Amount:</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  {parseFloat(amountInput).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  {currencyInput.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-zinc-500">Base Currency:</span>
                <span className="font-mono font-semibold text-white">{currencyInput.toUpperCase()}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block mb-1">Reason:</span>
                <p className="text-zinc-200 italic font-mono text-[11px] bg-black/40 p-2 rounded-lg">
                  "{reasonInput.trim()}"
                </p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              This action updates the platform-wide reported investment amount displayed to every investor. It creates an immutable audit trail entry. It does not alter double-entry ledger accounts or user balances.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="admin-confirm-save-btn"
                onClick={handleSave}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Update Platform</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
