"use node";

import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// SumUp Cloud API integration
//
// Uses the SumUp REST API to create checkouts and send them to a physical
// Solo card reader. No native SDK required — all calls are server-side.
//
// Required env vars (set in Convex dashboard):
//   SUMUP_API_KEY        - API key from SumUp developer portal
//   SUMUP_MERCHANT_CODE  - Merchant code
//   SUMUP_READER_ID      - Solo reader device ID (blank until hardware arrives)
// ---------------------------------------------------------------------------

const SUMUP_API_BASE = "https://api.sumup.com/v0.1";

function getSumUpHeaders(): Record<string, string> {
  const apiKey = process.env.SUMUP_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SUMUP_API_KEY environment variable is not set. " +
        "Configure it in the Convex dashboard."
    );
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a SumUp checkout for a given amount.
 */
export const createCheckout = internalAction({
  args: {
    amount: v.number(), // total in cents
    currency: v.string(),
    orderReference: v.string(), // e.g. "J-0042"
    description: v.string(),
  },
  handler: async (_ctx, args) => {
    const merchantCode = process.env.SUMUP_MERCHANT_CODE;
    if (!merchantCode) {
      throw new Error("SUMUP_MERCHANT_CODE environment variable is not set.");
    }

    const response = await fetch(`${SUMUP_API_BASE}/checkouts`, {
      method: "POST",
      headers: getSumUpHeaders(),
      body: JSON.stringify({
        checkout_reference: args.orderReference,
        amount: args.amount / 100, // SumUp expects euros, not cents
        currency: args.currency,
        merchant_code: merchantCode,
        description: args.description,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `SumUp checkout creation failed (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    return { checkoutId: data.id as string };
  },
});

/**
 * Send a checkout to the physical Solo reader for payment.
 */
export const sendToReader = internalAction({
  args: {
    checkoutId: v.string(),
  },
  handler: async (_ctx, args) => {
    const readerId = process.env.SUMUP_READER_ID;
    if (!readerId) {
      throw new Error(
        "SUMUP_READER_ID environment variable is not set. " +
          "Card terminal is not configured."
      );
    }

    const response = await fetch(
      `${SUMUP_API_BASE}/terminal/checkouts/${args.checkoutId}`,
      {
        method: "PUT",
        headers: getSumUpHeaders(),
        body: JSON.stringify({
          reader_id: readerId,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `SumUp send-to-reader failed (${response.status}): ${errorBody}`
      );
    }

    return { success: true };
  },
});

/**
 * Poll the status of a SumUp checkout.
 */
export const getCheckoutStatus = internalAction({
  args: {
    checkoutId: v.string(),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${SUMUP_API_BASE}/checkouts/${args.checkoutId}`,
      {
        method: "GET",
        headers: getSumUpHeaders(),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `SumUp status check failed (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    return {
      status: data.status as string,
      transactionId: (data.transaction_id as string) ?? null,
    };
  },
});

/**
 * Public orchestrator: initiate a SumUp terminal payment.
 *
 * 1. Creates a checkout
 * 2. Sends it to the physical reader
 * 3. Returns the checkoutId for client-side polling
 *
 * The client polls getCheckoutStatus until PAID/FAILED,
 * then calls pos.markPaid to finalize.
 */
export const initiatePayment = action({
  args: {
    amount: v.number(), // cents
    orderReference: v.string(), // e.g. "J-0042"
  },
  handler: async (ctx, args): Promise<{ checkoutId: string }> => {
    // Verify SumUp is configured
    if (!process.env.SUMUP_API_KEY) {
      throw new Error("SumUp is not configured. Card payments unavailable.");
    }
    if (!process.env.SUMUP_READER_ID) {
      throw new Error(
        "SumUp reader is not configured. Card payments unavailable."
      );
    }

    // Step 1: Create checkout
    const result: { checkoutId: string } = await ctx.runAction(
      internal.sumup.createCheckout,
      {
        amount: args.amount,
        currency: "EUR",
        orderReference: args.orderReference,
        description: `Jakob's Order ${args.orderReference}`,
      }
    );

    // Step 2: Send to reader
    await ctx.runAction(internal.sumup.sendToReader, {
      checkoutId: result.checkoutId,
    });

    // Return checkoutId for client-side polling
    return { checkoutId: result.checkoutId };
  },
});

/**
 * Public action to check checkout status.
 * Called by the client to poll for payment completion.
 */
export const checkPaymentStatus = action({
  args: {
    checkoutId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ status: string; transactionId: string | null }> => {
    const result: { status: string; transactionId: string | null } =
      await ctx.runAction(internal.sumup.getCheckoutStatus, {
        checkoutId: args.checkoutId,
      });
    return result;
  },
});
