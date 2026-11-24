'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck, 
  Building2, 
  Info, 
  CheckCircle2, 
  Copy, 
  Check, 
  Clock, 
  Layers 
} from 'lucide-react';
import { SupportedAsset } from '@cryptiq/types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Institutional Deposit Modal
 */
export const DepositModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset>('USDT');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-2xl z-10"
        >
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141518] dark:text-white">
                  Institutional Capital Deposit
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Segregated Custodial Clearing Rails
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#141518] dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Asset Rail Selector */}
            <div>
              <label className="text-xs font-semibold text-[#141518] dark:text-white mb-1.5 block">
                Select Asset Rail
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['USDT', 'BTC', 'ETH', 'SOL'] as const).map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-2.5 rounded-2xl border text-xs font-mono font-bold transition-all text-center ${
                      selectedAsset === asset
                        ? 'border-[#FF512F] bg-coral-50/20 text-[#FF512F] dark:bg-coral-950/20 shadow-xs'
                        : 'border-light-border dark:border-dark-border text-[#64748B] hover:border-slate-400'
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custody Compliance Notice */}
            <div className="p-3.5 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border text-xs text-[#64748B] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-[#141518] dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                MPC Segregated Account Policy
              </div>
              <p className="text-[11px] leading-relaxed">
                Nexora deposits are held in multi-party computation (MPC) cold vaults under segregated custodial custody. Capital will be recognized upon network finality and settled into vehicle investor units during the Friday NAV cycle.
              </p>
            </div>

            {/* Custodial Whitelist Notice */}
            <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-200">Deposit Rails in Pre-Launch Staging:</span>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    Direct automated address assignment is currently in institutional staging. Capital deposits and KYC whitelisting will activate in the next production release.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#64748B] hover:text-[#141518] dark:hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              disabled={true}
              className="px-5 py-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed shadow-none"
            >
              Deposit Rails in Pre-Launch Staging
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * Institutional Withdrawal Modal
 */
export const WithdrawModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-2xl z-10"
        >
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[#141518] dark:text-white flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-[#FF512F]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141518] dark:text-white">
                  Redemption & Withdrawal
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Weekly NAV Liquidity Cycle
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#141518] dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border space-y-2">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Settled Investor Equity</span>
                <span className="font-mono font-bold text-[#141518] dark:text-white">
                  — USD
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Available for Immediate Sweep</span>
                <span className="font-mono font-bold text-[#64748B]">
                  — USD
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-[#64748B] space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#141518] dark:text-white">
                <Clock className="w-4 h-4 text-[#FF512F]" />
                Weekly Liquidity Cycle Rule
              </div>
              <p className="text-[11px] leading-relaxed">
                Nexora enforces a structured weekly liquidity redemption cycle under approved fund rules. Redemptions submitted before Thursday 23:59 UTC are settled based on Friday close Net Asset Value (NAV). Redemptions require active settled investor units.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#64748B] hover:text-[#141518] dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={true}
              className="px-5 py-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed"
            >
              Redemptions Unavailable (Pre-Launch)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/**
 * Institutional Layer Architecture Modal
 */
export const LayersModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-2xl z-10"
        >
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF512F] to-[#FF7847] text-white flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141518] dark:text-white">
                  Nexora Institutional Legal Entities
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Separation of Accounting Ledgers & Boundaries
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#141518] dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border">
              <h4 className="font-bold text-[#141518] dark:text-white mb-1">
                1. Nexora Operating Company (Platform Ledger)
              </h4>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                Operating entity providing client interface, KYC/AML compliance attestations, and platform technology. Operating accounts are strictly isolated and never co-mingled with vehicle or client funds.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border">
              <h4 className="font-bold text-[#141518] dark:text-white mb-1">
                2. Nexora Investment Vehicle (Vehicle Subledger)
              </h4>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                Bankruptcy-remote fund vehicle issuing fractional investor units. Maintains immutable, append-only double-entry NAV valuation records in USD functional currency.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border">
              <h4 className="font-bold text-[#141518] dark:text-white mb-1">
                3. External Investment Manager
              </h4>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                Regulated asset manager executing systematic rebalancing and liquidity strategies under strict mandate parameters and risk boundaries.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border">
              <h4 className="font-bold text-[#141518] dark:text-white mb-1">
                4. Independent Custodian
              </h4>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                Qualified custodian maintaining institutional multi-party computation (MPC) cold storage vaults. All crypto assets are held in segregated, bankruptcy-remote trust accounts.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-border flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-[#141518] text-white text-xs font-bold hover:bg-[#252830] transition-colors"
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
