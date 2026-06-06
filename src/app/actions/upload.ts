/**
 * Upload Server Actions
 * Handles presigned URL generation for direct-to-S3 uploads
 */

'use server';

import { auth } from '@/auth';
import { s3Client, S3_ASSETS_BUCKET, generateS3Key, getFileExtension, S3_PUBLIC_URL } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants';

/**
 * Result type for presigned URL generation
 */
export type PresignedUrlResult = {
  success: true;
  url: string;
  key: string;
  publicUrl: string;
} | {
  success: false;
  error: string;
};

/**
 * Generate presigned URL for direct-to-S3 upload
 *
 * @param fileType - MIME type of the file (e.g., 'image/jpeg')
 * @param fileSize - Size of the file in bytes
 * @param assetType - Type of asset ('uploaded_model' | 'uploaded_garment')
 * @returns Presigned URL, S3 key, and public URL
 */
export async function getPresignedUploadUrl(
  fileType: string,
  fileSize: number,
  assetType: 'uploaded_model' | 'uploaded_garment'
): Promise<PresignedUrlResult> {
  try {
    // 1. Auth Check
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to upload files.',
      };
    }

    // 2. Validation - File Size
    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // 3. Validation - File Type
    if (!ALLOWED_IMAGE_TYPES.includes(fileType as typeof ALLOWED_IMAGE_TYPES[number])) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      };
    }

    // 4. Key Generation
    const userId = session.user.id;
    const uuid = uuidv4();
    const extension = getFileExtension(fileType);
    const key = generateS3Key(userId, assetType, uuid, extension);

    // 5. Sign URL
    const command = new PutObjectCommand({
      Bucket: S3_ASSETS_BUCKET,
      Key: key,
      ContentType: fileType,
      // Optional: Add metadata
      Metadata: {
        userId: userId,
        assetType: assetType,
        originalMimeType: fileType,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minutes (reduced for better security)
    });

    // 6. Construct public URL
    const publicUrl = `${S3_PUBLIC_URL}/${key}`;

    return {
      success: true,
      url: presignedUrl,
      key: key,
      publicUrl: publicUrl,
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      success: false,
      error: 'Failed to generate upload URL. Please try again.',
    };
  }
}
