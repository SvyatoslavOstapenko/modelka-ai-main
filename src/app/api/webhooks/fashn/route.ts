/**
 * POST /api/webhooks/fashn
 *
 * Webhook handler для получения результатов от FASHN.ai API.
 *
 * Безопасность:
 * - Токен аутентификации в URL: ?token=<webhookToken>
 * - Токен генерируется уникально для каждой генерации
 * - Проверка соответствия token ↔ generation.webhookToken
 *
 * Идемпотентность:
 * - Проверка статуса генерации перед обработкой
 * - Если COMPLETED/FAILED → 200 OK без повторной обработки
 * - Финализация через generationService
 *
 * @module api/webhooks/fashn
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { generations, generationEvents } from '@/db/schema';
import { finalizeResult, handleFailure } from '@/services/generationService';
import { mapFashnStatusToDbStatus } from '@/lib/fashn';

// ============================================
// ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ
// ============================================

/**
 * Схема валидации тела вебхука от FASHN.ai
 */
const FashnWebhookSchema = z.object({
  id: z.string().min(1, 'ID задачи обязателен'),
  status: z.enum(['completed', 'failed', 'starting', 'processing', 'canceled']),
  output: z.union([
    z.array(z.string().url()),
    z.string().url(),
  ]).optional(),
  error: z.union([
    z.object({ message: z.string() }),
    z.string(),
  ]).optional(),
});

type FashnWebhookPayload = z.infer<typeof FashnWebhookSchema>;

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Извлечение сообщения об ошибке из webhook payload
 */
function extractErrorMessage(error: FashnWebhookPayload['error']): string {
  if (!error) return 'Неизвестная ошибка';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) return error.message;
  return 'Неизвестная ошибка';
}

/**
 * Извлечение output URLs из разных форматов
 */
function extractOutputUrls(output: FashnWebhookPayload['output']): string[] {
  if (!output) return [];
  if (Array.isArray(output)) return output;
  return [output];
}

// ============================================
// WEBHOOK HANDLER
// ============================================

/**
 * POST /api/webhooks/fashn?token=<webhookToken>
 *
 * Обрабатывает уведомления от FASHN.ai о статусе генерации.
 *
 * Безопасность:
 * - Токен из URL query проверяется против generation.webhookToken
 * - Защита от подмены результатов сторонними запросами
 *
 * Идемпотентность:
 * - Проверка текущего статуса генерации
 * - Если уже COMPLETED/FAILED → 200 OK без повторной обработки
 *
 * @param req - NextRequest с query параметром token
 * @returns NextResponse с результатом обработки
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ========================================
    // ШАГ 1: ВАЛИДАЦИЯ ТОКЕНА
    // ========================================

    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      console.error('[Webhook] Токен отсутствует в URL');
      return NextResponse.json(
        { error: 'Токен аутентификации отсутствует' },
        { status: 401 }
      );
    }

    // ========================================
    // ШАГ 2: ПАРСИНГ И ВАЛИДАЦИЯ ТЕЛА
    // ========================================

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      console.error('[Webhook] Невалидный JSON');
      return NextResponse.json(
        { error: 'Невалидный JSON в теле запроса' },
        { status: 400 }
      );
    }

    const parseResult = FashnWebhookSchema.safeParse(body);

    if (!parseResult.success) {
      console.error('[Webhook] Валидация провалилась:', parseResult.error.format());
      return NextResponse.json(
        {
          error: 'Невалидная структура webhook payload',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const providerTaskId = payload.id;

    console.log(`[Webhook] Получен: task=${providerTaskId}, status=${payload.status}`);

    // ========================================
    // ШАГ 3: ПОИСК ГЕНЕРАЦИИ В БД
    // ========================================

    const generation = await db.query.generations.findFirst({
      where: eq(generations.providerTaskId, providerTaskId),
    });

    if (!generation) {
      console.error(`[Webhook] Генерация не найдена: ${providerTaskId}`);
      return NextResponse.json(
        { error: 'Генерация не найдена' },
        { status: 404 }
      );
    }

    // ========================================
    // ШАГ 4: ПРОВЕРКА ТОКЕНА БЕЗОПАСНОСТИ
    // ========================================

    if (generation.webhookToken !== token) {
      console.error(
        `[Webhook] SECURITY ALERT: неверный токен для ${providerTaskId}. ` +
        `Ожидалось: ${generation.webhookToken?.slice(0, 8)}..., получено: ${token.slice(0, 8)}...`
      );

      // Записываем событие безопасности
      await db.insert(generationEvents).values({
        generationId: generation.id,
        eventType: 'WEBHOOK_RECEIVED',
        payload: { error: 'INVALID_TOKEN', receivedTokenPrefix: token.slice(0, 8) },
        message: 'Webhook отклонён: недействительный токен',
      });

      return NextResponse.json(
        { error: 'Недействительный токен аутентификации' },
        { status: 403 }
      );
    }

    // ========================================
    // ШАГ 5: ПРОВЕРКА ИДЕМПОТЕНТНОСТИ
    // ========================================

    if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
      console.log(
        `[Webhook] Генерация ${generation.id} уже обработана (${generation.status})`
      );

      return NextResponse.json(
        {
          message: 'Already processed',
          status: generation.status,
        },
        { status: 200 }
      );
    }

    // ========================================
    // ШАГ 6: ЗАПИСЬ СОБЫТИЯ WEBHOOK
    // ========================================

    await db.insert(generationEvents).values({
      generationId: generation.id,
      eventType: 'WEBHOOK_RECEIVED',
      payload: { status: payload.status, hasOutput: !!payload.output, hasError: !!payload.error },
      message: `Webhook получен: ${payload.status}`,
    });

    // ========================================
    // ШАГ 7: ОБРАБОТКА ПО СТАТУСУ
    // ========================================

    switch (payload.status) {
      case 'completed': {
        const outputUrls = extractOutputUrls(payload.output);

        if (outputUrls.length === 0) {
          console.error(`[Webhook] Нет output URLs для completed статуса`);
          await handleFailure(generation.id, 'Результаты отсутствуют в ответе');
        } else {
          console.log(`[Webhook] Финализация с ${outputUrls.length} результатами`);
          await finalizeResult(generation.id, outputUrls);
        }
        break;
      }

      case 'failed': {
        const errorMessage = extractErrorMessage(payload.error);
        console.log(`[Webhook] Обработка ошибки: ${errorMessage}`);
        await handleFailure(generation.id, errorMessage);
        break;
      }

      case 'starting':
      case 'processing': {
        // Промежуточные статусы - обновляем статус в БД
        const fashnStatus = payload.status === 'starting' ? 'queued' : payload.status;
        const dbStatus = mapFashnStatusToDbStatus(fashnStatus);
        console.log(`[Webhook] Промежуточный статус: ${payload.status} → ${dbStatus}`);

        await db
          .update(generations)
          .set({ status: dbStatus })
          .where(eq(generations.id, generation.id));
        break;
      }

      case 'canceled': {
        console.log(`[Webhook] Генерация отменена`);
        await handleFailure(generation.id, 'Генерация отменена провайдером');
        break;
      }

      default: {
        console.warn(`[Webhook] Неизвестный статус: ${payload.status}`);
        break;
      }
    }

    // ========================================
    // ШАГ 8: УСПЕШНЫЙ ОТВЕТ
    // ========================================

    const duration = Date.now() - startTime;
    console.log(`[Webhook] Обработан ${generation.id} за ${duration}ms`);

    return NextResponse.json(
      {
        success: true,
        generationId: generation.id,
        status: payload.status,
        processingTimeMs: duration,
      },
      { status: 200 }
    );

  } catch (error) {
    // ========================================
    // ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК
    // ========================================

    console.error('[Webhook] Необработанная ошибка:', error);

    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      },
      { status: 500 }
    );
  }
}
