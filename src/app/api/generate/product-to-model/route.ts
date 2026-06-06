/**
 * POST /api/generate/product-to-model
 *
 * Генерация изображения товара на модели.
 * Трансформирует фото товара в изображение с человеком, который носит этот товар.
 *
 * @module api/generate/product-to-model
 */

import { z } from 'zod';
import {
  createGenerationHandler,
  S3KeySchema,
  MimeTypeSchema,
  ResolutionSchema,
  AspectRatioSchema,
  NumSamplesSchema,
  PromptSchema,
  type FileInput,
} from '../_shared/handler';

/**
 * Схема запроса Product to Model
 */
const ProductToModelRequestSchema = z.object({
  // Обязательно: фото товара (одежды)
  productS3Key: S3KeySchema,
  productMimeType: MimeTypeSchema,

  // Опционально: фото модели (если не указано - генерируется новая)
  modelS3Key: S3KeySchema.optional(),
  modelMimeType: MimeTypeSchema,

  // Опционально: референс лица (увеличивает стоимость до 4 токенов)
  faceReferenceS3Key: S3KeySchema.optional(),
  faceReferenceMimeType: MimeTypeSchema,

  // Параметры генерации
  prompt: PromptSchema,
  aspectRatio: AspectRatioSchema,
  resolution: ResolutionSchema.default('1k'),
  numSamples: NumSamplesSchema.default(1),
});

/**
 * POST handler
 */
export const POST = createGenerationHandler({
  type: 'product_to_model',

  schema: ProductToModelRequestSchema,

  extractInputs: (data) => {
    const inputs: FileInput[] = [
      {
        s3Key: data.productS3Key,
        role: 'product_image',
        mimeType: data.productMimeType,
      },
    ];

    if (data.modelS3Key) {
      inputs.push({
        s3Key: data.modelS3Key,
        role: 'model_image',
        mimeType: data.modelMimeType,
      });
    }

    if (data.faceReferenceS3Key) {
      inputs.push({
        s3Key: data.faceReferenceS3Key,
        role: 'face_reference',
        mimeType: data.faceReferenceMimeType,
      });
    }

    return inputs;
  },

  extractParams: (data) => ({
    prompt: data.prompt,
    aspect_ratio: data.aspectRatio,
    resolution: data.resolution,
    num_samples: data.numSamples,
  }),
});
