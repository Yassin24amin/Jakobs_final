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

<!-- TEMPORARY AUTH — REPLACE WITH CLERK -->
## Authentication (TEMPORARY)

The current auth system is a **temporary stub** for development:
- Accepts ALL email/password combinations without validation
- User state persisted to AsyncStorage
- Admin emails: `yahia@bals.pro`, `yassin@bals.pro`
- Auth logic lives in `contexts/auth-context.tsx`

### Clerk Migration Steps
When replacing with Clerk:
1. `bun add @clerk/clerk-expo`
2. Create `convex/auth.config.ts` with Clerk issuer
3. Modify `app/_layout.tsx`: wrap with `ClerkProvider`, swap `ConvexProvider` → `ConvexProviderWithClerk`
4. Rewrite `contexts/auth-context.tsx` internals: use `useUser()` from Clerk, remove AsyncStorage login
5. Modify `convex/users.ts`: switch from email lookup to `ctx.auth.getUserIdentity().tokenIdentifier`
6. Remove password field from login screen (Clerk handles its own UI)
7. No other files change — all screens/components consume `useAuth()` from the context
<!-- END TEMPORARY AUTH -->
