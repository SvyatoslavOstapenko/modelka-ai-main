'use client';

import { User, X, Lock, Image as ImageIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SellerLockTooltip } from '@/components/ui/seller-lock-tooltip';

interface OptionalFeaturesButtonsProps {
  // Модель
  modelImage: File | null;
  isManualModelMode: boolean;
  onAddModel: () => void;
  onRemoveModel: () => void;

  // Референс лица
  faceReferenceImage: File | null;
  onOpenFaceReference: () => void;

  // Промпт изображения
  imagePrompt: File | null;
  onOpenImagePrompt: () => void;

  // Референс фона
  backgroundReference: File | null;
  onOpenBackground: () => void;

  // Права доступа
  hasSellerAccess: boolean;
}

/**
 * Кнопки опциональных функций для генерации
 * Модель, референс лица, промпт изображения, фон
 */
export function OptionalFeaturesButtons({
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
  hasSellerAccess
}: OptionalFeaturesButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Кнопка модели */}
      <Button
        variant={modelImage || isManualModelMode ? 'secondary' : 'ghost'}
        size="sm"
        className={`h-9 text-sm ${modelImage || isManualModelMode ? 'text-foreground bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={modelImage || isManualModelMode ? onRemoveModel : onAddModel}
      >
        {modelImage || isManualModelMode ? <X className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
        {modelImage || isManualModelMode ? 'Удалить модель' : 'Добавить модель'}
      </Button>

      {/* Кнопка референса лица */}
      <SellerLockTooltip showTooltip={!hasSellerAccess}>
        <Button
          variant={faceReferenceImage ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-9 text-sm ${faceReferenceImage ? 'text-foreground bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => hasSellerAccess ? onOpenFaceReference() : undefined}
          disabled={!hasSellerAccess || !!modelImage || isManualModelMode}
        >
          {hasSellerAccess ? <User className="w-4 h-4 mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
          {faceReferenceImage ? '✓ Референс добавлен' : 'Референс лица'}
        </Button>
      </SellerLockTooltip>

      {/* Кнопка промпта изображения */}
      <SellerLockTooltip showTooltip={!hasSellerAccess}>
        <Button
          variant={imagePrompt ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-9 text-sm ${imagePrompt ? 'text-foreground bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => hasSellerAccess ? onOpenImagePrompt() : undefined}
          disabled={!hasSellerAccess || !!modelImage || isManualModelMode}
        >
          {hasSellerAccess ? <ImageIcon className="w-4 h-4 mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
          {imagePrompt ? '✓ Промпт добавлен' : 'Промпт изображения'}
        </Button>
      </SellerLockTooltip>

      {/* Кнопка референса фона */}
      <SellerLockTooltip showTooltip={!hasSellerAccess}>
        <Button
          variant={backgroundReference ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-9 text-sm ${backgroundReference ? 'text-foreground bg-primary/10 border border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => hasSellerAccess ? onOpenBackground() : undefined}
          disabled={!hasSellerAccess || !!modelImage || isManualModelMode}
        >
          {hasSellerAccess ? <Palette className="w-4 h-4 mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
          {backgroundReference ? '✓ Фон добавлен' : 'Референс фона'}
        </Button>
      </SellerLockTooltip>
    </div>
  );
}
