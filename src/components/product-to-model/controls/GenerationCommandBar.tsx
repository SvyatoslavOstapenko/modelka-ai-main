'use client';

import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { pluralizeTokens } from '@/lib/pluralize';
import { SettingsPopovers } from './SettingsPopovers';
import { OptionalFeaturesButtons } from './OptionalFeaturesButtons';

interface GenerationCommandBarProps {
  // Описание
  description: string;
  setDescription: (desc: string) => void;

  // Настройки (для SettingsPopovers)
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  isRatioOpen: boolean;
  setIsRatioOpen: (open: boolean) => void;

  resolution: string;
  setResolution: (res: string) => void;
  isResolutionOpen: boolean;
  setIsResolutionOpen: (open: boolean) => void;

  numVariants: number;
  setNumVariants: (num: number) => void;
  isVariantsOpen: boolean;
  setIsVariantsOpen: (open: boolean) => void;

  // Опциональные фичи (для OptionalFeaturesButtons)
  modelImage: File | null;
  isManualModelMode: boolean;
  onAddModel: () => void;
  onRemoveModel: () => void;

  faceReferenceImage: File | null;
  onOpenFaceReference: () => void;

  imagePrompt: File | null;
  onOpenImagePrompt: () => void;

  backgroundReference: File | null;
  onOpenBackground: () => void;

  // Генерация
  canGenerate: boolean;
  hasEnoughCredits: boolean;
  requiredCredits: number;
  onGenerate: () => void;
  onTopUp?: () => void;

  // Права доступа
  hasSellerAccess: boolean;
}

/**
 * Панель управления генерацией для десктопа
 * Содержит поле описания, настройки, опциональные фичи и кнопку генерации
 */
export function GenerationCommandBar({
  description,
  setDescription,
  aspectRatio,
  setAspectRatio,
  isRatioOpen,
  setIsRatioOpen,
  resolution,
  setResolution,
  isResolutionOpen,
  setIsResolutionOpen,
  numVariants,
  setNumVariants,
  isVariantsOpen,
  setIsVariantsOpen,
  modelImage,
  isManualModelMode,
  onAddModel,
  onRemoveModel,
  faceReferenceImage,
  onOpenFaceReference,
  imagePrompt,
  onOpenImagePrompt,
  backgroundReference,
  onOpenBackground,
  canGenerate,
  hasEnoughCredits,
  requiredCredits,
  onGenerate,
  onTopUp,
  hasSellerAccess
}: GenerationCommandBarProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="hidden md:block">
          {/* Основная строка */}
          <div className="flex items-center gap-3 mb-3">
            {/* Большое поле ввода */}
            <Input
              placeholder="Описание (не обязательно): Светлые волосы, студийная фотосессия"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 h-11 text-sm bg-white dark:bg-slate-900 text-foreground"
            />

            {/* Компактные кнопки настроек */}
            <SettingsPopovers
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              isRatioOpen={isRatioOpen}
              setIsRatioOpen={setIsRatioOpen}
              resolution={resolution}
              setResolution={setResolution}
              isResolutionOpen={isResolutionOpen}
              setIsResolutionOpen={setIsResolutionOpen}
              numVariants={numVariants}
              setNumVariants={setNumVariants}
              isVariantsOpen={isVariantsOpen}
              setIsVariantsOpen={setIsVariantsOpen}
              hasSellerAccess={hasSellerAccess}
            />

            {/* Кнопка генерации */}
            <Button
              onClick={hasEnoughCredits ? onGenerate : onTopUp}
              disabled={!canGenerate && hasEnoughCredits}
              className="h-11 px-6 gradient-primary text-white font-medium shadow-lg shadow-primary/25"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {hasEnoughCredits ? `Запустить (${pluralizeTokens(requiredCredits)})` : 'Пополнить'}
            </Button>
          </div>

          {/* Строка опциональных функций */}
          <OptionalFeaturesButtons
            modelImage={modelImage}
            isManualModelMode={isManualModelMode}
            onAddModel={onAddModel}
            onRemoveModel={onRemoveModel}
            faceReferenceImage={faceReferenceImage}
            onOpenFaceReference={onOpenFaceReference}
            imagePrompt={imagePrompt}
            onOpenImagePrompt={onOpenImagePrompt}
            backgroundReference={backgroundReference}
            onOpenBackground={onOpenBackground}
            hasSellerAccess={hasSellerAccess}
          />
        </div>
      </div>
    </div>
  );
}
