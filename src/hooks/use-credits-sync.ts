/**
 * Hook для синхронизации баланса токенов
 *
 * Автоматически обновляет баланс в session при изменениях
 */

'use client';

import { useSession } from 'next-auth/react';
import { getUserBalanceAction } from '@/app/actions/user';

/**
 * Синхронизирует баланс токенов с БД
 *
 * Использование:
 * - Вызовите useCreditsSync() в компоненте после операций с токенами
 * - Баланс автоматически обновится в session
 *
 * @example
 * // В TryOnForm после успешной генерации
 * const refreshCredits = useCreditsSync();
 * await generateTryOn();
 * refreshCredits(); // Обновить баланс
 */
export function useCreditsSync() {
  const { update } = useSession();

  const refreshCredits = async () => {
    const result = await getUserBalanceAction();
    if (result.success) {
      await update({ user: { credits: result.credits } });
    }
  };

  return refreshCredits;
}
