/**
 * User Server Actions
 * Управление данными пользователя (баланс, профиль)
 */

'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Результат получения баланса
 */
export type GetUserBalanceResult =
  | {
      success: true;
      credits: number;
    }
  | {
      success: false;
      error: string;
      errorCode?: 'UNAUTHORIZED' | 'NOT_FOUND';
    };

/**
 * Получить актуальный баланс пользователя из БД
 *
 * @returns Текущий баланс токенов
 */
export async function getUserBalanceAction(): Promise<GetUserBalanceResult> {
  try {
    // 1. Проверка аутентификации
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Необходимо войти в систему',
        errorCode: 'UNAUTHORIZED',
      };
    }

    // 2. Получаем актуальный баланс из БД
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        credits: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'Пользователь не найден',
        errorCode: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      credits: user.credits ?? 0,
    };
  } catch (error) {
    console.error('[getUserBalanceAction] Error:', error);
    return {
      success: false,
      error: 'Ошибка при получении баланса',
    };
  }
}
