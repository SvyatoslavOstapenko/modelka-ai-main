/**
 * POST /api/generate/model-create
 *
 * Генерация фото модели по текстовому описанию или референсу.
 * Создаёт реалистичный снимок модели без привязки к конкретному человеку.
 *
 * @module api/generate/model-create
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  ResolutionSchema,
  AspectRatioSchema,
  NumSamplesSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Model Create
 */
const ModelCreateRequestSchema = z.object({
  // Обязательно: текстовое описание модели
  prompt: z.string().min(1, 'Prompt обязателен').max(1000),

  // Опционально: референсное изображение (для стиля/позы)
  referenceS3Key: S3KeySchema.optional(),
  referenceMimeType: MimeTypeSchema,

  // Параметры генерации
  aspectRatio: AspectRatioSchema.default('3:4'),
  resolution: ResolutionSchema.default('1k'),
  numSamples: NumSamplesSchema.default(1),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'model_create',

  schema: ModelCreateRequestSchema,

  extractInputs: (data): FileInput[] => {
    if (data.referenceS3Key) {
      return [{
        s3Key: data.referenceS3Key,
        role: 'reference_image',
        mimeType: data.referenceMimeType,
      }];
    }
    return [];
  },

  extractParams: (data) => ({
    prompt: data.prompt,
    aspect_ratio: data.aspectRatio,
    resolution: data.resolution,
    num_samples: data.numSamples,
  }),
});
