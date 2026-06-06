/**
 * POST /api/generate/face-to-model
 *
 * Генерация аватара модели из фото лица.
 * Создаёт реалистичный портрет модели (по плечи), пригодный для примерки.
 *
 * ВАЖНО: Доступно только на платных тарифах (seller, brand).
 *
 * @module api/generate/face-to-model
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  ResolutionSchema,
  AspectRatioSchema,
  PromptSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Face to Model
 */
const FaceToModelRequestSchema = z.object({
  // Обязательно: фото лица
  faceS3Key: S3KeySchema,
  faceMimeType: MimeTypeSchema,

  // Параметры генерации
  prompt: PromptSchema,
  aspectRatio: AspectRatioSchema.default('3:4'),
  resolution: ResolutionSchema.default('1k'),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'face_to_model',

  schema: FaceToModelRequestSchema,

  extractInputs: (data): FileInput[] => [
    {
      s3Key: data.faceS3Key,
      role: 'face_image',
      mimeType: data.faceMimeType,
    },
  ],

  extractParams: (data) => ({
    prompt: data.prompt,
    aspect_ratio: data.aspectRatio,
    resolution: data.resolution,
  }),
});
