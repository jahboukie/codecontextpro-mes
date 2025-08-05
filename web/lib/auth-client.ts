/**
 * Better Auth Client for CodeContextPro-MES
 * Client-side authentication methods
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    // organizationClient(), // Commented out for now
  ],
});

// Export specific methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
