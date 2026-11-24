import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Coral-Orange Accent
        brand: {
          coral: '#FF512F',
          orange: '#FF7A45',
        },
        // Yield Performance Indicator
        yield: {
          emerald: '#10B981',
          emeraldBg: 'rgba(16, 185, 129, 0.1)',
          emeraldBorder: 'rgba(16, 185, 129, 0.25)',
        },
        // Light Theme Surface Tokens (Default)
        light: {
          bg: '#F7F8FA',
          card: '#FFFFFF',
          cardHover: '#FAFAFB',
          border: '#EAECEF',
          borderSubtle: '#F0F2F5',
          textPrimary: '#111318',
          textSecondary: '#64748B',
          textMuted: '#94A3B8',
        },
        // Dark Theme Surface Tokens
        dark: {
          bg: '#0C0D10',
          card: '#15171C',
          cardHover: '#1B1E24',
          border: '#23262F',
          borderSubtle: '#1C1F26',
          textPrimary: '#FFFFFF',
          textSecondary: '#94A3B8',
          textMuted: '#64748B',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF512F 0%, #FF7A45 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #FF3D15 0%, #FF6F35 100%)',
        'coral-glow': 'radial-gradient(circle at center, rgba(255, 81, 47, 0.15) 0%, transparent 70%)',
      },
      borderRadius: {
        '3xl': '24px',
      },
      boxShadow: {
        'card-light': '0 4px 20px -2px rgba(17, 19, 24, 0.04), 0 2px 6px -1px rgba(17, 19, 24, 0.02)',
        'card-dark': '0 8px 30px rgba(0, 0, 0, 0.45)',
        'pill-nav': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
        'pill-nav-dark': '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
        'coral-button': '0 4px 18px rgba(255, 81, 47, 0.35)',
        'coral-card': '0 12px 36px -4px rgba(255, 81, 47, 0.3)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-jakarta)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
