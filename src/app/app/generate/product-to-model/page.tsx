/**
 * Product-to-Model Page
 *
 * Преобразует фото товара (на манекене/плоской выкладке) в изображение модели в этом товаре
 *
 * @route /app/generate/product-to-model
 */

import { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { redirect } from 'next/navigation';
import { ProductToModelClient } from './client';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Товар → Модель',
  description: 'Преобразуйте фото товара в изображение модели',
};

// ============================================
// PAGE COMPONENT
// ============================================

export default async function ProductToModelPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Получаем план пользователя
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
    columns: {
      planCode: true,
    },
  });

  const userPlan = user?.planCode ?? 'test';

  return <ProductToModelClient userPlan={userPlan} />;
}

