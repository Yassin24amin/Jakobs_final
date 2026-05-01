import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * im_ wrapper around partner's menuItems table.
 * Provides category listing + menu item queries for the POS screen.
 */

/** Get all unique categories from menuItems. */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_isAvailable", (q) => q.eq("isAvailable", true))
      .take(200);

    // Extract unique categories preserving order
    const seen = new Set<string>();
    const categories: { key: string; label: string }[] = [];
    for (const item of items) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        categories.push({
          key: item.category,
          label: item.category.charAt(0).toUpperCase() + item.category.slice(1),
        });
      }
    }
    return categories;
  },
});

/** List available menu items by category. */
export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_category_and_sortOrder", (q) =>
        q.eq("category", args.category as any)
      )
      .take(50);
  },
});

/** List all available menu items. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_isAvailable", (q) => q.eq("isAvailable", true))
      .take(100);
  },
});
