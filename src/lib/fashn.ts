/**
 * Универсальный FASHN.ai API HTTP-клиент
 *
 * Поддерживает все типы генераций:
 * - Product to Model
 * - Face to Model
 * - Model Create
 * - Model Variation
 * - Model Swap
 * - Edit
 * - Reframe
 * - Image to Video
 * - Background Change
 * - Virtual Try-On (legacy)
 *
 * Документация: https://docs.fashn.ai/
 *
 * @module lib/fashn
 */

import { z } from 'zod';
import type { GenerationType } from '@/db/schema';

// ============================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================

const FASHN_API_BASE_URL = 'https://api.fashn.ai/v1';

/**
 * Маппинг типов генераций на имена моделей FASHN API
 */
export const FASHN_MODEL_NAMES: Record<GenerationType, string> = {
  product_to_model: 'product-to-model',
  face_to_model: 'face-to-model',
  model_create: 'model-create',
  model_variation: 'model-variation',
  model_swap: 'model-swap',
  edit: 'edit',
  reframe: 'reframe',
  image_to_video: 'image-to-video',
  background_change: 'background-change',
  virtual_tryon: 'tryon-v1.6', // Legacy
};

/**
 * API ключ FASHN.ai из переменных окружения
 * @throws {Error} Если ключ не найден
 */
function getFashnApiKey(): string {
  const apiKey = process.env.FASHN_API_KEY;

  if (!apiKey) {
    throw new Error(
      'FASHN_API_KEY не найден в переменных окружения. ' +
      'Добавьте FASHN_API_KEY в файл .env'
    );
  }

  return apiKey;
}

/**
 * Базовый URL для вебхуков
 * @throws {Error} Если URL не задан
 */
function getWebhookBaseUrl(): string {
  const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;

  if (!baseUrl) {
    throw new Error(
      'WEBHOOK_BASE_URL не найден в переменных окружения. ' +
      'Добавьте WEBHOOK_BASE_URL, AUTH_URL или NEXTAUTH_URL в файл .env'
    );
  }

  return baseUrl;
}

// ============================================
// ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ
// ============================================

/**
 * Схема валидации статуса задачи FASHN.ai
 */
const FashnStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed']);

/**
 * Схема валидации категории одежды
 */
export const GarmentCategorySchema = z.enum(['tops', 'bottoms', 'one-pieces', 'auto']);

/**
 * Схема валидации типа фото одежды
 */
export const GarmentPhotoTypeSchema = z.enum(['model', 'flat-lay', 'auto']);

/**
 * Схема валидации режима генерации
 */
export const GenerationModeSchema = z.enum(['performance', 'balanced', 'quality']);

/**
 * Схема валидации разрешения
 */
export const ResolutionSchema = z.enum(['1k', '4k']);

/**
 * Схема валидации разрешения видео
 */
export const VideoResolutionSchema = z.enum(['480p', '720p', '1080p']);

/**
 * Схема валидации длительности видео
 */
export const VideoDurationSchema = z.union([z.literal(5), z.literal(10)]);

/**
 * Схема валидации соотношения сторон
 */
export const AspectRatioSchema = z.enum(['1:1', '3:4', '4:3', '9:16', '16:9', '21:9', '3:2', '2:3', '4:5', '5:4']);

// --- Схемы входных параметров для каждого типа генерации ---

/**
 * Product to Model - товар на модель
 */
export const ProductToModelInputSchema = z.object({
  product_image: z.string().url('product_image должен быть валидным URL'),
  model_image: z.string().url('model_image должен быть валидным URL').optional(),
  face_reference: z.string().url('face_reference должен быть валидным URL').optional(),
  image_prompt: z.string().url('image_prompt должен быть валидным URL').optional(),
  background_reference: z.string().url('background_reference должен быть валидным URL').optional(),
  prompt: z.string().max(500).optional(),
  aspect_ratio: AspectRatioSchema.optional(),
  resolution: ResolutionSchema.default('1k'),
  num_images: z.number().int().min(1).max(4).default(1),
  // Parameters for Virtual Try-On mode (when model_image is present)
  category: GarmentCategorySchema.optional(),
  mode: GenerationModeSchema.optional(),
  garment_photo_type: GarmentPhotoTypeSchema.optional(),
});

/**
 * Face to Model - лицо в аватар модели
 */
export const FaceToModelInputSchema = z.object({
  face_image: z.string().url('face_image должен быть валидным URL'),
  prompt: z.string().max(500).optional(),
  aspect_ratio: AspectRatioSchema.default('3:4'),
  resolution: ResolutionSchema.default('1k'),
});

/**
 * Model Create - создание модели по prompt
 */
export const ModelCreateInputSchema = z.object({
  prompt: z.string().min(1, 'prompt обязателен').max(1000),
  reference_image: z.string().url('reference_image должен быть валидным URL').optional(),
  aspect_ratio: AspectRatioSchema.default('3:4'),
  resolution: ResolutionSchema.default('1k'),
  num_samples: z.number().int().min(1).max(4).default(1),
});

/**
 * Model Variation - вариации модели
 */
export const ModelVariationInputSchema = z.object({
  image: z.string().url('image должен быть валидным URL'),
  prompt: z.string().max(500).optional(),
  num_samples: z.number().int().min(1).max(4).default(1),
});

/**
 * Model Swap - замена модели на фото
 */
export const ModelSwapInputSchema = z.object({
  source_image: z.string().url('source_image должен быть валидным URL'),
  face_reference: z.string().url('face_reference должен быть валидным URL').optional(),
  model_image: z.string().url('model_image должен быть валидным URL').optional(),
});

/**
 * Edit - редактирование изображения
 */
export const EditInputSchema = z.object({
  image: z.string().url('image должен быть валидным URL'),
  prompt: z.string().min(1, 'prompt обязателен для редактирования').max(1000),
  resolution: ResolutionSchema.default('1k'),
});

/**
 * Reframe - изменение кадрирования
 */
export const ReframeInputSchema = z.object({
  image: z.string().url('image должен быть валидным URL'),
  aspect_ratio: AspectRatioSchema,
  prompt: z.string().max(500).optional(),
});

/**
 * Image to Video - изображение в видео
 */
export const ImageToVideoInputSchema = z.object({
  image: z.string().url('image должен быть валидным URL'),
  prompt: z.string().max(500).optional(),
  duration: VideoDurationSchema.default(5),
  resolution: VideoResolutionSchema.default('1080p'),
});

/**
 * Background Change - замена фона
 */
export const BackgroundChangeInputSchema = z.object({
  image: z.string().url('image должен быть валидным URL'),
  background_image: z.string().url('background_image должен быть валидным URL').optional(),
  prompt: z.string().max(500).optional(),
});

/**
 * Virtual Try-On (Legacy) - виртуальная примерка
 */
export const VirtualTryOnInputSchema = z.object({
  model_image: z.string().url('model_image должен быть валидным URL'),
  garment_image: z.string().url('garment_image должен быть валидным URL'),
  category: GarmentCategorySchema.default('auto'),
  garment_photo_type: GarmentPhotoTypeSchema.default('auto'),
  mode: GenerationModeSchema.default('balanced'),
  seed: z.number().int().positive().optional(),
  num_samples: z.number().int().min(1).max(4).default(1),
  moderation_level: z.enum(['conservative', 'permissive', 'none']).default('permissive'),
});

/**
 * Объединённая схема всех типов генераций
 */
export const FashnInputSchemas = {
  product_to_model: ProductToModelInputSchema,
  face_to_model: FaceToModelInputSchema,
  model_create: ModelCreateInputSchema,
  model_variation: ModelVariationInputSchema,
  model_swap: ModelSwapInputSchema,
  edit: EditInputSchema,
  reframe: ReframeInputSchema,
  image_to_video: ImageToVideoInputSchema,
  background_change: BackgroundChangeInputSchema,
  virtual_tryon: VirtualTryOnInputSchema,
} as const;

/**
 * Схема ответа от FASHN.ai API при запуске генерации
 */
const FashnRunResponseSchema = z.object({
  id: z.string().min(1, 'ID задачи не может быть пустым'),
  status: FashnStatusSchema.optional().nullable(),
  error: z.any().optional().nullable(),
});

/**
 * Схема ответа от FASHN.ai API при проверке статуса
 */
const FashnStatusResponseSchema = z.object({
  id: z.string(),
  status: FashnStatusSchema,
  output: z.array(z.string().url()).optional().nullable(),
  error: z.any().optional().nullable(),
  logs: z.string().optional().nullable(),
});

// ============================================
// TYPESCRIPT ТИПЫ
// ============================================

// Входные типы для каждого типа генерации
export type ProductToModelInput = z.input<typeof ProductToModelInputSchema>;
export type FaceToModelInput = z.input<typeof FaceToModelInputSchema>;
export type ModelCreateInput = z.input<typeof ModelCreateInputSchema>;
export type ModelVariationInput = z.input<typeof ModelVariationInputSchema>;
export type ModelSwapInput = z.input<typeof ModelSwapInputSchema>;
export type EditInput = z.input<typeof EditInputSchema>;
export type ReframeInput = z.input<typeof ReframeInputSchema>;
export type ImageToVideoInput = z.input<typeof ImageToVideoInputSchema>;
export type BackgroundChangeInput = z.input<typeof BackgroundChangeInputSchema>;
export type VirtualTryOnInput = z.input<typeof VirtualTryOnInputSchema>;

/**
 * Объединённый тип всех входных параметров
 */
export type FashnInput =
  | ProductToModelInput
  | FaceToModelInput
  | ModelCreateInput
  | ModelVariationInput
  | ModelSwapInput
  | EditInput
  | ReframeInput
  | ImageToVideoInput
  | BackgroundChangeInput
  | VirtualTryOnInput;

/**
 * Ответ от API при запуске задачи
 */
export type FashnRunResponse = z.infer<typeof FashnRunResponseSchema>;

/**
 * Ответ от API при проверке статуса
 */
export type FashnStatusResponse = z.infer<typeof FashnStatusResponseSchema>;

/**
 * Статус задачи FASHN.ai
 */
export type FashnStatus = z.infer<typeof FashnStatusSchema>;

// ============================================
// КАСТОМНЫЕ КЛАССЫ ОШИБОК
// ============================================

/**
 * Базовая ошибка FASHN.ai API
 */
export class FashnApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'FashnApiError';
  }
}

/**
 * Ошибка превышения лимита запросов (HTTP 429)
 */
export class FashnRateLimitError extends FashnApiError {
  constructor(
    message: string = 'Превышен лимит запросов к FASHN.ai API. Попробуйте позже.',
    public retryAfter?: number
  ) {
    super(message, 429);
    this.name = 'FashnRateLimitError';
  }
}

/**
 * Ошибка валидации входных данных (HTTP 400)
 */
export class FashnValidationError extends FashnApiError {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message, 400);
    this.name = 'FashnValidationError';
  }
}

/**
 * Ошибка авторизации (HTTP 401)
 */
export class FashnAuthError extends FashnApiError {
  constructor(message: string = 'Недействительный API ключ FASHN.ai') {
    super(message, 401);
    this.name = 'FashnAuthError';
  }
}

/**
 * Внутренняя ошибка сервера FASHN.ai (HTTP 500+)
 */
export class FashnServerError extends FashnApiError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = 'FashnServerError';
  }
}

/**
 * Ошибка модерации контента
 */
export class FashnContentModerationError extends FashnApiError {
  constructor(message: string = 'Контент не прошёл модерацию') {
    super(message, 400);
    this.name = 'FashnContentModerationError';
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Обработка HTTP ошибок от FASHN.ai API
 */
async function handleFashnApiError(response: Response): Promise<never> {
  const statusCode = response.status;
  let errorData: unknown;

  try {
    errorData = await response.json();
  } catch {
    errorData = await response.text();
  }

  // Извлечение сообщения об ошибке
  let errorMessage = 'Неизвестная ошибка FASHN.ai API';

  if (typeof errorData === 'object' && errorData !== null) {
    const data = errorData as Record<string, unknown>;

    if (typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (typeof data.message === 'string') {
      errorMessage = data.message;
    } else if (typeof data.detail === 'string') {
      errorMessage = data.detail;
    }

    // Проверка на ошибку модерации контента
    if (errorMessage.toLowerCase().includes('content moderation') ||
      errorMessage.toLowerCase().includes('moderation')) {
      throw new FashnContentModerationError(errorMessage);
    }
  } else if (typeof errorData === 'string') {
    errorMessage = errorData;
  }

  // Специфичные ошибки по статус-коду
  switch (statusCode) {
    case 400:
      throw new FashnValidationError(
        errorMessage || 'Невалидные входные параметры',
        typeof errorData === 'object' ? (errorData as Record<string, string[]>) : undefined
      );

    case 401:
      throw new FashnAuthError(errorMessage);

    case 429: {
      const retryAfter = response.headers.get('Retry-After');
      throw new FashnRateLimitError(
        errorMessage,
        retryAfter ? parseInt(retryAfter, 10) : undefined
      );
    }

    case 500:
    case 502:
    case 503:
    case 504:
      throw new FashnServerError(
        errorMessage || 'Внутренняя ошибка сервера FASHN.ai',
        statusCode
      );

    default:
      throw new FashnApiError(errorMessage, statusCode, errorData);
  }
}

/**
 * Выполнение HTTP запроса к FASHN.ai API
 */
async function fashnFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getFashnApiKey();
  const url = `${FASHN_API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    await handleFashnApiError(response);
  }

  return response.json();
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ API
// ============================================

/**
 * Универсальная функция запуска генерации
 *
 * @param generationType - Тип генерации
 * @param params - Параметры (зависят от типа)
 * @param webhookToken - Секретный токен для вебхука
 * @returns Promise с ID задачи
 *
 * @example
 * ```typescript
 * const { id } = await runGeneration('product_to_model', {
 *   product_image: 'https://...',
 *   model_image: 'https://...',
 * }, 'webhook-token-123');
 * ```
 */
export async function runGeneration(
  generationType: GenerationType,
  params: FashnInput,
  webhookToken: string
): Promise<{ id: string }> {
  // Получаем схему валидации для данного типа
  const schema = FashnInputSchemas[generationType];
  if (!schema) {
    throw new FashnValidationError(`Неизвестный тип генерации: ${generationType}`);
  }

  // Валидация входных параметров
  const validatedParams = schema.parse(params);

  // Получаем имя модели FASHN для данного типа
  const modelName = FASHN_MODEL_NAMES[generationType];

  // Формирование webhook URL
  const webhookBaseUrl = getWebhookBaseUrl();
  const webhookUrl = `${webhookBaseUrl}/api/webhooks/fashn?token=${encodeURIComponent(webhookToken)}`;

  console.log(`[runGeneration] Type: ${generationType}, Model: ${modelName}, Webhook: ${webhookUrl}`);

  // Формирование payload согласно спецификации FASHN API
  const payload = {
    model_name: modelName,
    inputs: validatedParams,
    webhook_url: webhookUrl,
  };

  // Выполнение запроса
  const response = await fashnFetch<FashnRunResponse>('/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Валидация ответа
  const validatedResponse = FashnRunResponseSchema.parse(response);

  // Проверка на немедленную ошибку
  // Проверка на немедленную ошибку
  if (validatedResponse.error) {
    const errorMsg = typeof validatedResponse.error === 'string'
      ? validatedResponse.error
      : JSON.stringify(validatedResponse.error);

    throw new FashnApiError(
      errorMsg,
      400,
      validatedResponse
    );
  }

  return { id: validatedResponse.id };
}

/**
 * Получение статуса задачи генерации (Lazy Sync)
 *
 * @param taskId - ID задачи от FASHN.ai
 * @returns Promise со статусом и результатами
 */
export async function getTaskStatus(taskId: string): Promise<FashnStatusResponse> {
  if (!taskId || typeof taskId !== 'string') {
    throw new FashnValidationError('taskId должен быть непустой строкой');
  }

  const response = await fashnFetch<FashnStatusResponse>(
    `/status/${encodeURIComponent(taskId)}`,
    { method: 'GET' }
  );

  return FashnStatusResponseSchema.parse(response);
}

// ============================================
// СПЕЦИФИЧНЫЕ ФУНКЦИИ ДЛЯ КАЖДОГО ТИПА
// ============================================

/**
 * Product to Model - товар на модель
 */
export async function runProductToModel(
  params: ProductToModelInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('product_to_model', params, webhookToken);
}

/**
 * Face to Model - лицо в аватар
 */
export async function runFaceToModel(
  params: FaceToModelInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('face_to_model', params, webhookToken);
}

/**
 * Model Create - создание модели
 */
export async function runModelCreate(
  params: ModelCreateInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('model_create', params, webhookToken);
}

/**
 * Model Variation - вариации модели
 */
export async function runModelVariation(
  params: ModelVariationInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('model_variation', params, webhookToken);
}

/**
 * Model Swap - замена модели
 */
export async function runModelSwap(
  params: ModelSwapInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('model_swap', params, webhookToken);
}

/**
 * Edit - редактирование изображения
 */
export async function runEdit(
  params: EditInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('edit', params, webhookToken);
}

/**
 * Reframe - изменение кадрирования
 */
export async function runReframe(
  params: ReframeInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('reframe', params, webhookToken);
}

/**
 * Image to Video - изображение в видео
 */
export async function runImageToVideo(
  params: ImageToVideoInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('image_to_video', params, webhookToken);
}

/**
 * Background Change - замена фона
 */
export async function runBackgroundChange(
  params: BackgroundChangeInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('background_change', params, webhookToken);
}

/**
 * Virtual Try-On (Legacy) - виртуальная примерка
 */
export async function runVirtualTryOn(
  params: VirtualTryOnInput,
  webhookToken: string
): Promise<{ id: string }> {
  return runGeneration('virtual_tryon', params, webhookToken);
}

// ============================================
// УТИЛИТАРНЫЕ ФУНКЦИИ
// ============================================

/**
 * Проверка доступности FASHN.ai API
 */
export async function checkFashnApiHealth(): Promise<boolean> {
  try {
    const apiKey = getFashnApiKey();
    const response = await fetch(`${FASHN_API_BASE_URL}/status/health-check-dummy`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    // Даже 404 означает что API доступен
    return response.status !== 401;
  } catch {
    return false;
  }
}

/**
 * Маппинг статусов FASHN.ai на статусы в нашей БД
 */
export function mapFashnStatusToDbStatus(
  fashnStatus: FashnStatus
): 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' {
  switch (fashnStatus) {
    case 'queued':
      return 'QUEUED';
    case 'processing':
      return 'PROCESSING';
    case 'completed':
      return 'COMPLETED';
    case 'failed':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

/**
 * Извлечение URL результатов из ответа
 */
export function extractResultUrls(response: FashnStatusResponse): string[] {
  if (response.status === 'completed' && response.output && response.output.length > 0) {
    return response.output;
  }
  return [];
}

/**
 * Извлечение URL первого результата
 */
export function extractFirstResultUrl(response: FashnStatusResponse): string | null {
  const urls = extractResultUrls(response);
  return urls.length > 0 ? urls[0] : null;
}

/**
 * Расчёт стоимости генерации в кредитах
 */
export function calculateGenerationCost(
  generationType: GenerationType,
  params: FashnInput
): number {
  // Базовая стоимость
  let cost = 1;

  // Специфичные модификаторы
  switch (generationType) {
    case 'product_to_model':
      // face_reference увеличивает стоимость до 4 кредитов
      if ('face_reference' in params && params.face_reference) {
        cost = 4;
      }
      break;

    case 'face_to_model':
      // Создание аватара дороже
      cost = 4;
      break;

    case 'model_swap':
      // Если используется face_reference
      if ('face_reference' in params && params.face_reference) {
        cost = 4;
      } else {
        cost = 2;
      }
      break;

    case 'image_to_video':
      // Стоимость зависит от длительности и разрешения
      const videoParams = params as ImageToVideoInput;
      const duration = videoParams.duration || 5;
      const resolution = videoParams.resolution || '1080p';

      // Базовая стоимость по разрешению (5 сек)
      const resolutionCosts: Record<string, number> = {
        '480p': 1,
        '720p': 3,
        '1080p': 6,
      };
      cost = resolutionCosts[resolution] || 1;

      // Множитель для 10 секунд
      if (duration === 10) {
        cost *= 2;
      }
      break;

    default:
      cost = 1;
  }

  // Множитель за количество результатов (если поддерживается)
  // product_to_model использует num_images вместо num_samples
  if (generationType === 'product_to_model' && 'num_images' in params && params.num_images && params.num_images > 1) {
    cost *= params.num_images;
  } else if ('num_samples' in params && params.num_samples && params.num_samples > 1) {
    cost *= params.num_samples;
  }

  return cost;
}

/**
 * Проверка доступности типа генерации для плана
 */
export function isGenerationTypeAllowed(
  generationType: GenerationType,
  planFeatures: {
    allowVideo: boolean;
    allowCustomModel: boolean;
    allow4k: boolean;
  }
): { allowed: boolean; reason?: string } {
  // Face to Model требует allowCustomModel
  if (generationType === 'face_to_model' && !planFeatures.allowCustomModel) {
    return {
      allowed: false,
      reason: 'Создание собственных моделей недоступно на вашем тарифе',
    };
  }

  // Image to Video требует allowVideo
  if (generationType === 'image_to_video' && !planFeatures.allowVideo) {
    return {
      allowed: false,
      reason: 'Генерация видео недоступна на вашем тарифе',
    };
  }

  return { allowed: true };
}
