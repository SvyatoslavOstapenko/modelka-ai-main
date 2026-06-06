/**
 * POST /api/generate/try-on
 *
 * Виртуальная примерка одежды на модель
 *
 * @module api/generate/try-on
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Try-On
 */
const TryOnRequestSchema = z.object({
  // Обязательные изображения
  modelS3Key: S3KeySchema,
  modelMimeType: MimeTypeSchema,
  garmentS3Key: S3KeySchema,
  garmentMimeType: MimeTypeSchema,

  // Параметры одежды
  category: z.enum(['tops', 'bottoms', 'one-pieces', 'auto']).default('auto'),
  garmentPhotoType: z.enum(['model', 'flat-lay', 'auto']).default('auto'),

  // Режим генерации
  mode: z.enum(['performance', 'balanced', 'quality']).default('balanced'),

  // Опции коррекции
  adjustHands: z.boolean().default(false),
  coverFeet: z.boolean().default(false),
  restoreBackground: z.boolean().default(false),

  // Дополнительные параметры
  seed: z.number().int().positive().optional(),
  numSamples: z.number().int().min(1).max(4).default(1),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'virtual_tryon',

  schema: TryOnRequestSchema,

  extractInputs: (data): FileInput[] => {
    const inputs: FileInput[] = [
      {
        s3Key: data.modelS3Key,
        role: 'model_image',
        mimeType: data.modelMimeType,
      },
      {
        s3Key: data.garmentS3Key,
        role: 'garment_image',
        mimeType: data.garmentMimeType,
      },
    ];

    return inputs;
  },

  extractParams: (data) => ({
    category: data.category,
    garment_photo_type: data.garmentPhotoType,
    mode: data.mode,
    adjust_hands: data.adjustHands,
    cover_feet: data.coverFeet,
    restore_background: data.restoreBackground,
    seed: data.seed,
    num_samples: data.numSamples,
  }),
});
