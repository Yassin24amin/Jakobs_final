<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Project Overview

Jakob's is a **single-restaurant food ordering app** for a Shawarma/Doner restaurant.
- **Frontend**: Expo + React Native with Expo Router (file-based routing)
- **Backend**: Convex (schema, queries, mutations, actions)
- **Payment**: Stripe (online) + Cash (on pickup/delivery)
- **Currency**: EUR (prices stored in cents as integers)
- **Fulfillment**: Pickup + Delivery

### App Modes
- **Customer**: Newspaper/zine aesthetic UI. Users can browse menu, add to cart, and order as guest or logged-in user.
- **Admin**: Minimal speed-focused dashboard for order management and menu editing.

### Design System (Customer)
- Background: `#0a0a0a`, Primary text: `#fafaf5`, Accent: `#FF4D1C` (blood orange), Secondary: `#E8FF3C` (acid yellow)
- Typography: Oswald Bold (display, ALL CAPS), Menlo/monospace (mono), Georgia Italic (body)
- Sharp rectangles (no rounded corners), double-rule dividers, newspaper section markers

### Convex Conventions
- All functions MUST have argument validators
- Use `.withIndex()` instead of `.filter()` for queries
- Always bound results with `.take()` or `.paginate()`, never unbounded `.collect()`
- Prices in cents (integer math)
- Order items are a separate `orderItems` table (no unbounded arrays)
- Use `Id<'tableName'>` for typed IDs, `Doc<'tableName'>` for document types

### File Conventions
- Kebab-case filenames (`menu-item-card.tsx`)
- Components in `components/`, contexts in `contexts/`
- Customer routes in `app/(customer)/`, admin routes in `app/(admin)/`

## Authentication (Clerk)

Auth uses **Clerk** (native Expo SDK) + **Convex JWT validation**.

- **Provider chain**: `ClerkProvider` → `ConvexProviderWithAuth` → `AuthProvider` → app
- **Token flow**: Clerk issues JWT → `useConvexClerkAuth` adapter fetches token with `template: "convex"` → Convex validates via `convex/auth.config.ts`
- **User sync**: On sign-in, `storeUser` mutation creates/updates user record keyed by `tokenIdentifier`
- **User query**: `currentUser` query reads the authenticated user server-side via `ctx.auth.getUserIdentity()`
- **Admin emails**: `yahia@bals.pro`, `yassin@bals.pro` (role assigned on first sign-up)
- **Token cache**: `expo-secure-store` for persistent session across app restarts
- **Login screen**: Native RN components using `useSignIn`/`useSignUp` hooks (email + password, email verification)
- All screens consume `useAuth()` from `contexts/auth-context.tsx` — the interface is unchanged

### Key Files
- `convex/auth.config.ts` — Clerk JWT issuer config (reads `CLERK_JWT_ISSUER_DOMAIN` env var)
- `app/_layout.tsx` — Provider wiring (`ClerkProvider`, `ConvexProviderWithAuth`)
- `contexts/auth-context.tsx` — App auth context (derives state from Clerk + Convex)
- `convex/users.ts` — `storeUser`, `currentUser`, legacy email helpers
- `app/login.tsx` — Sign In / Sign Up / Verify screens
