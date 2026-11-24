'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  PieChart, 
  Wallet, 
  Calendar, 
  Users, 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  LogOut,
  Layers
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export type SidebarNavId = 
  | 'overview' 
  | 'portfolio' 
  | 'wallet' 
  | 'calendar' 
  | 'referrals' 
  | 'settings' 
  | 'support'
  | 'security';

interface DashboardSidebarProps {
  activeNav: SidebarNavId;
  onSelectNav: (id: SidebarNavId) => void;
  onLogout: () => Promise<void>;
  onOpenLayersModal?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeNav,
  onSelectNav,
  onLogout,
  onOpenLayersModal,
}) => {
  const middleNavItems: { id: SidebarNavId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Dashboard / Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio / Analytics', icon: PieChart },
    { id: 'wallet', label: 'Wallet / Vault', icon: Wallet },
    { id: 'calendar', label: 'Payout Calendar', icon: Calendar },
    { id: 'referrals', label: 'Referral Program', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <>
      {/* Desktop Floating Sidebar (Exact 3-Capsule Stack) */}
      <aside 
        aria-label="Sidebar Navigation"
        className="hidden lg:flex flex-col gap-3 shrink-0 select-none z-20 sticky top-6"
      >
        {/* Capsule 1: Top (2 controls) */}
        <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-1.5 shadow-sm flex flex-col items-center gap-1">
          <ThemeToggle />
          <button
            onClick={onOpenLayersModal}
            title="Institutional Layer Architecture"
            aria-label="Layer architecture"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Capsule 2: Middle Navigation (7 icons) */}
        <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-1.5 shadow-sm flex flex-col items-center gap-1.5">
          {middleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNav(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none ${
                  isActive
                    ? 'bg-[#141518] text-white shadow-md'
                    : 'text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {/* Floating tooltip */}
                <span className="absolute left-14 px-2.5 py-1 bg-[#141518] text-white text-[11px] font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Capsule 3: Bottom Security & Logout (2 controls) */}
        <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-1.5 shadow-sm flex flex-col items-center gap-1.5">
          <button
            onClick={() => onSelectNav('security')}
            title="Security & 2FA"
            aria-label="Security and 2FA"
            aria-current={activeNav === 'security' ? 'page' : undefined}
            className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none ${
              activeNav === 'security'
                ? 'bg-[#141518] text-white'
                : 'text-[#64748B] hover:text-[#141518] dark:text-dark-textSecondary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="absolute left-14 px-2.5 py-1 bg-[#141518] text-white text-[11px] font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Security & 2FA
            </span>
          </button>

          <button
            onClick={onLogout}
            title="Sign Out"
            aria-label="Sign Out"
            className="group relative w-10 h-10 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
            <span className="absolute left-14 px-2.5 py-1 bg-rose-950 text-rose-200 text-[11px] font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-3 left-4 right-4 z-40 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md border border-light-border dark:border-dark-border rounded-full py-2 px-4 shadow-xl flex items-center justify-around"
      >
        <button
          onClick={() => onSelectNav('overview')}
          aria-label="Dashboard Overview"
          className={`p-2 rounded-full transition-colors ${
            activeNav === 'overview' ? 'bg-[#141518] text-white' : 'text-[#64748B]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectNav('portfolio')}
          aria-label="Portfolio"
          className={`p-2 rounded-full transition-colors ${
            activeNav === 'portfolio' ? 'bg-[#141518] text-white' : 'text-[#64748B]'
          }`}
        >
          <PieChart className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectNav('wallet')}
          aria-label="Wallet"
          className={`p-2 rounded-full transition-colors ${
            activeNav === 'wallet' ? 'bg-[#141518] text-white' : 'text-[#64748B]'
          }`}
        >
          <Wallet className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectNav('calendar')}
          aria-label="Payout Calendar"
          className={`p-2 rounded-full transition-colors ${
            activeNav === 'calendar' ? 'bg-[#141518] text-white' : 'text-[#64748B]'
          }`}
        >
          <Calendar className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectNav('security')}
          aria-label="Security"
          className={`p-2 rounded-full transition-colors ${
            activeNav === 'security' ? 'bg-[#141518] text-white' : 'text-[#64748B]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
        </button>
      </nav>
    </>
  );
};
