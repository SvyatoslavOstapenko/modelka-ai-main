import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Yandex from "next-auth/providers/yandex";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { verifyOtpSchema } from "@/lib/validators/auth";
import { getOtpToken, deleteOtpToken } from "@/lib/tokens";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    ...authConfig.callbacks,
    // Override JWT callback to fetch credits from DB when missing
    async jwt({ token, user, trigger, session }) {
      // Call parent JWT callback first
      const baseToken = await authConfig.callbacks!.jwt!({
        token,
        user,
        trigger,
        session,
        account: null,
      });

      // If this is the first sign-in and credits are still missing, fetch from DB
      if (user?.id && (typeof baseToken.credits !== 'number' || baseToken.credits === undefined)) {
        const dbUser = await db.query.users.findFirst({
          where: (dbUsers, { eq }) => eq(dbUsers.id, user.id!),
          columns: { credits: true },
        });

        if (dbUser) {
          baseToken.credits = dbUser.credits ?? 0;
        }
      }

      return baseToken;
    },
    // Override session callback to always fetch fresh credits from DB
    async session({ session, token, user, trigger, newSession }) {
      // Call parent session callback first
      const baseSession = await authConfig.callbacks!.session!({
        session,
        token,
        user,
        trigger,
        newSession,
      });

      // Always fetch fresh credits from DB to avoid stale JWT data
      if (baseSession.user?.id) {
        const dbUser = await db.query.users.findFirst({
          where: (dbUsers, { eq }) => eq(dbUsers.id, baseSession.user.id),
          columns: { credits: true },
        });

        if (dbUser) {
          baseSession.user.credits = dbUser.credits ?? 0;
        }
      }

      return baseSession;
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        // Extract only first name from Google profile
        const firstName = profile.given_name || profile.name?.split(' ')[0] || 'User';

        return {
          id: profile.sub,
          name: firstName,
          email: profile.email,
          image: profile.picture,
          emailVerified: new Date(), // Auto-verify OAuth users
          isVerified: true, // OAuth users are auto-verified
        };
      },
    }),
    Yandex({
      clientId: process.env.AUTH_YANDEX_ID,
      clientSecret: process.env.AUTH_YANDEX_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        // Extract only first name from Yandex profile
        const firstName = profile.first_name || profile.display_name?.split(' ')[0] || 'User';

        return {
          id: profile.id,
          name: firstName,
          email: profile.default_email,
          image: profile.default_avatar_id
            ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
            : null,
          emailVerified: new Date(), // Auto-verify OAuth users
          isVerified: true, // OAuth users are auto-verified
        };
      },
    }),
    Credentials({
      id: "otp",  // THIS IS THE PROVIDER ID used in signIn("otp", ...)
      name: "OTP Login",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        // Validate input
        const validatedFields = verifyOtpSchema.safeParse(credentials);
        if (!validatedFields.success) {
          throw new Error("Invalid fields");
        }

        const { email, code } = validatedFields.data;

        // Check if token exists and is valid
        const otpToken = await getOtpToken(email, code);
        if (!otpToken) {
          throw new Error("Invalid or expired code");
        }

        // Check if token expired
        const hasExpired = new Date(otpToken.expires) < new Date();
        if (hasExpired) {
          await deleteOtpToken(code);
          throw new Error("Code has expired");
        }

        // Find or create user
        let user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, email),
        });

        if (!user) {
          // Auto-register: Create new user
          const [newUser] = await db.insert(users).values({
            email,
            name: email.split('@')[0], // Generate name from email
            emailVerified: new Date(),
            isVerified: true,
            role: 'user',
            credits: 0,
          }).returning();

          user = newUser;
        } else {
          // Update emailVerified and isVerified if not set
          if (!user.emailVerified || !user.isVerified) {
            await db
              .update(users)
              .set({
                emailVerified: new Date(),
                isVerified: true
              })
              .where(eq(users.id, user.id));
          }
        }

        // Delete used token
        await deleteOtpToken(code);

        return user;
      },
    }),
  ],
});
