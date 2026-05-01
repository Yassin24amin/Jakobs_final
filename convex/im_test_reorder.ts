import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/** Test helper: manually trigger reorder check for an ingredient. */
export const triggerCheck = mutation({
  args: { ingredientId: v.id("im_ingredients") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
      ingredientId: args.ingredientId,
    });
    return "Check triggered";
  },
});
