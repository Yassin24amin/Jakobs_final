import React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("EXPO_PUBLIC_CONVEX_URL is required");
const convex = new ConvexReactClient(convexUrl);

/**
 * Plain ConvexProvider for now.
 * When Clerk is ready, swap this for ClerkProvider + ConvexProviderWithClerk.
 */
export function ClerkConvexProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
