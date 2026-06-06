/**
 * S3 Client Configuration
 * Yandex Object Storage (S3-compatible)
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

if (!process.env.S3_ACCESS_KEY) {
  throw new Error('S3_ACCESS_KEY is not defined in environment variables');
}

if (!process.env.S3_SECRET_KEY) {
  throw new Error('S3_SECRET_KEY is not defined in environment variables');
}

if (!process.env.S3_ASSETS_BUCKET) {
  throw new Error('S3_ASSETS_BUCKET is not defined in environment variables');
}

if (!process.env.S3_REGION) {
  throw new Error('S3_REGION is not defined in environment variables');
}

if (!process.env.S3_ENDPOINT) {
  throw new Error('S3_ENDPOINT is not defined in environment variables');
}

/**
 * S3 Client instance for Yandex Object Storage
 * Configured with credentials from environment variables
 */
export const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  // Force path-style URLs (required for some S3-compatible services)
  forcePathStyle: false,
});

/**
 * S3 Assets Bucket name from environment
 * Used for storing user-uploaded images (models, garments, results)
 */
export const S3_ASSETS_BUCKET = process.env.S3_ASSETS_BUCKET;

/**
 * S3 Public URL prefix
 * Used to construct public URLs for uploaded files
 * NOTE: This is only for reference - actual access requires presigned URLs for private buckets
 * 
 * Yandex Cloud has two domains:
 * - SDK/API endpoint: S3_ENDPOINT (e.g., https://s3.yandexcloud.net)
 * - Public storage: https://storage.yandexcloud.net/BUCKET_NAME
 */
export const S3_PUBLIC_URL = (() => {
  // Use the public storage domain, not the SDK endpoint
  const bucket = process.env.S3_ASSETS_BUCKET!;
  // Check if NEXT_PUBLIC_S3_PUBLIC_URL is defined, otherwise use standard Yandex pattern
  const publicBase = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || `https://storage.yandexcloud.net/${bucket}`;
  return publicBase.replace(/\/$/, ''); // Remove trailing slash
})();

/**
 * Generate file extension from MIME type
 * Throws error for unsupported types instead of defaulting
 */
export function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  const extension = mimeToExt[mimeType];
  if (!extension) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  return extension;
}

// ============================================
// FILE STRUCTURE STRATEGY
// ============================================

/**
 * Генерирует S3 ключ для входящих загрузок
 * Структура: uploads/{userId}/{uuid}.{ext}
 * Lifecycle: Удаляется через 24 часа, если не использовано в генерации
 *
 * @param userId - ID пользователя
 * @param uuid - Уникальный идентификатор файла
 * @param extension - Расширение файла (jpg, png, webp)
 */
export function generateUploadKey(
  userId: string,
  uuid: string,
  extension: string
): string {
  return `uploads/${userId}/${uuid}.${extension}`;
}

/**
 * Генерирует S3 ключ для результатов генерации
 * Структура: permanent-assets/results/{userId}/{generationId}.png
 * Lifecycle: Храним вечно (не удаляются Lifecycle Policy)
 *
 * @param userId - ID пользователя
 * @param generationId - ID генерации
 */
export function generateResultKey(
  userId: string,
  generationId: string,
  index?: number
): string {
  const suffix = index !== undefined ? `-${index + 1}` : '';
  return `permanent-assets/results/${userId}/${generationId}${suffix}.png`;
}

/**
 * Генерирует S3 ключ для постоянного хранилища (Гардероб)
 * Структура: wardrobe/{userId}/{assetType}/{uuid}.{ext}
 * Lifecycle: Храним вечно
 *
 * @param userId - ID пользователя
 * @param assetType - Тип ассета (model/garment)
 * @param uuid - Уникальный идентификатор
 * @param extension - Расширение файла
 */
export function generateWardrobeKey(
  userId: string,
  assetType: 'model' | 'garment',
  uuid: string,
  extension: string
): string {
  return `wardrobe/${userId}/${assetType}/${uuid}.${extension}`;
}

/**
 * @deprecated Используйте generateUploadKey, generateResultKey или generateWardrobeKey
 * Сохранено для обратной совместимости
 */
export function generateS3Key(
  userId: string,
  assetType: 'uploaded_model' | 'uploaded_garment' | 'generated_result',
  uuid: string,
  extension: string
): string {
  // Map new types to old format for backwards compatibility
  const typeMap = {
    'uploaded_model': 'model',
    'uploaded_garment': 'garment',
    'generated_result': 'result'
  };
  const legacyType = typeMap[assetType];
  return `uploads/${userId}/${legacyType}_${uuid}.${extension}`;
}

/**
 * Generate presigned URL for downloading from S3
 * Used for providing temporary access to private bucket objects (e.g., for Fashn.ai API)
 *
 * @param key - S3 object key (e.g., 'uploads/user123/model_abc.jpg')
 * @param expiresIn - URL expiration time in seconds (default: 600 = 10 minutes)
 * @returns Presigned URL that allows temporary download access
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn,
  });

  return presignedUrl;
}

/**
 * Upload a buffer/file to S3
 * Used for saving downloaded generation results to our bucket
 *
 * @param key - S3 object key (e.g., 'permanent-assets/results/user123/gen_abc.png')
 * @param body - File buffer or content to upload
 * @param contentType - MIME type of the file
 * @returns Promise resolving when upload completes
 */
export async function uploadBuffer(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string = 'image/png',
  isPublic: boolean = false
): Promise<{ key: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    // Set public-read ACL for result images that should be publicly accessible
    ...(isPublic ? { ACL: 'public-read' } : {}),
  });

  await s3Client.send(command);

  // Return the public URL format
  const url = `${S3_PUBLIC_URL}/${key}`;
  return { key, url };
}

/**
 * Download image from URL and upload to our S3
 * Used for saving Fashn CDN results to our bucket
 *
 * @param sourceUrl - URL to download from (e.g., Fashn CDN URL)
 * @param targetKey - S3 key for the uploaded file
 * @returns Promise with the uploaded file info
 */
export async function downloadAndUploadToS3(
  sourceUrl: string,
  targetKey: string
): Promise<{ key: string; url: string; size: number; mimeType: string }> {
  console.log('[downloadAndUploadToS3] Downloading from:', sourceUrl);

  // Download the image
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/png';

  console.log('[downloadAndUploadToS3] Downloaded size:', buffer.length, 'Content-Type:', contentType);

  // Upload to S3
  const result = await uploadBuffer(targetKey, buffer, contentType);

  console.log('[downloadAndUploadToS3] Uploaded to S3 key:', targetKey);

  return {
    key: result.key,
    url: result.url,
    size: buffer.length,
    mimeType: contentType,
  };
}
