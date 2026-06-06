/**
 * POST /api/generate/reframe
 *
 * Изменение кадрирования и расширение изображения.
 * Автоматически расширяет границы фото, генеративно достраивая недостающие области.
 *
 * @module api/generate/reframe
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
 * Схема запроса Reframe
 */
const ReframeRequestSchema = z.object({
  // Обязательно: исходное изображение
  sourceS3Key: S3KeySchema,
  sourceMimeType: MimeTypeSchema,

  // Обязательно: желаемое соотношение сторон
  aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']),

  // Опционально: стилистические пожелания для генерируемого фона
  prompt: PromptSchema,
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'reframe',

  schema: ReframeRequestSchema,

  extractInputs: (data): FileInput[] => [
    {
      s3Key: data.sourceS3Key,
      role: 'source_image',
      mimeType: data.sourceMimeType,
    },
  ],

  extractParams: (data) => ({
    aspect_ratio: data.aspectRatio,
    prompt: data.prompt,
  }),
});
