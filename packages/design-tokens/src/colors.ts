export const colors = {
  // Base Obsidian & Void Tones
  background: '#08090D',
  secondaryBackground: '#10131B',
  surface: '#151923',
  surfaceHover: '#1B202D',
  surfaceElevated: '#1E2433',

  // Electric & Neon Accents
  electricCyan: '#00F0FF',
  electricBlue: '#2563EB',
  neonMagenta: '#FF2A85',
  amber: '#FFB800',

  // Supporting Technical Tones
  emeraldSuccess: '#10B981',
  crimsonAlert: '#EF4444',

  // Typography Tones
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',

  // Borders & Dividers
  border: '#252B38',
  borderLight: '#333D4F',
  borderHighlight: 'rgba(0, 240, 255, 0.4)',
  borderMagenta: 'rgba(255, 42, 133, 0.4)',
  borderAmber: 'rgba(255, 184, 0, 0.4)',

  // Glows & HUD overlays
  glowCyan: '0 0 20px rgba(0, 240, 255, 0.25)',
  glowMagenta: '0 0 20px rgba(255, 42, 133, 0.25)',
  glowAmber: '0 0 20px rgba(255, 184, 0, 0.25)',
} as const;

export type CryptiqColors = typeof colors;
