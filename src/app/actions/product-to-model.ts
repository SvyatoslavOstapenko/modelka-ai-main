/**
 * Product to Model - Специфическая логика
 *
 * Этот файл НЕ содержит 'use server' директиву.
 * Server Actions определяются в generate.ts, который импортирует функции отсюда.
 */

import {
  executeGeneration,
  checkGenerationStatus,
  signIfInternalUrl,
} from './_core/base-generation';
import type {
  GenerateResult,
  CheckStatusResult,
  UserData,
  ValidationResult,
} from './types';
import { runProductToModel, type ProductToModelInput } from '@/lib/fashn';

// ============================================
// PRODUCT TO MODEL - СПЕЦИФИЧЕСКАЯ ЛОГИКА
// ============================================

/**
 * Расчёт стоимости для Product to Model
 *
 * Базовая стоимость: 1 кредит
 * С face_reference: 4 кредита
 * Умножается на num_images (количество генерируемых изображений)
 */
function calculateProductToModelCost(
  input: ProductToModelInput
): number {
  const baseCost = input.face_reference ? 4 : 1;
  const numImages = input.num_images ?? 1;
  return baseCost * numImages;
}

/**
 * Валидация ограничений плана для Product to Model
 *
 * Проверяет:
 * - 4K доступно только для seller/brand
 * - face_reference доступен только для seller/brand
 * - num_images > 1 доступно только для seller/brand
 */
function validateProductToModelPlan(
  input: ProductToModelInput,
  user: UserData
): ValidationResult {
  const isPremiumPlan = ['seller', 'brand'].includes(user.planCode);

  // Проверка 4K разрешения
  if (input.resolution === '4k' && !isPremiumPlan) {
    return {
      valid: false,
      errorCode: 'PLAN_RESTRICTION',
      message: '4K разрешение доступно начиная с пакета Seller. Обновите ваш пакет для доступа к этой функции.',
    };
  }

  // Проверка face_reference
  if (input.face_reference && !isPremiumPlan) {
    return {
      valid: false,
      errorCode: 'PLAN_RESTRICTION',
      message: 'Референс лица доступен начиная с пакета Seller. Обновите ваш пакет для доступа к этой функции.',
    };
  }

  // Проверка множественной генерации
  if ((input.num_images ?? 1) > 1 && !isPremiumPlan) {
    return {
      valid: false,
      errorCode: 'PLAN_RESTRICTION',
      message: 'Генерация нескольких изображений доступна начиная с пакета Seller. Обновите ваш пакет для доступа к этой функции.',
    };
  }

  return { valid: true };
}

/**
 * Подготовка входных данных для FASHN API
 *
 * Конвертирует S3 ключи в presigned URLs для доступа FASHN
 */
async function prepareProductToModelInputs(
  input: ProductToModelInput
): Promise<ProductToModelInput> {
  console.log('[prepareProductToModelInputs] Preparing inputs for FASHN');

  const signedInput: ProductToModelInput = {
    ...input,
    product_image: (await signIfInternalUrl(input.product_image))!,
    model_image: await signIfInternalUrl(input.model_image),
    face_reference: await signIfInternalUrl(input.face_reference),
    image_prompt: await signIfInternalUrl(input.image_prompt),
    background_reference: await signIfInternalUrl(input.background_reference),
  };

  console.log('[prepareProductToModelInputs] Inputs prepared');
  return signedInput;
}

/**
 * Вызов FASHN API для Product to Model
 */
async function callProductToModelApi(
  inputs: Record<string, unknown>,
  webhookToken: string
): Promise<{ id: string }> {
  return runProductToModel(inputs as ProductToModelInput, webhookToken);
}

// ============================================
// ПУБЛИЧНЫЕ ФУНКЦИИ
// ============================================

/**
 * Запуск генерации Product to Model
 *
 * @param input - Входные данные для генерации
 * @returns Результат запуска генерации
 *
 * @example
 * ```typescript
 * const result = await generateProductToModel({
 *   product_image: 'https://storage.../product.jpg',
 *   model_image: 'https://storage.../model.jpg',
 *   prompt: 'elegant photoshoot',
 *   aspect_ratio: '3:4',
 *   resolution: '1k',
 *   num_images: 2,
 * });
 *
 * if (result.success) {
 *   console.log('Task ID:', result.taskId);
 *   console.log('Generation ID:', result.generationId);
 * }
 * ```
 */
export async function generateProductToModel(
  input: ProductToModelInput
): Promise<GenerateResult> {
  return executeGeneration({
    type: 'product_to_model',
    input,
    calculateCost: calculateProductToModelCost,
    validatePlanRestrictions: validateProductToModelPlan,
    prepareInputs: prepareProductToModelInputs,
    callFashnApi: callProductToModelApi,
  });
}

/**
 * Проверка статуса генерации Product to Model
 *
 * @param providerTaskId - ID задачи в FASHN
 * @returns Результат проверки статуса
 *
 * @example
 * ```typescript
 * const status = await checkProductToModelStatus('task_123');
 *
 * if (status.success && status.status === 'COMPLETED') {
 *   console.log('Results:', status.output);
 * }
 * ```
 */
export async function checkProductToModelStatus(
  providerTaskId: string
): Promise<CheckStatusResult> {
  return checkGenerationStatus(providerTaskId);
}
