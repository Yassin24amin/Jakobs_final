import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        quantity: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
    fulfillmentType: v.union(v.literal("pickup"), v.literal("delivery")),
    deliveryAddress: v.optional(v.string()),
    paymentMethod: v.union(v.literal("card"), v.literal("cash")),
  },
  handler: async (ctx, args) => {
    // Validate all items exist and are available, and calculate total
    let subtotal = 0;
    const resolvedItems: Array<{
      menuItemId: (typeof args.items)[number]["menuItemId"];
      name: string;
      price: number;
      quantity: number;
      notes?: string;
    }> = [];

    for (const item of args.items) {
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

    const deliveryFee = args.fulfillmentType === "delivery" ? 300 : 0;
    const total = subtotal + deliveryFee;

    // Generate order number based on existing order count
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
    const orderNumber = `J-${String(nextNumber).padStart(4, "0")}`;

    const now = Date.now();

    // Insert the order
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      status: "pending",
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      userId: args.userId,
      total,
      notes: args.notes,
      fulfillmentType: args.fulfillmentType,
      deliveryAddress: args.deliveryAddress,
      deliveryFee,
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Insert order items
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

    return { orderId, orderNumber };
  },
});

export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) =>
        q.eq("orderNumber", args.orderNumber)
      )
      .unique();
  },
});

export const get = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMyOrders = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", args.status)
      )
      .order("desc")
      .take(50);
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error("Order not found");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const getOrderItems = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(50);
  },
});
