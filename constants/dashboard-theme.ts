/**
 * Dashboard-specific color constants for status indicators,
 * stock levels, and action buttons.
 */
export const DashboardColors = {
  status: {
    pending: "#F59E0B",
    confirmed: "#3B82F6",
    preparing: "#8B5CF6",
    ready: "#10B981",
    completed: "#6B7280",
    cancelled: "#EF4444",
  },
  stock: {
    healthy: "#10B981",
    warning: "#F59E0B",
    critical: "#EF4444",
  },
  action: {
    accept: "#10B981",
    reject: "#EF4444",
    placeOrder: "#10B981",
  },
} as const;

/**
 * Returns stock color.
 * Critical = stock ≤ 40% of parLevel (red)
 * Low/Warning = stock ≤ parLevel (amber)
 * Healthy = stock > parLevel (green)
 */
export function getStockColor(
  currentQty: number,
  parLevel: number,
  criticalPct: number = 0.4
): string {
  if (currentQty <= parLevel * criticalPct) return DashboardColors.stock.critical;
  if (currentQty <= parLevel) return DashboardColors.stock.warning;
  return DashboardColors.stock.healthy;
}
