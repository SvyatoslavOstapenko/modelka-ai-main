'use server';

/**
 * Главный файл-координатор для всех типов генерации
 *
 * Этот файл служит центральной точкой экспорта для всех генерационных Server Actions.
 * Каждый тип генерации имеет свой отдельный файл со специфической логикой,
 * но использует общую базовую функцию из _core/base-generation.ts
 *
 * ВАЖНО: Типы экспортируются из отдельного файла ./types.ts,
 * так как 'use server' файлы не могут экспортировать type-only exports
 *
 * Архитектура:
 * - types.ts - общие типы для всех генераций
 * - _core/base-generation.ts - универсальная логика (auth, credits, DB, polling)
 * - product-to-model.ts - специфическая логика Product to Model
 * - try-on.ts - специфическая логика Try-On (TODO)
 * - face-to-model.ts - специфическая логика Face to Model (TODO)
 * - и т.д.
 *
 * @module actions/generate
 */

import type { GenerateResult, CheckStatusResult } from './types';
import type { ProductToModelInput } from '@/lib/fashn';
import {
  generateProductToModel,
  checkProductToModelStatus,
} from './product-to-model';

// ============================================
// PRODUCT TO MODEL
// ============================================

/**
 * Server Action: Запуск генерации Product to Model
 */
export async function generateProductToModelAction(
  input: ProductToModelInput
): Promise<GenerateResult> {
  return generateProductToModel(input);
}

/**
 * Server Action: Проверка статуса генерации Product to Model
 */
export async function checkProductToModelStatusAction(
  providerTaskId: string
): Promise<CheckStatusResult> {
  return checkProductToModelStatus(providerTaskId);
}

// ============================================
// TODO: ДРУГИЕ ТИПЫ ГЕНЕРАЦИИ
// ============================================

// Экспорт для Try-On (будет добавлено позже)
// export async function generateTryOnAction(...) {
//   return generateTryOn(...);
// }

// Экспорт для Face to Model (будет добавлено позже)
// export async function generateFaceToModelAction(...) {
//   return generateFaceToModel(...);
// }

// И т.д. для остальных типов генерации
