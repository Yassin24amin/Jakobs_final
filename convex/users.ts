import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const ADMIN_EMAILS = ["yahia@bals.pro", "yassin@bals.pro"];

export const getOrCreateByEmail = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastLoginAt: Date.now() });
      return await ctx.db.get(existing._id);
    }

    const role = ADMIN_EMAILS.includes(args.email) ? "admin" : "customer";
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role,
      lastLoginAt: Date.now(),
    });
    return await ctx.db.get(userId);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});
