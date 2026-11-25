'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { cryptiqApi } from '@cryptiq/api-client';
import { AssetInfo, SupportedAsset, LedgerEntry, UserPortfolioResponse, UserTransactionItem } from '@cryptiq/types';

import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardHeader, DashboardTab } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar, SidebarNavId } from '@/components/dashboard/DashboardSidebar';
import { DynamicGreeting } from '@/components/dashboard/DynamicGreeting';
import { TotalBalanceCard } from '@/components/dashboard/TotalBalanceCard';
import { FinancialMetricsGrid } from '@/components/dashboard/FinancialMetricsGrid';
import { InvestmentPerformanceChart } from '@/components/dashboard/InvestmentPerformanceChart';
import { InvestmentOverviewCard } from '@/components/dashboard/InvestmentOverviewCard';
import { RecentActivitiesCard } from '@/components/dashboard/RecentActivitiesCard';
import { DepositModal, WithdrawModal, LayersModal } from '@/components/dashboard/DashboardModals';
import { SearchModal } from '@/components/layout/SearchModal';
import { ShieldCheck, Info, Sliders, FileText, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [activeNav, setActiveNav] = useState<SidebarNavId>('overview');

  // Modals
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Live Backend Data States
  const [quotes, setQuotes] = useState<Record<SupportedAsset, AssetInfo> | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [portfolio, setPortfolio] = useState<UserPortfolioResponse | null>(null);
  const [personalTransactions, setPersonalTransactions] = useState<UserTransactionItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Protected Route Check: Redirect unauthenticated users immediately
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Fetch real authoritative backend data
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function loadData() {
      try {
        const [quotesData, ledgerData, portfolioData, transactionsData] = await Promise.all([
          cryptiqApi.getAssetQuotes(),
          cryptiqApi.getLedgerEntries(),
          cryptiqApi.getUserPortfolio(),
          cryptiqApi.getUserTransactions(),
        ]);
        if (isMounted) {
          setQuotes(quotesData);
          setLedgerEntries(ledgerData);
          setPortfolio(portfolioData);
          setPersonalTransactions(transactionsData.items || []);
        }
      } catch (err) {
        console.error('Error loading dashboard financial data:', err);
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // If session is loading or user is not yet verified, render skeleton
  if (isLoading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-dark-bg text-[#141518] dark:text-white transition-colors duration-300 selection:bg-[#FF512F] selection:text-white pb-20 lg:pb-12">
      {/* Outer Content Container */}
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Top Navigation Bar Chrome */}
        <DashboardHeader
          user={user}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'Overview') setActiveNav('overview');
            if (tab === 'Activity') setActiveNav('overview');
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onLogout={handleLogout}
          onOpenSettings={() => setActiveNav('settings')}
          onOpenSecurity={() => setActiveNav('security')}
        />

        {/* Layout Container: Segmented Floating Left Sidebar + Main Content */}
        <div className="flex gap-6 items-start mt-2">
          {/* Segmented Floating Left Sidebar (3 white capsules) */}
          <DashboardSidebar
            activeNav={activeNav}
            onSelectNav={(navId) => {
              setActiveNav(navId);
              if (navId === 'overview') setActiveTab('Overview');
              if (navId === 'settings') setActiveTab('Account');
              if (navId === 'security') setActiveTab('Manage');
            }}
            onLogout={handleLogout}
            onOpenLayersModal={() => setIsLayersOpen(true)}
          />

          {/* Main Dashboard Content Area */}
          <main className="flex-1 min-w-0">
            {/* Dynamic Greeting */}
            <DynamicGreeting user={user} />

            {/* TAB CONTENT SWITCHER */}
            {activeTab === 'Overview' && activeNav === 'overview' && (
              /* Asymmetric Bento Grid Layout */
              <div className="space-y-6">
                {/* TOP ROW: Three-Column Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Card A: Total Balance + Nested Crypto Wallets */}
                  <TotalBalanceCard
                    quotes={quotes}
                    portfolio={portfolio}
                    onOpenDeposit={() => setIsDepositOpen(true)}
                    onOpenWithdraw={() => setIsWithdrawOpen(true)}
                  />

                  {/* Card B: Compact 2x2 Financial Metrics Grid */}
                  <FinancialMetricsGrid portfolio={portfolio} />

                  {/* Card C: Investment Performance Chart */}
                  <InvestmentPerformanceChart quotes={quotes} />
                </div>

                {/* BOTTOM ROW: Asymmetric Two-Column Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Card D: Investment Overview & Platform Allocation (~40% width) */}
                  <div className="lg:col-span-5">
                    <InvestmentOverviewCard
                      onExplorePools={() => setActiveTab('Program')}
                    />
                  </div>

                  {/* Card E: Recent Activities Transaction Table (~60% width) */}
                  <div className="lg:col-span-7">
                    <RecentActivitiesCard
                      platformLedgerEntries={ledgerEntries}
                      personalTransactions={personalTransactions}
                      onViewAllActivity={() => setActiveTab('Activity')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dedicated Activity Tab View */}
            {activeTab === 'Activity' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
                  <RecentActivitiesCard
                    platformLedgerEntries={ledgerEntries}
                    personalTransactions={personalTransactions}
                  />
                </div>
              </div>
            )}

            {/* Dedicated Program / Manage / Account / Security Tab Views */}
            {(activeTab === 'Manage' || activeNav === 'security') && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#141518] dark:text-white">
                        Account Security & 2FA Attestation
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Multi-factor protection and session management
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#141518] dark:text-white">Argon2id Password Security</p>
                        <p className="text-[#64748B] text-[11px] mt-0.5">High-entropy salted cryptographic hashing</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[10px]">
                        Active
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[#141518] dark:text-white">HttpOnly SameSite Session Token</p>
                        <p className="text-[#64748B] text-[11px] mt-0.5">Dual-mode cross-origin cookie with Bearer fallback</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[10px]">
                        Protected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Program' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm">
                  <h2 className="text-base font-bold text-[#141518] dark:text-white mb-2">
                    Nexora Capital Allocation Program
                  </h2>
                  <p className="text-xs text-[#64748B] max-w-2xl mb-6">
                    Our diversified multi-asset quantitative strategy maintains a strict 40% BTC, 25% ETH, 15% SOL, 15% USDT, and 5% Cash allocation across independent bankruptcy-remote custody trusts.
                  </p>
                  <InvestmentOverviewCard />
                </div>
              </div>
            )}

            {(activeTab === 'Account' || activeNav === 'settings') && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm max-w-2xl">
                  <h2 className="text-base font-bold text-[#141518] dark:text-white mb-2">
                    Investor Profile & Identification
                  </h2>
                  <div className="space-y-3 mt-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex justify-between">
                      <span className="text-[#64748B]">Legal Name</span>
                      <span className="font-bold text-[#141518] dark:text-white">{user.fullName}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex justify-between">
                      <span className="text-[#64748B]">Primary Email</span>
                      <span className="font-mono font-bold text-[#141518] dark:text-white">{user.email}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex justify-between">
                      <span className="text-[#64748B]">Account Identifier</span>
                      <span className="font-mono text-[11px] text-[#64748B]">{user.id}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F4F5F7] dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex justify-between">
                      <span className="text-[#64748B]">Member Since</span>
                      <span className="font-mono text-[11px] text-[#64748B]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Reports' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm max-w-2xl text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#64748B] mx-auto mb-3">
                    <FileText className="w-5 h-5 text-[#FF512F]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#141518] dark:text-white">
                    Audit Reports & Statements
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                    Weekly NAV restatements and monthly independent CPA audit attestations will be published here upon cycle settlement.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Institutional Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
      />
      <LayersModal
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
      />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
