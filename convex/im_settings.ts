import { v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";

/** Default day-of-week multipliers (0=Sun ... 6=Sat) */
export const DEFAULT_DAY_MULTIPLIERS: Record<number, number> = {
  0: 0.7, // Sunday
  1: 0.8, // Monday
  2: 0.85, // Tuesday
  3: 0.9, // Wednesday
  4: 1.0, // Thursday (baseline)
  5: 1.6, // Friday
  6: 1.5, // Saturday
};

export const DEFAULT_ALPHA = 0.4; // EWMA smoothing factor

/** Get a system setting by key. Returns parsed JSON value or null. */
export async function getSetting(
  ctx: QueryCtx,
  key: string
): Promise<unknown | null> {
  const row = await ctx.db
    .query("im_systemSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) return null;
  return JSON.parse(row.value);
}

/** Get day multipliers from settings, or return defaults. */
export async function getDayMultipliers(
  ctx: QueryCtx
): Promise<Record<number, number>> {
  const stored = await getSetting(ctx, "dayMultipliers");
  if (stored && typeof stored === "object") {
    return stored as Record<number, number>;
  }
  return DEFAULT_DAY_MULTIPLIERS;
}

/** Get EWMA alpha from settings, or return default. */
export async function getAlpha(ctx: QueryCtx): Promise<number> {
  const stored = await getSetting(ctx, "alpha");
  if (typeof stored === "number") return stored;
  return DEFAULT_ALPHA;
}

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await getSetting(ctx, args.key);
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("im_systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("im_systemSettings", {
        key: args.key,
        value: args.value,
      });
    }
  },
});

export const getDayMultipliersQuery = query({
  args: {},
  handler: async (ctx) => {
    return await getDayMultipliers(ctx);
  },
});

/** Get all stock level settings for the settings UI. */
export const getStockLevelSettings = query({
  args: {},
  handler: async (ctx) => {
    const criticalPct = ((await getSetting(ctx, "criticalStockPct")) as number) ?? 0.4;
    const alpha = ((await getSetting(ctx, "alpha")) as number) ?? DEFAULT_ALPHA;
    const dayMultipliers = await getDayMultipliers(ctx);
    const restaurantName = ((await getSetting(ctx, "restaurantName")) as string) ?? "Restaurant";
    return { criticalPct, alpha, dayMultipliers, restaurantName };
  },
});
