import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getSetting } from "./im_settings";

/**
 * 3-tier reorder system:
 *
 * 1. LOW (stock <= parLevel):
 *    → Creates a "suggested" reorder. Manager sees it as a recommendation.
 *
 * 2. CRITICAL (stock <= 50% of parLevel):
 *    → Auto-creates an "approved" reorder. Manager gets an urgent alert.
 *      They can still dismiss it, but the system assumes it's needed.
 *
 * 3. Manager can also create manual reorders anytime.
 *
 * Deduplication: won't create a duplicate if there's already a pending
 * (suggested/approved/ordered) reorder for the same ingredient.
 */

// ─── Queries ───

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("im_reorders")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .order("desc")
      .take(100);
  },
});

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const suggested = await ctx.db
      .query("im_reorders")
      .withIndex("by_status", (q) => q.eq("status", "suggested"))
      .order("desc")
      .take(50);
    const approved = await ctx.db
      .query("im_reorders")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .take(50);
    const ordered = await ctx.db
      .query("im_reorders")
      .withIndex("by_status", (q) => q.eq("status", "ordered"))
      .order("desc")
      .take(50);
    return [...approved, ...suggested, ...ordered].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

/** Dashboard summary: counts of each status */
export const statusCounts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("im_reorders").take(500);
    return {
      suggested: all.filter((r) => r.status === "suggested").length,
      approved: all.filter((r) => r.status === "approved").length,
      ordered: all.filter((r) => r.status === "ordered").length,
    };
  },
});

// ─── Manager Actions ───

/** Manager approves a suggestion → status becomes "approved" */
export const approve = mutation({
  args: { id: v.id("im_reorders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "approved", updatedAt: Date.now() });
  },
});

/** Manager dismisses a suggestion */
export const dismiss = mutation({
  args: { id: v.id("im_reorders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "dismissed", updatedAt: Date.now() });
  },
});

/** Manager marks as ordered (sent to supplier) */
export const markOrdered = mutation({
  args: { id: v.id("im_reorders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "ordered", updatedAt: Date.now() });
  },
});

/** Manager marks as received → adds stock back to ingredient */
export const markReceived = mutation({
  args: { id: v.id("im_reorders") },
  handler: async (ctx, args) => {
    const reorder = await ctx.db.get(args.id);
    if (!reorder) throw new Error("Reorder not found");

    // Add stock + auto-set expiry if shelf life is configured
    const ingredient = await ctx.db.get(reorder.ingredientId);
    if (ingredient) {
      const patch: Record<string, unknown> = {
        currentStock: ingredient.currentStock + reorder.quantity,
      };
      // Auto-calculate new expiry from shelf life
      if (ingredient.shelfLifeDays && ingredient.shelfLifeDays > 0) {
        patch.expiryDate = Date.now() + ingredient.shelfLifeDays * 24 * 60 * 60 * 1000;
      }
      await ctx.db.patch(reorder.ingredientId, patch);
    }

    await ctx.db.patch(args.id, { status: "received", updatedAt: Date.now() });
  },
});

/** Manager creates a manual reorder */
export const createManual = mutation({
  args: {
    ingredientId: v.id("im_ingredients"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) throw new Error("Ingredient not found");

    const supplier = ingredient.supplierId
      ? await ctx.db.get(ingredient.supplierId)
      : null;

    return await ctx.db.insert("im_reorders", {
      ingredientId: args.ingredientId,
      ingredientName: ingredient.name,
      supplierId: ingredient.supplierId,
      supplierName: supplier?.name,
      quantity: args.quantity,
      unit: ingredient.unit,
      status: "approved",
      trigger: "manual",
      estimatedCost: args.quantity * ingredient.costPerUnit,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/** Manager updates par level + reorder qty for an ingredient */
export const updateThresholds = mutation({
  args: {
    ingredientId: v.id("im_ingredients"),
    parLevel: v.number(),
    reorderQty: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ingredientId, {
      parLevel: args.parLevel,
      reorderQty: args.reorderQty,
    });
  },
});

// ─── Auto-trigger (called after stock deduction) ───

/**
 * Checks a single ingredient and creates reorder if needed.
 * Deduplicates: skips if there's already a pending reorder for this ingredient.
 */
export const checkAndCreateReorder = internalMutation({
  args: { ingredientId: v.id("im_ingredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient || !ingredient.isActive) return;

    // Skip if stock is fine
    if (ingredient.currentStock > ingredient.parLevel) return;

    // Check for existing pending reorder (avoid duplicates)
    const existing = await ctx.db
      .query("im_reorders")
      .withIndex("by_ingredientId", (q) =>
        q.eq("ingredientId", args.ingredientId)
      )
      .take(10);

    const hasPending = existing.some(
      (r) =>
        r.status === "suggested" ||
        r.status === "approved" ||
        r.status === "ordered"
    );
    if (hasPending) return;

    const supplier = ingredient.supplierId
      ? await ctx.db.get(ingredient.supplierId)
      : null;

    // Configurable: default 0.4 = 40% of par level
    const criticalPct = ((await getSetting(ctx, "criticalStockPct")) as number) ?? 0.4;
    const isCritical = ingredient.currentStock <= ingredient.parLevel * criticalPct;

    // Smart quantity: daily consumption x days until next delivery + par buffer
    let smartQty = ingredient.reorderQty; // fallback
    try {
      const recipeLinks = await ctx.db
        .query("im_recipes")
        .withIndex("by_ingredientId", (q) => q.eq("ingredientId", args.ingredientId))
        .take(50);

      const { getDayMultipliers: getMultipliers } = await import("./im_settings");
      const multipliers = await getMultipliers(ctx);
      const avgMultiplier = Object.values(multipliers).reduce((a, b) => a + b, 0) / 7;

      let dailyConsumption = 0;
      for (const link of recipeLinks) {
        const profile = await ctx.db
          .query("im_demandProfiles")
          .withIndex("by_menuItemId", (q) => q.eq("menuItemId", link.menuItemId))
          .unique();
        if (profile) {
          dailyConsumption += profile.baseline * avgMultiplier * link.quantityNeeded;
        }
      }

      let daysUntilDelivery = 7;
      if (supplier && supplier.deliveryDays.length > 0) {
        const today = new Date().getDay();
        let minDays = 7;
        for (const day of supplier.deliveryDays) {
          let diff = day - today;
          if (diff <= 0) diff += 7;
          if (diff < minDays) minDays = diff;
        }
        daysUntilDelivery = minDays;
      }

      const calculated = Math.ceil(
        dailyConsumption * daysUntilDelivery + ingredient.parLevel - ingredient.currentStock
      );
      smartQty = Math.max(ingredient.reorderQty, calculated);
    } catch {
      // fallback to fixed reorderQty
    }

    await ctx.db.insert("im_reorders", {
      ingredientId: args.ingredientId,
      ingredientName: ingredient.name,
      supplierId: ingredient.supplierId,
      supplierName: supplier?.name,
      quantity: smartQty,
      unit: ingredient.unit,
      status: isCritical ? "approved" : "suggested",
      trigger: isCritical ? "critical" : "low",
      estimatedCost: smartQty * ingredient.costPerUnit,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
