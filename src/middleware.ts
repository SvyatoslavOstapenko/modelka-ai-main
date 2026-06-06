/**
 * Middleware for protecting routes
 *
 * IMPORTANT: This file MUST import from @/auth.edge (not @/auth) to avoid
 * Edge Runtime timeout issues. The auth.edge module provides a lightweight
 * auth instance without database adapter or provider credentials.
 *
 * See: https://nextjs.authjs.dev/getting-started/installation#middleware
 */

import { auth } from "@/auth.edge";

// Export auth function as default (Next.js 16 compatible)
// The auth() function from NextAuth v5 is already a proper middleware function
export default auth(() => {
  // Authentication logic is handled by callbacks.authorized in auth.config.ts
  // This middleware just needs to return undefined to continue the request
});

export const config = {
  // Match all routes except static files and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
