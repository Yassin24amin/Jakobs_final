"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import Stripe from "stripe";

export const createPaymentIntent = internalAction({
  args: {
    amount: v.number(), // cents
    orderId: v.string(),
  },
  handler: async (_ctx, args): Promise<{ clientSecret: string }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-04-22.dahlia",
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: args.amount,
      currency: "eur",
      metadata: { orderId: args.orderId },
    });
    return { clientSecret: paymentIntent.client_secret! };
  },
});
