/**
 * Custom Hook: useGenerationStatus
 *
 * Поллинг статуса генерации каждые 3 секунды до завершения.
 * Аналог React Query с refetchInterval.
 *
 * @module hooks/use-generation-status
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGenerationStatusAction, type GetGenerationStatusResult } from '@/app/actions/try-on';

// ============================================
// TYPES
// ============================================

type GenerationStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED';

interface UseGenerationStatusOptions {
  /**
   * ID генерации для отслеживания
   */
  generationId: string | null;

  /**
   * Интервал поллинга в миллисекундах
   * @default 3000 (3 секунды)
   */
  refetchInterval?: number;

  /**
   * Автоматически останавливать поллинг при завершении
   * @default true
   */
  stopOnCompletion?: boolean;
}

interface UseGenerationStatusReturn {
  /**
   * Данные о генерации (если загружены)
   */
  data: GetGenerationStatusResult | null;

  /**
   * Статус генерации
   */
  status: GenerationStatus | null;

  /**
   * Флаг загрузки
   */
  isLoading: boolean;

  /**
   * Флаг ошибки
   */
  isError: boolean;

  /**
   * Флаг завершения (COMPLETED или FAILED)
   */
  isCompleted: boolean;

  /**
   * URL результата (если есть)
   */
  resultUrl: string | null | undefined;

  /**
   * Причина ошибки (если есть)
   */
  errorReason: string | null | undefined;

  /**
   * Ручной рефетч
   */
  refetch: () => Promise<void>;

  /**
   * Остановить поллинг
   */
  stopPolling: () => void;
}

// ============================================
// HOOK
// ============================================

/**
 * Хук для отслеживания статуса генерации
 *
 * @example
 * ```tsx
 * const { status, resultUrl, isCompleted } = useGenerationStatus({
 *   generationId: '123e4567-e89b-12d3-a456-426614174000',
 * });
 *
 * if (status === 'PROCESSING') {
 *   return <Loader />;
 * }
 *
 * if (status === 'COMPLETED' && resultUrl) {
 *   return <Image src={resultUrl} />;
 * }
 * ```
 */
export function useGenerationStatus({
  generationId,
  refetchInterval = 3000,
  stopOnCompletion = true,
}: UseGenerationStatusOptions): UseGenerationStatusReturn {
  // ========================================
  // STATE
  // ========================================

  const [data, setData] = useState<GetGenerationStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

  // ========================================
  // DERIVED STATE
  // ========================================

  const status: GenerationStatus | null =
    data && data.success ? (data.generation.status as GenerationStatus) : null;

  const isCompleted = status === 'COMPLETED' || status === 'FAILED';

  const resultUrl =
    data && data.success && status === 'COMPLETED' ? data.generation.resultUrl : null;

  const errorReason =
    data && data.success && status === 'FAILED' ? data.generation.errorReason : null;

  // ========================================
  // FETCH FUNCTION
  // ========================================

  const fetchStatus = useCallback(async () => {
    if (!generationId) {
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const result = await getGenerationStatusAction(generationId);
      setData(result);

      if (!result.success) {
        setIsError(true);
        console.error('[useGenerationStatus] Error:', result.error);
      } else {
        // Если завершено и stopOnCompletion = true, останавливаем поллинг
        const currentStatus = result.generation.status;
        if (
          stopOnCompletion &&
          (currentStatus === 'COMPLETED' || currentStatus === 'FAILED')
        ) {
          setIsPolling(false);
        }
      }
    } catch (err) {
      console.error('[useGenerationStatus] Fetch error:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [generationId, stopOnCompletion]);

  // ========================================
  // POLLING EFFECT
  // ========================================

  useEffect(() => {
    if (!generationId || !isPolling) {
      return;
    }

    // Начальный fetch
    fetchStatus();

    // Устанавливаем интервал
    const intervalId = setInterval(() => {
      fetchStatus();
    }, refetchInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [generationId, isPolling, refetchInterval, fetchStatus]);

  // ========================================
  // MANUAL CONTROLS
  // ========================================

  const refetch = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // ========================================
  // RETURN
  // ========================================

  return {
    data,
    status,
    isLoading,
    isError,
    isCompleted,
    resultUrl,
    errorReason,
    refetch,
    stopPolling,
  };
}
