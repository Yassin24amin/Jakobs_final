import { Colors, Fonts, Spacing } from "./theme";

/**
 * POS Design Tokens
 *
 * iPad-first, arm's-length-legible, speed-optimized.
 * Extends the base theme colors but with POS-specific sizing and layout.
 * No newspaper/zine aesthetic — purely functional.
 */

export const POSColors = {
  // Inherit base
  background: Colors.background,
  surface: Colors.surface,
  primary: Colors.primary,
  accent: Colors.accent,
  faint: Colors.faint,
  rule: Colors.rule,
  black: Colors.black,
  white: Colors.white,

  // POS-specific
  panelBorder: "#2a2a2a",
  itemCardBg: "#1a1a1a",
  itemCardActive: "#2a2a2a",
  itemCardUnavailable: "#0f0f0f",

  // Action colors
  cashGreen: "#22C55E",
  cashGreenDark: "#16A34A",
  cardBlue: "#3B82F6",
  cardBlueDark: "#2563EB",
  dangerRed: "#EF4444",
  dangerRedDark: "#DC2626",
  successGreen: "#22C55E",
  warningAmber: "#FBBF24",

  // Status (re-export for convenience)
  statusPending: Colors.statusPending,
  statusConfirmed: Colors.statusConfirmed,
  statusPreparing: Colors.statusPreparing,
  statusReady: Colors.statusReady,
  statusCompleted: Colors.statusCompleted,
  statusCancelled: Colors.statusCancelled,
} as const;

export const POSFonts = {
  display: Fonts.display,
  mono: Fonts.mono,
  body: Fonts.body,
} as const;

/** Font sizes optimized for iPad at arm's length */
export const POSFontSizes = {
  /** Category sidebar labels */
  categoryTab: 13,
  /** Menu item name in grid */
  itemName: 17,
  /** Price on item card */
  itemPrice: 15,
  /** Order panel line items */
  orderLine: 15,
  /** Section headers */
  sectionHeader: 12,
  /** Order total */
  orderTotal: 26,
  /** Action bar button text */
  actionButton: 15,
  /** Numpad digits */
  numpad: 28,
  /** Cash modal total display */
  modalTotal: 36,
  /** Receipt total display */
  receiptTotal: 48,
  /** Header bar info text */
  headerInfo: 12,
  /** Header bar title */
  headerTitle: 16,
  /** Small labels */
  label: 11,
  /** Badge text */
  badge: 10,
} as const;

/** Layout constants for the three-panel POS screen */
export const POSLayout = {
  /** Category sidebar width */
  sidebarWidth: 110,
  /** Right order panel width */
  orderPanelWidth: 300,
  /** Minimum touch target size (Apple HIG: 44pt, POS: 56pt) */
  touchTargetMin: 56,
  /** Action bar height */
  actionBarHeight: 68,
  /** Header bar height */
  headerBarHeight: 44,
  /** Item card grid gap */
  cardGap: 6,
  /** Item card minimum height */
  cardMinHeight: 72,
  /** Number of item columns in grid (for ~10" iPad landscape) */
  gridColumns: 4,
} as const;

export const POSSpacing = {
  ...Spacing,
  /** Panel internal padding */
  panelPadding: 12,
  /** Tight gap between elements */
  tight: 4,
} as const;

/** Standardized overlay backgrounds for POS modals */
export const POSOverlay = {
  /** Full-screen modal (cash, card, receipt) */
  modal: "rgba(0,0,0,0.88)",
  /** Lightweight popup (quantity edit, quick actions) */
  popup: "rgba(0,0,0,0.72)",
} as const;
