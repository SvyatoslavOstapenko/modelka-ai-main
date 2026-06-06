/**
 * POST /api/generations/:id/sync
 *
 * Принудительная синхронизация статуса генерации с FASHN API.
 * Используется когда webhook не был доставлен.
 *
 * @module api/generations/[id]/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { generations, generationAssets } from '@/db/schema';
import { syncGenerationStatus } from '@/services/generationService';

// ============================================
// POST HANDLER
// ============================================

/**
 * POST /api/generations/:id/sync
 *
 * Синхронизирует статус генерации с провайдером.
 * Полезно когда webhook не доставлен или статус устарел.
 *
 * Responses:
 * - 200: Синхронизация успешна
 * - 401: Не авторизован
 * - 403: Нет доступа к генерации
 * - 404: Генерация не найдена
 * - 400: Генерация уже завершена / нет provider_task_id
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Авторизация
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Получаем генерацию
    const generation = await db.query.generations.findFirst({
      where: eq(generations.id, id),
    });

    if (!generation) {
      return NextResponse.json(
        { error: 'Генерация не найдена' },
        { status: 404 }
      );
    }

    // Проверяем ownership
    if (generation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Доступ запрещён' },
        { status: 403 }
      );
    }

    // Проверяем, нужна ли синхронизация
    if (generation.status === 'COMPLETED' || generation.status === 'FAILED') {
      // Уже завершена - возвращаем текущий статус
      let outputs: string[] = [];

      if (generation.status === 'COMPLETED') {
        const outputAssets = await db.query.generationAssets.findMany({
          where: eq(generationAssets.generationId, id),
          with: { asset: true },
        });

        outputs = outputAssets
          .filter((a) => a.direction === 'output')
          .map((a) => a.asset.url);
      }

      return NextResponse.json({
        status: generation.status,
        alreadyCompleted: true,
        outputs,
      });
    }

    // Проверяем наличие provider_task_id
    if (!generation.providerTaskId) {
      return NextResponse.json(
        { error: 'Генерация ещё не была отправлена в API' },
        { status: 400 }
      );
    }

    // Выполняем синхронизацию
    console.log(`[Sync] Синхронизация генерации ${id}`);
    const result = await syncGenerationStatus(id);

    return NextResponse.json({
      status: result.status,
      synced: true,
      outputs: result.outputs || [],
    });

  } catch (error) {
    console.error('[POST /api/generations/:id/sync] Ошибка:', error);

    return NextResponse.json(
      {
        error: 'Ошибка синхронизации',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      },
      { status: 500 }
    );
  }
}
