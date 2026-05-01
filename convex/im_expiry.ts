import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getDayMultipliers } from "./im_settings";

/**
 * Expiry-aware inventory management.
 *
 * Nightly cron checks:
 * 1. Ingredients expiring within 2 days → suggest reorder with smart quantity
 * 2. Ingredients already expired → auto-deduct from stock, create urgent reorder
 *
 * Smart reorder quantity = (daily consumption x days until next delivery) + parLevel buffer
 */

// ─── Queries ───

/** List ingredients expiring within N days. */
export const listExpiringSoon = query({
  args: { withinDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.withinDays ?? 3;
    const cutoff = Date.now() + days * 24 * 60 * 60 * 1000;

    const all = await ctx.db
      .query("im_ingredients")
      .withIndex("by_expiryDate")
      .take(200);

    return all.filter(
      (i) => i.expiryDate && i.expiryDate > 0 && i.expiryDate <= cutoff && i.currentStock > 0
    );
  },
});

/** List already expired ingredients (still have stock). */
export const listExpired = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("im_ingredients")
      .withIndex("by_expiryDate")
      .take(200);

    return all.filter(
      (i) => i.expiryDate && i.expiryDate > 0 && i.expiryDate <= now && i.currentStock > 0
    );
  },
});

// ─── Mutations ───

/** Manager sets expiry date for an ingredient. */
export const setExpiry = mutation({
  args: {
    ingredientId: v.id("im_ingredients"),
    expiryDate: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ingredientId, { expiryDate: args.expiryDate });
  },
});

/** Manager sets shelf life (used to auto-calculate expiry on restock). */
export const setShelfLife = mutation({
  args: {
    ingredientId: v.id("im_ingredients"),
    shelfLifeDays: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ingredientId, { shelfLifeDays: args.shelfLifeDays });
  },
});

/**
 * Calculate smart reorder quantity for an ingredient.
 * = (dailyConsumption x daysUntilNextDelivery) + parLevel - currentUsableStock
 */
export const calculateSmartReorderQty = query({
  args: { ingredientId: v.id("im_ingredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) return null;

    // 1. Calculate daily consumption from recipes + demand profiles
    const recipeLinks = await ctx.db
      .query("im_recipes")
      .withIndex("by_ingredientId", (q) => q.eq("ingredientId", args.ingredientId))
      .take(50);

    const multipliers = await getDayMultipliers(ctx);
    const todayMultiplier = multipliers[new Date().getDay()] ?? 1.0;

    let dailyConsumption = 0;
    for (const link of recipeLinks) {
      const profile = await ctx.db
        .query("im_demandProfiles")
        .withIndex("by_menuItemId", (q) => q.eq("menuItemId", link.menuItemId))
        .unique();
      if (profile) {
        // Average daily consumption = baseline x avg multiplier x recipe qty
        dailyConsumption += profile.baseline * todayMultiplier * link.quantityNeeded;
      }
    }

    // 2. Find days until next supplier delivery
    let daysUntilDelivery = 7; // worst case
    if (ingredient.supplierId) {
      const supplier = await ctx.db.get(ingredient.supplierId);
      if (supplier && supplier.deliveryDays.length > 0) {
        const today = new Date().getDay(); // 0=Sun
        let minDays = 7;
        for (const day of supplier.deliveryDays) {
          let diff = day - today;
          if (diff < 0) diff += 7; // next week
          if (diff < minDays) minDays = diff;
        }
        daysUntilDelivery = minDays;
      }
    }

    // 3. Usable stock = current stock that hasn't expired
    const now = Date.now();
    const usableStock =
      ingredient.expiryDate && ingredient.expiryDate <= now
        ? 0
        : ingredient.currentStock;

    // 4. Smart qty = cover until delivery + maintain par level
    const neededUntilDelivery = dailyConsumption * daysUntilDelivery;
    const smartQty = Math.max(
      0,
      Math.ceil(neededUntilDelivery + ingredient.parLevel - usableStock)
    );

    return {
      dailyConsumption: Math.round(dailyConsumption * 100) / 100,
      daysUntilDelivery,
      usableStock,
      parLevel: ingredient.parLevel,
      smartQty: Math.max(smartQty, ingredient.reorderQty), // never order less than minimum
      fallbackQty: ingredient.reorderQty,
    };
  },
});

// ─── Nightly Cron Logic ───

/**
 * Check all ingredients for expiry.
 * Called by the nightly cron alongside the EWMA update.
 *
 * 1. Expired (past date): zero out stock, log as waste, create urgent reorder
 * 2. Expiring within 2 days: create suggested reorder with smart quantity
 */
export const checkExpiry = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twoDaysOut = now + 2 * 24 * 60 * 60 * 1000;

    const all = await ctx.db.query("im_ingredients").take(200);

    for (const ingredient of all) {
      if (!ingredient.expiryDate || ingredient.expiryDate <= 0) continue;
      if (ingredient.currentStock <= 0) continue;

      if (ingredient.expiryDate <= now) {
        // ─── EXPIRED: zero stock + log waste + urgent reorder ───

        // Log as waste
        await ctx.db.insert("im_wasteLog", {
          reason: "expired",
          reasonNote: "Auto-detected by expiry check",
          items: [
            {
              ingredientId: ingredient._id,
              ingredientName: ingredient.name,
              quantity: ingredient.currentStock,
              unit: ingredient.unit,
              costCents: Math.round(ingredient.currentStock * ingredient.costPerUnit),
            },
          ],
          totalCostCents: Math.round(ingredient.currentStock * ingredient.costPerUnit),
          reportedAt: now,
        });

        const expiredQty = ingredient.currentStock;

        // Zero out stock
        await ctx.db.patch(ingredient._id, { currentStock: 0 });

        // Create urgent reorder with expiry reason (skip checkAndCreateReorder to get correct reason)
        const existingReorders = await ctx.db
          .query("im_reorders")
          .withIndex("by_ingredientId", (q) => q.eq("ingredientId", ingredient._id))
          .take(10);
        const hasPending = existingReorders.some(
          (r) => r.status === "suggested" || r.status === "approved" || r.status === "ordered"
        );
        if (!hasPending) {
          // Smart qty calc
          const recipeLinks = await ctx.db
            .query("im_recipes")
            .withIndex("by_ingredientId", (q) => q.eq("ingredientId", ingredient._id))
            .take(50);
          const multipliers = await getDayMultipliers(ctx);
          const avgMultiplier = Object.values(multipliers).reduce((a, b) => a + b, 0) / 7;
          let dailyConsumption = 0;
          for (const link of recipeLinks) {
            const profile = await ctx.db
              .query("im_demandProfiles")
              .withIndex("by_menuItemId", (q) => q.eq("menuItemId", link.menuItemId))
              .unique();
            if (profile) dailyConsumption += profile.baseline * avgMultiplier * link.quantityNeeded;
          }
          let daysUntilDelivery = 7;
          if (ingredient.supplierId) {
            const sup = await ctx.db.get(ingredient.supplierId);
            if (sup && sup.deliveryDays.length > 0) {
              const today = new Date().getDay();
              let minDays = 7;
              for (const day of sup.deliveryDays) {
                let diff = day - today;
                if (diff < 0) diff += 7;
                if (diff < minDays) minDays = diff;
              }
              daysUntilDelivery = minDays;
            }
          }
          const smartQty = Math.max(
            ingredient.reorderQty,
            Math.ceil(dailyConsumption * daysUntilDelivery + ingredient.parLevel)
          );
          const sup = ingredient.supplierId ? await ctx.db.get(ingredient.supplierId) : null;

          const expiryDateStr = new Date(ingredient.expiryDate).toLocaleDateString();
          const noRecipesNote = recipeLinks.length === 0 ? " No menu items use this ingredient." : "";
          await ctx.db.insert("im_reorders", {
            ingredientId: ingredient._id,
            ingredientName: ingredient.name,
            supplierId: ingredient.supplierId,
            supplierName: sup?.name,
            quantity: smartQty,
            unit: ingredient.unit,
            status: "ordered",
            trigger: "expiry",
            reason: `Expired: ${expiredQty} ${ingredient.unit} expired on ${expiryDateStr} and was discarded. Stock is now 0. Auto-ordered.${noRecipesNote}`,
            estimatedCost: smartQty * ingredient.costPerUnit,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (ingredient.expiryDate <= twoDaysOut) {
        // ─── EXPIRING SOON: smart reorder suggestion ───

        // Check if there's already a pending reorder
        const existing = await ctx.db
          .query("im_reorders")
          .withIndex("by_ingredientId", (q) => q.eq("ingredientId", ingredient._id))
          .take(10);

        const hasPending = existing.some(
          (r) => r.status === "suggested" || r.status === "approved" || r.status === "ordered"
        );
        if (hasPending) continue;

        // Calculate smart quantity
        const recipeLinks = await ctx.db
          .query("im_recipes")
          .withIndex("by_ingredientId", (q) => q.eq("ingredientId", ingredient._id))
          .take(50);

        const multipliers = await getDayMultipliers(ctx);
        const avgMultiplier =
          Object.values(multipliers).reduce((a, b) => a + b, 0) / 7;

        let dailyConsumption = 0;
        for (const link of recipeLinks) {
          const profile = await ctx.db
            .query("im_demandProfiles")
            .withIndex("by_menuItemId", (q) => q.eq("menuItemId", link.menuItemId))
            .unique();
          if (profile) {
            dailyConsumption += profile.baseline * avgMultiplier * link.quantityNeeded;
          }
        }

        // Days until next delivery
        let daysUntilDelivery = 7;
        if (ingredient.supplierId) {
          const supplier = await ctx.db.get(ingredient.supplierId);
          if (supplier && supplier.deliveryDays.length > 0) {
            const today = new Date().getDay();
            let minDays = 7;
            for (const day of supplier.deliveryDays) {
              let diff = day - today;
              if (diff < 0) diff += 7;
              if (diff < minDays) minDays = diff;
            }
            daysUntilDelivery = minDays;
          }
        }

        const smartQty = Math.max(
          ingredient.reorderQty,
          Math.ceil(dailyConsumption * daysUntilDelivery + ingredient.parLevel)
        );

        const supplier = ingredient.supplierId
          ? await ctx.db.get(ingredient.supplierId)
          : null;

        const daysLeft = Math.ceil(
          (ingredient.expiryDate - now) / (24 * 60 * 60 * 1000)
        );

        const expiryDateStr = new Date(ingredient.expiryDate).toLocaleDateString();
        const noRecipesNote = recipeLinks.length === 0 ? " No menu items use this ingredient." : "";

        await ctx.db.insert("im_reorders", {
          ingredientId: ingredient._id,
          ingredientName: ingredient.name,
          supplierId: ingredient.supplierId,
          supplierName: supplier?.name,
          quantity: smartQty,
          unit: ingredient.unit,
          status: "suggested",
          trigger: "expiry",
          reason: `Expires soon: ${ingredient.currentStock} ${ingredient.unit} expires on ${expiryDateStr} (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left).${noRecipesNote}`,
          estimatedCost: smartQty * ingredient.costPerUnit,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});
