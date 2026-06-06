/**
 * Gallery Server Actions
 * Обработка запросов для страницы "Мои генерации"
 */

'use server';

import { auth } from '@/auth';
import { getUserGallery, getGalleryItem, type GalleryItem } from '@/services/assets';

/**
 * Результат получения галереи
 */
export type GetGalleryResult =
  | {
      success: true;
      gallery: GalleryItem[];
    }
  | {
      success: false;
      error: string;
      errorCode?: 'UNAUTHORIZED';
    };

/**
 * Результат получения одного элемента галереи
 */
export type GetGalleryItemResult =
  | {
      success: true;
      item: GalleryItem;
    }
  | {
      success: false;
      error: string;
      errorCode?: 'UNAUTHORIZED' | 'NOT_FOUND' | 'PERMISSION_DENIED';
    };

/**
 * Получить галерею генераций пользователя
 *
 * @param limit - Максимальное количество элементов (по умолчанию: 50)
 * @returns Массив элементов галереи с presigned URLs
 */
export async function getGalleryAction(limit: number = 50): Promise<GetGalleryResult> {
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

    // 2. Получаем галерею из сервиса
    const gallery = await getUserGallery(session.user.id, limit);

    return {
      success: true,
      gallery,
    };
  } catch (error) {
    console.error('[getGalleryAction] Error:', error);
    return {
      success: false,
      error: 'Ошибка при загрузке галереи',
    };
  }
}

/**
 * Получить один элемент галереи по ID генерации
 *
 * @param generationId - ID генерации
 * @returns Элемент галереи с presigned URLs
 */
export async function getGalleryItemAction(
  generationId: string
): Promise<GetGalleryItemResult> {
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

    // 2. Получаем элемент из сервиса
    const item = await getGalleryItem(generationId, session.user.id);

    if (!item) {
      return {
        success: false,
        error: 'Генерация не найдена',
        errorCode: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      item,
    };
  } catch (error) {
    console.error('[getGalleryItemAction] Error:', error);
    return {
      success: false,
      error: 'Ошибка при загрузке генерации',
    };
  }
}
