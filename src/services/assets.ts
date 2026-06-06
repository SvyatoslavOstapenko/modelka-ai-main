/**
 * Asset Service - Бизнес-логика управления файлами
 *
 * Обеспечивает:
 * - Генерацию presigned URLs для загрузки/просмотра
 * - Управление жизненным циклом файлов (uploads → results/wardrobe)
 * - Интеграцию с БД (создание/обновление записей assets)
 * - Получение данных для галереи пользователя
 *
 * @module services/assets
 */

import 'server-only';

import { db } from '@/db';
import { assets, generations, type Asset } from '@/db/schema';
import {
  s3Client,
  S3_ASSETS_BUCKET,
  S3_PUBLIC_URL,
  generateWardrobeKey,
  getPresignedDownloadUrl,
} from '@/lib/s3';
import { CopyObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

/**
 * Метаданные для создания asset записи
 */
export type AssetMetadata = {
  type: 'uploaded_model' | 'uploaded_garment';
  mimeType: string;
  size?: number;
  originalName?: string;
  garmentCategory?: 'tops' | 'bottoms' | 'one-pieces' | 'auto';
  garmentPhotoType?: 'model' | 'flat-lay' | 'auto';
};

/**
 * Результат генерации presigned URL для загрузки
 */
export type PresignedUploadResult = {
  uploadUrl: string; // Presigned PUT URL для фронтенда
  assetId: string; // ID созданной записи в БД
  s3Key: string; // Ключ объекта в S3
};

/**
 * Asset с временной ссылкой для просмотра
 */
export type AssetWithViewUrl = Asset & {
  viewUrl: string; // Presigned GET URL (срок действия: 1 час)
};

/**
 * Элемент галереи пользователя
 */
export type GalleryItem = {
  id: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  createdAt: Date;
  completedAt: Date | null;
  errorReason: string | null;

  // Ассеты с временными ссылками
  modelAsset: AssetWithViewUrl;
  garmentAsset: AssetWithViewUrl;
  resultAsset: AssetWithViewUrl | null;

  // Конфигурация генерации
  category: 'tops' | 'bottoms' | 'one-pieces' | 'auto';
  mode: 'performance' | 'balanced' | 'quality';
  cost: number;
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Создает presigned URL для загрузки файла пользователем
 *
 * Процесс:
 * 1. Генерирует уникальный ключ в папке uploads/{userId}/
 * 2. Создает запись в БД с типом 'uploaded_model' или 'uploaded_garment'
 * 3. Генерирует presigned PUT URL (срок действия: 15 минут)
 *
 * @param userId - ID пользователя
 * @param metadata - Метаданные файла (тип, MIME, размер, категория)
 * @returns Presigned URL для загрузки + assetId + s3Key
 *
 * @example
 * const result = await createPresignedUpload(
 *   'user123',
 *   {
 *     type: 'uploaded_model',
 *     mimeType: 'image/jpeg',
 *     size: 1024000,
 *     originalName: 'photo.jpg'
 *   }
 * );
 * // Frontend использует result.uploadUrl для PUT запроса
 */
export async function createPresignedUpload(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _metadata: AssetMetadata
): Promise<PresignedUploadResult> {
  // 1. DEPRECATED: Больше не создаём assets для uploads в БД
  // Uploads теперь только в S3 (tmp/ folder) без записи в БД
  // Только generated_result создаются в БД
  throw new Error('createPresignedUpload is deprecated. Use /api/assets/upload endpoint instead');

  /* DEPRECATED CODE:
  const [asset] = await db
    .insert(assets)
    .values({
      userId,
      url: `${S3_PUBLIC_URL}/${s3Key}`,
      s3Key,
      s3Bucket: S3_ASSETS_BUCKET!,
      type: metadata.type, // uploaded_model/garment больше не поддерживаются
      mimeType: metadata.mimeType,
      size: metadata.size,
      originalName: metadata.originalName,
      garmentCategory: metadata.garmentCategory,
      garmentPhotoType: metadata.garmentPhotoType,
    })
    .returning();
  */

  // 3. DEPRECATED: Код ниже не выполнится из-за throw выше
  /* DEPRECATED CODE:
  const command = new PutObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: s3Key,
    ContentType: metadata.mimeType,
    Metadata: {
      userId,
      assetId: asset.id,
      assetType: metadata.type,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 900,
  });

  return {
    uploadUrl,
    assetId: asset.id,
    s3Key,
  };
  */
}

/**
 * Генерирует presigned URL для просмотра файла
 *
 * Используется для отображения приватных изображений на фронтенде.
 * Временная ссылка действительна 1 час.
 *
 * @param s3Key - Ключ объекта в S3
 * @param expiresIn - Время жизни URL в секундах (по умолчанию: 3600 = 1 час)
 * @returns Presigned GET URL
 *
 * @example
 * const viewUrl = await getPresignedViewUrl('uploads/user123/abc123.jpg');
 * // <img src={viewUrl} />
 */
export async function getPresignedViewUrl(
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> {
  return getPresignedDownloadUrl(s3Key, expiresIn);
}

/**
 * Перемещает asset из временного хранилища (uploads/) в постоянное (wardrobe/)
 *
 * Use Case: Пользователь хочет сохранить фото модели или одежды в "Гардероб".
 * Файлы в uploads/ удаляются Lifecycle Policy через 24 часа.
 *
 * Процесс:
 * 1. Копирует объект из uploads/{userId}/{uuid}.ext → wardrobe/{userId}/{type}/{uuid}.ext
 * 2. Обновляет запись в БД (новый s3Key и URL)
 * 3. Опционально удаляет старый объект (пока пропускаем - lifecycle удалит сам)
 *
 * @param assetId - ID записи в БД
 * @returns Обновленный asset
 *
 * @example
 * await moveAssetToPermanent('asset-uuid-123');
 * // Файл теперь в wardrobe/ и не будет удален
 */
export async function moveAssetToPermanent(assetId: string): Promise<Asset> {
  // 1. Получаем текущий asset
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetId),
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  // 2. Проверяем, что это uploaded файл (не результат генерации)
  if (asset.type === 'generated_result') {
    throw new Error('Cannot move generated results to wardrobe');
  }

  // 3. Проверяем, что файл еще не в wardrobe
  if (asset.s3Key.startsWith('wardrobe/')) {
    console.log(`[moveAssetToPermanent] Asset already in wardrobe: ${assetId}`);
    return asset;
  }

  // 4. Генерируем новый ключ в wardrobe/
  const extension = asset.s3Key.split('.').pop() || 'jpg';
  const uuid = uuidv4();
  const assetType = asset.type === 'uploaded_model' ? 'model' : 'garment';
  const newS3Key = generateWardrobeKey(asset.userId, assetType, uuid, extension);

  // 5. Копируем объект в S3
  const copyCommand = new CopyObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    CopySource: `${S3_ASSETS_BUCKET}/${asset.s3Key}`,
    Key: newS3Key,
    MetadataDirective: 'COPY',
  });

  await s3Client.send(copyCommand);

  // 6. Обновляем запись в БД
  const [updatedAsset] = await db
    .update(assets)
    .set({
      s3Key: newS3Key,
      url: `${S3_PUBLIC_URL}/${newS3Key}`,
    })
    .where(eq(assets.id, assetId))
    .returning();

  console.log(`[moveAssetToPermanent] Moved ${asset.s3Key} → ${newS3Key}`);

  return updatedAsset;
}

/**
 * Добавляет presigned view URL к asset
 *
 * Утилита для обогащения asset объектов временными ссылками.
 *
 * @param asset - Asset из БД
 * @param expiresIn - Время жизни URL в секундах
 * @returns Asset с добавленным полем viewUrl
 */
export async function enrichAssetWithViewUrl(
  asset: Asset,
  expiresIn: number = 3600
): Promise<AssetWithViewUrl> {
  const viewUrl = await getPresignedViewUrl(asset.s3Key, expiresIn);
  return {
    ...asset,
    viewUrl,
  };
}

// ============================================
// GALLERY LOGIC
// ============================================

/**
 * Получает галерею генераций пользователя
 *
 * Возвращает все генерации с enriched ассетами (с presigned URLs).
 * Используется для страницы "Мои генерации".
 *
 * Процесс:
 * 1. Выбирает все generations пользователя (сортировка по дате, новые первыми)
 * 2. Подтягивает связанные ассеты (modelAsset, garmentAsset, resultAsset)
 * 3. Генерирует presigned view URLs для всех изображений
 * 4. Возвращает готовый массив для фронтенда
 *
 * @param userId - ID пользователя
 * @param limit - Максимальное количество генераций (по умолчанию: 50)
 * @returns Массив элементов галереи с временными ссылками
 *
 * @example
 * const gallery = await getUserGallery('user123');
 * // [{
 * //   id: 'gen123',
 * //   modelAsset: { ..., viewUrl: 'https://storage...?Signature=...' },
 * //   ...
 * // }]
 */
export async function getUserGallery(
  userId: string,
  limit: number = 50
): Promise<GalleryItem[]> {
  // 1. Получаем генерации со связанными ассетами через generationAssets
  const generationsData = await db.query.generations.findMany({
    where: eq(generations.userId, userId),
    orderBy: [desc(generations.createdAt)],
    limit,
    with: {
      generationAssets: {
        with: {
          asset: true,
        },
      },
    },
  });

  // 2. Обогащаем ассеты presigned URLs и маппим в структуру галереи
  const gallery: GalleryItem[] = await Promise.all(
    generationsData.map(async (gen) => {
      // Фильтруем ассеты по ролям
      const modelAssetRel = gen.generationAssets.find(
        (ga) => ga.role === 'model_image' || ga.role === 'source_image'
      );
      const garmentAssetRel = gen.generationAssets.find(
        (ga) => ga.role === 'garment_image' || ga.role === 'product_image'
      );
      const resultAssetRel = gen.generationAssets.find(
        (ga) => ga.role === 'output_image' || ga.role === 'output_video'
      );

      // Если обязательных ассетов нет (теоретически невозможно для валидной генерации),
      // но для безопасности вернем null или пустой объект, пока просто пропустим
      if (!modelAssetRel || !garmentAssetRel) {
        // В реальном сценарии лучше логировать или возвращать частичные данные
        // Для совместимости типов вернем пустые объекты (или можно фильтровать такие генерации)
        // пока оставим throw для отладки
      }

      const modelAsset = modelAssetRel ? modelAssetRel.asset : null;
      const garmentAsset = garmentAssetRel ? garmentAssetRel.asset : null;
      const resultAsset = resultAssetRel ? resultAssetRel.asset : null;

      // Генерируем временные ссылки
      const modelAssetEnriched = modelAsset
        ? await enrichAssetWithViewUrl(modelAsset)
        : ({} as AssetWithViewUrl); // Fallback
      const garmentAssetEnriched = garmentAsset
        ? await enrichAssetWithViewUrl(garmentAsset)
        : ({} as AssetWithViewUrl); // Fallback
      const resultAssetEnriched = resultAsset
        ? await enrichAssetWithViewUrl(resultAsset)
        : null;

      // Извлекаем параметры из JSONB
      const params = gen.params as Record<string, unknown>;

      return {
        id: gen.id,
        status: gen.status,
        createdAt: gen.createdAt,
        completedAt: gen.completedAt,
        errorReason: gen.errorReason,
        modelAsset: modelAssetEnriched,
        garmentAsset: garmentAssetEnriched,
        resultAsset: resultAssetEnriched,
        // Маппим параметры из JSONB в поля галереи
        category: (params.category as 'tops' | 'bottoms' | 'one-pieces' | 'auto') || 'auto',
        mode: (params.mode as 'performance' | 'balanced' | 'quality') || 'balanced',
        cost: gen.cost,
      } as GalleryItem;
    })
  );

  return gallery; // В реальном коде можно отфильтровать элементы с пустыми ассетами
}

/**
 * Получает один элемент галереи по ID генерации
 *
 * Используется для детального просмотра генерации.
 *
 * @param generationId - ID генерации
 * @param userId - ID пользователя (для проверки доступа)
 * @returns Элемент галереи или null, если не найден
 */
export async function getGalleryItem(
  generationId: string,
  userId: string
): Promise<GalleryItem | null> {
  const gen = await db.query.generations.findFirst({
    where: eq(generations.id, generationId),
    with: {
      generationAssets: {
        with: {
          asset: true,
        },
      },
    },
  });

  if (!gen || gen.userId !== userId) {
    return null;
  }

  // Фильтруем ассеты по ролям
  const modelAssetRel = gen.generationAssets.find(
    (ga) => ga.role === 'model_image' || ga.role === 'source_image'
  );
  const garmentAssetRel = gen.generationAssets.find(
    (ga) => ga.role === 'garment_image' || ga.role === 'product_image'
  );
  const resultAssetRel = gen.generationAssets.find(
    (ga) => ga.role === 'output_image' || ga.role === 'output_video'
  );

  const modelAsset = modelAssetRel ? modelAssetRel.asset : null;
  const garmentAsset = garmentAssetRel ? garmentAssetRel.asset : null;
  const resultAsset = resultAssetRel ? resultAssetRel.asset : null;

  const modelAssetEnriched = modelAsset
    ? await enrichAssetWithViewUrl(modelAsset)
    : ({} as AssetWithViewUrl); // Fallback
  const garmentAssetEnriched = garmentAsset
    ? await enrichAssetWithViewUrl(garmentAsset)
    : ({} as AssetWithViewUrl); // Fallback
  const resultAssetEnriched = resultAsset
    ? await enrichAssetWithViewUrl(resultAsset)
    : null;

  // Извлекаем параметры из JSONB
  const params = gen.params as Record<string, unknown>;

  return {
    id: gen.id,
    status: gen.status,
    createdAt: gen.createdAt,
    completedAt: gen.completedAt,
    errorReason: gen.errorReason,
    modelAsset: modelAssetEnriched,
    garmentAsset: garmentAssetEnriched,
    resultAsset: resultAssetEnriched,
    // Маппим параметры из JSONB в поля галереи
    category: (params.category as 'tops' | 'bottoms' | 'one-pieces' | 'auto') || 'auto',
    mode: (params.mode as 'performance' | 'balanced' | 'quality') || 'balanced',
    cost: gen.cost,
  } as GalleryItem;
}
