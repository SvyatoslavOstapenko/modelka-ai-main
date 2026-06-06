/**
 * GenerationResult - Компонент отображения результата генерации
 *
 * Функции:
 * - Поллинг статуса через useGenerationStatus
 * - Отображение прогресса (PENDING, QUEUED, PROCESSING)
 * - Отображение результата (COMPLETED)
 * - Обработка ошибок (FAILED) с user-friendly сообщениями
 * - Кнопки: Скачать, Новая генерация
 *
 * @module components/try-on/generation-result
 */

'use client';

import React from 'react';
import { useGenerationStatus } from '@/hooks/use-generation-status';
import { getFashnErrorMessage } from '@/lib/validations/try-on';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, RefreshCw, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

interface GenerationResultProps {
  /**
   * ID генерации для отслеживания
   */
  generationId: string;

  /**
   * Callback для создания новой генерации
   */
  onNewGeneration: () => void;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export function GenerationResult({ generationId, onNewGeneration }: GenerationResultProps) {
  // ========================================
  // POLLING
  // ========================================

  const { status, resultUrl, errorReason, isError } =
    useGenerationStatus({
      generationId,
      refetchInterval: 3000, // 3 секунды
    });

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Скачивание результата
   */
  const handleDownload = () => {
    if (!resultUrl) return;

    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `modelka-result-${generationId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========================================
  // RENDER: ERROR STATE
  // ========================================

  if (isError) {
    return (
      <Card className="p-8 text-center space-y-4">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
        <div>
          <h3 className="text-lg font-semibold">Ошибка загрузки статуса</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Не удалось получить информацию о генерации
          </p>
        </div>

        <Button onClick={onNewGeneration} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </Button>
      </Card>
    );
  }

  // ========================================
  // RENDER: FAILED
  // ========================================

  if (status === 'FAILED') {
    const userMessage = getFashnErrorMessage(errorReason);

    return (
      <Card className="p-8 text-center space-y-6">
        <div className="space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
          <div>
            <h3 className="text-lg font-semibold text-destructive">Генерация не удалась</h3>
            <p className="text-sm text-muted-foreground mt-2">{userMessage}</p>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-md">
          <p className="text-xs text-muted-foreground">
            Токены за эту генерацию были автоматически возвращены на ваш баланс.
          </p>
        </div>

        <Button onClick={onNewGeneration} size="lg" className="w-full">
          <RefreshCw className="w-5 h-5 mr-2" />
          Попробовать снова
        </Button>
      </Card>
    );
  }

  // ========================================
  // RENDER: COMPLETED
  // ========================================

  if (status === 'COMPLETED' && resultUrl) {
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Готово!</h3>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>

              <Button onClick={onNewGeneration} variant="default" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Новая примерка
              </Button>
            </div>
          </div>

          {/* RESULT IMAGE */}
          <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
            <Image
              src={resultUrl}
              alt="Результат виртуальной примерки"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          </div>

          {/* TIP */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              💡 <strong>Совет:</strong> Попробуйте разные настройки (режим качества, опции рук и ног)
              для лучшего результата
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ========================================
  // RENDER: PROCESSING / QUEUED / PENDING
  // ========================================

  const statusText = {
    PENDING: 'Подготовка...',
    QUEUED: 'В очереди...',
    PROCESSING: 'Генерация...',
    COMPLETED: 'Завершено',
    CANCELED: 'Отменено',
  }[status || 'PENDING'] || 'Обработка...';

  const progressValue = {
    PENDING: 10,
    QUEUED: 30,
    PROCESSING: 60,
    COMPLETED: 100,
    CANCELED: 0,
  }[status || 'PENDING'] || 50;

  return (
    <Card className="p-8 space-y-6">
      <div className="text-center space-y-4">
        {/* ANIMATED ICON */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative w-full h-full bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </div>

        {/* STATUS TEXT */}
        <div>
          <h3 className="text-lg font-semibold">{statusText}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Это займет около 15-30 секунд
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {status === 'PENDING' && 'Подключение к AI-сервису...'}
            {status === 'QUEUED' && 'Ожидание в очереди...'}
            {status === 'PROCESSING' && 'Генерируем изображение...'}
          </p>
        </div>
      </div>

      {/* INFO BOX */}
      <div className="bg-muted p-4 rounded-md space-y-2">
        <p className="text-xs font-medium">Что происходит?</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>AI анализирует позу модели и детали одежды</li>
          <li>Генерируется реалистичное изображение примерки</li>
          <li>Сохраняются текстуры, узоры и освещение</li>
        </ul>
      </div>

      {/* CANCEL BUTTON (optional) */}
      <Button
        onClick={onNewGeneration}
        variant="ghost"
        size="sm"
        className="w-full"
      >
        Отменить
      </Button>
    </Card>
  );
}
