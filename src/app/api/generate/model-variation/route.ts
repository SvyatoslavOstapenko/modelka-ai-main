/**
 * POST /api/generate/model-variation
 *
 * Создание вариаций существующего изображения модели.
 * Генерирует похожие изображения с изменениями (поза, мимика, фон, освещение).
 *
 * @module api/generate/model-variation
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  NumSamplesSchema,
  PromptSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Model Variation
 */
const ModelVariationRequestSchema = z.object({
  // Обязательно: исходное изображение модели
  sourceS3Key: S3KeySchema,
  sourceMimeType: MimeTypeSchema,

  // Опционально: инструкции по изменению
  prompt: PromptSchema,

  // Количество вариаций
  numSamples: NumSamplesSchema.default(1),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'model_variation',

  schema: ModelVariationRequestSchema,

  extractInputs: (data): FileInput[] => [
    {
      s3Key: data.sourceS3Key,
      role: 'source_image',
      mimeType: data.sourceMimeType,
    },
  ],

  extractParams: (data) => ({
    prompt: data.prompt,
    num_samples: data.numSamples,
  }),
});
