/**
 * Server Actions для виртуальной примерки
 *
 * Переписано под новую архитектуру (s3Key-based approach).
 * Uploads НЕ сохраняются в БД, работаем напрямую с S3 ключами.
 *
 * @module app/actions/try-on
 */

'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { users, generations, generationAssets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateTryOnSchema, type GenerateTryOnInput } from '@/lib/validations/try-on';
import { getPresignedDownloadUrl } from '@/lib/storage';
import { createAndSubmitGeneration } from '@/services/generationService';

// ============================================
// TYPES
// ============================================

export type GenerateTryOnResult =
  | {
    success: true;
    generationId: string;
  }
  | {
    success: false;
    error: string;
    errorCode?: string;
  };

export type GetGenerationStatusResult =
  | {
    success: true;
    generation: {
      id: string;
      status: string;
      resultUrl?: string | null;
      errorReason?: string | null;
      createdAt: Date;
      completedAt?: Date | null;
    };
  }
  | {
    success: false;
    error: string;
    errorCode?: string;
  };

// ============================================
// HELPERS
// ============================================

/**
 * Валидация S3 ключа для безопасности
 * Проверяет что ключ принадлежит пользователю и имеет правильный формат
 */
function validateS3Key(s3Key: string, userId: string): { valid: boolean; error?: string } {
  // Проверка префикса tmp/{userId}/
  const expectedPrefix = `tmp/${userId}/`;
  if (!s3Key.startsWith(expectedPrefix)) {
    return {
      valid: false,
      error: `S3 ключ должен начинаться с ${expectedPrefix}`,
    };
  }

  // Проверка path traversal
  if (s3Key.includes('../') || s3Key.includes('..\\')) {
    return { valid: false, error: 'S3 ключ содержит недопустимые символы' };
  }

  // Проверка расширения
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const hasValidExtension = validExtensions.some(ext =>
    s3Key.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Поддерживаются только изображения: .jpg, .jpeg, .png, .webp',
    };
  }

  return { valid: true };
}

// ============================================
// ACTIONS
// ============================================

export async function generateTryOnAction(
  input: GenerateTryOnInput
): Promise<GenerateTryOnResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
    }
    const userId = session.user.id;

    const parseResult = generateTryOnSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.message,
        errorCode: 'INVALID_INPUT',
      };
    }
    const data = parseResult.data;

    // 1. Валидация S3 ключей (безопасность)
    const modelValidation = validateS3Key(data.modelImageS3Key, userId);
    if (!modelValidation.valid) {
      return {
        success: false,
        error: modelValidation.error || 'Невалидный model S3 ключ',
        errorCode: 'INVALID_S3_KEY',
      };
    }

    const garmentValidation = validateS3Key(data.garmentImageS3Key, userId);
    if (!garmentValidation.valid) {
      return {
        success: false,
        error: garmentValidation.error || 'Невалидный garment S3 ключ',
        errorCode: 'INVALID_S3_KEY',
      };
    }

    // 2. Create Generation via Service (используем s3Keys напрямую)
    const result = await createAndSubmitGeneration({
      userId,
      type: 'virtual_tryon',
      inputs: [
        {
          s3Key: data.modelImageS3Key,
          role: 'model_image',
          mimeType: 'image/jpeg', // можно добавить в схему валидации
        },
        {
          s3Key: data.garmentImageS3Key,
          role: 'garment_image',
          mimeType: 'image/jpeg',
        },
      ],
      params: {
        category: data.category,
        mode: data.mode,
        garment_photo_type: data.garmentPhotoType,
        num_samples: 1,
        adjust_hands: data.adjustHands,
        cover_feet: data.coverFeet,
        restore_background: data.restoreBackground,
        nsfw_filter: data.nsfwFilter,
      },
    });

    return {
      success: true,
      generationId: result.generationId,
    };
  } catch (error) {
    console.error('[generateTryOnAction] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: msg,
      errorCode: msg.includes('credits') ? 'INSUFFICIENT_CREDITS' : 'INTERNAL_ERROR',
    };
  }
}

export async function getGenerationStatusAction(
  generationId: string
): Promise<GetGenerationStatusResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
    }

    const generation = await db.query.generations.findFirst({
      where: eq(generations.id, generationId),
    });

    if (!generation) return { success: false, error: 'Not found', errorCode: 'NOT_FOUND' };
    if (generation.userId !== session.user.id) return { success: false, error: 'Access denied', errorCode: 'PERMISSION_DENIED' };

    // Get output url if completed
    let resultUrl: string | null = null;
    if (generation.status === 'COMPLETED') {
      const outputs = await db.query.generationAssets.findMany({
        where: and(eq(generationAssets.generationId, generationId), eq(generationAssets.direction, 'output')),
        with: { asset: true },
      });
      if (outputs.length > 0) {
        resultUrl = await getPresignedDownloadUrl(outputs[0].asset.s3Key, 3600);
      }
    }

    return {
      success: true,
      generation: {
        id: generation.id,
        status: generation.status,
        resultUrl,
        errorReason: generation.errorReason,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
      },
    };
  } catch (error) {
    console.error('[getGenerationStatusAction] Error:', error);
    return { success: false, error: 'Error fetching status' };
  }
}

export async function checkUserBalanceAction(): Promise<{
  success: boolean;
  credits?: number;
  canGenerate?: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { credits: true },
    });

    if (!user) return { success: false, error: 'User not found' };

    return {
      success: true,
      credits: user.credits,
      canGenerate: user.credits >= 1,
    };
  } catch {
    return { success: false, error: 'Error checking balance' };
  }
}
