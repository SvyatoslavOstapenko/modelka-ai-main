/**
 * Zod-схемы для валидации виртуальной примерки
 *
 * Используется для:
 * - Валидации формы на клиенте (React Hook Form)
 * - Валидации Server Actions на сервере
 * - Генерации TypeScript типов
 *
 * @see web/docs/Архитектура интеграции Fashn.ai Virtual Try-On.md
 */

import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

/**
 * Категория одежды
 * @see https://docs.fashn.ai/api-reference/virtual-try-on#category
 */
export const garmentCategorySchema = z.enum(['tops', 'bottoms', 'one-pieces', 'auto']);

/**
 * Тип фотографии одежды
 * - model: одежда на человеке
 * - flat-lay: одежда на манекене/без человека
 * - auto: автоматическое определение
 */
export const garmentPhotoTypeSchema = z.enum(['model', 'flat-lay', 'auto']);

/**
 * Режим генерации (влияет на качество и скорость)
 * - performance: ~5-10s, низкое качество
 * - balanced: ~15s, среднее качество (по умолчанию)
 * - quality: ~30s, максимальное качество
 */
export const generationModeSchema = z.enum(['performance', 'balanced', 'quality']);

// ============================================
// ОСНОВНАЯ СХЕМА ГЕНЕРАЦИИ
// ============================================

/**
 * Схема запроса генерации виртуальной примерки
 *
 * Используется в:
 * - React Hook Form (клиент)
 * - Server Action generateTryOnAction (сервер)
 */
export const generateTryOnSchema = z.object({
  // ========================================
  // ОБЯЗАТЕЛЬНЫЕ ПОЛЯ
  // ========================================

  /**
   * S3 ключ фотографии модели (человека)
   * Пример: "raw-uploads/user-123/model-abc.jpg"
   */
  modelImageS3Key: z.string().min(1, 'Фото модели обязательно'),

  /**
   * S3 ключ фотографии одежды
   * Пример: "raw-uploads/user-123/garment-xyz.jpg"
   */
  garmentImageS3Key: z.string().min(1, 'Фото одежды обязательно'),

  // ========================================
  // ПАРАМЕТРЫ ОДЕЖДЫ
  // ========================================

  /**
   * Категория одежды
   * Рекомендуется выбирать явно (не auto), особенно для платьев
   */
  category: garmentCategorySchema.default('auto'),

  /**
   * Тип фотографии одежды
   * ВАЖНО: неправильное значение ухудшает результат
   */
  garmentPhotoType: garmentPhotoTypeSchema.default('auto'),

  // ========================================
  // ПАРАМЕТРЫ ГЕНЕРАЦИИ
  // ========================================

  /**
   * Режим качества генерации
   * @default 'balanced'
   */
  mode: generationModeSchema.default('balanced'),

  // ========================================
  // ОПЦИИ (ФЛАГИ)
  // ========================================

  /**
   * Дорисовывать руки, если они закрывают одежду
   * Включать для одежды с длинным рукавом
   * @default false
   */
  adjustHands: z.boolean().default(false),

  /**
   * Позволить одежде закрывать обувь/ноги
   * Актуально для длинных платьев, юбок в пол
   * Показывать только для category = 'one-pieces' | 'bottoms'
   * @default false
   */
  coverFeet: z.boolean().default(false),

  /**
   * Сохранить фон оригинального фото
   * Увеличивает время генерации
   * @default false
   */
  restoreBackground: z.boolean().default(false),

  /**
   * NSFW фильтр (всегда включен для безопасности бренда)
   * Не показывается пользователю, всегда true на бэкенде
   * @default true
   */
  nsfwFilter: z.boolean().default(true),
});

// ============================================
// TYPE EXPORTS
// ============================================

/**
 * Input-тип для формы (поля с .default() являются optional)
 * Используется в React Hook Form
 */
export type GenerateTryOnInput = z.input<typeof generateTryOnSchema>;

/**
 * Output-тип для API (после применения .default() все поля required)
 * Используется в Server Actions
 */
export type GenerateTryOnSchema = z.output<typeof generateTryOnSchema>;

export type GarmentCategory = z.infer<typeof garmentCategorySchema>;
export type GarmentPhotoType = z.infer<typeof garmentPhotoTypeSchema>;
export type GenerationMode = z.infer<typeof generationModeSchema>;

// ============================================
// ERROR MESSAGES MAPPING
// ============================================

/**
 * Маппинг кодов ошибок Fashn.ai на пользовательские сообщения
 * @see web/docs/Архитектура интеграции Fashn.ai Virtual Try-On.md (раздел 9)
 */
export const FASHN_ERROR_MESSAGES: Record<string, string> = {
  NSFW_DETECTED: 'Изображение отклонено системой безопасности. Пожалуйста, используйте другое фото.',
  'No Face Detected': 'Лицо не найдено на фото. Загрузите фото человека анфас (хотя бы по пояс).',
  ImageLoadError: 'Не удалось загрузить ваши исходные изображения. Попробуйте еще раз.',
  'Too Many Requests': 'Высокая нагрузка на сервис. Попробуйте через минуту.',
  'Internal Error': 'Сервис временно недоступен. Попробуйте позже.',
};

/**
 * Получить user-friendly сообщение об ошибке
 */
export function getFashnErrorMessage(errorReason: string | null | undefined): string {
  if (!errorReason) {
    return 'Неизвестная ошибка генерации';
  }

  // Проверяем точные совпадения
  if (FASHN_ERROR_MESSAGES[errorReason]) {
    return FASHN_ERROR_MESSAGES[errorReason];
  }

  // Проверяем частичные совпадения
  for (const [key, message] of Object.entries(FASHN_ERROR_MESSAGES)) {
    if (errorReason.includes(key)) {
      return message;
    }
  }

  // Фолбэк
  return `Ошибка: ${errorReason}`;
}
