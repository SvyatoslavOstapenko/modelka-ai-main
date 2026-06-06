'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, User, AlertCircle } from 'lucide-react';

// ============================================
// ТИПЫ
// ============================================

export interface AddModelDialogProps {
  /** Открыт ли диалог */
  open: boolean;
  /** Коллбэк изменения состояния открытия */
  onOpenChange: (open: boolean) => void;
  /** Коллбэк при выборе "Сгенерировать автоматически" */
  onGenerateAuto: () => void;
  /** Коллбэк при выборе "Выбрать модель вручную" */
  onSelectManual: () => void;
}

// ============================================
// КОМПОНЕНТ
// ============================================

/**
 * Диалог добавления модели
 *
 * Предупреждает пользователя о том, что добавление модели может снизить качество,
 * и предлагает два варианта: автоматическая генерация или ручной выбор.
 */
export function AddModelDialog({
  open,
  onOpenChange,
  onGenerateAuto,
  onSelectManual,
}: AddModelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить модель</DialogTitle>
          <DialogDescription>
            Товар на модели работает лучше, когда генерирует модель только из фото товара и промпта.
          </DialogDescription>
        </DialogHeader>

        {/* Предупреждение */}
        <div className="flex gap-2 sm:gap-3 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100">
            <strong>Внимание:</strong> Добавление модели может снизить надёжность и точность результата.
            Рекомендуется использовать только когда необходимо показать товар на конкретном фото.
          </p>
        </div>

        {/* Кнопки выбора */}
        <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
          <Button
            onClick={onSelectManual}
            variant="outline"
            className="w-full md:w-[50%] h-12 md:h-11 text-base md:text-sm"
          >
            <User className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Выбрать вручную
          </Button>
          <Button
            onClick={onGenerateAuto}
            className="w-full md:w-[50%] h-12 md:h-11 text-base md:text-sm"
          >
            <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Сгенерировать автоматически
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

