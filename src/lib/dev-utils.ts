/**
 * Development utilities for disabling security features in local development
 *
 * SECURITY WARNING: These should NEVER be true in production!
 */

export const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Skip CAPTCHA verification in development
 * Set SKIP_CAPTCHA_IN_DEV=true in .env to disable CAPTCHA checks
 */
export const skipCaptchaInDev = isDevelopment && process.env.SKIP_CAPTCHA_IN_DEV === "true";

/**
 * Skip rate limiting in development
 * Set SKIP_RATE_LIMIT_IN_DEV=true in .env to disable rate limiting
 */
export const skipRateLimitInDev = isDevelopment && process.env.SKIP_RATE_LIMIT_IN_DEV === "true";

/**
 * Log warning when dev mode is active
 */
if (skipCaptchaInDev) {
  console.warn("⚠️  DEV MODE: CAPTCHA verification is DISABLED");
}

if (skipRateLimitInDev) {
  console.warn("⚠️  DEV MODE: Rate limiting is DISABLED");
}
