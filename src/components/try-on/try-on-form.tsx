/**
 * TryOnForm - Форма виртуальной примерки
 *
 * Включает:
 * - Два SmartUploader (модель + одежда)
 * - Conditional fields (coverFeet только для one-pieces/bottoms)
 * - React Hook Form + Zod валидация
 * - Интеграция с Server Actions
 * - Поллинг статуса генерации
 * - Отображение результата/ошибок
 *
 * @module components/try-on/try-on-form
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateTryOnSchema, type GenerateTryOnInput, type GarmentCategory, type GarmentPhotoType, type GenerationMode } from '@/lib/validations/try-on';
import { generateTryOnAction, checkUserBalanceAction } from '@/app/actions/try-on';
import { useCreditsSync } from '@/hooks/use-credits-sync';
import { SmartUploader } from './smart-uploader';
import { GenerationResult } from './generation-result';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Sparkles, Info } from 'lucide-react';

// ============================================
// КОМПОНЕНТ
// ============================================

export function TryOnForm() {
  // ========================================
  // STATE
  // ========================================

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // HOOKS
  // ========================================

  const refreshCredits = useCreditsSync();

  // ========================================
  // FORM
  // ========================================

  const form = useForm<GenerateTryOnInput>({
    resolver: zodResolver(generateTryOnSchema),
    defaultValues: {
      category: 'auto',
      garmentPhotoType: 'auto',
      mode: 'balanced',
      adjustHands: false,
      coverFeet: false,
      restoreBackground: false,
      nsfwFilter: true,
    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;

  // Watching для conditional logic
  const category = watch('category');

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Submit handler
   */
  const onSubmit = async (data: GenerateTryOnInput) => {
    setIsSubmitting(true);

    try {
      // Проверка баланса
      const balanceResult = await checkUserBalanceAction();

      if (!balanceResult.success || !balanceResult.canGenerate) {
        toast.error('Недостаточно токенов', {
          description: 'Пополните баланс для генерации',
        });
        setIsSubmitting(false);
        return;
      }

      // Запуск генерации
      const result = await generateTryOnAction(data);

      if (!result.success) {
        toast.error('Ошибка запуска генерации', {
          description: result.error,
        });
        setIsSubmitting(false);
        return;
      }

      // Успех - переходим к поллингу
      setGenerationId(result.generationId);
      toast.success('Генерация запущена!', {
        description: 'Это займет около 15-30 секунд',
      });

      // Обновляем баланс токенов в session
      await refreshCredits();
    } catch (error) {
      console.error('[TryOnForm] Submit error:', error);
      toast.error('Неожиданная ошибка', {
        description: 'Попробуйте позже',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Сброс формы для новой генерации
   */
  const handleReset = () => {
    setGenerationId(null);
    form.reset();
  };

  // ========================================
  // RENDER: Если генерация запущена
  // ========================================

  if (generationId) {
    return (
      <GenerationResult
        generationId={generationId}
        onNewGeneration={handleReset}
      />
    );
  }

  // ========================================
  // RENDER: Форма
  // ========================================

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Загрузка изображений</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* MODEL IMAGE UPLOADER */}
          <SmartUploader
            assetType="uploaded_model"
            label="Фото модели"
            description="Загрузите фото человека (анфас, по пояс или полный рост)"
            onUploadComplete={(data) => {
              setValue('modelImageS3Key', data.s3Key, { shouldValidate: true });
            }}
            onReset={() => {
              setValue('modelImageS3Key', '', { shouldValidate: true });
            }}
            error={errors.modelImageS3Key?.message}
            disabled={isSubmitting}
          />

          {/* GARMENT IMAGE UPLOADER */}
          <SmartUploader
            assetType="uploaded_garment"
            label="Фото одежды"
            description="Загрузите изображение одежды (на модели или на манекене)"
            onUploadComplete={(data) => {
              setValue('garmentImageS3Key', data.s3Key, { shouldValidate: true });
            }}
            onReset={() => {
              setValue('garmentImageS3Key', '', { shouldValidate: true });
            }}
            error={errors.garmentImageS3Key?.message}
            disabled={isSubmitting}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold">Настройки генерации</h2>

        <Separator />

        {/* CATEGORY */}
        <div className="space-y-2">
          <Label htmlFor="category">
            Категория одежды
            <span className="text-muted-foreground text-xs ml-2">(рекомендуется выбрать явно)</span>
          </Label>
          <Select
            value={watch('category')}
            onValueChange={(value) => setValue('category', value as GarmentCategory)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tops">Верх (рубашка, блузка, топ)</SelectItem>
              <SelectItem value="bottoms">Низ (брюки, юбка)</SelectItem>
              <SelectItem value="one-pieces">Платье / Комбинезон</SelectItem>
              <SelectItem value="auto">Авто-определение</SelectItem>
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        {/* GARMENT PHOTO TYPE */}
        <div className="space-y-2">
          <Label htmlFor="garmentPhotoType">Тип фотографии одежды</Label>
          <Select
            value={watch('garmentPhotoType')}
            onValueChange={(value) => setValue('garmentPhotoType', value as GarmentPhotoType)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="garmentPhotoType">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="model">На человеке (модель)</SelectItem>
              <SelectItem value="flat-lay">На манекене / Без человека</SelectItem>
              <SelectItem value="auto">Авто-определение</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Важно выбрать правильно - влияет на качество результата
          </p>
        </div>

        {/* MODE */}
        <div className="space-y-2">
          <Label htmlFor="mode">Качество генерации</Label>
          <Select
            value={watch('mode')}
            onValueChange={(value) => setValue('mode', value as GenerationMode)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="mode">
              <SelectValue placeholder="Выберите режим" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Быстрый (~5-10с, 1 токен)</SelectItem>
              <SelectItem value="balanced">Сбалансированный (~15с, 1 токен)</SelectItem>
              <SelectItem value="quality">Максимальный (~30с, 2 токена)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Дополнительные опции</h3>

          {/* ADJUST HANDS */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="adjustHands"
              checked={watch('adjustHands')}
              onChange={(e) => setValue('adjustHands', e.target.checked)}
              disabled={isSubmitting}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="adjustHands" className="cursor-pointer">
                Подогнать руки
              </Label>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Info className="w-3 h-3" />
                Включите, если рукава длинные или руки перекрывают тело
              </p>
            </div>
          </div>

          {/* COVER FEET (conditional) */}
          {(category === 'one-pieces' || category === 'bottoms') && (
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="coverFeet"
                checked={watch('coverFeet')}
                onChange={(e) => setValue('coverFeet', e.target.checked)}
                disabled={isSubmitting}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="coverFeet" className="cursor-pointer">
                  Позволить одежде закрывать ноги
                </Label>
                <p className="text-xs text-muted-foreground">
                  Актуально для длинных платьев и юбок в пол
                </p>
              </div>
            </div>
          )}

          {/* RESTORE BACKGROUND */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="restoreBackground"
              checked={watch('restoreBackground')}
              onChange={(e) => setValue('restoreBackground', e.target.checked)}
              disabled={isSubmitting}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="restoreBackground" className="cursor-pointer">
                Сохранить фон фотографии
              </Label>
              <p className="text-xs text-muted-foreground">
                Может увеличить время генерации
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* SUBMIT BUTTON */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || !watch('modelImageS3Key') || !watch('garmentImageS3Key')}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Запуск генерации...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Примерить одежду
          </>
        )}
      </Button>
    </form>
  );
}
