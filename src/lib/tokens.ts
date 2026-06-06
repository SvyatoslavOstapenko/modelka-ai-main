import { db } from '@/db';
import { verificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomInt } from 'crypto';

/**
 * Generate a cryptographically secure 6-digit OTP code
 * Uses crypto.randomInt() instead of Math.random() for security
 */
function generateOtpCode(): string {
  // Generate a random number between 100000 and 999999 (inclusive)
  return randomInt(100000, 1000000).toString();
}

/**
 * Create OTP token for email authentication
 * @param email - User email
 * @returns 6-digit OTP code
 */
export async function generateOtpToken(email: string): Promise<string> {
  const code = generateOtpCode();
  const expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing tokens for this email
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, email));

  // Create new OTP token
  await db.insert(verificationTokens).values({
    identifier: email,
    token: code,
    expires,
  });

  return code;
}

/**
 * Get OTP token by email and code
 * @param email - User email
 * @param code - 6-digit code
 */
export async function getOtpToken(email: string, code: string) {
  try {
    const token = await db.query.verificationTokens.findFirst({
      where: (tokens, { eq, and }) =>
        and(eq(tokens.identifier, email), eq(tokens.token, code)),
    });

    return token;
  } catch {
    return null;
  }
}

/**
 * Delete used OTP token
 * @param token - The code to delete
 */
export async function deleteOtpToken(token: string) {
  await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
}

export async function getVerificationTokenByToken(token: string) {
  try {
    const verificationToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, token),
    });

    return verificationToken;
  } catch {
    return null;
  }
}
