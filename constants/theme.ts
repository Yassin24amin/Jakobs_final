import { Platform } from 'react-native';

/**
 * Jakob's Design System — Newspaper/Zine Aesthetic
 *
 * Dark-only design. No light mode.
 * All colors, typography, and spacing tokens are defined here.
 */

export const Colors = {
  background: '#0a0a0a',
  surface: '#111111',
  primary: '#fafaf5',
  accent: '#FF4D1C',
  accentYellow: '#E8FF3C',
  faint: '#777777',
  rule: '#222222',
  white: '#ffffff',
  black: '#000000',
  // Status colors (admin)
  statusPending: '#FBBF24',
  statusConfirmed: '#3B82F6',
  statusPreparing: '#F97316',
  statusReady: '#22C55E',
  statusCompleted: '#6B7280',
  statusCancelled: '#EF4444',
} as const;

export const Fonts = {
  display: 'Oswald_700Bold',
  mono: Platform.select({
    ios: 'Menlo',
    web: 'Menlo, Monaco, Consolas, monospace',
    default: 'monospace',
  }) as string,
  body: Platform.select({
    ios: 'Georgia',
    web: 'Georgia, serif',
    default: 'serif',
  }) as string,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSizes = {
  /** Tiny labels, badges */
  badge: 9,
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Section titles, large headings */
  subtitle: 28,
  xxxl: 32,
  display: 48,
  masthead: 64,
  /** Masthead hero title */
  mastheadHero: 72,
  giant: 96,
} as const;
