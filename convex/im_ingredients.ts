import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("im_ingredients")
      .withIndex("by_name")
      .take(200);
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("im_ingredients")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .take(100);
  },
});

export const get = query({
  args: { id: v.id("im_ingredients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    unit: v.string(),
    currentStock: v.number(),
    parLevel: v.number(),
    reorderQty: v.number(),
    costPerUnit: v.number(),
    category: v.string(),
    supplierId: v.optional(v.id("im_suppliers")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("im_ingredients", {
      ...args,
      isActive: true,
    });
    // Check reorder immediately if created below par
    await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
      ingredientId: id,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("im_ingredients"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    parLevel: v.optional(v.number()),
    reorderQty: v.optional(v.number()),
    costPerUnit: v.optional(v.number()),
    category: v.optional(v.string()),
    supplierId: v.optional(v.id("im_suppliers")),
    isActive: v.optional(v.boolean()),
    expiryDate: v.optional(v.number()),
    shelfLifeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
    // If parLevel changed, stock might now be below par
    await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
      ingredientId: id,
    });
  },
});

export const adjustStock = mutation({
  args: {
    id: v.id("im_ingredients"),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Ingredient not found");
    const newStock = Math.max(0, item.currentStock + args.delta);
    await ctx.db.patch(args.id, { currentStock: newStock });
    // Immediately check if reorder needed
    await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
      ingredientId: args.id,
    });
  },
});

export const setStock = mutation({
  args: {
    id: v.id("im_ingredients"),
    newStock: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      currentStock: Math.max(0, args.newStock),
    });
    // Immediately check if reorder needed
    await ctx.runMutation(internal.im_reorders.checkAndCreateReorder, {
      ingredientId: args.id,
    });
  },
});
