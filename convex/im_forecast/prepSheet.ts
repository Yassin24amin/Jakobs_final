import { v } from "convex/values";
import { query } from "../_generated/server";
import { getDayMultipliers } from "../im_settings";

/**
 * Core query: compute today's (or any date's) prep sheet.
 * Returns what to prep + total ingredient needs + shortfalls vs current stock.
 */
export const computePrepSheet = query({
  args: { dateTs: v.number() },
  handler: async (ctx, args) => {
    const date = new Date(args.dateTs);
    const dayOfWeek = date.getDay();
    const multipliers = await getDayMultipliers(ctx);
    const multiplier = multipliers[dayOfWeek] ?? 1.0;

    // 1. Get all demand profiles → expected units per product
    const profiles = await ctx.db.query("im_demandProfiles").take(200);

    const productDemand: { menuItemId: string; name: string; expected: number }[] = [];
    for (const profile of profiles) {
      const product = await ctx.db.get(profile.menuItemId);
      if (!product || !product.isAvailable) continue;
      const expected = Math.round(profile.baseline * multiplier);
      if (expected > 0) {
        productDemand.push({
          menuItemId: profile.menuItemId,
          name: product.name,
          expected,
        });
      }
    }

    // 2. For each product, look up recipe (BOM) → aggregate ingredient needs
    const ingredientNeeds: Record<
      string,
      { ingredientId: string; name: string; unit: string; totalNeeded: number }
    > = {};

    for (const item of productDemand) {
      const recipeLinks = await ctx.db
        .query("im_recipes")
        .withIndex("by_menuItemId", (q) =>
          q.eq("menuItemId", item.menuItemId as any)
        )
        .take(30);

      for (const link of recipeLinks) {
        const key = link.ingredientId;
        if (!ingredientNeeds[key]) {
          const ingredient = await ctx.db.get(link.ingredientId);
          ingredientNeeds[key] = {
            ingredientId: key,
            name: ingredient?.name ?? "Unknown",
            unit: ingredient?.unit ?? "",
            totalNeeded: 0,
          };
        }
        ingredientNeeds[key].totalNeeded +=
          link.quantityNeeded * item.expected;
      }
    }

    // 3. Compare against current stock → compute shortfalls
    const ingredientReport = await Promise.all(
      Object.values(ingredientNeeds).map(async (need) => {
        const ingredient = await ctx.db
          .query("im_ingredients")
          .withIndex("by_name", (q) => q.eq("name", need.name))
          .unique();
        const currentStock = ingredient?.currentStock ?? 0;
        const shortfall = Math.max(0, need.totalNeeded - currentStock);
        return {
          ...need,
          totalNeeded: Math.round(need.totalNeeded * 100) / 100,
          currentStock,
          shortfall: Math.round(shortfall * 100) / 100,
          isShort: shortfall > 0,
        };
      })
    );

    // 4. Get prep recipes
    const prepRecipes = await ctx.db.query("im_prepRecipes").take(50);

    return {
      date: date.toISOString().slice(0, 10),
      dayName: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][dayOfWeek],
      multiplier,
      productDemand: productDemand.sort((a, b) => b.expected - a.expected),
      ingredientReport: ingredientReport.sort(
        (a, b) => (b.isShort ? 1 : 0) - (a.isShort ? 1 : 0)
      ),
      prepRecipes,
      shortfallCount: ingredientReport.filter((i) => i.isShort).length,
    };
  },
});
