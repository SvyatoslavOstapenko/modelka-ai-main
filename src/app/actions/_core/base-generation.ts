'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { users, generations, transactions, generationEvents, assets, generationAssets } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getTaskStatus } from '@/lib/fashn';
import { getPresignedDownloadUrl, S3_PUBLIC_URL, downloadAndUploadToS3, S3_ASSETS_BUCKET, generateResultKey } from '@/lib/s3';
import { mapFashnError, type ErrorCode } from '@/types/errors';
import type {
  GenerationType,
  GenerateResult,
  CheckStatusResult,
  ValidationResult,
  UserData,
} from '../types';

// ============================================
// TYPES (Re-export for convenience)
// ============================================

export type {
  GenerationType,
  GenerateResult,
  CheckStatusResult,
  ValidationResult,
  UserData,
};

/**
 * Опции для executeGeneration
 */
export interface GenerationOptions<TInput> {
  /** Тип генерации */
  type: GenerationType;
  /** Входные данные */
  input: TInput;
  /** Функция расчёта стоимости */
  calculateCost: (input: TInput, user: UserData) => number;
  /** Функция валидации ограничений плана */
  validatePlanRestrictions: (input: TInput, user: UserData) => ValidationResult;
  /** Функция подготовки входных данных для FASHN API */
  prepareInputs: (input: TInput) => Promise<Record<string, unknown>>;
  /** Функция вызова FASHN API */
  callFashnApi: (inputs: Record<string, unknown>, webhookToken: string) => Promise<{ id: string }>;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Подпись внутренних S3 URL для доступа FASHN
 */
export async function signIfInternalUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;

  if (url.startsWith(S3_PUBLIC_URL)) {
    const key = url.replace(S3_PUBLIC_URL + '/', '');
    console.log('[signIfInternalUrl] Signing internal S3 key:', key);
    try {
      const signedUrl = await getPresignedDownloadUrl(key, 3600); // 1 час
      console.log('[signIfInternalUrl] Presigned URL generated successfully');
      return signedUrl;
    } catch (err) {
      console.error('[signIfInternalUrl] Failed to generate presigned URL for key:', key, err);
      return url; // Fallback
    }
  }

  return url;
}

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ
// ============================================

/**
 * Универсальная функция запуска генерации
 *
 * Выполняет общую логику для всех типов генерации:
 * 1. Аутентификация
 * 2. Расчёт стоимости
 * 3. Проверка баланса и плана
 * 4. Валидация ограничений плана
 * 5. Вызов FASHN API
 * 6. DB транзакция (списание кредитов, создание записи)
 *
 * @param options - Опции генерации
 * @returns Результат запуска генерации
 */
export async function executeGeneration<TInput>(
  options: GenerationOptions<TInput>
): Promise<GenerateResult> {
  const { type, input, calculateCost, validatePlanRestrictions, prepareInputs, callFashnApi } = options;

  try {
    console.log(`[executeGeneration] Starting ${type} generation`);

    // 1. Аутентификация
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[executeGeneration] Unauthorized - no session');
      return { success: false, errorCode: 'UNAUTHORIZED' };
    }

    const userId = session.user.id;

    // 2. Получение данных пользователя
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, credits: true, planCode: true },
    });

    if (!user) {
      console.log('[executeGeneration] User not found:', userId);
      return { success: false, errorCode: 'UNAUTHORIZED' };
    }

    const userData: UserData = {
      id: user.id,
      credits: user.credits ?? 0,
      planCode: user.planCode,
    };

    // 3. Расчёт стоимости
    const cost = calculateCost(input, userData);
    console.log(`[executeGeneration] Calculated cost: ${cost} credits`);

    // 4. Проверка баланса
    if (userData.credits < cost) {
      console.log(`[executeGeneration] Insufficient credits: has ${userData.credits}, needs ${cost}`);
      return { success: false, errorCode: 'INSUFFICIENT_CREDITS' };
    }

    // 5. Валидация ограничений плана
    const validationResult = validatePlanRestrictions(input, userData);
    if (!validationResult.valid) {
      console.log('[executeGeneration] Plan restriction failed:', validationResult.message);
      return {
        success: false,
        errorCode: validationResult.errorCode,
        message: validationResult.message,
      };
    }

    // 6. Подготовка входных данных
    console.log('[executeGeneration] Preparing inputs for FASHN API');
    const fashnInputs = await prepareInputs(input);
    console.log('[executeGeneration] Inputs prepared with', Object.keys(fashnInputs).length, 'fields');

    // 7. Генерация webhook токена
    const webhookToken = `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 8. Вызов FASHN API
    console.log('[executeGeneration] Calling FASHN API');
    const { id: providerTaskId } = await callFashnApi(fashnInputs, webhookToken);
    console.log('[executeGeneration] FASHN task created:', providerTaskId);

    // 9. DB транзакция: списание кредитов + создание записи
    const [generation] = await db.transaction(async (tx) => {
      // Списание кредитов
      await tx.update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      // Создание записи генерации
      const [gen] = await tx.insert(generations).values({
        userId,
        type,
        provider: 'fashn',
        providerTaskId,
        status: 'QUEUED',
        cost,
        params: input as Record<string, unknown>,
        webhookToken,
      }).returning();

      // Создание записи транзакции
      await tx.insert(transactions).values({
        userId,
        type: 'SPEND',
        amount: -cost,
        generationId: gen.id,
        description: `Generation: ${type}`,
      });

      return [gen];
    });

    console.log('[executeGeneration] Generation created:', generation.id);

    return {
      success: true,
      taskId: providerTaskId,
      generationId: generation.id,
    };

  } catch (error: unknown) {
    console.error('[executeGeneration] Error:', error);
    const errorCode = mapFashnError(error);
    return { success: false, errorCode };
  }
}

// ============================================
// УНИВЕРСАЛЬНАЯ ПРОВЕРКА СТАТУСА
// ============================================

/**
 * Универсальная функция проверки статуса генерации
 *
 * Выполняет общую логику для всех типов генерации:
 * 1. Получение статуса из FASHN
 * 2. Обновление статуса в DB
 * 3. Сохранение результатов в наш S3
 * 4. Создание asset записей
 * 5. Автоматический возврат кредитов при ошибке
 *
 * @param providerTaskId - ID задачи в FASHN
 * @returns Результат проверки статуса
 */
export async function checkGenerationStatus(
  providerTaskId: string
): Promise<CheckStatusResult> {
  try {
    if (!providerTaskId) {
      return { success: false, errorCode: 'VALIDATION_ERROR' };
    }

    console.log('[checkGenerationStatus] Checking status for task:', providerTaskId);

    // 1. Получение статуса из FASHN
    const statusData = await getTaskStatus(providerTaskId);
    console.log('[checkGenerationStatus] FASHN status:', statusData.status);

    // 2. Маппинг статуса
    let dbStatus = 'PENDING';
    if (statusData.status === 'processing') dbStatus = 'PROCESSING';
    else if (statusData.status === 'completed') dbStatus = 'COMPLETED';
    else if (statusData.status === 'failed') dbStatus = 'FAILED';

    // 3. Массив для сохранённых результатов
    let savedS3Urls: string[] = [];

    // 4. Обработка завершённых/неудачных генераций
    if (statusData.status === 'completed' || statusData.status === 'failed') {
      const generation = await db.query.generations.findFirst({
        where: eq(generations.providerTaskId, providerTaskId),
        columns: { id: true, cost: true, userId: true, status: true, createdAt: true },
      });

      if (generation) {
        // Расчёт длительности
        const now = new Date();
        const durationMs = generation.createdAt
          ? now.getTime() - generation.createdAt.getTime()
          : 0;

        // Обновление статуса в DB
        await db.update(generations)
          .set({
            status: dbStatus as 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED',
            completedAt: now,
            durationMs: durationMs,
          })
          .where(eq(generations.providerTaskId, providerTaskId));

        // 5. Сохранение результатов при успехе
        if (statusData.status === 'completed' && statusData.output && statusData.output.length > 0) {
          const outputImages = statusData.output;
          const totalImages = outputImages.length;
          console.log(`[checkGenerationStatus] Saving ${totalImages} result images`);

          // Параллельное сохранение всех изображений
          const savePromises = outputImages.map(async (fashnCdnUrl, index) => {
            try {
              console.log(`[checkGenerationStatus] [${index + 1}/${totalImages}] Downloading:`, fashnCdnUrl);

              // Генерация S3 ключа
              const s3Key = totalImages > 1
                ? generateResultKey(generation.userId, generation.id, index)
                : generateResultKey(generation.userId, generation.id);

              // Скачивание и загрузка в S3
              const uploadResult = await downloadAndUploadToS3(fashnCdnUrl, s3Key);
              console.log(`[checkGenerationStatus] [${index + 1}/${totalImages}] Saved to S3:`, uploadResult.key);

              // Генерация presigned URL для фронтенда
              const presignedUrl = await getPresignedDownloadUrl(uploadResult.key, 86400); // 24 часа

              // Создание asset записи
              const [asset] = await db.insert(assets).values({
                userId: generation.userId,
                url: uploadResult.url,
                s3Key: uploadResult.key,
                s3Bucket: S3_ASSETS_BUCKET!,
                type: 'generated_result',
                resultType: 'product', // TODO: определять по типу генерации
                mediaKind: 'image',
                origin: 'fetched',
                mimeType: uploadResult.mimeType,
                size: uploadResult.size,
              }).returning();

              // Связывание asset с generation
              await db.insert(generationAssets).values({
                generationId: generation.id,
                assetId: asset.id,
                direction: 'output',
                role: 'output_image',
                sortOrder: index,
              });

              console.log(`[checkGenerationStatus] [${index + 1}/${totalImages}] Asset created:`, asset.id);

              return presignedUrl;
            } catch (saveError) {
              console.error(`[checkGenerationStatus] [${index + 1}/${totalImages}] Save failed:`, saveError);
              return null;
            }
          });

          const results = await Promise.all(savePromises);
          savedS3Urls = results.filter((url): url is string => url !== null);

          console.log(`[checkGenerationStatus] Saved ${savedS3Urls.length}/${outputImages.length} images`);

          // Логирование событий
          if (savedS3Urls.length > 0) {
            await db.insert(generationEvents).values({
              generationId: generation.id,
              eventType: 'RESULT_SAVED',
              payload: { count: savedS3Urls.length, total: outputImages.length },
            });
          }

          if (savedS3Urls.length < outputImages.length) {
            await db.insert(generationEvents).values({
              generationId: generation.id,
              eventType: 'FAILED',
              message: `Failed to save ${outputImages.length - savedS3Urls.length}/${outputImages.length} results`,
            });
          }
        }

        // 6. Возврат кредитов при ошибке
        if (statusData.status === 'failed' && generation.status !== 'FAILED') {
          const cost = generation.cost || 0;
          if (cost > 0) {
            console.log(`[checkGenerationStatus] Refunding ${cost} credits for failed generation`);

            await db.update(users)
              .set({ credits: sql`${users.credits} + ${cost}` })
              .where(eq(users.id, generation.userId));

            await db.insert(transactions).values({
              userId: generation.userId,
              type: 'REFUND',
              amount: cost,
              generationId: generation.id,
              description: 'Refund: Generation failed',
            });
          }
        }
      }
    }

    // 7. Маппинг ошибок
    let errorCode: ErrorCode | undefined;
    if (statusData.error) {
      errorCode = mapFashnError(statusData.error);
    }

    // 8. Подготовка output URLs
    let outputUrls: string[] = [];
    if (savedS3Urls.length > 0) {
      outputUrls = savedS3Urls;
    } else if (statusData.output && statusData.output.length > 0) {
      outputUrls = statusData.output;
    }

    return {
      success: true,
      status: dbStatus as 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED',
      output: outputUrls,
      errorCode,
    };

  } catch (error: unknown) {
    console.error('[checkGenerationStatus] Error:', error);
    const errorCode = mapFashnError(error);
    return { success: false, errorCode };
  }
}
