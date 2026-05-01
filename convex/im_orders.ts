import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * im_ wrapper around partner's orders/orderItems tables.
 * Provides order management for the dashboard Orders + POS screens.
 */

export const listPendingOnline = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(20);
  },
});

export const listActiveOrders = query({
  args: {},
  handler: async (ctx) => {
    const statuses = ["pending", "confirmed", "preparing", "ready"] as const;
    const results = await Promise.all(
      statuses.map((status) =>
        ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(20)
      )
    );
    return results.flat().sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listByStatus = query({
  args: {
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .order("desc")
      .take(50);
  },
});

export const getWithItems = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(30);

    return { ...order, items };
  },
});

/** Get next order number atomically. */
const getNextOrderNumber = async (ctx: any): Promise<string> => {
  // Find highest order number and increment
  const latest = await ctx.db
    .query("orders")
    .withIndex("by_createdAt")
    .order("desc")
    .take(1);

  if (latest.length === 0) return "001";

  const lastNum = parseInt(latest[0].orderNumber, 10);
  if (isNaN(lastNum)) return "001";
  return String(lastNum + 1).padStart(3, "0");
};

export const create = mutation({
  args: {
    customerName: v.string(),
    fulfillmentType: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("counter")
    ),
    paymentMethod: v.union(
      v.literal("card"),
      v.literal("cash"),
      v.literal("sumup_terminal")
    ),
    orderSource: v.optional(v.union(v.literal("online"), v.literal("in_store"))),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        quantity: v.number(),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const orderNumber = await getNextOrderNumber(ctx);
    const now = Date.now();

    // Look up menu items for prices
    let total = 0;
    const itemDocs = [];

    for (const item of args.items) {
      const menuItem = await ctx.db.get(item.menuItemId);
      if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);

      const lineTotal = menuItem.price * item.quantity;
      total += lineTotal;

      itemDocs.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      status: args.orderSource === "in_store" ? "preparing" : "pending",
      customerName: args.customerName,
      total,
      fulfillmentType: args.fulfillmentType,
      deliveryFee: 0,
      paymentMethod: args.paymentMethod,
      paymentStatus: args.paymentMethod === "cash" ? "pending" : "pending",
      orderSource: args.orderSource,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    for (const doc of itemDocs) {
      await ctx.db.insert("orderItems", { orderId, ...doc });
    }

    return orderId;
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(args.orderId, {
      status: args.newStatus as any,
      updatedAt: Date.now(),
    });

    // When completed → trigger stock deduction + sales logging
    if (args.newStatus === "completed") {
      await ctx.runMutation(
        internal.im_stock_deduction.onOrderCompleted,
        { orderId: args.orderId }
      );
    }
  },
});

export const reject = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await ctx.db.patch(args.orderId, {
      status: "cancelled" as any,
      updatedAt: Date.now(),
    });
  },
});
