"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }

  return secretKey;
}

function createStripeClient() {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2026-04-22.dahlia",
  });
}

async function requireAdminActionUser(ctx: ActionCtx) {
  const user: Doc<"users"> | null = await ctx.runQuery(api.users.currentUser, {});
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

export const createConnectionToken = action({
  args: {},
  handler: async (ctx): Promise<{ secret: string }> => {
    await requireAdminActionUser(ctx);

    const stripe = createStripeClient();
    const connectionToken = await stripe.terminal.connectionTokens.create();

    return { secret: connectionToken.secret };
  },
});

export const createTapToPayPaymentIntent = action({
  args: {
    paymentRequestId: v.id("posPaymentRequests"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ paymentIntentId: string; clientSecret: string }> => {
    await requireAdminActionUser(ctx);

    const request: {
      _id: string;
      total: number;
      status: string;
      stripePaymentIntentId: string | null;
      stripePaymentIntentClientSecret: string | null;
      expiresAt: number;
    } = await ctx.runQuery(api.pos.getTapToPayRequestForTerminal, {
      paymentRequestId: args.paymentRequestId,
    });

    if (request.expiresAt < Date.now()) {
      throw new Error("Tap to Pay request has expired");
    }

    if (request.stripePaymentIntentId && request.stripePaymentIntentClientSecret) {
      return {
        paymentIntentId: request.stripePaymentIntentId,
        clientSecret: request.stripePaymentIntentClientSecret,
      };
    }

    const stripe = createStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.total,
      currency: "eur",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        posPaymentRequestId: request._id,
        source: "stripe_tap_to_pay_phone",
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret");
    }

    await ctx.runMutation(internal.pos.attachTapToPayPaymentIntent, {
      paymentRequestId: args.paymentRequestId,
      stripePaymentIntentId: paymentIntent.id,
      stripePaymentIntentClientSecret: paymentIntent.client_secret,
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  },
});

export const cancelTapToPayPaymentIntent = action({
  args: {
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    await requireAdminActionUser(ctx);

    const stripe = createStripeClient();

    try {
      await stripe.paymentIntents.cancel(args.paymentIntentId);
    } catch (error) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        typeof error.code === "string" &&
        error.code === "payment_intent_unexpected_state"
      ) {
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  },
});
