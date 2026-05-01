import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  menuItems: defineTable({
    name: v.string(),
    arabicName: v.optional(v.string()),
    description: v.string(),
    price: v.number(), // cents (EUR)
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
    displayIndex: v.string(), // "001", "002", etc.
  })
    .index("by_category", ["category"])
    .index("by_category_and_sortOrder", ["category", "sortOrder"])
    .index("by_isAvailable", ["isAvailable"]),

  orders: defineTable({
    orderNumber: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    total: v.number(), // cents
    notes: v.optional(v.string()),
    fulfillmentType: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("counter")
    ),
    deliveryAddress: v.optional(v.string()),
    deliveryFee: v.number(), // cents
    paymentMethod: v.union(
      v.literal("card"),
      v.literal("cash"),
      v.literal("sumup_terminal")
    ),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    orderSource: v.optional(v.union(v.literal("online"), v.literal("in_store"))),
    sumupTransactionId: v.optional(v.string()),
    cashTendered: v.optional(v.number()),
    changeGiven: v.optional(v.number()),
    posOperatorId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_userId", ["userId"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_createdAt", ["createdAt"])
    .index("by_orderSource_and_createdAt", ["orderSource", "createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.id("menuItems"),
    name: v.string(),
    price: v.number(), // cents, denormalized snapshot
    quantity: v.number(),
    notes: v.optional(v.string()),
  }).index("by_orderId", ["orderId"]),

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("customer"), v.literal("admin")),
    tokenIdentifier: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),
});
