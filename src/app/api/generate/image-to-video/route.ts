/**
 * POST /api/generate/image-to-video
 *
 * Генерация короткого видео (5-10 секунд) из статичного изображения.
 * Добавляет эффект оживления: модель начинает двигаться как в модном видеоролике.
 *
 * ВАЖНО:
 * - Недоступно на тарифе test (allowVideo: false)
 * - На seller максимум 720p
 * - На brand доступно до 1080p
 *
 * Стоимость:
 * - 480p/5s = 1 токен
 * - 720p/5s = 3 токена
 * - 1080p/5s = 6 токенов
 * - 10 секунд = x2
 *
 * @module api/generate/image-to-video
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  PromptSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Image to Video
 */
const ImageToVideoRequestSchema = z.object({
  // Обязательно: исходное изображение (обычно с человеком в одежде)
  sourceS3Key: S3KeySchema,
  sourceMimeType: MimeTypeSchema,

  // Опционально: prompt для характера движения (рекомендуется оставлять пустым)
  prompt: PromptSchema,

  // Длительность видео в секундах
  duration: z.enum(['5', '10']).default('5').transform(Number),

  // Разрешение видео
  resolution: z.enum(['480p', '720p', '1080p']).default('1080p'),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'image_to_video',

  schema: ImageToVideoRequestSchema,

  extractInputs: (data): FileInput[] => [
    {
      s3Key: data.sourceS3Key,
      role: 'source_image',
      mimeType: data.sourceMimeType,
    },
  ],

  extractParams: (data) => ({
    prompt: data.prompt,
    duration: data.duration as 5 | 10,
    resolution: data.resolution,
    // Маппинг для params в БД
    videoDuration: data.duration as 5 | 10,
    videoResolution: data.resolution,
  }),
});
