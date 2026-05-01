import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Idempotent seed: populates im_ inventory tables with demo data.
 * Looks up partner's menuItems by exact name to create BOM + demand profiles.
 * Run: bunx convex run im_seed:run
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("im_ingredients").take(1);
    if (existing.length > 0) return "Already seeded";

    // ─── 1. Suppliers ───
    const sup: Record<string, Id<"im_suppliers">> = {};
    for (const s of [
      { name: "Main Meat Supplier", phone: "+1-555-0101", deliveryDays: [1, 3, 5], notes: "Proteins — Mon/Wed/Fri" },
      { name: "Fresh Produce Market", phone: "+1-555-0102", deliveryDays: [1, 2, 4, 6], notes: "Produce — Mon/Tue/Thu/Sat" },
      { name: "Bakery & Dry Goods", phone: "+1-555-0103", deliveryDays: [2, 5], notes: "Pita/Flour/Pantry — Tue/Fri" },
      { name: "Beverage Distributor", phone: "+1-555-0104", deliveryDays: [3], notes: "Drinks — Wed" },
    ]) {
      sup[s.name] = await ctx.db.insert("im_suppliers", s);
    }

    // ─── 2. Ingredients ───
    const ing: Record<string, Id<"im_ingredients">> = {};
    const ingredients = [
      { name: "Chicken Thighs", unit: "kg", currentStock: 18, parLevel: 15, reorderQty: 20, costPerUnit: 850, category: "proteins", supplier: "Main Meat Supplier" },
      { name: "Lamb Meat", unit: "kg", currentStock: 10, parLevel: 8, reorderQty: 12, costPerUnit: 1800, category: "proteins", supplier: "Main Meat Supplier" },
      { name: "Beef Doner Meat", unit: "kg", currentStock: 12, parLevel: 10, reorderQty: 15, costPerUnit: 1400, category: "proteins", supplier: "Main Meat Supplier" },
      { name: "Ground Beef", unit: "kg", currentStock: 6, parLevel: 5, reorderQty: 8, costPerUnit: 1100, category: "proteins", supplier: "Main Meat Supplier" },
      { name: "Falafel Mix", unit: "kg", currentStock: 4, parLevel: 3, reorderQty: 5, costPerUnit: 500, category: "proteins", supplier: "Main Meat Supplier" },
      { name: "Mozzarella", unit: "kg", currentStock: 10, parLevel: 8, reorderQty: 12, costPerUnit: 950, category: "dairy", supplier: "Fresh Produce Market" },
      { name: "Yogurt", unit: "L", currentStock: 6, parLevel: 5, reorderQty: 10, costPerUnit: 350, category: "dairy", supplier: "Fresh Produce Market" },
      { name: "Feta Cheese", unit: "kg", currentStock: 3, parLevel: 2, reorderQty: 4, costPerUnit: 1100, category: "dairy", supplier: "Fresh Produce Market" },
      { name: "Halloumi", unit: "kg", currentStock: 2, parLevel: 2, reorderQty: 3, costPerUnit: 1500, category: "dairy", supplier: "Fresh Produce Market" },
      { name: "Tomatoes", unit: "kg", currentStock: 10, parLevel: 8, reorderQty: 12, costPerUnit: 300, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Lettuce", unit: "heads", currentStock: 12, parLevel: 10, reorderQty: 15, costPerUnit: 150, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Onions", unit: "kg", currentStock: 6, parLevel: 5, reorderQty: 8, costPerUnit: 200, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Garlic", unit: "kg", currentStock: 2.5, parLevel: 2, reorderQty: 3, costPerUnit: 600, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Potatoes", unit: "kg", currentStock: 18, parLevel: 15, reorderQty: 20, costPerUnit: 150, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Cucumbers", unit: "kg", currentStock: 5, parLevel: 4, reorderQty: 6, costPerUnit: 250, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Pickled Turnips", unit: "kg", currentStock: 3, parLevel: 2, reorderQty: 4, costPerUnit: 400, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Parsley", unit: "bunches", currentStock: 8, parLevel: 6, reorderQty: 10, costPerUnit: 100, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Lemons", unit: "kg", currentStock: 3, parLevel: 2, reorderQty: 4, costPerUnit: 350, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Mint", unit: "bunches", currentStock: 5, parLevel: 4, reorderQty: 6, costPerUnit: 120, category: "produce", supplier: "Fresh Produce Market" },
      { name: "Pita Bread", unit: "pcs", currentStock: 120, parLevel: 100, reorderQty: 150, costPerUnit: 25, category: "dough_bread", supplier: "Bakery & Dry Goods" },
      { name: "Flatbread", unit: "pcs", currentStock: 80, parLevel: 60, reorderQty: 100, costPerUnit: 30, category: "dough_bread", supplier: "Bakery & Dry Goods" },
      { name: "Olive Oil", unit: "L", currentStock: 6, parLevel: 5, reorderQty: 10, costPerUnit: 800, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Shawarma Spice Mix", unit: "kg", currentStock: 1.2, parLevel: 1, reorderQty: 2, costPerUnit: 2000, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Tahini", unit: "L", currentStock: 4, parLevel: 3, reorderQty: 5, costPerUnit: 700, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Chickpeas (canned)", unit: "kg", currentStock: 5, parLevel: 4, reorderQty: 8, costPerUnit: 300, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Garlic Sauce", unit: "L", currentStock: 3, parLevel: 2, reorderQty: 5, costPerUnit: 500, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Hot Sauce", unit: "L", currentStock: 2, parLevel: 1.5, reorderQty: 3, costPerUnit: 600, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "French Fry Oil", unit: "L", currentStock: 15, parLevel: 10, reorderQty: 20, costPerUnit: 250, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Rice", unit: "kg", currentStock: 8, parLevel: 5, reorderQty: 10, costPerUnit: 200, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Tomato Sauce", unit: "L", currentStock: 4, parLevel: 3, reorderQty: 6, costPerUnit: 350, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
      { name: "Turkish Tea", unit: "kg", currentStock: 1, parLevel: 0.5, reorderQty: 1, costPerUnit: 3000, category: "dry_pantry", supplier: "Beverage Distributor" },
      { name: "Sparkling Water", unit: "bottles", currentStock: 48, parLevel: 24, reorderQty: 48, costPerUnit: 80, category: "dry_pantry", supplier: "Beverage Distributor" },
      { name: "Sugar", unit: "kg", currentStock: 3, parLevel: 2, reorderQty: 5, costPerUnit: 150, category: "dry_pantry", supplier: "Bakery & Dry Goods" },
    ];
    for (const item of ingredients) {
      const { supplier, ...data } = item;
      ing[item.name] = await ctx.db.insert("im_ingredients", { ...data, supplierId: sup[supplier], isActive: true });
    }

    // ─── 3. Look up partner's menu items ───
    const allMenu = await ctx.db.query("menuItems").take(100);
    const mi: Record<string, Id<"menuItems">> = {};
    for (const m of allMenu) mi[m.name] = m._id;

    // ─── 4. Demand baselines (matched to partner's exact names) ───
    const baselines: Record<string, number> = {
      "Classic Chicken Shawarma": 75,
      "Jakob's Signature Shawarma": 35,
      "Lamb Shawarma": 25,
      "Spicy Chicken Shawarma": 30,
      "Mixed Shawarma Plate": 20,
      "Veggie Shawarma": 15,
      "Classic Doner Kebab": 40,
      "Iskender Doner": 18,
      "Doner Box": 22,
      "Spicy Doner Wrap": 20,
      "Hummus": 30,
      "Falafel (6 pcs)": 20,
      "Fattoush Salad": 15,
      "Loaded Fries": 35,
      "Tabbouleh": 12,
      "Ayran": 25,
      "Fresh Mint Lemonade": 20,
      "Turkish Tea": 30,
      "Sparkling Water": 15,
      "Extra Garlic Sauce": 40,
      "Extra Meat": 20,
      "Pickled Turnips": 25,
    };
    for (const [name, baseline] of Object.entries(baselines)) {
      if (mi[name]) {
        await ctx.db.insert("im_demandProfiles", { menuItemId: mi[name], baseline, lastUpdated: Date.now() });
      }
    }

    // ─── 5. Recipes (BOM): [menuItemName, ingredientName, qty] ───
    const bom: [string, string, number][] = [
      // Classic Chicken Shawarma
      ["Classic Chicken Shawarma", "Chicken Thighs", 0.18],
      ["Classic Chicken Shawarma", "Pita Bread", 1],
      ["Classic Chicken Shawarma", "Garlic Sauce", 0.03],
      ["Classic Chicken Shawarma", "Tomatoes", 0.03],
      ["Classic Chicken Shawarma", "Lettuce", 0.02],
      ["Classic Chicken Shawarma", "Pickled Turnips", 0.025],
      ["Classic Chicken Shawarma", "Onions", 0.02],
      // Jakob's Signature Shawarma
      ["Jakob's Signature Shawarma", "Chicken Thighs", 0.15],
      ["Jakob's Signature Shawarma", "Lamb Meat", 0.1],
      ["Jakob's Signature Shawarma", "Pita Bread", 1],
      ["Jakob's Signature Shawarma", "Garlic Sauce", 0.04],
      ["Jakob's Signature Shawarma", "Tomatoes", 0.03],
      ["Jakob's Signature Shawarma", "Lettuce", 0.02],
      ["Jakob's Signature Shawarma", "Pickled Turnips", 0.02],
      // Lamb Shawarma
      ["Lamb Shawarma", "Lamb Meat", 0.22],
      ["Lamb Shawarma", "Pita Bread", 1],
      ["Lamb Shawarma", "Tahini", 0.03],
      ["Lamb Shawarma", "Tomatoes", 0.03],
      ["Lamb Shawarma", "Onions", 0.02],
      ["Lamb Shawarma", "Parsley", 0.1],
      // Spicy Chicken Shawarma
      ["Spicy Chicken Shawarma", "Chicken Thighs", 0.18],
      ["Spicy Chicken Shawarma", "Pita Bread", 1],
      ["Spicy Chicken Shawarma", "Hot Sauce", 0.02],
      ["Spicy Chicken Shawarma", "Garlic Sauce", 0.02],
      ["Spicy Chicken Shawarma", "Tomatoes", 0.03],
      ["Spicy Chicken Shawarma", "Lettuce", 0.02],
      ["Spicy Chicken Shawarma", "Pickled Turnips", 0.02],
      // Mixed Shawarma Plate
      ["Mixed Shawarma Plate", "Chicken Thighs", 0.15],
      ["Mixed Shawarma Plate", "Lamb Meat", 0.12],
      ["Mixed Shawarma Plate", "Pita Bread", 2],
      ["Mixed Shawarma Plate", "Garlic Sauce", 0.04],
      ["Mixed Shawarma Plate", "Rice", 0.15],
      ["Mixed Shawarma Plate", "Tomatoes", 0.05],
      ["Mixed Shawarma Plate", "Lettuce", 0.03],
      // Veggie Shawarma
      ["Veggie Shawarma", "Falafel Mix", 0.12],
      ["Veggie Shawarma", "Pita Bread", 1],
      ["Veggie Shawarma", "Tahini", 0.03],
      ["Veggie Shawarma", "Tomatoes", 0.04],
      ["Veggie Shawarma", "Lettuce", 0.03],
      ["Veggie Shawarma", "Cucumbers", 0.03],
      ["Veggie Shawarma", "Pickled Turnips", 0.02],
      // Classic Doner Kebab
      ["Classic Doner Kebab", "Beef Doner Meat", 0.2],
      ["Classic Doner Kebab", "Flatbread", 1],
      ["Classic Doner Kebab", "Tomatoes", 0.03],
      ["Classic Doner Kebab", "Onions", 0.03],
      ["Classic Doner Kebab", "Garlic Sauce", 0.03],
      ["Classic Doner Kebab", "Lettuce", 0.02],
      // Iskender Doner
      ["Iskender Doner", "Beef Doner Meat", 0.22],
      ["Iskender Doner", "Pita Bread", 2],
      ["Iskender Doner", "Tomato Sauce", 0.1],
      ["Iskender Doner", "Yogurt", 0.08],
      // Doner Box
      ["Doner Box", "Beef Doner Meat", 0.18],
      ["Doner Box", "Rice", 0.15],
      ["Doner Box", "Garlic Sauce", 0.03],
      ["Doner Box", "Tomatoes", 0.03],
      ["Doner Box", "Lettuce", 0.02],
      // Spicy Doner Wrap
      ["Spicy Doner Wrap", "Beef Doner Meat", 0.2],
      ["Spicy Doner Wrap", "Flatbread", 1],
      ["Spicy Doner Wrap", "Hot Sauce", 0.02],
      ["Spicy Doner Wrap", "Garlic Sauce", 0.02],
      ["Spicy Doner Wrap", "Tomatoes", 0.03],
      ["Spicy Doner Wrap", "Onions", 0.02],
      // Hummus
      ["Hummus", "Chickpeas (canned)", 0.15],
      ["Hummus", "Tahini", 0.04],
      ["Hummus", "Garlic", 0.005],
      ["Hummus", "Lemons", 0.02],
      ["Hummus", "Olive Oil", 0.015],
      ["Hummus", "Pita Bread", 2],
      // Falafel (6 pcs)
      ["Falafel (6 pcs)", "Falafel Mix", 0.18],
      ["Falafel (6 pcs)", "French Fry Oil", 0.05],
      ["Falafel (6 pcs)", "Tahini", 0.03],
      // Fattoush Salad
      ["Fattoush Salad", "Lettuce", 0.08],
      ["Fattoush Salad", "Tomatoes", 0.06],
      ["Fattoush Salad", "Cucumbers", 0.05],
      ["Fattoush Salad", "Pita Bread", 0.5],
      ["Fattoush Salad", "Olive Oil", 0.02],
      ["Fattoush Salad", "Lemons", 0.02],
      // Loaded Fries
      ["Loaded Fries", "Potatoes", 0.3],
      ["Loaded Fries", "French Fry Oil", 0.06],
      ["Loaded Fries", "Mozzarella", 0.05],
      ["Loaded Fries", "Garlic Sauce", 0.03],
      // Tabbouleh
      ["Tabbouleh", "Parsley", 0.5],
      ["Tabbouleh", "Tomatoes", 0.06],
      ["Tabbouleh", "Onions", 0.02],
      ["Tabbouleh", "Olive Oil", 0.02],
      ["Tabbouleh", "Lemons", 0.03],
      // Ayran
      ["Ayran", "Yogurt", 0.25],
      // Fresh Mint Lemonade
      ["Fresh Mint Lemonade", "Lemons", 0.08],
      ["Fresh Mint Lemonade", "Mint", 0.2],
      ["Fresh Mint Lemonade", "Sugar", 0.03],
      // Turkish Tea
      ["Turkish Tea", "Turkish Tea", 0.005],
      ["Turkish Tea", "Sugar", 0.01],
      // Sparkling Water
      ["Sparkling Water", "Sparkling Water", 1],
      // Extra Garlic Sauce
      ["Extra Garlic Sauce", "Garlic Sauce", 0.06],
      // Extra Meat
      ["Extra Meat", "Chicken Thighs", 0.1],
      // Pickled Turnips
      ["Pickled Turnips", "Pickled Turnips", 0.06],
    ];

    for (const [menuName, ingredientName, qty] of bom) {
      if (mi[menuName] && ing[ingredientName]) {
        await ctx.db.insert("im_recipes", { menuItemId: mi[menuName], ingredientId: ing[ingredientName], quantityNeeded: qty });
      }
    }

    // ─── 6. System Settings ───
    await ctx.db.insert("im_systemSettings", { key: "dayMultipliers", value: JSON.stringify({ 0: 0.7, 1: 0.8, 2: 0.85, 3: 0.9, 4: 1.0, 5: 1.6, 6: 1.5 }) });
    await ctx.db.insert("im_systemSettings", { key: "alpha", value: JSON.stringify(0.4) });
    await ctx.db.insert("im_systemSettings", { key: "restaurantName", value: JSON.stringify("Jakob's Kitchen") });

    return "Seeded successfully";
  },
});
