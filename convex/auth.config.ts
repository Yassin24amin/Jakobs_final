import type { AuthConfig } from 'convex/server';

const clerkIssuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ?? process.env.CLERK_FRONTEND_API_URL;

if (!clerkIssuerDomain) {
  throw new Error(
    'Either CLERK_JWT_ISSUER_DOMAIN or CLERK_FRONTEND_API_URL is required for Convex Clerk auth.',
  );
}

export default {
  providers: [
    {
      domain: clerkIssuerDomain,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig;
