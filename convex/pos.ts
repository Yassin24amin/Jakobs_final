import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// ---------------------------------------------------------------------------
// Shared helpers (reusable order-creation logic)
// ---------------------------------------------------------------------------

interface ResolvedItem {
  menuItemId: Id<"menuItems">;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

/**
 * Validate menu items exist and are available, calculate subtotal.
 * Shared between customer orders.create and POS order creation.
 */
export async function validateAndResolveItems(
  ctx: MutationCtx,
  items: Array<{ menuItemId: Id<"menuItems">; quantity: number; notes?: string }>
): Promise<{ resolvedItems: ResolvedItem[]; subtotal: number }> {
  let subtotal = 0;
  const resolvedItems: ResolvedItem[] = [];

  for (const item of items) {
    const menuItem = await ctx.db.get(item.menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item not found: ${item.menuItemId}`);
    }
    if (!menuItem.isAvailable) {
      throw new Error(`Menu item is not available: ${menuItem.name}`);
    }
    subtotal += menuItem.price * item.quantity;
    resolvedItems.push({
      menuItemId: item.menuItemId,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      notes: item.notes,
    });
  }

  return { resolvedItems, subtotal };
}

/**
 * Generate the next sequential order number (J-0001, J-0002, ...).
 */
export async function generateOrderNumber(ctx: MutationCtx): Promise<string> {
  const existingOrders = await ctx.db
    .query("orders")
    .withIndex("by_createdAt")
    .order("desc")
    .take(1);

  let nextNumber = 1;
  if (existingOrders.length > 0) {
    const lastOrderNum = existingOrders[0].orderNumber;
    const lastNum = parseInt(lastOrderNum.replace("J-", ""), 10);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }
  return `J-${String(nextNumber).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// POS Mutations
// ---------------------------------------------------------------------------

/**
 * Create an in-store POS order.
 * Payment is collected at the counter before creation, so orders are born
 * with status "confirmed" and paymentStatus "paid".
 */
export const createOrder = mutation({
  args: {
    customerName: v.optional(v.string()),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        quantity: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
    paymentMethod: v.union(v.literal("cash"), v.literal("sumup_terminal")),
    cashTendered: v.optional(v.number()),
    sumupTransactionId: v.optional(v.string()),
    posOperatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    const { resolvedItems, subtotal } = await validateAndResolveItems(
      ctx,
      args.items
    );

    const total = subtotal; // No delivery fee for counter orders
    const orderNumber = await generateOrderNumber(ctx);
    const now = Date.now();

    // Calculate change for cash payments
    let changeGiven: number | undefined;
    if (args.paymentMethod === "cash") {
      if (args.cashTendered === undefined) {
        throw new Error("Cash tendered is required for cash payments");
      }
      if (args.cashTendered < total) {
        throw new Error("Cash tendered must be greater than or equal to total");
      }
      changeGiven = args.cashTendered - total;
    }

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      status: "confirmed",
      customerName: args.customerName ?? "Walk-in",
      total,
      notes: args.notes,
      fulfillmentType: "counter",
      deliveryFee: 0,
      paymentMethod: args.paymentMethod,
      paymentStatus: "paid",
      orderSource: "in_store",
      sumupTransactionId: args.sumupTransactionId,
      cashTendered: args.cashTendered,
      changeGiven,
      posOperatorId: args.posOperatorId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert order items (denormalized snapshot)
    for (const item of resolvedItems) {
      await ctx.db.insert("orderItems", {
        orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    return { orderId, orderNumber, total, changeGiven };
  },
});

/**
 * List all active orders (confirmed, preparing, ready) for kitchen tracking.
 * Optionally filter by order source.
 */
export const listActiveOrders = query({
  args: {
    source: v.optional(
      v.union(v.literal("online"), v.literal("in_store"))
    ),
  },
  handler: async (ctx, args) => {
    const statuses = ["confirmed", "preparing", "ready"] as const;
    const allOrders: Doc<"orders">[] = [];

    for (const status of statuses) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
        .order("asc")
        .take(50);
      allOrders.push(...orders);
    }

    // Filter by source if specified
    if (args.source) {
      return allOrders
        .filter((o: Doc<"orders">) => o.orderSource === args.source)
        .sort((a: Doc<"orders">, b: Doc<"orders">) => a.createdAt - b.createdAt);
    }

    return allOrders.sort((a: Doc<"orders">, b: Doc<"orders">) => a.createdAt - b.createdAt);
  },
});

/**
 * Get aggregated daily summary for in-store orders.
 */
export const getDailySummary = query({
  args: {},
  handler: async (ctx) => {
    // Start of today (UTC)
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const todaysOrders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("asc")
      .take(500);

    // Filter to today's orders only
    const filtered = todaysOrders.filter((o) => o.createdAt >= startOfDay);

    let totalRevenue = 0;
    let cashRevenue = 0;
    let cardRevenue = 0;
    let inStoreCount = 0;
    let onlineCount = 0;

    for (const order of filtered) {
      if (order.status === "cancelled") continue;
      totalRevenue += order.total;

      if (order.paymentMethod === "cash") {
        cashRevenue += order.total;
      } else {
        cardRevenue += order.total;
      }

      if (order.orderSource === "in_store") {
        inStoreCount++;
      } else {
        onlineCount++;
      }
    }

    return {
      totalOrders: filtered.filter((o) => o.status !== "cancelled").length,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      inStoreCount,
      onlineCount,
    };
  },
});

/**
 * Void (cancel) a recent in-store order.
 * Only allows voiding orders created within the last 15 minutes.
 */
export const voidOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    if (order.orderSource !== "in_store") {
      throw new Error("Can only void in-store orders from the POS");
    }

    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - order.createdAt > fifteenMinutes) {
      throw new Error(
        "Cannot void orders older than 15 minutes. Contact a manager."
      );
    }

    if (order.status === "cancelled") {
      throw new Error("Order is already cancelled");
    }

    await ctx.db.patch(args.orderId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true, orderNumber: order.orderNumber };
  },
});

/**
 * Mark an order as paid (for delayed SumUp confirmation / error recovery).
 */
export const markPaid = mutation({
  args: {
    orderId: v.id("orders"),
    sumupTransactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      paymentStatus: "paid",
      sumupTransactionId: args.sumupTransactionId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
