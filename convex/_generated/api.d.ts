/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as im_crons from "../im_crons.js";
import type * as im_forecast_demandProfiles from "../im_forecast/demandProfiles.js";
import type * as im_forecast_nightlyCron from "../im_forecast/nightlyCron.js";
import type * as im_forecast_prepSheet from "../im_forecast/prepSheet.js";
import type * as im_ingredients from "../im_ingredients.js";
import type * as im_menu from "../im_menu.js";
import type * as im_orders from "../im_orders.js";
import type * as im_recipes from "../im_recipes.js";
import type * as im_reorders from "../im_reorders.js";
import type * as im_reseed from "../im_reseed.js";
import type * as im_sales_salesLog from "../im_sales/salesLog.js";
import type * as im_seed from "../im_seed.js";
import type * as im_settings from "../im_settings.js";
import type * as im_stock_deduction from "../im_stock_deduction.js";
import type * as im_suppliers from "../im_suppliers.js";
import type * as im_test_reorder from "../im_test_reorder.js";
import type * as im_waste from "../im_waste.js";
import type * as menu from "../menu.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as pos from "../pos.js";
import type * as seed from "../seed.js";
import type * as sumup from "../sumup.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  im_crons: typeof im_crons;
  "im_forecast/demandProfiles": typeof im_forecast_demandProfiles;
  "im_forecast/nightlyCron": typeof im_forecast_nightlyCron;
  "im_forecast/prepSheet": typeof im_forecast_prepSheet;
  im_ingredients: typeof im_ingredients;
  im_menu: typeof im_menu;
  im_orders: typeof im_orders;
  im_recipes: typeof im_recipes;
  im_reorders: typeof im_reorders;
  im_reseed: typeof im_reseed;
  "im_sales/salesLog": typeof im_sales_salesLog;
  im_seed: typeof im_seed;
  im_settings: typeof im_settings;
  im_stock_deduction: typeof im_stock_deduction;
  im_suppliers: typeof im_suppliers;
  im_test_reorder: typeof im_test_reorder;
  im_waste: typeof im_waste;
  menu: typeof menu;
  orders: typeof orders;
  payments: typeof payments;
  pos: typeof pos;
  seed: typeof seed;
  sumup: typeof sumup;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
