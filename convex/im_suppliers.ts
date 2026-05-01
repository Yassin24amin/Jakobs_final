import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("im_suppliers").take(50);
  },
});

export const get = query({
  args: { id: v.id("im_suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    preferredContact: v.optional(v.union(
      v.literal("phone"),
      v.literal("email"),
      v.literal("whatsapp")
    )),
    deliveryDays: v.array(v.number()),
    orderMessageTemplate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("im_suppliers", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("im_suppliers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    preferredContact: v.optional(v.union(
      v.literal("phone"),
      v.literal("email"),
      v.literal("whatsapp")
    )),
    deliveryDays: v.optional(v.array(v.number())),
    orderMessageTemplate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});
