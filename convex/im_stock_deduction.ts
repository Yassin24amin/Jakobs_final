import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Called when an order is completed.
 * 1. Logs each line item to salesLog (feeds the nightly EWMA cron)
 * 2. Deducts ingredient stock based on recipe BOM
 * 3. Checks each affected ingredient for reorder triggers
 *
 * ── PARTNER INTEGRATION ──
 * Your partner needs to add ONE line to their orders.ts updateStatus handler,
 * inside the `if (newStatus === "completed")` block:
 *
 *   await ctx.runMutation(internal.im_stock_deduction.onOrderCompleted, {
 *     orderId: args.orderId,
 *   });
 */
export const onOrderCompleted = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(30);

    // Collect affected ingredient IDs for reorder check
    const affectedIngredientIds = new Set<string>();

    for (const item of items) {
      // 1. Log sale for EWMA learning
      await ctx.db.insert("im_salesLog", {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        soldAt: Date.now(),
        source: order.orderSource ?? "in_store",
      });

      // 2. Deduct ingredients via recipe BOM
      const recipeLinks = await ctx.db
        .query("im_recipes")
        .withIndex("by_menuItemId", (q) => q.eq("menuItemId", item.menuItemId))
        .take(30);

      for (const link of recipeLinks) {
        const ingredient = await ctx.db.get(link.ingredientId);
        if (ingredient) {
          const deduction = link.quantityNeeded * item.quantity;
          const newStock = Math.max(0, ingredient.currentStock - deduction);
          await ctx.db.patch(link.ingredientId, {
            currentStock: Math.round(newStock * 1000) / 1000,
          });
          affectedIngredientIds.add(link.ingredientId);
        }
      }
    }

    // 3. Check each affected ingredient for reorder triggers
    for (const ingredientId of affectedIngredientIds) {
      await ctx.runMutation(
        internal.im_reorders.checkAndCreateReorder,
        { ingredientId: ingredientId as any }
      );
    }
  },
});
