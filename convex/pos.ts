import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const TAP_TO_PAY_REQUEST_TTL_MS = 2 * 60 * 1000;

type POSDeviceStatus =
  | "offline"
  | "register_ready"
  | "companion_ready"
  | "busy"
  | "reconnecting";

type TapToPayRequestStatus =
  | "created"
  | "claimed"
  | "reader_ready"
  | "waiting_for_tap"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "expired";

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

async function requireAdminUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

async function getDeviceByInstanceId(
  ctx: QueryCtx | MutationCtx,
  deviceInstanceId: string
) {
  return await ctx.db
    .query("posDevices")
    .withIndex("by_deviceInstanceId", (q) =>
      q.eq("deviceInstanceId", deviceInstanceId)
    )
    .unique();
}

async function getPresenceByDeviceInstanceId(
  ctx: QueryCtx | MutationCtx,
  deviceInstanceId: string
) {
  return await ctx.db
    .query("posDevicePresence")
    .withIndex("by_deviceInstanceId", (q) =>
      q.eq("deviceInstanceId", deviceInstanceId)
    )
    .unique();
}

function isPresenceOnline(
  presence: Doc<"posDevicePresence"> | null
): presence is Doc<"posDevicePresence"> {
  if (!presence) return false;
  if (presence.status === "offline") return false;
  return Date.now() - presence.lastSeenAt <= 30_000;
}

function isTerminalRequestStatus(status: TapToPayRequestStatus) {
  return (
    status === "succeeded" ||
    status === "failed" ||
    status === "canceled" ||
    status === "expired"
  );
}

async function clearCompanionCurrentRequest(
  ctx: MutationCtx,
  companionDeviceInstanceId: string,
  paymentRequestId: Id<"posPaymentRequests">,
  nextStatus: POSDeviceStatus = "companion_ready"
) {
  const presence = await getPresenceByDeviceInstanceId(ctx, companionDeviceInstanceId);
  if (!presence) return;
  if (presence.currentPaymentRequestId !== paymentRequestId) return;

  await ctx.db.patch(presence._id, {
    currentPaymentRequestId: undefined,
    status: nextStatus,
    lastSeenAt: Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Validate menu items exist and are available, calculate subtotal.
 * Shared between customer orders.create and POS order creation.
 */
export async function validateAndResolveItems(
  ctx: MutationCtx,
  items: { menuItemId: Id<"menuItems">; quantity: number; notes?: string }[]
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

export const createTapToPayRequest = mutation({
  args: {
    registerDeviceInstanceId: v.string(),
    companionDeviceInstanceId: v.string(),
    customerName: v.optional(v.string()),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        quantity: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdminUser(ctx);

    if (args.items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    const registerDevice = await getDeviceByInstanceId(
      ctx,
      args.registerDeviceInstanceId
    );
    const companionDevice = await getDeviceByInstanceId(
      ctx,
      args.companionDeviceInstanceId
    );

    if (!registerDevice || registerDevice.role !== "register") {
      throw new Error("Register device not found");
    }
    if (
      !companionDevice ||
      companionDevice.role !== "tap_to_pay_companion"
    ) {
      throw new Error("Tap to Pay companion not found");
    }
    if (
      registerDevice.pairedDeviceInstanceId !== companionDevice.deviceInstanceId ||
      companionDevice.pairedDeviceInstanceId !== registerDevice.deviceInstanceId
    ) {
      throw new Error("Register and companion are not paired");
    }

    const presence = await getPresenceByDeviceInstanceId(
      ctx,
      companionDevice.deviceInstanceId
    );
    if (!isPresenceOnline(presence)) {
      throw new Error("Paired Tap to Pay device is offline");
    }

    const { resolvedItems, subtotal } = await validateAndResolveItems(
      ctx,
      args.items
    );

    const total = subtotal;
    const now = Date.now();

    const requestId = await ctx.db.insert("posPaymentRequests", {
      registerDeviceInstanceId: registerDevice.deviceInstanceId,
      companionDeviceInstanceId: companionDevice.deviceInstanceId,
      operatorUserId: adminUser._id,
      customerName: args.customerName ?? "Walk-in",
      notes: args.notes,
      items: resolvedItems,
      total,
      status: "created",
      expiresAt: now + TAP_TO_PAY_REQUEST_TTL_MS,
      createdAt: now,
      updatedAt: now,
    });

    return { requestId, total };
  },
});

export const getTapToPayRequest = query({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    return await ctx.db.get(args.paymentRequestId);
  },
});

export const getTapToPayRequestForCompanion = query({
  args: {
    companionDeviceInstanceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const requests = await ctx.db
      .query("posPaymentRequests")
      .withIndex("by_companionDeviceInstanceId_and_createdAt", (q) =>
        q.eq("companionDeviceInstanceId", args.companionDeviceInstanceId)
      )
      .order("desc")
      .take(10);

    for (const request of requests) {
      if (isTerminalRequestStatus(request.status)) {
        continue;
      }
      return request;
    }

    return null;
  },
});

export const claimTapToPayRequest = mutation({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
    companionDeviceInstanceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }
    if (request.companionDeviceInstanceId !== args.companionDeviceInstanceId) {
      throw new Error("Payment request assigned to a different device");
    }
    if (
      request.status !== "created" &&
      request.status !== "claimed" &&
      request.status !== "reader_ready"
    ) {
      throw new Error("Payment request is no longer claimable");
    }

    const presence = await getPresenceByDeviceInstanceId(
      ctx,
      args.companionDeviceInstanceId
    );
    if (!presence) {
      throw new Error("Companion device presence not found");
    }

    const now = Date.now();
    if (request.status === "created") {
      await ctx.db.patch(args.paymentRequestId, {
        status: "claimed",
        updatedAt: now,
      });
    }

    await ctx.db.patch(presence._id, {
      status: "busy",
      currentPaymentRequestId: args.paymentRequestId,
      lastSeenAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(args.paymentRequestId);
  },
});

export const updateTapToPayRequestStatus = mutation({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
    status: v.union(
      v.literal("created"),
      v.literal("claimed"),
      v.literal("reader_ready"),
      v.literal("waiting_for_tap"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("expired")
    ),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripePaymentIntentClientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }
    if (isTerminalRequestStatus(request.status) && request.status !== args.status) {
      throw new Error("Payment request is already finalized");
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentRequestId, {
      status: args.status,
      failureCode: args.failureCode,
      failureMessage: args.failureMessage,
      stripePaymentIntentId:
        args.stripePaymentIntentId ?? request.stripePaymentIntentId,
      stripePaymentIntentClientSecret:
        args.stripePaymentIntentClientSecret ??
        request.stripePaymentIntentClientSecret,
      updatedAt: now,
    });

    if (isTerminalRequestStatus(args.status)) {
      await clearCompanionCurrentRequest(
        ctx,
        request.companionDeviceInstanceId,
        args.paymentRequestId
      );
    }

    return await ctx.db.get(args.paymentRequestId);
  },
});

export const cancelTapToPayRequest = mutation({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }
    if (request.status === "succeeded") {
      throw new Error("Completed Tap to Pay request cannot be canceled");
    }

    await ctx.db.patch(args.paymentRequestId, {
      status: "canceled",
      failureMessage: args.reason ?? request.failureMessage,
      updatedAt: Date.now(),
    });
    await clearCompanionCurrentRequest(
      ctx,
      request.companionDeviceInstanceId,
      args.paymentRequestId
    );

    return { success: true };
  },
});

export const attachTapToPayPaymentIntent = internalMutation({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
    stripePaymentIntentId: v.string(),
    stripePaymentIntentClientSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    await ctx.db.patch(args.paymentRequestId, {
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripePaymentIntentClientSecret: args.stripePaymentIntentClientSecret,
      updatedAt: Date.now(),
    });
  },
});

export const getTapToPayRequestForTerminal = query({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    return {
      _id: request._id,
      total: request.total,
      status: request.status,
      stripePaymentIntentId: request.stripePaymentIntentId ?? null,
      stripePaymentIntentClientSecret:
        request.stripePaymentIntentClientSecret ?? null,
      expiresAt: request.expiresAt,
    };
  },
});

export const finalizeTapToPayOrder = mutation({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    if (request.createdOrderId && request.createdOrderNumber) {
      return {
        orderId: request.createdOrderId,
        orderNumber: request.createdOrderNumber,
      };
    }

    if (request.status === "failed" || request.status === "canceled") {
      throw new Error("Cannot finalize a failed or canceled payment request");
    }

    const orderNumber = await generateOrderNumber(ctx);
    const now = Date.now();
    const companionDevice = await getDeviceByInstanceId(
      ctx,
      request.companionDeviceInstanceId
    );
    const tapToPayPaymentMethod =
      companionDevice?.platform === "android"
        ? "stripe_tap_to_pay_android"
        : "stripe_tap_to_pay_iphone";

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      status: "confirmed",
      customerName: request.customerName ?? "Walk-in",
      total: request.total,
      notes: request.notes,
      fulfillmentType: "counter",
      deliveryFee: 0,
      paymentMethod: tapToPayPaymentMethod,
      paymentStatus: "paid",
      stripePaymentIntentId: args.stripePaymentIntentId,
      orderSource: "in_store",
      posOperatorId: request.operatorUserId,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of request.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    await ctx.db.patch(args.paymentRequestId, {
      status: "succeeded",
      stripePaymentIntentId: args.stripePaymentIntentId,
      createdOrderId: orderId,
      createdOrderNumber: orderNumber,
      updatedAt: now,
    });
    await clearCompanionCurrentRequest(
      ctx,
      request.companionDeviceInstanceId,
      args.paymentRequestId
    );

    return { orderId, orderNumber };
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
