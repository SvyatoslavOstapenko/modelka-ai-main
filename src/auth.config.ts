import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/",
        error: "/",
    },
    session: { strategy: "jwt" },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnApp = nextUrl.pathname.startsWith("/app");

            if (isOnApp) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            }
            return true;
        },
        async signIn() {
            // Allow all sign-ins (OAuth and credentials)
            // For OAuth providers, user will be auto-created by DrizzleAdapter
            return true;
        },
        async redirect({ url, baseUrl }) {
            // If the URL is already absolute and belongs to our domain, use it
            if (url.startsWith(baseUrl)) {
                return url;
            }
            // If it's a relative URL, append it to the base URL
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }
            // Default to /app after successful sign-in
            return `${baseUrl}/app`;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }

            if (token.role && session.user) {
                session.user.role = token.role as "user" | "admin";
            }

            // Add name from token to session
            if (token.name && session.user) {
                session.user.name = token.name as string;
            }

            // Add credits from token to session (always set, default to 0)
            if (session.user) {
                session.user.credits = typeof token.credits === 'number' ? token.credits : 0;
            }

            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.name = user.name;
                // Ensure credits is always set, default to 0 if not present
                token.credits = user.credits ?? 0;
            }

            // Handle updates via session.update()
            if (trigger === "update") {
                if (session?.role) {
                    token.role = session.role;
                }
                if (session?.user?.name) {
                    token.name = session.user.name;
                }
                if (typeof session?.user?.credits === 'number') {
                    token.credits = session.user.credits;
                }
            }

            return token;
        },
    },
    providers: [], // Configured in auth.ts to avoid Edge Runtime issues with database adapters
} satisfies NextAuthConfig;
