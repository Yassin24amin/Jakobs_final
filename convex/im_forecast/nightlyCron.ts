import { internalMutation } from "../_generated/server";
import { getAlpha } from "../im_settings";

/**
 * Nightly EWMA update — runs every night at 4 AM.
 *
 * For each product that had sales yesterday:
 *   newBaseline = (alpha × yesterdaySales) + ((1 - alpha) × previousBaseline)
 *
 * If no sales for a product, its baseline stays unchanged (no-op).
 * Alpha=0.4 means ~4 weeks to converge from seed to reality.
 */
export const runNightlyUpdate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const alpha = await getAlpha(ctx);
    const now = Date.now();

    // Instead of midnight-to-midnight, use a rolling 24h window ending 4 hours ago.
    // This captures a full day of sales that ended before the cron runs, regardless of timezone.
    const windowEnd = now - 4 * 60 * 60 * 1000; // 4 hours ago (cron runs at 4AM)
    const windowStart = windowEnd - 24 * 60 * 60 * 1000; // 28 hours ago
    const yesterdayStart = windowStart;
    const yesterdayEnd = windowEnd;

    // Fetch yesterday's sales
    const sales = await ctx.db
      .query("im_salesLog")
      .withIndex("by_soldAt", (q) =>
        q.gte("soldAt", yesterdayStart).lt("soldAt", yesterdayEnd)
      )
      .take(5000);

    if (sales.length === 0) return; // No sales yesterday → no-op

    // Aggregate sales by product
    const salesByProduct: Record<string, number> = {};
    for (const sale of sales) {
      salesByProduct[sale.menuItemId] =
        (salesByProduct[sale.menuItemId] ?? 0) + sale.quantity;
    }

    // Update demand profiles
    const profiles = await ctx.db.query("im_demandProfiles").take(200);

    for (const profile of profiles) {
      const yesterdaySales = salesByProduct[profile.menuItemId];
      if (yesterdaySales === undefined) continue; // No sales for this product → skip

      // Get yesterday's day-of-week multiplier to normalize
      const yesterday = new Date(yesterdayStart);
      const dayMultipliers = await (
        await import("../im_settings")
      ).getDayMultipliers(ctx);
      const dayMultiplier = dayMultipliers[yesterday.getDay()] ?? 1.0;

      // Normalize: convert actual sales to "baseline equivalent"
      // If Friday has 1.6x multiplier and we sold 160, baseline equivalent = 160/1.6 = 100
      const normalizedSales =
        dayMultiplier > 0 ? yesterdaySales / dayMultiplier : yesterdaySales;

      // EWMA update
      const newBaseline =
        alpha * normalizedSales + (1 - alpha) * profile.baseline;

      await ctx.db.patch(profile._id, {
        baseline: Math.round(newBaseline * 10) / 10, // 1 decimal precision
        lastUpdated: Date.now(),
      });
    }
  },
});
