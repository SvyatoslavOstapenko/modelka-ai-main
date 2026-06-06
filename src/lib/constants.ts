/**
 * Application Constants
 * Central configuration for business logic constraints
 */

// ============================================
// FILE UPLOAD LIMITS
// ============================================

/**
 * Maximum file size for uploads (10 MB)
 * Rationale: Fashn.ai accepts up to 1MP images, 10MB is more than sufficient for high-quality JPEG/PNG
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

/**
 * Allowed image MIME types
 * Only accept standard web image formats
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/**
 * Type guard for allowed image types
 */
export const isAllowedImageType = (
  mimeType: string
): mimeType is (typeof ALLOWED_IMAGE_TYPES)[number] => {
  return ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number]);
};

// ============================================
// CREDIT ECONOMICS
// ============================================

/**
 * Credit cost per generation
 * Default: 1 credit = 1 virtual try-on
 */
export const CREDITS_PER_GENERATION = 1;

/**
 * Exchange rate: RUB to Credits
 * Example: 300 RUB = 15 credits → 20 RUB per credit
 */
export const RUB_PER_CREDIT = 20;

/**
 * Helper function to convert money (kopecks) to credits
 */
export const moneyToCredits = (kopecks: number): number => {
  const rubles = kopecks / 100;
  return Math.floor(rubles / RUB_PER_CREDIT);
};

/**
 * Helper function to convert credits to money (kopecks)
 */
export const creditsToMoney = (credits: number): number => {
  return credits * RUB_PER_CREDIT * 100; // Convert to kopecks
};

// ============================================
// FASHN.AI DEFAULTS
// ============================================

/**
 * Default configuration for Fashn.ai virtual try-on
 */
export const FASHN_DEFAULTS = {
  category: 'auto' as const,
  mode: 'balanced' as const,
  adjustHands: false,
  coverFeet: false,
  restoreBackground: false,
} as const;

// ============================================
// PAGINATION
// ============================================

/**
 * Default page size for listings (generations, transactions, assets)
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Maximum page size allowed
 */
export const MAX_PAGE_SIZE = 100;
