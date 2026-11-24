'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, ChevronRight, Menu, X, Terminal, Cpu } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Node Symbol */}
        <Link
          href="/"
          data-crawl-target="nav-brand"
          className="flex items-center gap-3.5 group cursor-pointer focus:outline-none"
        >
          {/* Geometric arachnid/node logo */}
          <div className="relative w-10 h-10 flex items-center justify-center bg-surface border border-electric-cyan/40 rounded-lg shadow-glow-cyan group-hover:border-electric-cyan transition-colors">
            <svg
              className="w-6 h-6 text-electric-cyan"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Arachnid Node Center */}
              <circle cx="12" cy="12" r="3" fill="#00F0FF" />
              {/* Articulated Antennae / Legs */}
              <path d="M12 9V3" />
              <path d="M12 15v6" />
              <path d="M9 10l-4-4" />
              <path d="M15 14l4 4" />
              <path d="M15 10l4-4" />
              <path d="M9 14l-4 4" />
              <circle cx="5" cy="5" r="1.5" fill="#FF2A85" />
              <circle cx="19" cy="5" r="1.5" fill="#FF2A85" />
              <circle cx="5" cy="19" r="1.5" fill="#FFB800" />
              <circle cx="19" cy="19" r="1.5" fill="#FFB800" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-xl tracking-widest text-text-primary group-hover:text-electric-cyan transition-colors">
              CRYPTIQ
            </span>
            <span className="text-[10px] font-mono tracking-wider text-text-muted uppercase">
              Algorithmic Core
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-text-secondary">
          <a
            href="#how-it-works"
            className="hover:text-electric-cyan transition-colors py-1"
          >
            How It Works
          </a>
          <a
            href="#calculator"
            data-crawl-target="nav-calculator-link"
            className="hover:text-electric-cyan transition-colors py-1 flex items-center gap-1.5"
          >
            <span className="text-amber font-mono text-xs px-1.5 py-0.5 rounded bg-amber/10 border border-amber/30">
              3% Model
            </span>
            Yield Calculator
          </a>
          <a
            href="#ledger"
            className="hover:text-electric-cyan transition-colors py-1"
          >
            Live Ledger
          </a>
          <a
            href="#security"
            className="hover:text-electric-cyan transition-colors py-1 flex items-center gap-1"
          >
            <Shield className="w-3.5 h-3.5 text-electric-cyan" />
            Security
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => alert('Authentication portal access initiated.')}
            className="text-xs font-mono tracking-wider text-text-secondary hover:text-text-primary px-3 py-2 rounded transition-colors"
          >
            LOGIN
          </button>
          <a
            href="#calculator"
            data-crawl-target="nav-cta"
            className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-electric-cyan text-background font-mono text-xs font-bold tracking-wider hover:bg-white transition-all shadow-glow-cyan"
          >
            LAUNCH APP
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface border border-border"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background-secondary/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-3 font-mono text-sm text-text-secondary">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-electric-cyan border-b border-border/50"
            >
              How It Works
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-electric-cyan border-b border-border/50 flex items-center justify-between"
            >
              <span>3% Yield Calculator</span>
              <span className="text-amber text-xs px-2 py-0.5 rounded bg-amber/10 border border-amber/30">
                SCENARIO
              </span>
            </a>
            <a
              href="#ledger"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-electric-cyan border-b border-border/50"
            >
              Live Ledger Activity
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-electric-cyan"
            >
              Security Architecture
            </a>
          </nav>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                alert('Authentication portal access initiated.');
              }}
              className="w-full py-2.5 text-center font-mono text-xs tracking-wider text-text-primary bg-surface border border-border rounded-lg"
            >
              LOGIN
            </button>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center font-mono text-xs font-bold tracking-wider text-background bg-electric-cyan rounded-lg shadow-glow-cyan"
            >
              LAUNCH APP
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
