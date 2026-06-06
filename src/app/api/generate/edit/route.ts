/**
 * POST /api/generate/edit
 *
 * Редактирование изображения по текстовому запросу.
 * Позволяет вносить изменения: поза, выражение лица, аксессуары, освещение, фон.
 *
 * @module api/generate/edit
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  ResolutionSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Edit
 */
const EditRequestSchema = z.object({
  // Обязательно: исходное изображение
  sourceS3Key: S3KeySchema,
  sourceMimeType: MimeTypeSchema,

  // Обязательно: инструкция по редактированию
  prompt: z.string().min(1, 'Prompt обязателен').max(1000),

  // Параметры генерации
  resolution: ResolutionSchema.default('1k'),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'edit',

  schema: EditRequestSchema,

  extractInputs: (data): FileInput[] => [
    {
      s3Key: data.sourceS3Key,
      role: 'source_image',
      mimeType: data.sourceMimeType,
    },
  ],

  extractParams: (data) => ({
    prompt: data.prompt,
    resolution: data.resolution,
  }),
});
