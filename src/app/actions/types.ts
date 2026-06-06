/**
 * Общие типы для генерационных actions
 *
 * Отдельный файл для типов, так как 'use server' файлы
 * не могут экспортировать type-only exports
 */

import type { ErrorCode } from '@/types/errors';

/**
 * Тип генерации (соответствует generationTypeEnum в DB schema)
 */
export type GenerationType =
  | 'product_to_model'
  | 'face_to_model'
  | 'model_create'
  | 'model_variation'
  | 'model_swap'
  | 'edit'
  | 'reframe'
  | 'image_to_video'
  | 'background_change'
  | 'virtual_tryon';

/**
 * Результат генерации
 */
export type GenerateResult =
  | { success: true; taskId: string; generationId: string }
  | { success: false; errorCode: ErrorCode; message?: string };

/**
 * Результат проверки статуса
 */
export type CheckStatusResult =
  | {
      success: true;
      status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
      progress?: number;
      output?: string[];
      errorCode?: ErrorCode;
    }
  | { success: false; errorCode: ErrorCode };

/**
 * Результат валидации плана
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; errorCode: ErrorCode; message: string };

/**
 * Данные пользователя для валидации
 */
export interface UserData {
  id: string;
  credits: number;
  planCode: string;
}
