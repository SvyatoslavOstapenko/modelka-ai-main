/**
 * Assets Server Actions
 * Database operations for asset management
 */

'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { assets, type Asset } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { s3Client, S3_ASSETS_BUCKET, S3_PUBLIC_URL } from '@/lib/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Input data for creating an asset
 * ВАЖНО: Используется ТОЛЬКО для generated_result.
 * Uploads больше не сохраняются в БД!
 */
export type CreateAssetInput = {
  url: string;
  s3Key: string;
  type: 'generated_result';
  resultType?: 'model' | 'product';
  mimeType: string;
  size: number;
  originalName?: string;
};

/**
 * Result type for asset creation
 */
export type CreateAssetResult = {
  success: true;
  asset: Asset;
} | {
  success: false;
  error: string;
};

/**
 * Create a new asset record in the database
 *
 * @param data - Asset metadata
 * @returns Created asset or error
 */
export async function createAssetAction(
  data: CreateAssetInput
): Promise<CreateAssetResult> {
  try {
    // 1. Auth Check
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to create assets.',
      };
    }

    // 2. Validate input
    if (!data.url || !data.s3Key || !data.type) {
      return {
        success: false,
        error: 'Missing required fields: url, s3Key, or type',
      };
    }

    // 2.1 Validate URL format (security: prevent SSRF)
    const expectedUrlPrefix = S3_PUBLIC_URL;
    if (!data.url.startsWith(expectedUrlPrefix)) {
      return {
        success: false,
        error: 'Invalid URL: must be from authorized S3 bucket',
      };
    }

    // 2.2 Validate S3 key format (security: prevent path traversal)
    // Только results разрешены (tmp uploads не сохраняются в БД)
    const s3KeyPattern = /^results\/[a-f0-9-]+\/[a-f0-9-]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp4)$/i;
    if (!s3KeyPattern.test(data.s3Key)) {
      return {
        success: false,
        error: 'Invalid S3 key format. Only results/ prefix is allowed.',
      };
    }

    // 3. Insert into database
    const [newAsset] = await db
      .insert(assets)
      .values({
        userId: session.user.id,
        url: data.url,
        s3Key: data.s3Key,
        s3Bucket: S3_ASSETS_BUCKET,
        type: data.type,
        resultType: data.resultType,
        mediaKind: data.mimeType.startsWith('video/') ? 'video' : 'image',
        origin: 'generated',
        mimeType: data.mimeType,
        meta: {
          size: data.size,
          originalName: data.originalName,
        },
      })
      .returning();

    return {
      success: true,
      asset: newAsset,
    };
  } catch (error) {
    console.error('Error creating asset:', error);
    return {
      success: false,
      error: 'Failed to save asset metadata. Please try again.',
    };
  }
}

/**
 * Result type for asset deletion
 */
export type DeleteAssetResult = {
  success: true;
} | {
  success: false;
  error: string;
};

/**
 * Delete an asset from both database and S3
 * IMPROVED: Now deletes the S3 file as well (fixes security audit issue)
 *
 * @param assetId - ID of the asset to delete
 * @returns Success status or error
 */
export async function deleteAssetAction(
  assetId: string
): Promise<DeleteAssetResult> {
  try {
    // 1. Auth Check
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to delete assets.',
      };
    }

    // 2. Verify ownership
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!asset) {
      return {
        success: false,
        error: 'Asset not found',
      };
    }

    if (asset.userId !== session.user.id) {
      return {
        success: false,
        error: 'You do not have permission to delete this asset',
      };
    }

    // 3. Delete from S3 first
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: S3_ASSETS_BUCKET,
        Key: asset.s3Key,
      });
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      console.error('Error deleting S3 object:', s3Error);
      // Continue with DB deletion even if S3 deletion fails
      // This prevents orphaned DB records
    }

    // 4. Delete from database
    await db.delete(assets).where(eq(assets.id, assetId));

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return {
      success: false,
      error: 'Failed to delete asset. Please try again.',
    };
  }
}

/**
 * Get user's generated assets by result type
 * ВАЖНО: Uploads больше не хранятся в БД!
 *
 * @param resultType - Result type to filter by (model/product), optional
 * @returns List of assets or error
 */
export async function getUserAssetsByResultType(resultType?: 'model' | 'product') {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const userAssets = await db.query.assets.findMany({
      where: (assets, { eq, and }) => {
        const conditions = [
          eq(assets.userId, session.user.id),
          eq(assets.type, 'generated_result'),
        ];
        if (resultType) {
          conditions.push(eq(assets.resultType, resultType));
        }
        return and(...conditions);
      },
      orderBy: (assets, { desc }) => [desc(assets.createdAt)],
    });

    return {
      success: true,
      assets: userAssets,
    };
  } catch (error) {
    console.error('Error fetching user assets:', error);
    return {
      success: false,
      error: 'Failed to fetch assets',
    };
  }
}
