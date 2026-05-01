import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const wasteReasonValidator = v.union(
  v.literal("expired"),
  v.literal("overcooked"),
  v.literal("customer_return"),
  v.literal("spillage"),
  v.literal("contaminated"),
  v.literal("other")
);

/**
 * Report waste for individual ingredients.
 * Each item in the array is deducted from stock immediately.
 * Triggers reorder checks on affected ingredients.
 */
export const reportIngredientWaste = mutation({
  args: {
    reason: wasteReasonValidator,
    reasonNote: v.optional(v.string()),
    items: v.array(
      v.object({
        ingredientId: v.id("im_ingredients"),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const wasteItems = [];
    let totalCost = 0;

    for (const item of args.items) {
      const ingredient = await ctx.db.get(item.ingredientId);
      if (!ingredient) continue;

      const costCents = Math.round(item.quantity * ingredient.costPerUnit);
      totalCost += costCents;

      wasteItems.push({
        ingredientId: item.ingredientId,
        ingredientName: ingredient.name,
        quantity: item.quantity,
        unit: ingredient.unit,
        costCents,
      });

      // Deduct from stock
      const newStock = Math.max(0, ingredient.currentStock - item.quantity);
      await ctx.db.patch(item.ingredientId, {
        currentStock: Math.round(newStock * 1000) / 1000,
      });

      // Check reorder
      await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
        ingredientId: item.ingredientId,
      });
    }

    return await ctx.db.insert("im_wasteLog", {
      reason: args.reason,
      reasonNote: args.reasonNote,
      items: wasteItems,
      totalCostCents: totalCost,
      reportedAt: Date.now(),
    });
  },
});

/**
 * Report waste for a whole menu item (e.g. "3 burnt Chicken Shawarma Wraps").
 * Looks up the recipe BOM and deducts each ingredient × quantity.
 * Admin can override individual ingredient amounts.
 */
export const reportMenuItemWaste = mutation({
  args: {
    reason: wasteReasonValidator,
    reasonNote: v.optional(v.string()),
    menuItemId: v.id("menuItems"),
    menuItemQty: v.number(),
    // Optional overrides: if admin wants to adjust specific ingredient amounts
    overrides: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("im_ingredients"),
          quantity: v.number(), // manual override amount
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const menuItem = await ctx.db.get(args.menuItemId);
    if (!menuItem) throw new Error("Menu item not found");

    // Get recipe BOM
    const recipeLinks = await ctx.db
      .query("im_recipes")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.menuItemId))
      .take(30);

    // Build override map
    const overrideMap = new Map<string, number>();
    if (args.overrides) {
      for (const o of args.overrides) {
        overrideMap.set(o.ingredientId, o.quantity);
      }
    }

    const wasteItems = [];
    let totalCost = 0;

    for (const link of recipeLinks) {
      const ingredient = await ctx.db.get(link.ingredientId);
      if (!ingredient) continue;

      // Use override if provided, otherwise recipe qty × menu item qty
      const wasteQty = overrideMap.has(link.ingredientId)
        ? overrideMap.get(link.ingredientId)!
        : link.quantityNeeded * args.menuItemQty;

      const costCents = Math.round(wasteQty * ingredient.costPerUnit);
      totalCost += costCents;

      wasteItems.push({
        ingredientId: link.ingredientId,
        ingredientName: ingredient.name,
        quantity: Math.round(wasteQty * 1000) / 1000,
        unit: ingredient.unit,
        costCents,
      });

      // Deduct from stock
      const newStock = Math.max(0, ingredient.currentStock - wasteQty);
      await ctx.db.patch(link.ingredientId, {
        currentStock: Math.round(newStock * 1000) / 1000,
      });

      // Check reorder
      await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
        ingredientId: link.ingredientId,
      });
    }

    return await ctx.db.insert("im_wasteLog", {
      reason: args.reason,
      reasonNote: args.reasonNote,
      items: wasteItems,
      menuItemId: args.menuItemId,
      menuItemName: menuItem.name,
      menuItemQty: args.menuItemQty,
      totalCostCents: totalCost,
      reportedAt: Date.now(),
    });
  },
});

/** Preview what ingredients will be deducted for a menu item waste report. */
export const previewMenuItemWaste = query({
  args: {
    menuItemId: v.id("menuItems"),
    menuItemQty: v.number(),
  },
  handler: async (ctx, args) => {
    const recipeLinks = await ctx.db
      .query("im_recipes")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.menuItemId))
      .take(30);

    const items = [];
    let totalCost = 0;

    for (const link of recipeLinks) {
      const ingredient = await ctx.db.get(link.ingredientId);
      if (!ingredient) continue;

      const qty = Math.round(link.quantityNeeded * args.menuItemQty * 1000) / 1000;
      const cost = Math.round(qty * ingredient.costPerUnit);
      totalCost += cost;

      items.push({
        ingredientId: link.ingredientId,
        ingredientName: ingredient.name,
        quantity: qty,
        unit: ingredient.unit,
        costCents: cost,
        currentStock: ingredient.currentStock,
      });
    }

    return { items, totalCostCents: totalCost };
  },
});

/** Waste history — most recent first. */
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("im_wasteLog")
      .withIndex("by_reportedAt")
      .order("desc")
      .take(50);
  },
});

/** Today's waste summary. */
export const todaySummary = query({
  args: {},
  handler: async (ctx) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await ctx.db
      .query("im_wasteLog")
      .withIndex("by_reportedAt", (q) => q.gte("reportedAt", startOfDay.getTime()))
      .take(200);

    const totalCost = logs.reduce((sum, l) => sum + l.totalCostCents, 0);
    const totalItems = logs.reduce((sum, l) => sum + l.items.length, 0);

    // Group by reason
    const byReason: Record<string, { count: number; cost: number }> = {};
    for (const log of logs) {
      if (!byReason[log.reason]) byReason[log.reason] = { count: 0, cost: 0 };
      byReason[log.reason].count += 1;
      byReason[log.reason].cost += log.totalCostCents;
    }

    return { reports: logs.length, totalItems, totalCostCents: totalCost, byReason };
  },
});
