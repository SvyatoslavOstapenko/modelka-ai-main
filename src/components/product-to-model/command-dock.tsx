'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Info, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

export interface CommandDockProps {
  // Form state
  description: string;
  onDescriptionChange: (value: string) => void;

  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;

  resolution: string;
  onResolutionChange: (value: string) => void;

  numVariants: number;
  onNumVariantsChange: (value: number) => void;

  // Optional features
  faceReferenceImage: File | null;
  onFaceReferenceUpload: (file: File | null) => void;

  imagePrompt: File | null;
  onImagePromptUpload: (file: File | null) => void;

  backgroundReference: File | null;
  onBackgroundReferenceUpload: (file: File | null) => void;

  // Advanced options (currently unused but kept for future implementation)
  adjustHands?: boolean;
  onAdjustHandsChange?: (value: boolean) => void;

  coverFeet?: boolean;
  onCoverFeetChange: (value: boolean) => void;

  restoreBackground: boolean;
  onRestoreBackgroundChange: (value: boolean) => void;

  // Generation
  onGenerate: () => void;
  canGenerate: boolean;
  isGenerating: boolean;

  // Credits
  userCredits: number;
  requiredCredits: number;
  onTopUp?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function CommandDock({
  description,
  onDescriptionChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  numVariants,
  onNumVariantsChange,
  faceReferenceImage,
  onFaceReferenceUpload,
  imagePrompt,
  onImagePromptUpload,
  backgroundReference,
  onBackgroundReferenceUpload,
  onGenerate,
  canGenerate,
  isGenerating,
  userCredits,
  requiredCredits,
  onTopUp,
}: CommandDockProps) {
  const hasEnoughCredits = userCredits >= requiredCredits;

  return (
    <div className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl border-slate-200 dark:border-slate-800">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {/* Mobile Layout */}
        <div className="flex flex-col gap-3 md:hidden">
          {/* Top Row: Description Input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Описание (опционально)"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="h-9 text-xs border-slate-300 dark:border-slate-700 focus-visible:ring-primary flex-1"
            />
          </div>

          {/* Bottom Row: Options and Generate Button */}
          <div className="flex items-center gap-2 justify-between">
            {/* Options Group */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Aspect Ratio */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] px-2 font-medium border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {aspectRatio}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" align="start" side="top">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold mb-2">Формат</h4>
                    <div className="grid gap-1.5">
                      {[
                        { value: '1:1', label: '1:1' },
                        { value: '3:4', label: '3:4' },
                        { value: '4:3', label: '4:3' },
                        { value: '9:16', label: '9:16' },
                        { value: '16:9', label: '16:9' },
                        { value: '2:3', label: '2:3' },
                        { value: '3:2', label: '3:2' },
                        { value: '4:5', label: '4:5' },
                        { value: '5:4', label: '5:4' },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={aspectRatio === option.value ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-7 text-xs"
                          onClick={() => onAspectRatioChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Resolution */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] px-2 font-medium border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {resolution === '1024' ? '1K' : resolution === '2048' ? '2K' : '4K'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start" side="top">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold mb-2">Разрешение</h4>
                    <div className="grid gap-1.5">
                      {[
                        { value: '1024', label: 'Точное 1K разрешение', description: 'Стабильные результаты с хорошим следованием инструкциям', locked: false },
                        { value: '4096-balanced', label: 'Сбалансированное 4K', description: 'Чёткие детали с умеренным контролем', locked: true },
                        { value: '4096-creative', label: 'Креативное 4K', description: 'UHD результаты с хорошей детализацией товара', locked: true },
                      ].map((option) => (
                        <TooltipProvider key={option.value}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={resolution === option.value ? 'default' : 'outline'}
                                size="sm"
                                className="justify-start h-auto py-2 flex-col items-start"
                                onClick={() => !option.locked && onResolutionChange(option.value)}
                                disabled={option.locked}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-xs font-medium">{option.label}</span>
                                  {option.locked && <Lock className="w-3 h-3 ml-1 opacity-50" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{option.description}</span>
                              </Button>
                            </TooltipTrigger>
                            {option.locked && (
                              <TooltipContent>
                                <p className="text-xs">Доступно на PRO</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Variants */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] px-2 font-medium font-heading border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {numVariants}v
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" align="start" side="top">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold mb-2">Варианты</h4>
                    <div className="grid gap-1.5">
                      {[1, 2, 3, 4].map((num) => (
                        <Button
                          key={num}
                          variant={numVariants === num ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-7 text-xs"
                          onClick={() => onNumVariantsChange(num)}
                        >
                          {num} {num === 1 ? 'Изображение' : 'Изображения'}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 text-center">
                      Каждый вариант = 1 токен
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Generate Button */}
            <div className="flex-shrink-0">
              {hasEnoughCredits ? (
                <Button
                  onClick={onGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="gradient-primary h-9 px-4 text-xs font-semibold shadow-lg shadow-primary/25"
                  size="sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Поехали
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] font-heading">
                    {requiredCredits}
                  </Badge>
                </Button>
              ) : (
                <Button
                  onClick={onTopUp}
                  className="gradient-primary h-9 px-4 text-xs font-semibold"
                  size="sm"
                >
                  Пополнить
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-[1fr_auto_auto] gap-4 items-center">
          {/* Left: Description Input */}
          <div className="flex items-center gap-3">
            <Input
              placeholder="Описание (опционально): Например, студия, мягкий свет, нейтральный фон"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="h-10 text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-primary"
            />
          </div>

          {/* Center: Chips Buttons */}
          <div className="flex items-center gap-2">
            {/* Aspect Ratio */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs font-medium">
                  Формат: {aspectRatio}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="center" side="top">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Формат изображения</h4>
                  <div className="grid gap-1.5">
                    {[
                      { value: '3:4', label: '3:4 (Портрет)' },
                      { value: '1:1', label: '1:1 (Квадрат)' },
                      { value: '4:5', label: '4:5 (Instagram)' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={aspectRatio === option.value ? 'default' : 'outline'}
                        size="sm"
                        className="justify-start h-8 text-xs"
                        onClick={() => onAspectRatioChange(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Resolution */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs font-medium">
                  Размер: {resolution}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="center" side="top">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Разрешение</h4>
                  <div className="grid gap-1.5">
                    {[
                      { value: '1024', label: '1024px (Стандарт)', locked: false },
                      { value: '2048', label: '2048px (HD)', locked: false },
                      { value: '4096', label: '4096px (4K)', locked: true },
                    ].map((option) => (
                      <TooltipProvider key={option.value}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={resolution === option.value ? 'default' : 'outline'}
                              size="sm"
                              className="justify-start h-8 text-xs"
                              onClick={() => !option.locked && onResolutionChange(option.value)}
                              disabled={option.locked}
                            >
                              {option.label}
                              {option.locked && <Lock className="w-3 h-3 ml-auto" />}
                            </Button>
                          </TooltipTrigger>
                          {option.locked && (
                            <TooltipContent>
                              <p className="text-xs">Доступно на Pro тарифе</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Variants */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs font-medium font-heading">
                  Варианты: {numVariants}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="center" side="top">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Количество вариантов</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => numVariants > 1 && onNumVariantsChange(numVariants - 1)}
                      disabled={numVariants <= 1}
                    >
                      -
                    </Button>
                    <div className="flex-1 text-center font-heading font-semibold">
                      {numVariants}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => numVariants < 4 && onNumVariantsChange(numVariants + 1)}
                      disabled={numVariants >= 4}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Каждый вариант = 1 токен
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6" />

            {/* Face Reference */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={faceReferenceImage ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs font-medium"
                >
                  Референс лица
                  {faceReferenceImage ? ' ✓' : ''}
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] font-heading">
                    +3
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="center" side="top">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Референс лица</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Загрузите фото лица для точного воспроизведения черт
                  </p>
                  {faceReferenceImage ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        ✓ {faceReferenceImage.name}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => onFaceReferenceUpload(null)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) onFaceReferenceUpload(file);
                        };
                        input.click();
                      }}
                    >
                      Загрузить фото
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Image Prompt */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={imagePrompt ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs font-medium"
                >
                  Image Prompt {imagePrompt ? '✓' : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="center" side="top">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Image Prompt</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Референсное изображение для стиля
                  </p>
                  {imagePrompt ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        ✓ {imagePrompt.name}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => onImagePromptUpload(null)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) onImagePromptUpload(file);
                        };
                        input.click();
                      }}
                    >
                      Загрузить фото
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Background Reference */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={backgroundReference ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 text-xs font-medium"
                >
                  Фон-референс {backgroundReference ? '✓' : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="center" side="top">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Фон-референс</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Задайте желаемый фон
                  </p>
                  {backgroundReference ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        ✓ {backgroundReference.name}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => onBackgroundReferenceUpload(null)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) onBackgroundReferenceUpload(file);
                        };
                        input.click();
                      }}
                    >
                      Загрузить фото
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right: CTA */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              {hasEnoughCredits ? (
                <Button
                  onClick={onGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="gradient-primary h-11 px-6 text-sm font-semibold shadow-lg shadow-primary/25"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать
                  <Badge variant="secondary" className="ml-2 font-heading">
                    {requiredCredits}
                  </Badge>
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={onTopUp}
                    className="gradient-primary h-11 px-6 text-sm font-semibold"
                    size="lg"
                  >
                    Пополнить баланс
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="h-7 px-3 text-xs opacity-50"
                        >
                          <Info className="w-3 h-3 mr-1" />
                          Недостаточно токенов
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Требуется {requiredCredits} токенов, у вас {userCredits}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                Если генерация не получилась- вернём токены
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
