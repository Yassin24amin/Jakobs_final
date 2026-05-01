import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByMenuItem = query({
  args: { menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("im_recipes")
      .withIndex("by_menuItemId", (q) => q.eq("menuItemId", args.menuItemId))
      .take(30);

    // Enrich with ingredient details
    const enriched = await Promise.all(
      links.map(async (link) => {
        const ingredient = await ctx.db.get(link.ingredientId);
        return {
          ...link,
          ingredientName: ingredient?.name ?? "Unknown",
          ingredientUnit: ingredient?.unit ?? "",
        };
      })
    );
    return enriched;
  },
});

export const getByIngredient = query({
  args: { ingredientId: v.id("im_ingredients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("im_recipes")
      .withIndex("by_ingredientId", (q) =>
        q.eq("ingredientId", args.ingredientId)
      )
      .take(50);
  },
});

export const add = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    ingredientId: v.id("im_ingredients"),
    quantityNeeded: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("im_recipes", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("im_recipes"),
    quantityNeeded: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { quantityNeeded: args.quantityNeeded });
  },
});

export const remove = mutation({
  args: { id: v.id("im_recipes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
