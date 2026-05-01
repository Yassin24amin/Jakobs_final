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

  // ─── Inventory Management (im_* files) ───

  im_ingredients: defineTable({
    name: v.string(),
    unit: v.string(),
    currentStock: v.number(),
    parLevel: v.number(),
    reorderQty: v.number(), // fallback if smart calc unavailable
    costPerUnit: v.number(), // cents
    category: v.string(), // "proteins", "dairy", "produce", "dough_bread", "dry_pantry"
    supplierId: v.optional(v.id("im_suppliers")),
    isActive: v.boolean(),
    expiryDate: v.optional(v.number()), // timestamp — when current stock expires
    shelfLifeDays: v.optional(v.number()), // typical shelf life for this ingredient
  })
    .index("by_category", ["category"])
    .index("by_name", ["name"])
    .index("by_expiryDate", ["expiryDate"]),

  im_recipes: defineTable({
    menuItemId: v.id("menuItems"),
    ingredientId: v.id("im_ingredients"),
    quantityNeeded: v.number(),
  })
    .index("by_menuItemId", ["menuItemId"])
    .index("by_ingredientId", ["ingredientId"]),

  im_suppliers: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    deliveryDays: v.array(v.number()), // 0=Sun ... 6=Sat
    notes: v.optional(v.string()),
  }),

  im_demandProfiles: defineTable({
    menuItemId: v.id("menuItems"),
    baseline: v.number(),
    lastUpdated: v.number(),
  }).index("by_menuItemId", ["menuItemId"]),

  im_salesLog: defineTable({
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    soldAt: v.number(),
    source: v.union(v.literal("in_store"), v.literal("online")),
  }).index("by_soldAt", ["soldAt"]),

  im_prepRecipes: defineTable({
    name: v.string(),
    description: v.string(),
    restTimeHours: v.number(),
    category: v.string(),
    inputs: v.array(
      v.object({
        ingredientId: v.id("im_ingredients"),
        quantity: v.number(),
      })
    ),
    outputDescription: v.string(),
  }),

  im_systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  im_reorders: defineTable({
    ingredientId: v.id("im_ingredients"),
    ingredientName: v.string(), // denormalized
    supplierId: v.optional(v.id("im_suppliers")),
    supplierName: v.optional(v.string()), // denormalized
    quantity: v.number(), // how much to order
    unit: v.string(),
    status: v.union(
      v.literal("suggested"),  // system auto-suggested, needs manager approval
      v.literal("approved"),   // manager approved, ready to send
      v.literal("ordered"),    // order placed with supplier
      v.literal("received"),   // stock received and added
      v.literal("dismissed")   // manager dismissed this suggestion
    ),
    trigger: v.union(
      v.literal("low"),        // stock fell below parLevel
      v.literal("critical"),   // stock fell below 50% of parLevel — auto-created
      v.literal("manual")      // manager created manually
    ),
    estimatedCost: v.number(), // cents: quantity × costPerUnit
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_ingredientId", ["ingredientId"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  im_wasteLog: defineTable({
    reason: v.union(
      v.literal("expired"),
      v.literal("overcooked"),
      v.literal("customer_return"),
      v.literal("spillage"),
      v.literal("contaminated"),
      v.literal("other")
    ),
    reasonNote: v.optional(v.string()), // free-text detail
    // Each report can have multiple waste lines (batch reporting)
    items: v.array(
      v.object({
        ingredientId: v.id("im_ingredients"),
        ingredientName: v.string(),
        quantity: v.number(),
        unit: v.string(),
        costCents: v.number(), // quantity × costPerUnit at time of report
      })
    ),
    // Optional: if waste came from a whole menu item (e.g. "3 burnt shawarmas")
    menuItemId: v.optional(v.id("menuItems")),
    menuItemName: v.optional(v.string()),
    menuItemQty: v.optional(v.number()),
    totalCostCents: v.number(), // sum of all item costs
    reportedAt: v.number(),
  }).index("by_reportedAt", ["reportedAt"]),
});
