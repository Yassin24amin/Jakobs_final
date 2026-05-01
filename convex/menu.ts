import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_category_and_sortOrder")
      .take(100);
    return items.filter((item) => item.isAvailable);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_category_and_sortOrder")
      .take(200);
  },
});

export const getByCategory = query({
  args: {
    category: v.union(
      v.literal("shawarma"),
      v.literal("doner"),
      v.literal("pizza"),
      v.literal("sides"),
      v.literal("drinks"),
      v.literal("extras")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_category_and_sortOrder", (q) =>
        q.eq("category", args.category)
      )
      .take(50);
  },
});

export const get = query({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    arabicName: v.optional(v.string()),
    description: v.string(),
    price: v.number(),
    category: v.union(
      v.literal("shawarma"),
      v.literal("doner"),
      v.literal("pizza"),
      v.literal("sides"),
      v.literal("drinks"),
      v.literal("extras")
    ),
    tags: v.array(v.string()),
    isSpicy: v.boolean(),
    isSignature: v.boolean(),
    isAvailable: v.boolean(),
    imageId: v.optional(v.id("_storage")),
    sortOrder: v.number(),
    displayIndex: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("menuItems", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    arabicName: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(
      v.union(
        v.literal("shawarma"),
        v.literal("doner"),
        v.literal("pizza"),
        v.literal("sides"),
        v.literal("drinks"),
        v.literal("extras")
      )
    ),
    tags: v.optional(v.array(v.string())),
    isSpicy: v.optional(v.boolean()),
    isSignature: v.optional(v.boolean()),
    isAvailable: v.optional(v.boolean()),
    imageId: v.optional(v.id("_storage")),
    sortOrder: v.optional(v.number()),
    displayIndex: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // Remove undefined fields so patch only updates provided values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const toggleAvailability = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Menu item not found");
    }
    await ctx.db.patch(args.id, { isAvailable: !item.isAvailable });
    return { isAvailable: !item.isAvailable };
  },
});
