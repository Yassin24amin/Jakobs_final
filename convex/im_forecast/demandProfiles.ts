import { v } from "convex/values";
import { query } from "../_generated/server";
import { getDayMultipliers } from "../im_settings";

export const getByMenuItem = query({
  args: { menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("im_demandProfiles")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.menuItemId))
      .unique();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("im_demandProfiles").take(200);
  },
});

/**
 * Get expected demand for a specific date.
 * Returns: { menuItemId, productName, expectedUnits }[]
 */
export const getExpectedForDate = query({
  args: { dateTs: v.number() },
  handler: async (ctx, args) => {
    const date = new Date(args.dateTs);
    const dayOfWeek = date.getDay(); // 0=Sun
    const multipliers = await getDayMultipliers(ctx);
    const multiplier = multipliers[dayOfWeek] ?? 1.0;

    const profiles = await ctx.db.query("im_demandProfiles").take(200);

    const results = await Promise.all(
      profiles.map(async (profile) => {
        const product = await ctx.db.get(profile.menuItemId);
        return {
          menuItemId: profile.menuItemId,
          productName: product?.name ?? "Unknown",
          baseline: profile.baseline,
          multiplier,
          expectedUnits: Math.round(profile.baseline * multiplier),
        };
      })
    );

    return results.filter((r) => r.expectedUnits > 0);
  },
});
