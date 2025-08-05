/**
 * Better Auth Configuration for CodeContextPro-MES
 * Integrated with SQLite database and Polar.sh licensing
 */

import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import path from "path";

// Use the same SQLite database as our memory system
const dbPath = path.join(process.cwd(), "../.codecontext/memory.db");
const db = new Database(dbPath);

export const auth = betterAuth({
  // Database configuration - using our existing SQLite database
  database: db,
  
  // Base URL configuration
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  // Secret for encryption and hashing
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-here-change-in-production",
  
  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // Auto sign in after successful registration
    requireEmailVerification: false, // Disable for development
  },
  
  // Social providers (optional - can be added later)
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  
  // Plugins for Next.js integration
  plugins: [
    nextCookies(), // Essential for Next.js cookie handling - must be last
    // organization({
    //   allowUserToCreateOrganization: true,
    //   organizationLimit: 5, // Free tier limit
    // }),
  ],
  
  // User configuration (simplified for now)
  // user: {
  //   additionalFields: {
  //     // Will add custom fields later
  //   },
  // },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  // Rate limiting
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
  },
  
  // Advanced security
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

// Export types for TypeScript
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
