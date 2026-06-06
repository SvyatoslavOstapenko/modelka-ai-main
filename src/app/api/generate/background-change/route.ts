/**
 * POST /api/generate/background-change
 *
 * Замена фона на фотографии с сохранением основного субъекта.
 * Вырезает человека/объект и помещает на новый фон с гармонизацией цвета и освещения.
 *
 * @module api/generate/background-change
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
 * Схема запроса Background Change
 */
const BackgroundChangeRequestSchema = z.object({
  // Обязательно: исходное изображение (откуда убрать фон)
  sourceS3Key: S3KeySchema,
  sourceMimeType: MimeTypeSchema,

  // Опционально (один из двух): конкретное изображение нового фона
  backgroundS3Key: S3KeySchema.optional(),
  backgroundMimeType: MimeTypeSchema,

  // Опционально (один из двух): текстовое описание желаемого фона
  prompt: PromptSchema,
}).refine(
  (data) => data.backgroundS3Key || data.prompt,
  { message: 'Необходимо указать backgroundS3Key или prompt для нового фона' }
);

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'background_change',

  schema: BackgroundChangeRequestSchema,

  extractInputs: (data): FileInput[] => {
    const inputs: FileInput[] = [
      {
        s3Key: data.sourceS3Key,
        role: 'source_image',
        mimeType: data.sourceMimeType,
      },
    ];

    if (data.backgroundS3Key) {
      inputs.push({
        s3Key: data.backgroundS3Key,
        role: 'background_image',
        mimeType: data.backgroundMimeType,
      });
    }

    return inputs;
  },

  extractParams: (data) => ({
    prompt: data.prompt,
    backgroundPrompt: data.prompt,
  }),
});
