import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { skipRateLimitInDev } from "./dev-utils";

// Initialize Redis client
const redis = Redis.fromEnv();

/**
 * Rate limiter for OTP email sending
 * Limits: 3 requests per 15 minutes per email
 */
export const otpSendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  analytics: true,
  prefix: "ratelimit:otp:send",
});

/**
 * Rate limiter for OTP verification attempts
 * Limits: 5 attempts per 10 minutes per email
 */
export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "ratelimit:otp:verify",
});

/**
 * Rate limiter for general authentication attempts (OAuth)
 * Limits: 10 attempts per 5 minutes per IP
 */
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "5 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

/**
 * Helper to check rate limit and return user-friendly error
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; error?: string; reset?: Date }> {
  // Skip rate limiting in development if configured
  if (skipRateLimitInDev) {
    return { success: true };
  }

  try {
    const { success, reset } = await limiter.limit(identifier);

    if (!success) {
      const resetDate = new Date(reset);
      const minutesUntilReset = Math.ceil((reset - Date.now()) / 1000 / 60);

      return {
        success: false,
        error: `Слишком много попыток. Попробуйте снова через ${minutesUntilReset} ${getMinuteWord(minutesUntilReset)}.`,
        reset: resetDate,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // If rate limiting fails, allow the request (fail open)
    // But log the error for monitoring
    return { success: true };
  }
}

/**
 * Get correct Russian word for "minute(s)"
 */
function getMinuteWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "минуту";
  } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return "минуты";
  } else {
    return "минут";
  }
}
