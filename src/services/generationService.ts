/**
 * Сервис генераций - основная бизнес-логика
 *
 * Функционал:
 * - Проверка прав доступа (entitlements) по тарифному плану
 * - Атомарное создание генерации с списанием токенов
 * - Отправка запроса в FASHN API
 * - Обработка результатов (finalize)
 * - Обработка ошибок и возвраты (refund)
 * - Запись событий аудита
 *
 * @module services/generationService
 */

import { db } from '@/db';
import {
  users,
  assets,
  generations,
  generationAssets,
  generationEvents,
  transactions,
  plans,
  type GenerationType,
  type GenerationStatus,
  type PlanFeatures,
  type PlanCode,
  type GenerationParams,
  type AssetMeta,
} from '@/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import {
  runGeneration,
  getTaskStatus,
  calculateGenerationCost,
  isGenerationTypeAllowed,
  mapFashnStatusToDbStatus,
  extractResultUrls,
  type FashnInput,
  // FashnApiError,
  FashnRateLimitError,
} from '@/lib/fashn';
import {
  fetchAndStore,
  generateResultKey,
  getPresignedDownloadUrl,
  deleteFile,
} from '@/lib/storage';

// ============================================
// ТИПЫ
// ============================================

/**
 * Входной файл для генерации (из S3 tmp/)
 */
export interface InputFile {
  s3Key: string;      // Ключ в S3 (например: tmp/{userId}/{uuid}.jpg)
  role: string;       // Роль файла (model_image, product_image, etc.)
  mimeType?: string;  // MIME тип (для валидации)
}

/**
 * Запрос на создание генерации
 */
export interface CreateGenerationRequest {
  userId: string;
  type: GenerationType;
  inputs: InputFile[];
  params: Partial<GenerationParams>;
}

/**
 * Результат создания генерации
 */
export interface CreateGenerationResult {
  generationId: string;
  status: GenerationStatus;
  cost: number;
}

/**
 * Кэш планов для избежания повторных запросов
 */
const planFeaturesCache: Map<PlanCode, PlanFeatures> = new Map();

// ============================================
// ПОЛУЧЕНИЕ ДАННЫХ ПЛАНА
// ============================================

/**
 * Получение конфигурации фич плана
 */
export async function getPlanFeatures(planCode: PlanCode): Promise<PlanFeatures> {
  // Проверяем кэш
  const cached = planFeaturesCache.get(planCode);
  if (cached) return cached;

  // Загружаем из БД
  const plan = await db.query.plans.findFirst({
    where: eq(plans.code, planCode),
  });

  if (!plan) {
    // Fallback на дефолтные значения для test плана
    const defaultFeatures: PlanFeatures = {
      allowVideo: false,
      allowCustomModel: false,
      allow4k: false,
      maxVideoResolution: null,
      maxVideoDuration: null,
      resultRetentionDays: 7,
      priority: 'standard',
      maxConcurrentGenerations: 1,
      artificialDelay: 10000,
    };
    return defaultFeatures;
  }

  const features = plan.features as PlanFeatures;
  planFeaturesCache.set(planCode, features);

  return features;
}

/**
 * Очистка кэша планов (при обновлении планов)
 */
export function clearPlanFeaturesCache(): void {
  planFeaturesCache.clear();
}

// ============================================
// ПРОВЕРКА ПРАВ ДОСТУПА
// ============================================

/**
 * Проверка возможности запуска генерации
 */
export async function checkEntitlements(
  userId: string,
  generationType: GenerationType,
  params: Partial<GenerationParams>
): Promise<{
  allowed: boolean;
  reason?: string;
  planFeatures: PlanFeatures;
  user: { id: string; credits: number; planCode: PlanCode };
}> {
  // Получаем пользователя
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return {
      allowed: false,
      reason: 'Пользователь не найден',
      planFeatures: {} as PlanFeatures,
      user: { id: '', credits: 0, planCode: 'test' },
    };
  }

  // Получаем фичи плана
  const planFeatures = await getPlanFeatures(user.planCode);

  // Проверка доступности типа генерации
  const typeCheck = isGenerationTypeAllowed(generationType, planFeatures);
  if (!typeCheck.allowed) {
    return {
      allowed: false,
      reason: typeCheck.reason,
      planFeatures,
      user: { id: user.id, credits: user.credits, planCode: user.planCode },
    };
  }

  // Проверка 4K разрешения
  if (params.resolution === '4k' && !planFeatures.allow4k) {
    return {
      allowed: false,
      reason: '4K разрешение недоступно на вашем тарифе',
      planFeatures,
      user: { id: user.id, credits: user.credits, planCode: user.planCode },
    };
  }

  // Проверка разрешения видео
  if (generationType === 'image_to_video' && params.videoResolution) {
    const resolutionOrder = ['480p', '720p', '1080p'];
    const requestedIndex = resolutionOrder.indexOf(params.videoResolution);
    const maxIndex = planFeatures.maxVideoResolution
      ? resolutionOrder.indexOf(planFeatures.maxVideoResolution)
      : -1;

    if (maxIndex >= 0 && requestedIndex > maxIndex) {
      return {
        allowed: false,
        reason: `Максимальное разрешение видео на вашем тарифе: ${planFeatures.maxVideoResolution}`,
        planFeatures,
        user: { id: user.id, credits: user.credits, planCode: user.planCode },
      };
    }
  }

  // Проверка количества параллельных генераций
  const activeGenerations = await db
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        inArray(generations.status, ['PENDING', 'QUEUED', 'PROCESSING'])
      )
    );

  const activeCount = activeGenerations[0]?.count || 0;
  if (activeCount >= planFeatures.maxConcurrentGenerations) {
    return {
      allowed: false,
      reason: `Превышен лимит параллельных генераций (${planFeatures.maxConcurrentGenerations})`,
      planFeatures,
      user: { id: user.id, credits: user.credits, planCode: user.planCode },
    };
  }

  return {
    allowed: true,
    planFeatures,
    user: { id: user.id, credits: user.credits, planCode: user.planCode },
  };
}

// ============================================
// СОЗДАНИЕ ГЕНЕРАЦИИ
// ============================================

/**
 * Генерация безопасного webhook токена
 */
function generateWebhookToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Атомарное создание генерации с списанием токенов
 *
 * В одной транзакции:
 * 1. Блокируем запись пользователя (FOR UPDATE)
 * 2. Проверяем достаточность токенов
 * 3. Списываем кредиты
 * 4. Создаём генерацию
 * 5. Создаём транзакцию SPEND
 * 6. Записываем событие CREATED
 *
 * ВАЖНО: НЕ создаём assets записи для входных файлов (они только в S3)
 */
export async function createGenerationAtomic(
  request: CreateGenerationRequest,
  fashnParams: FashnInput,
  cost: number
): Promise<CreateGenerationResult> {
  const webhookToken = generateWebhookToken();

  // Выполняем всё в транзакции
  const result = await db.transaction(async (tx) => {
    // 1. Блокируем запись пользователя
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .for('update');

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // 2. Проверяем кредиты
    if (user.credits < cost) {
      throw new Error(
        `Недостаточно токенов. Требуется: ${cost}, доступно: ${user.credits}`
      );
    }

    // 3. Списываем кредиты
    await tx
      .update(users)
      .set({ credits: sql`${users.credits} - ${cost}` })
      .where(eq(users.id, request.userId));

    // 4. Создаём генерацию
    const [generation] = await tx
      .insert(generations)
      .values({
        userId: request.userId,
        type: request.type,
        provider: 'fashn',
        status: 'PENDING',
        params: request.params as GenerationParams,
        cost,
        webhookToken,
        createdAt: new Date(),
      })
      .returning();

    // 5. Создаём транзакцию SPEND
    await tx.insert(transactions).values({
      userId: request.userId,
      type: 'SPEND',
      status: 'SUCCEEDED',
      amount: -cost,
      generationId: generation.id,
      description: `Генерация: ${request.type}`,
    });

    // 6. Записываем событие CREATED
    await tx.insert(generationEvents).values({
      generationId: generation.id,
      eventType: 'CREATED',
      payload: { params: request.params, cost },
      message: `Создана генерация типа ${request.type}`,
    });

    return {
      generationId: generation.id,
      webhookToken,
      status: generation.status,
      cost,
    };
  });

  return {
    generationId: result.generationId,
    status: result.status,
    cost: result.cost,
  };
}

/**
 * Отправка запроса в FASHN и обновление статуса
 */
export async function submitToFashn(
  generationId: string,
  generationType: GenerationType,
  fashnParams: FashnInput,
  webhookToken: string
): Promise<{ providerTaskId: string }> {
  try {
    // Получаем текущую генерацию
    const generation = await db.query.generations.findFirst({
      where: eq(generations.id, generationId),
    });

    if (!generation) {
      throw new Error('Генерация не найдена');
    }

    // Отправляем в FASHN API
    const { id: providerTaskId } = await runGeneration(
      generationType,
      fashnParams,
      webhookToken
    );

    // Обновляем статус и provider_task_id
    await db
      .update(generations)
      .set({
        providerTaskId,
        status: 'QUEUED',
      })
      .where(eq(generations.id, generationId));

    // Записываем событие
    await db.insert(generationEvents).values({
      generationId,
      eventType: 'REQUEST_SENT',
      payload: { providerTaskId },
      message: 'Запрос отправлен в FASHN API',
    });

    return { providerTaskId };
  } catch (error) {
    // Обрабатываем ошибку
    const errorMessage =
      error instanceof Error ? error.message : 'Неизвестная ошибка';

    await db
      .update(generations)
      .set({
        status: 'FAILED',
        errorReason: errorMessage,
      })
      .where(eq(generations.id, generationId));

    // Записываем событие
    await db.insert(generationEvents).values({
      generationId,
      eventType: 'FAILED',
      payload: { error: errorMessage },
      message: `Ошибка отправки в FASHN: ${errorMessage}`,
    });

    // Если ошибка rate limit, не делаем refund сразу
    if (!(error instanceof FashnRateLimitError)) {
      await refundGeneration(generationId);
    }

    throw error;
  }
}

// ============================================
// ОБРАБОТКА РЕЗУЛЬТАТОВ
// ============================================

/**
 * Финализация успешной генерации
 *
 * 1. Скачивает результаты с CDN FASHN
 * 2. Загружает в наш S3
 * 3. Создаёт assets записи
 * 4. Связывает outputs через generation_assets
 * 5. Обновляет статус генерации
 */
export async function finalizeResult(
  generationId: string,
  outputUrls: string[]
): Promise<void> {
  // Получаем генерацию с пользователем
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, generationId),
  });

  if (!generation) {
    throw new Error('Генерация не найдена');
  }

  // Проверяем идемпотентность - если уже COMPLETED и есть outputs, пропускаем
  if (generation.status === 'COMPLETED') {
    const existingOutputs = await db.query.generationAssets.findMany({
      where: and(
        eq(generationAssets.generationId, generationId),
        eq(generationAssets.direction, 'output')
      ),
    });

    if (existingOutputs.length > 0) {
      console.log(`[finalizeResult] Генерация ${generationId} уже завершена`);
      return;
    }
  }

  // Получаем фичи плана для вычисления retention
  const user = await db.query.users.findFirst({
    where: eq(users.id, generation.userId),
  });

  const planFeatures = user
    ? await getPlanFeatures(user.planCode)
    : { resultRetentionDays: 7 } as PlanFeatures;

  // Вычисляем expires_at
  const expiresAt = planFeatures.resultRetentionDays
    ? new Date(Date.now() + planFeatures.resultRetentionDays * 24 * 60 * 60 * 1000)
    : null;

  // Определяем тип медиа
  const isVideo = generation.type === 'image_to_video';
  const mediaKind = isVideo ? 'video' : 'image';
  const extension = isVideo ? 'mp4' : 'png';

  // Скачиваем и сохраняем результаты
  const createdAssets: string[] = [];

  for (let i = 0; i < outputUrls.length; i++) {
    const url = outputUrls[i];
    const key = generateResultKey(generation.userId, generationId, i, extension);

    try {
      // Скачиваем с CDN FASHN и загружаем в наш S3
      const uploadResult = await fetchAndStore(url, key);

      // Создаём запись asset
      const [asset] = await db
        .insert(assets)
        .values({
          userId: generation.userId,
          url: uploadResult.url,
          s3Key: uploadResult.key,
          s3Bucket: uploadResult.bucket,
          type: 'generated_result',
          mediaKind: mediaKind as 'image' | 'video',
          origin: 'fetched',
          mimeType: uploadResult.mimeType,
          size: uploadResult.size,
          expiresAt,
          meta: {
            generationType: generation.type,
            modelUsed: 'fashn',
          } as AssetMeta,
        })
        .returning();

      createdAssets.push(asset.id);

      // Связываем с генерацией
      await db.insert(generationAssets).values({
        generationId,
        assetId: asset.id,
        direction: 'output',
        role: isVideo ? 'output_video' : 'output_image',
        sortOrder: i,
      });
    } catch (error) {
      console.error(`[finalizeResult] Ошибка сохранения результата ${i}:`, error);
      // Продолжаем с остальными результатами
    }
  }

  // Вычисляем duration
  const durationMs = Date.now() - generation.createdAt.getTime();

  // Обновляем генерацию
  await db
    .update(generations)
    .set({
      status: 'COMPLETED',
      completedAt: new Date(),
      durationMs,
    })
    .where(eq(generations.id, generationId));

  // Записываем события
  await db.insert(generationEvents).values({
    generationId,
    eventType: 'RESULT_SAVED',
    payload: { assetIds: createdAssets, outputCount: outputUrls.length },
    message: `Сохранено ${createdAssets.length} результатов`,
  });

  await db.insert(generationEvents).values({
    generationId,
    eventType: 'COMPLETED',
    payload: { durationMs },
    message: 'Генерация успешно завершена',
  });
}

/**
 * Обработка неудачной генерации
 */
export async function handleFailure(
  generationId: string,
  errorReason: string
): Promise<void> {
  // Проверяем идемпотентность
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, generationId),
  });

  if (!generation) {
    console.error(`[handleFailure] Генерация ${generationId} не найдена`);
    return;
  }

  if (generation.status === 'FAILED') {
    console.log(`[handleFailure] Генерация ${generationId} уже помечена как FAILED`);
    return;
  }

  // Обновляем статус
  await db
    .update(generations)
    .set({
      status: 'FAILED',
      errorReason,
      completedAt: new Date(),
    })
    .where(eq(generations.id, generationId));

  // Записываем событие
  await db.insert(generationEvents).values({
    generationId,
    eventType: 'FAILED',
    payload: { error: errorReason },
    message: `Генерация завершилась с ошибкой: ${errorReason}`,
  });

  // Делаем refund
  await refundGeneration(generationId);
}

/**
 * Возврат токенов за неудачную генерацию
 */
export async function refundGeneration(generationId: string): Promise<void> {
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, generationId),
  });

  if (!generation) {
    console.error(`[refundGeneration] Генерация ${generationId} не найдена`);
    return;
  }

  // Проверяем, не был ли уже сделан refund
  const existingRefund = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.generationId, generationId),
      eq(transactions.type, 'REFUND')
    ),
  });

  if (existingRefund) {
    console.log(`[refundGeneration] Refund уже выполнен для ${generationId}`);
    return;
  }

  // Возвращаем кредиты атомарно
  await db.transaction(async (tx) => {
    // Возвращаем кредиты пользователю
    await tx
      .update(users)
      .set({ credits: sql`${users.credits} + ${generation.cost}` })
      .where(eq(users.id, generation.userId));

    // Создаём транзакцию REFUND
    await tx.insert(transactions).values({
      userId: generation.userId,
      type: 'REFUND',
      status: 'SUCCEEDED',
      amount: generation.cost,
      generationId,
      description: `Возврат за неудачную генерацию: ${generation.type}`,
    });

    // Записываем событие
    await tx.insert(generationEvents).values({
      generationId,
      eventType: 'REFUNDED',
      payload: { amount: generation.cost },
      message: `Возвращено ${generation.cost} токенов`,
    });
  });

  console.log(`[refundGeneration] Возвращено ${generation.cost} токенов для ${generationId}`);
}

// ============================================
// СИНХРОНИЗАЦИЯ СТАТУСА
// ============================================

/**
 * Ручная синхронизация статуса генерации (poll)
 *
 * Используется когда webhook не доставлен
 */
export async function syncGenerationStatus(generationId: string): Promise<{
  status: GenerationStatus;
  outputs?: string[];
}> {
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, generationId),
  });

  if (!generation) {
    throw new Error('Генерация не найдена');
  }

  // Если уже COMPLETED или FAILED, возвращаем текущий статус
  if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
    if (generation.status === 'COMPLETED') {
      // Получаем outputs
      const outputs = await db.query.generationAssets.findMany({
        where: and(
          eq(generationAssets.generationId, generationId),
          eq(generationAssets.direction, 'output')
        ),
        with: {
          asset: true,
        },
      });

      return {
        status: generation.status,
        outputs: outputs.map((o) => o.asset.url),
      };
    }

    return { status: generation.status };
  }

  // Если нет provider_task_id, нечего опрашивать
  if (!generation.providerTaskId) {
    return { status: generation.status };
  }

  try {
    // Опрашиваем FASHN API
    const statusResponse = await getTaskStatus(generation.providerTaskId);

    // Записываем событие
    await db.insert(generationEvents).values({
      generationId,
      eventType: 'STATUS_POLLED',
      payload: statusResponse,
      message: `Опрос статуса: ${statusResponse.status}`,
    });

    // Маппим статус
    const dbStatus = mapFashnStatusToDbStatus(statusResponse.status);

    // Обновляем статус в БД
    await db
      .update(generations)
      .set({ status: dbStatus })
      .where(eq(generations.id, generationId));

    // Если completed - финализируем
    if (statusResponse.status === 'completed') {
      const outputs = extractResultUrls(statusResponse);
      if (outputs.length > 0) {
        await finalizeResult(generationId, outputs);
      }
      return { status: 'COMPLETED', outputs };
    }

    // Если failed - обрабатываем ошибку
    if (statusResponse.status === 'failed') {
      await handleFailure(generationId, statusResponse.error || 'Неизвестная ошибка');
      return { status: 'FAILED' };
    }

    return { status: dbStatus };
  } catch (error) {
    console.error(`[syncGenerationStatus] Ошибка опроса статуса:`, error);
    throw error;
  }
}

// ============================================
// ВЫСОКОУРОВНЕВЫЙ API
// ============================================

/**
 * Полный pipeline создания и запуска генерации
 *
 * @example
 * ```typescript
 * const result = await createAndSubmitGeneration({
 *   userId: 'user-123',
 *   type: 'product_to_model',
 *   inputs: [
 *     { s3Key: 'tmp/user-123/product.jpg', role: 'product_image' },
 *     { s3Key: 'tmp/user-123/model.jpg', role: 'model_image' },
 *   ],
 *   params: { resolution: '1k' },
 * });
 * ```
 */
export async function createAndSubmitGeneration(
  request: CreateGenerationRequest
): Promise<CreateGenerationResult> {
  // 1. Проверяем права доступа
  const entitlements = await checkEntitlements(
    request.userId,
    request.type,
    request.params
  );

  if (!entitlements.allowed) {
    throw new Error(entitlements.reason || 'Доступ запрещён');
  }

  // 2. Формируем параметры для FASHN API
  const fashnParams = await buildFashnParams(request);

  // 3. Вычисляем стоимость
  const cost = calculateGenerationCost(request.type, fashnParams);

  // 4. Проверяем достаточность токенов
  if (entitlements.user.credits < cost) {
    throw new Error(
      `Недостаточно токенов. Требуется: ${cost}, доступно: ${entitlements.user.credits}`
    );
  }

  // 5. Атомарно создаём генерацию
  const createResult = await createGenerationAtomic(request, fashnParams, cost);

  // 6. Получаем webhook token (нужно достать из БД после создания)
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, createResult.generationId),
  });

  if (!generation) {
    throw new Error('Генерация не найдена после создания');
  }

  // 7. Отправляем в FASHN API
  try {
    await submitToFashn(
      createResult.generationId,
      request.type,
      fashnParams,
      generation.webhookToken
    );
  } catch (error) {
    // Ошибка уже обработана в submitToFashn
    throw error;
  }

  return {
    generationId: createResult.generationId,
    status: 'QUEUED',
    cost,
  };
}

/**
 * Построение параметров для FASHN API из запроса
 *
 * Генерирует presigned GET URLs из s3Key для передачи в FASHN API
 */
async function buildFashnParams(request: CreateGenerationRequest): Promise<FashnInput> {
  const urlsByRole: Record<string, string> = {};

  // Генерируем presigned URLs для каждого входного файла
  for (const input of request.inputs) {
    // Presigned GET URL действителен 30 минут (достаточно для FASHN)
    const presignedUrl = await getPresignedDownloadUrl(input.s3Key, 1800);
    urlsByRole[input.role] = presignedUrl;
  }

  // Формируем параметры в зависимости от типа генерации
  switch (request.type) {
    case 'product_to_model':
      return {
        product_image: urlsByRole['product_image'] || urlsByRole['garment_image'],
        model_image: urlsByRole['model_image'],
        face_reference: urlsByRole['face_reference'],
        ...request.params,
      } as FashnInput;

    case 'face_to_model':
      return {
        face_image: urlsByRole['face_image'],
        ...request.params,
      } as FashnInput;

    case 'model_create':
      return {
        reference_image: urlsByRole['reference_image'],
        ...request.params,
      } as FashnInput;

    case 'model_variation':
      return {
        image: urlsByRole['source_image'] || urlsByRole['model_image'],
        ...request.params,
      } as FashnInput;

    case 'model_swap':
      return {
        source_image: urlsByRole['source_image'],
        face_reference: urlsByRole['face_reference'],
        model_image: urlsByRole['model_image'],
        ...request.params,
      } as FashnInput;

    case 'edit':
      return {
        image: urlsByRole['source_image'],
        ...request.params,
      } as FashnInput;

    case 'reframe':
      return {
        image: urlsByRole['source_image'],
        ...request.params,
      } as FashnInput;

    case 'image_to_video':
      return {
        image: urlsByRole['source_image'] || urlsByRole['model_image'],
        ...request.params,
      } as FashnInput;

    case 'background_change':
      return {
        image: urlsByRole['source_image'],
        background_image: urlsByRole['background_image'],
        ...request.params,
      } as FashnInput;

    case 'virtual_tryon':
      return {
        model_image: urlsByRole['model_image'],
        garment_image: urlsByRole['garment_image'],
        ...request.params,
      } as FashnInput;

    default:
      throw new Error(`Неподдерживаемый тип генерации: ${request.type}`);
  }
}

// ============================================
// ОЧИСТКА И RETENTION
// ============================================

/**
 * Удаление истёкших ассетов
 *
 * Запускается как cron job ежедневно
 */
export async function cleanupExpiredAssets(): Promise<{ deletedCount: number }> {
  const now = new Date();

  // Находим истёкшие ассеты
  const expiredAssets = await db.query.assets.findMany({
    where: sql`${assets.expiresAt} IS NOT NULL AND ${assets.expiresAt} < ${now}`,
    limit: 100, // Обрабатываем пачками
  });

  let deletedCount = 0;

  for (const asset of expiredAssets) {
    try {
      // Удаляем файл из S3
      await deleteFile(asset.s3Key);

      // Удаляем запись из БД
      await db.delete(assets).where(eq(assets.id, asset.id));

      deletedCount++;
    } catch (error) {
      console.error(`[cleanupExpiredAssets] Ошибка удаления ${asset.id}:`, error);
    }
  }

  console.log(`[cleanupExpiredAssets] Удалено ${deletedCount} ассетов`);

  return { deletedCount };
}

/**
 * Удаление временных загрузок из S3
 *
 * ВАЖНО: Uploads больше не хранятся в БД, только в S3 (tmp/ prefix).
 * Основная очистка происходит через S3 Lifecycle Policy (≤24ч).
 * Эта функция опциональна, если нужна дополнительная очистка.
 *
 * TODO: Реализовать через S3 ListObjects по префиксу tmp/
 */
export async function cleanupTmpUploads(): Promise<{ deletedCount: number }> {
  // Временно пустая реализация - основная очистка через Lifecycle
  console.log('[cleanupTmpUploads] Очистка tmp/ происходит через S3 Lifecycle Policy');

  return { deletedCount: 0 };
}

/**
 * Обработка зависших PENDING генераций
 *
 * Если генерация создана (кредиты списаны), но submitToFashn не успел выполниться
 * (нет providerTaskId), и прошло больше 15 минут - помечаем как FAILED и делаем refund.
 */
export async function cleanupStalePendingGenerations(): Promise<{ failedCount: number }> {
  const timeoutMinutes = 15;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const cutoffTime = new Date(Date.now() - timeoutMs);

  // Находим зависшие PENDING генерации без providerTaskId
  const staleGenerations = await db.query.generations.findMany({
    where: and(
      eq(generations.status, 'PENDING'),
      sql`${generations.providerTaskId} IS NULL`,
      sql`${generations.createdAt} < ${cutoffTime}`
    ),
    limit: 50,
  });

  let failedCount = 0;

  for (const gen of staleGenerations) {
    try {
      await handleFailure(gen.id, `Submit timeout (${timeoutMinutes} минут)`);
      failedCount++;
    } catch (error) {
      console.error(`[cleanupStalePending] Ошибка обработки ${gen.id}:`, error);
    }
  }

  if (failedCount > 0) {
    console.log(`[cleanupStalePending] Обработано ${failedCount} зависших PENDING генераций`);
  }

  return { failedCount };
}
