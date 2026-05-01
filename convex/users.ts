import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const ADMIN_EMAILS = ["yahia@bals.pro", "yassin@bals.pro"];

/**
 * Called from the client whenever a Clerk session becomes active.
 * Creates or updates the user record keyed by tokenIdentifier.
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tokenIdentifier = identity.tokenIdentifier;

    // Check if user already exists by tokenIdentifier
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier),
      )
      .unique();

    if (existing) {
      // Update profile fields that may have changed in Clerk
      const updates: Record<string, unknown> = {
        lastLoginAt: Date.now(),
      };
      if (identity.name) updates.name = identity.name;
      if (identity.email) updates.email = identity.email;

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // New user — determine role from email
    const email = identity.email ?? "";
    const role = ADMIN_EMAILS.includes(email.toLowerCase())
      ? "admin"
      : "customer";

    return await ctx.db.insert("users", {
      email,
      name: identity.name,
      role,
      tokenIdentifier,
      lastLoginAt: Date.now(),
    });
  },
});

/**
 * Returns the current authenticated user's record, or null.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

// ── Legacy helpers (still used by POS / admin) ──────────────────────────

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
