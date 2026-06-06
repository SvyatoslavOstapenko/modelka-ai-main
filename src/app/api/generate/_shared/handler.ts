/**
 * Общий обработчик для всех endpoint'ов генерации
 *
 * Обеспечивает:
 * - Аутентификацию
 * - Валидацию входных данных
 * - Валидацию S3 ключей (безопасность)
 * - Единообразную обработку ошибок
 *
 * ВАЖНО: Входные изображения больше НЕ хранятся в БД.
 * Клиент загружает их напрямую в S3 (tmp/ prefix) и передаёт s3Key.
 *
 * @module api/generate/_shared/handler
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { GenerationType } from '@/db/schema';
import { z, ZodSchema } from 'zod';
import {
  createAndSubmitGeneration,
  type InputFile,
} from '@/services/generationService';
import { FashnApiError, FashnRateLimitError, FashnValidationError } from '@/lib/fashn';

// ============================================
// ТИПЫ
// ============================================

/**
 * Определение входного файла из запроса
 */
export interface FileInput {
  s3Key: string;
  role: string;
  mimeType?: string;
}

/**
 * Конфигурация endpoint'а генерации
 */
export interface GenerationEndpointConfig<T> {
  /** Тип генерации */
  type: GenerationType;
  /** Zod схема валидации тела запроса */
  schema: ZodSchema<T>;
  /** Функция извлечения входных файлов из валидированных данных */
  extractInputs: (data: T) => FileInput[];
  /** Функция извлечения параметров генерации */
  extractParams: (data: T) => Record<string, unknown>;
}

/**
 * Стандартный успешный ответ
 */
interface SuccessResponse {
  success: true;
  generationId: string;
  status: string;
  cost: number;
}

/**
 * Стандартный ответ с ошибкой
 */
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  retryAfter?: number;
}

// ============================================
// ВАЛИДАЦИЯ БЕЗОПАСНОСТИ
// ============================================

/**
 * Валидация S3 ключа на безопасность
 *
 * Проверяет что ключ:
 * - Начинается с tmp/{userId}/
 * - Не содержит path traversal атак (../)
 * - Соответствует ожидаемому формату
 */
function validateS3Key(s3Key: string, userId: string): { valid: boolean; error?: string } {
  // Проверка пустой строки
  if (!s3Key || typeof s3Key !== 'string') {
    return { valid: false, error: 'S3 ключ не может быть пустым' };
  }

  // Проверка path traversal
  if (s3Key.includes('../') || s3Key.includes('..\\')) {
    return { valid: false, error: 'S3 ключ содержит недопустимые символы' };
  }

  // Проверка префикса tmp/{userId}/
  const expectedPrefix = `tmp/${userId}/`;
  if (!s3Key.startsWith(expectedPrefix)) {
    return {
      valid: false,
      error: `S3 ключ должен начинаться с ${expectedPrefix}`
    };
  }

  // Проверка что после префикса есть имя файла
  const fileName = s3Key.substring(expectedPrefix.length);
  if (!fileName || fileName.length === 0) {
    return { valid: false, error: 'S3 ключ должен содержать имя файла' };
  }

  // Проверка расширения файла (только изображения)
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const hasValidExtension = validExtensions.some(ext =>
    fileName.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Поддерживаются только изображения: ${validExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Валидация MIME типа
 */
function validateMimeType(mimeType?: string): boolean {
  if (!mimeType) return true; // Опционально

  const validMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  return validMimeTypes.includes(mimeType);
}

// ============================================
// ОСНОВНОЙ ОБРАБОТЧИК
// ============================================

/**
 * Создание обработчика POST запроса для endpoint'а генерации
 *
 * @example
 * ```typescript
 * export const POST = createGenerationHandler({
 *   type: 'product_to_model',
 *   schema: ProductToModelRequestSchema,
 *   extractInputs: (data) => [
 *     { s3Key: data.productS3Key, role: 'product_image' },
 *     ...(data.modelS3Key ? [{ s3Key: data.modelS3Key, role: 'model_image' }] : []),
 *   ],
 *   extractParams: (data) => ({
 *     resolution: data.resolution,
 *     category: data.category,
 *   }),
 * });
 * ```
 */
export function createGenerationHandler<T>(
  config: GenerationEndpointConfig<T>
): (request: Request) => Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  return async (request: Request) => {
    try {
      // 1. Аутентификация
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      const userId = session.user.id;

      // 2. Парсинг и валидация тела запроса
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Невалидный JSON', code: 'INVALID_JSON' },
          { status: 400 }
        );
      }

      const parseResult = config.schema.safeParse(body);

      if (!parseResult.success) {
        const errors = parseResult.error.flatten();
        return NextResponse.json(
          {
            success: false,
            error: 'Ошибка валидации',
            code: 'VALIDATION_ERROR',
            details: errors.fieldErrors,
          } as ErrorResponse & { details: unknown },
          { status: 400 }
        );
      }

      const data = parseResult.data;

      // 3. Извлечение входных файлов
      const fileInputs = config.extractInputs(data);

      // 4. Валидация S3 ключей (безопасность!)
      for (const fileInput of fileInputs) {
        // Валидация ключа
        const keyValidation = validateS3Key(fileInput.s3Key, userId);
        if (!keyValidation.valid) {
          return NextResponse.json(
            {
              success: false,
              error: keyValidation.error || 'Невалидный S3 ключ',
              code: 'INVALID_S3_KEY',
            },
            { status: 400 }
          );
        }

        // Валидация MIME типа
        if (fileInput.mimeType && !validateMimeType(fileInput.mimeType)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Неподдерживаемый формат файла',
              code: 'INVALID_MIME_TYPE',
            },
            { status: 400 }
          );
        }
      }

      // 5. Формируем InputFile[] для сервиса
      const inputs: InputFile[] = fileInputs.map(fi => ({
        s3Key: fi.s3Key,
        role: fi.role,
        mimeType: fi.mimeType,
      }));

      // 6. Извлечение параметров
      const params = config.extractParams(data);

      // 7. Создание и отправка генерации
      const result = await createAndSubmitGeneration({
        userId,
        type: config.type,
        inputs,
        params,
      });

      // 8. Успешный ответ
      return NextResponse.json({
        success: true,
        generationId: result.generationId,
        status: result.status,
        cost: result.cost,
      });
    } catch (error) {
      console.error(`[${config.type}] Ошибка:`, error);

      // Обработка специфичных ошибок FASHN API
      if (error instanceof FashnRateLimitError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'RATE_LIMIT',
            retryAfter: error.retryAfter,
          },
          { status: 429 }
        );
      }

      if (error instanceof FashnValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'FASHN_VALIDATION',
          },
          { status: 400 }
        );
      }

      if (error instanceof FashnApiError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'FASHN_API_ERROR',
          },
          { status: error.statusCode >= 500 ? 503 : 400 }
        );
      }

      // Общие ошибки
      const errorMessage =
        error instanceof Error ? error.message : 'Внутренняя ошибка сервера';

      // Специфичные ошибки бизнес-логики
      if (errorMessage.includes('Недостаточно токенов')) {
        return NextResponse.json(
          { success: false, error: errorMessage, code: 'INSUFFICIENT_CREDITS' },
          { status: 402 }
        );
      }

      if (errorMessage.includes('недоступно на вашем тарифе') ||
        errorMessage.includes('Доступ запрещён')) {
        return NextResponse.json(
          { success: false, error: errorMessage, code: 'PLAN_RESTRICTION' },
          { status: 403 }
        );
      }

      if (errorMessage.includes('лимит параллельных генераций')) {
        return NextResponse.json(
          { success: false, error: errorMessage, code: 'CONCURRENCY_LIMIT' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: errorMessage, code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}

// ============================================
// ZOD СХЕМЫ ДЛЯ ОБЩИХ ПАРАМЕТРОВ
// ============================================

/**
 * Схема для S3 ключа
 *
 * Формат: tmp/{userId}/{uuid}.{ext}
 */
export const S3KeySchema = z.string()
  .min(1, 'S3 ключ не может быть пустым')
  .regex(/^tmp\/[a-f0-9-]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i,
    'Невалидный формат S3 ключа');

export const MimeTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']).optional();

export const ResolutionSchema = z.enum(['1k', '4k']).optional();

export const AspectRatioSchema = z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']).optional();

export const NumSamplesSchema = z.number().int().min(1).max(4).optional();

export const PromptSchema = z.string().max(1000).optional();
