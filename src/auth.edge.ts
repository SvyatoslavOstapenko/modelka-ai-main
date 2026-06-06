/**
 * Edge-optimized auth for middleware
 *
 * This file provides a lightweight auth instance for Edge Runtime (middleware).
 * It ONLY includes authConfig without database adapter or provider credentials,
 * making it fast and suitable for Edge Runtime.
 *
 * IMPORTANT: Do NOT import this file in API routes or server components.
 * Use @/auth instead for full auth functionality with database access.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Create auth instance WITHOUT providers or adapter
// This is safe for Edge Runtime and performs only JWT verification
export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
