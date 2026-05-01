import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

export const record = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    source: v.union(v.literal("in_store"), v.literal("online")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("im_salesLog", {
      menuItemId: args.menuItemId,
      quantity: args.quantity,
      soldAt: Date.now(),
      source: args.source,
    });
  },
});

/** Get all sales for a specific date range. */
export const listByDateRange = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("im_salesLog")
      .withIndex("by_soldAt", (q) =>
        q.gte("soldAt", args.startTs).lte("soldAt", args.endTs)
      )
      .take(5000);
  },
});

/** Get today's sales grouped by product. */
export const todaysSummary = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const sales = await ctx.db
      .query("im_salesLog")
      .withIndex("by_soldAt", (q) => q.gte("soldAt", startOfDay))
      .take(5000);

    // Group by menuItemId
    const grouped: Record<string, number> = {};
    for (const sale of sales) {
      grouped[sale.menuItemId] = (grouped[sale.menuItemId] ?? 0) + sale.quantity;
    }
    return grouped;
  },
});
