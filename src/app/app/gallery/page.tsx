/**
 * Gallery Page - Галерея генераций
 *
 * Отображает все завершенные генерации пользователя в виде галереи
 *
 * @route /app/gallery
 */

import { auth } from '@/auth';
import { db } from '@/db';
import { generations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { GalleryClient } from './gallery-client';
import { getPresignedDownloadUrl } from '@/lib/s3';

export default async function GalleryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  // Fetch completed generations with output assets
  const userGenerations = await db.query.generations.findMany({
    where: eq(generations.userId, session.user.id),
    orderBy: [desc(generations.createdAt)],
    limit: 100,
    with: {
      generationAssets: {
        where: (generationAssets, { eq }) => eq(generationAssets.direction, 'output'),
        with: {
          asset: true,
        },
      },
    },
  });

  // Filter only completed generations with outputs and generate presigned URLs
  const completedGenerations = await Promise.all(
    userGenerations
      .filter((gen) => gen.status === 'COMPLETED' && gen.generationAssets.length > 0)
      .map(async (gen) => {
        // Generate presigned URLs for all output assets
        const outputs = await Promise.all(
          gen.generationAssets.map(async (ga) => ({
            url: await getPresignedDownloadUrl(ga.asset.s3Key, 3600), // 1 hour
            s3Key: ga.asset.s3Key,
            mediaKind: ga.asset.mediaKind,
          }))
        );

        return {
          id: gen.id,
          type: gen.type,
          createdAt: gen.createdAt.toISOString(),
          outputs,
          parameters: gen.params,
        };
      })
  );

  return <GalleryClient generations={completedGenerations} />;
}
