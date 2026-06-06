/**
 * GET /api/cron/cleanup
 *
 * Cron job для очистки устаревших данных.
 * Запускается ежедневно.
 *
 * Выполняет:
 * 1. Удаление истёкших result ассетов (expires_at < now)
 * 2. Обработка зависших PENDING генераций (timeout > 15 мин)
 * 3. (опционально) Очистка tmp uploads (основная очистка через S3 Lifecycle)
 *
 * Безопасность:
 * - Требует Authorization: Bearer <CRON_SECRET>
 *
 * @module api/cron/cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  cleanupExpiredAssets,
  cleanupStalePendingGenerations,
  cleanupTmpUploads,
} from '@/services/generationService';

export async function GET(req: NextRequest) {
    // Проверка авторизации (CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const startTime = Date.now();
        console.log('[Cron] Start cleanup...');

        // Запускаем параллельно
        const [expiredResult, staleResult, tmpResult] = await Promise.all([
            cleanupExpiredAssets(),
            cleanupStalePendingGenerations(),
            cleanupTmpUploads(),
        ]);

        const duration = Date.now() - startTime;
        console.log(`[Cron] Cleanup completed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            durationMs: duration,
            stats: {
                expiredAssetsDeleted: expiredResult.deletedCount,
                stalePendingGenerationsFailed: staleResult.failedCount,
                tmpUploadsDeleted: tmpResult.deletedCount,
            },
        });
    } catch (error) {
        console.error('[Cron] Cleanup failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
