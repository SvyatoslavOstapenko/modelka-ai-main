/**
 * POST /api/generate/model-swap
 *
 * Замена модели на фото с сохранением одежды и окружения.
 * Берёт существующий снимок и меняет внешность человека на новую.
 *
 * @module api/generate/model-swap
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Model Swap
 */
const ModelSwapRequestSchema = z.object({
  // Обязательно: исходное фото с одеждой и оригинальной моделью
  sourceS3Key: S3KeySchema,
  sourceMimeType: MimeTypeSchema,

  // Опционально (один из двух): фото лица новой модели
  faceReferenceS3Key: S3KeySchema.optional(),
  faceReferenceMimeType: MimeTypeSchema,

  // Опционально (один из двух): полное фото новой модели
  modelS3Key: S3KeySchema.optional(),
  modelMimeType: MimeTypeSchema,
}).refine(
  (data) => data.faceReferenceS3Key || data.modelS3Key,
  { message: 'Необходимо указать faceReferenceS3Key или modelS3Key' }
);

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'model_swap',

  schema: ModelSwapRequestSchema,

  extractInputs: (data): FileInput[] => {
    const inputs: FileInput[] = [
      {
        s3Key: data.sourceS3Key,
        role: 'source_image',
        mimeType: data.sourceMimeType,
      },
    ];

    if (data.faceReferenceS3Key) {
      inputs.push({
        s3Key: data.faceReferenceS3Key,
        role: 'face_reference',
        mimeType: data.faceReferenceMimeType,
      });
    }

    if (data.modelS3Key) {
      inputs.push({
        s3Key: data.modelS3Key,
        role: 'model_image',
        mimeType: data.modelMimeType,
      });
    }

    return inputs;
  },

  extractParams: () => ({}),
});
