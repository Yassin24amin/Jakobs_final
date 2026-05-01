import React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string
);

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
