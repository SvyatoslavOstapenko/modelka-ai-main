/**
 * POST /api/assets/upload
 *
 * Генерирует presigned URL для загрузки файла в S3 (tmp/ директория)
 *
 * ВАЖНО: НЕ создаёт записи в БД!
 * Uploads хранятся только в S3 с автоматической очисткой через Lifecycle Policy (≤24ч).
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { getPresignedUploadUrl } from '@/lib/storage';
import { nanoid } from 'nanoid';

// ============================================
// SCHEMA
// ============================================

const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/),
  // assetType больше не нужен, все uploads идут в tmp/
});

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Невалидный JSON' },
        { status: 400 }
      );
    }

    const parseResult = UploadRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Ошибка валидации',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fileName, fileType } = parseResult.data;

    // 3. Generate S3 key (tmp/ директория для автоматической очистки)
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueId = nanoid(12);
    const s3Key = `tmp/${userId}/${uniqueId}.${fileExtension}`;

    // 4. Get presigned upload URL (valid for 15 minutes)
    const presignedUrl = await getPresignedUploadUrl(s3Key, fileType, 900);

    // 5. Return presigned URL and s3Key (НЕ создаём запись в БД!)
    return NextResponse.json({
      presignedUrl,
      s3Key, // Клиент будет использовать это для API генерации
      // Не возвращаем assetId т.к. ассет не создан в БД
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка сервера при загрузке',
      },
      { status: 500 }
    );
  }
}
