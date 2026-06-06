/**
 * GET /api/generations/:id
 *
 * Получение статуса и деталей генерации.
 * Возвращает полную информацию о генерации, включая входные/выходные ассеты.
 *
 * @module api/generations/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { generations, generationAssets, generationEvents } from '@/db/schema';

// ============================================
// ТИПЫ ОТВЕТА
// ============================================

interface GenerationAssetResponse {
  id: string;
  url: string;
  role: string;
  direction: 'input' | 'output';
}

interface GenerationEventResponse {
  eventType: string;
  message: string | null;
  createdAt: string;
}

interface GenerationResponse {
  id: string;
  type: string;
  status: string;
  cost: number;
  params: Record<string, unknown>;
  errorReason: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  assets: {
    inputs: GenerationAssetResponse[];
    outputs: GenerationAssetResponse[];
  };
  events?: GenerationEventResponse[];
}

// ============================================
// GET HANDLER
// ============================================

/**
 * GET /api/generations/:id
 *
 * Возвращает информацию о генерации.
 *
 * Query params:
 * - includeEvents=true - включить историю событий
 *
 * Responses:
 * - 200: Генерация найдена
 * - 401: Не авторизован
 * - 403: Нет доступа к генерации
 * - 404: Генерация не найдена
 */
export async function GET(
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
    const includeEvents = req.nextUrl.searchParams.get('includeEvents') === 'true';

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

    // Получаем связанные ассеты
    const relatedAssets = await db.query.generationAssets.findMany({
      where: eq(generationAssets.generationId, id),
      with: {
        asset: true,
      },
      orderBy: (ga, { asc }) => [asc(ga.sortOrder)],
    });

    // Разделяем на inputs и outputs
    const inputs: GenerationAssetResponse[] = [];
    const outputs: GenerationAssetResponse[] = [];

    for (const ga of relatedAssets) {
      const assetResponse: GenerationAssetResponse = {
        id: ga.asset.id,
        url: ga.asset.url,
        role: ga.role,
        direction: ga.direction,
      };

      if (ga.direction === 'input') {
        inputs.push(assetResponse);
      } else {
        outputs.push(assetResponse);
      }
    }

    // Формируем базовый ответ
    const response: GenerationResponse = {
      id: generation.id,
      type: generation.type,
      status: generation.status,
      cost: generation.cost,
      params: (generation.params as Record<string, unknown>) || {},
      errorReason: generation.errorReason,
      createdAt: generation.createdAt.toISOString(),
      completedAt: generation.completedAt?.toISOString() || null,
      durationMs: generation.durationMs,
      assets: {
        inputs,
        outputs,
      },
    };

    // Опционально добавляем события
    if (includeEvents) {
      const events = await db.query.generationEvents.findMany({
        where: eq(generationEvents.generationId, id),
        orderBy: (ge, { desc }) => [desc(ge.createdAt)],
        limit: 50,
      });

      response.events = events.map((e) => ({
        eventType: e.eventType,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      }));
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[GET /api/generations/:id] Ошибка:', error);

    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      },
      { status: 500 }
    );
  }
}
