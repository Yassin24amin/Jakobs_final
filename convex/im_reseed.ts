import { internalMutation } from "./_generated/server";

/** Wipe all im_ tables so we can re-seed cleanly. */
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "im_ingredients", "im_recipes", "im_suppliers",
      "im_demandProfiles", "im_salesLog", "im_prepRecipes", "im_systemSettings",
    ] as const;
    for (const table of tables) {
      const rows = await ctx.db.query(table).take(500);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }
    return "Cleared";
  },
});
