import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Periodic scan: checks ALL ingredients for reorder needs.
 * Called by cron every 15 min AND by frontend on screen load.
 */
export const scanAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ingredients = await ctx.db.query("im_ingredients").take(200);

    for (const ingredient of ingredients) {
      if (!ingredient.isActive) continue;
      if (ingredient.currentStock > ingredient.parLevel) continue;

      await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
        ingredientId: ingredient._id,
      });
    }
  },
});

/**
 * Public mutation: called by the frontend when the Stock screen loads.
 * Scans all ingredients and creates reorders for any at critical level.
 * Fast — only checks, dedup prevents duplicates.
 */
export const triggerScan = mutation({
  args: {},
  handler: async (ctx) => {
    const ingredients = await ctx.db.query("im_ingredients").take(200);

    for (const ingredient of ingredients) {
      if (!ingredient.isActive) continue;
      if (ingredient.currentStock > ingredient.parLevel) continue;

      await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
        ingredientId: ingredient._id,
      });
    }
  },
});
