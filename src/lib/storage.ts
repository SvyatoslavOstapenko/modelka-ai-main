/**
 * Модуль работы с S3-совместимым хранилищем (Yandex Object Storage)
 *
 * Функционал:
 * - Загрузка файлов (upload)
 * - Скачивание файлов (download)
 * - Удаление файлов (delete)
 * - Генерация presigned URLs
 * - Скачивание результатов с внешних URL (fetchAndStore)
 *
 * @module lib/storage
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

/**
 * Проверка обязательных переменных окружения
 */
function validateEnvVars(): void {
  const required = [
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'S3_ASSETS_BUCKET',
    'S3_REGION',
    'S3_ENDPOINT',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`${key} не определён в переменных окружения`);
    }
  }
}

// Валидируем при импорте модуля
validateEnvVars();

/**
 * S3 клиент для Yandex Object Storage
 */
export const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: false,
});

/**
 * Имя бакета для ассетов
 */
export const S3_ASSETS_BUCKET = process.env.S3_ASSETS_BUCKET!;

/**
 * Публичный URL бакета
 */
export const S3_PUBLIC_URL = (() => {
  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, '');
  const bucket = process.env.S3_ASSETS_BUCKET!;
  return `${endpoint}/${bucket}`;
})();

// ============================================
// ТИПЫ
// ============================================

/**
 * Результат загрузки файла
 */
export interface UploadResult {
  key: string;      // S3 ключ объекта
  bucket: string;   // Имя бакета
  url: string;      // Полный URL
  size: number;     // Размер в байтах
  mimeType: string; // MIME-тип
}

/**
 * Опции загрузки файла
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

/**
 * Результат скачивания файла
 */
export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  contentLength: number;
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Определение MIME-типа по расширению файла
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Изображения
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    // Видео
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    // Прочее
    'json': 'application/json',
    'pdf': 'application/pdf',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Получение расширения файла по MIME-типу
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };

  return extensions[mimeType] || 'bin';
}

/**
 * Генерация уникального S3 ключа для загрузки
 */
export function generateUploadKey(
  userId: string,
  assetId: string,
  extension: string
): string {
  return `uploads/${userId}/${assetId}.${extension}`;
}

/**
 * Генерация S3 ключа для результатов генерации
 */
export function generateResultKey(
  userId: string,
  generationId: string,
  index: number,
  extension: string
): string {
  const suffix = index > 0 ? `_${index}` : '';
  return `results/${userId}/${generationId}${suffix}.${extension}`;
}

/**
 * Генерация S3 ключа для гардероба (постоянное хранилище)
 */
export function generateWardrobeKey(
  userId: string,
  assetType: 'model' | 'garment' | 'face',
  assetId: string,
  extension: string
): string {
  return `wardrobe/${userId}/${assetType}/${assetId}.${extension}`;
}

/**
 * Построение полного URL объекта
 */
export function buildObjectUrl(key: string, bucket: string = S3_ASSETS_BUCKET): string {
  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, '');
  return `${endpoint}/${bucket}/${key}`;
}

// ============================================
// ОСНОВНЫЕ ОПЕРАЦИИ
// ============================================

/**
 * Загрузка файла в S3
 *
 * @param key - S3 ключ объекта
 * @param data - Данные файла (Buffer или Uint8Array)
 * @param options - Опции загрузки
 * @returns Результат загрузки
 *
 * @example
 * ```typescript
 * const result = await uploadFile(
 *   'uploads/user123/photo.jpg',
 *   imageBuffer,
 *   { contentType: 'image/jpeg' }
 * );
 * ```
 */
export async function uploadFile(
  key: string,
  data: Buffer | Uint8Array,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const contentType = options.contentType || getMimeType(key);

  const command = new PutObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType,
    CacheControl: options.cacheControl || 'max-age=31536000', // 1 год
    Metadata: options.metadata,
  });

  await s3Client.send(command);

  return {
    key,
    bucket: S3_ASSETS_BUCKET,
    url: buildObjectUrl(key),
    size: data.length,
    mimeType: contentType,
  };
}

/**
 * Загрузка файла из File объекта (для upload с клиента)
 */
export async function uploadFromFile(
  key: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadFile(key, buffer, {
    contentType: file.type || getMimeType(file.name),
    ...options,
  });
}

/**
 * Скачивание файла из S3
 *
 * @param key - S3 ключ объекта
 * @returns Результат скачивания с данными
 */
export async function downloadFile(key: string): Promise<DownloadResult> {
  const command = new GetObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`Файл не найден: ${key}`);
  }

  // Конвертация ReadableStream в Buffer
  const chunks: Uint8Array[] = [];

  if (response.Body instanceof Readable) {
    // Node.js stream
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
  } else {
    // Web ReadableStream
    const reader = (response.Body as ReadableStream).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || 0,
  };
}

/**
 * Удаление файла из S3
 *
 * @param key - S3 ключ объекта
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Проверка существования файла
 *
 * @param key - S3 ключ объекта
 * @returns true если файл существует
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_ASSETS_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if ((error as { name?: string }).name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Получение метаданных файла
 */
export async function getFileMetadata(key: string): Promise<{
  contentType: string;
  contentLength: number;
  lastModified: Date | undefined;
}> {
  const command = new HeadObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength || 0,
    lastModified: response.LastModified,
  };
}

// ============================================
// PRESIGNED URLs
// ============================================

/**
 * Генерация presigned URL для скачивания (GET)
 *
 * @param key - S3 ключ объекта
 * @param expiresIn - Время жизни URL в секундах (по умолчанию 15 минут)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Генерация presigned URL для загрузки (PUT)
 *
 * @param key - S3 ключ объекта
 * @param contentType - MIME-тип файла
 * @param expiresIn - Время жизни URL в секундах (по умолчанию 15 минут)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_ASSETS_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// ============================================
// СКАЧИВАНИЕ С ВНЕШНИХ ИСТОЧНИКОВ
// ============================================

/**
 * Скачивание файла с внешнего URL и сохранение в S3
 *
 * Используется для сохранения результатов с CDN FASHN в наше хранилище.
 *
 * @param externalUrl - URL внешнего файла
 * @param key - S3 ключ для сохранения
 * @returns Результат загрузки
 *
 * @example
 * ```typescript
 * const result = await fetchAndStore(
 *   'https://cdn.fashn.ai/.../result.png',
 *   'results/user123/gen456.png'
 * );
 * ```
 */
export async function fetchAndStore(
  externalUrl: string,
  key: string
): Promise<UploadResult> {
  console.log(`[fetchAndStore] Скачивание: ${externalUrl}`);

  // Скачиваем файл с внешнего URL
  const response = await fetch(externalUrl);

  if (!response.ok) {
    throw new Error(
      `Ошибка скачивания файла: ${response.status} ${response.statusText}`
    );
  }

  // Получаем данные и тип контента
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || getMimeType(key);

  console.log(`[fetchAndStore] Размер: ${buffer.length} байт, тип: ${contentType}`);

  // Загружаем в наш S3
  const result = await uploadFile(key, buffer, { contentType });

  console.log(`[fetchAndStore] Сохранено: ${result.url}`);

  return result;
}

/**
 * Скачивание нескольких файлов и сохранение в S3
 *
 * @param urls - Массив внешних URL
 * @param keyGenerator - Функция генерации ключей
 * @returns Массив результатов загрузки
 */
export async function fetchAndStoreMultiple(
  urls: string[],
  keyGenerator: (index: number) => string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < urls.length; i++) {
    const key = keyGenerator(i);
    const result = await fetchAndStore(urls[i], key);
    results.push(result);
  }

  return results;
}

// ============================================
// ПАКЕТНЫЕ ОПЕРАЦИИ
// ============================================

/**
 * Удаление нескольких файлов
 *
 * @param keys - Массив S3 ключей
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  // Удаляем параллельно с ограничением concurrency
  const batchSize = 10;

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    await Promise.all(batch.map(key => deleteFile(key)));
  }
}

/**
 * Копирование файла внутри S3 (из временного в постоянное хранилище)
 *
 * @param sourceKey - Исходный ключ
 * @param destinationKey - Целевой ключ
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string
): Promise<UploadResult> {
  // Скачиваем и загружаем заново (простой способ)
  const { buffer, contentType } = await downloadFile(sourceKey);
  return uploadFile(destinationKey, buffer, { contentType });
}

/**
 * Перемещение файла (копирование + удаление оригинала)
 */
export async function moveFile(
  sourceKey: string,
  destinationKey: string
): Promise<UploadResult> {
  const result = await copyFile(sourceKey, destinationKey);
  await deleteFile(sourceKey);
  return result;
}

// ============================================
// LEGACY СОВМЕСТИМОСТЬ
// ============================================

/**
 * @deprecated Используйте getExtensionFromMimeType
 */
export function getFileExtension(mimeType: string): string {
  const ext = getExtensionFromMimeType(mimeType);
  if (ext === 'bin') {
    throw new Error(`Неподдерживаемый MIME-тип: ${mimeType}`);
  }
  return ext;
}

/**
 * @deprecated Используйте generateUploadKey
 */
export function generateS3Key(
  userId: string,
  assetType: 'uploaded_model' | 'uploaded_garment' | 'generated_result',
  uuid: string,
  extension: string
): string {
  const typeMap = {
    'uploaded_model': 'model',
    'uploaded_garment': 'garment',
    'generated_result': 'result',
  } as const;

  const legacyType = typeMap[assetType];
  return `uploads/${userId}/${legacyType}_${uuid}.${extension}`;
}
