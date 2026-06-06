'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence } from 'framer-motion';
import { Sparkles, Settings2, User, Lock, X, Image as ImageIcon, Palette, Ratio, MonitorUp } from 'lucide-react';
import { toast } from 'sonner';
import { pluralizeTokens } from '@/lib/pluralize';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAssetUpload } from '@/hooks/use-asset-upload';
import { SellerLockTooltip } from '@/components/ui/seller-lock-tooltip';
import { ProductImageUploader } from './uploaders/ProductImageUploader';
import { ModelImageUploader } from './uploaders/ModelImageUploader';
import { GenerationCommandBar } from './controls/GenerationCommandBar';
import { AddModelDialog } from './dialogs/add-model-dialog';
import { ModelSelectionDialog } from './dialogs/model-selection-dialog';
import { UploadDialog } from './dialogs/upload-dialog';
import { GenerationLoadingState } from './generation-loading-state';
import { GenerationResultCarousel } from './generation-result-carousel';
import { GenerationErrorState, ErrorType } from './generation-error-state';
import type { UploadedFile, GenerationStatus } from './shared/types';
import { ASPECT_RATIOS, RESOLUTIONS } from './shared/constants';

// ============================================
// TYPES
// ============================================

export interface SingleUploaderWorkspaceProps {
  userCredits: number;
  userPlan: string;
  onTopUp?: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Главный компонент рабочего пространства для генерации Product-to-Model
 * Разделён на логические подкомпоненты для удобства поддержки и переиспользования
 */
export function SingleUploaderWorkspace({
  userCredits,
  userPlan,
  onTopUp,
}: SingleUploaderWorkspaceProps) {

  // Хук загрузки ассетов
  const { uploadAsset } = useAssetUpload();

  // Права доступа
  const hasSellerAccess = ['seller', 'brand'].includes(userPlan);

  // Состояние загрузки товара
  const [productImage, setProductImage] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Настройки генерации
  const [description, setDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [resolution, setResolution] = useState('1K');
  const [numVariants, setNumVariants] = useState(1);

  // Опциональные ассеты
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [, setModelPrompt] = useState<string>('');
  const [faceReferenceImage, setFaceReferenceImage] = useState<File | null>(null);
  const [imagePrompt, setImagePrompt] = useState<File | null>(null);
  const [backgroundReference, setBackgroundReference] = useState<File | null>(null);

  // Состояния диалогов
  const [isAddModelDialogOpen, setIsAddModelDialogOpen] = useState(false);
  const [isModelSelectionDialogOpen, setIsModelSelectionDialogOpen] = useState(false);
  const [isFaceReferenceDialogOpen, setIsFaceReferenceDialogOpen] = useState(false);
  const [isImagePromptDialogOpen, setIsImagePromptDialogOpen] = useState(false);
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);

  // Режим ручной модели
  const [isManualModelMode, setIsManualModelMode] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // Состояния поповеров
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [isVariantsOpen, setIsVariantsOpen] = useState(false);

  // Состояния генерации
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle' as GenerationStatus);
  const [progress, setProgress] = useState(0);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [errorCode, setErrorCode] = useState<ErrorType | null>(null);

  // ============================================
  // HANDLERS
  // ============================================

  const handleGenerate = useCallback(async () => {
    if (!productImage?.s3Key) return;

    // Проверка кредитов
    const baseCostPerImage = faceReferenceImage ? 4 : 1;
    const estimatedCost = baseCostPerImage * numVariants;

    if (userCredits < estimatedCost) {
      toast.error('Недостаточно кредитов');
      onTopUp?.();
      return;
    }

    setGenerationStatus('processing');
    setProgress(0);
    setErrorCode(null);

    try {
      // Загрузка опциональных ассетов в S3
      const uploadOptionalAsset = async (file: File | null) => {
        if (!file) return undefined;
        const result = await uploadAsset(file, 'uploaded_model');
        return result?.s3Key;
      }

      const [modelKey, faceKey, promptKey, bgKey] = await Promise.all([
        isManualModelMode ? uploadOptionalAsset(modelImage) : undefined,
        uploadOptionalAsset(faceReferenceImage),
        uploadOptionalAsset(imagePrompt),
        uploadOptionalAsset(backgroundReference)
      ]);

      // Формирование публичных URL
      const getPublicUrl = (key?: string) => key ? `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || 'https://storage.yandexcloud.net/modelka-storage'}/${key}` : undefined;

      const payload = {
        product_image: getPublicUrl(productImage.s3Key)!,
        aspect_ratio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9' | '2:3' | '3:2' | '4:5' | '5:4',
        resolution: (resolution === '1K' ? '1k' : '4k') as '1k' | '4k',
        num_images: numVariants,
        ...(getPublicUrl(modelKey) && { model_image: getPublicUrl(modelKey) }),
        ...(getPublicUrl(faceKey) && { face_reference: getPublicUrl(faceKey) }),
        ...(getPublicUrl(promptKey) && { image_prompt: getPublicUrl(promptKey) }),
        ...(getPublicUrl(bgKey) && { background_reference: getPublicUrl(bgKey) }),
        ...(description && { prompt: description }),
      };

      // Вызов Server Action
      const { generateProductToModelAction, checkProductToModelStatusAction } = await import('@/app/actions/generate');
      const result = await generateProductToModelAction(payload);

      if (!result.success) {
        throw new Error(result.message || 'Failed to start generation');
      }

      if (!result.taskId) {
        throw new Error('No task ID returned');
      }

      // Polling цикл
      const taskId = result.taskId;
      const startTime = Date.now();

      const pollInterval = setInterval(async () => {
        try {
          const statusResult = await checkProductToModelStatusAction(taskId);

          if (!statusResult.success) {
            clearInterval(pollInterval);
            throw new Error(statusResult.errorCode || 'Status check failed');
          }

          const status = statusResult.status;

          // Динамическое время на основе опций
          let extraTime = 0;
          if (faceReferenceImage) extraTime = Math.max(extraTime, 15);
          if (resolution === '4K') extraTime = Math.max(extraTime, 5);
          if (numVariants > 1) extraTime = Math.max(extraTime, 5);
          const estimatedTime = 17 + extraTime;

          // Обновление прогресса
          const elapsed = (Date.now() - startTime) / 1000;
          let fakeProgress: number;
          if (elapsed < 0.5) {
            fakeProgress = Math.floor((elapsed / 0.5) * 9);
          } else if (elapsed < 3) {
            fakeProgress = 9 + Math.floor(((elapsed - 0.5) / 2.5) * 11);
          } else {
            const remainingProgress = 75;
            const remainingTime = estimatedTime - 3;
            fakeProgress = 20 + Math.min(remainingProgress, Math.floor(((elapsed - 3) / remainingTime) * remainingProgress));
          }
          fakeProgress = Math.min(95, fakeProgress);

          if (status === 'COMPLETED') {
            clearInterval(pollInterval);
            setProgress(100);
            setGenerationStatus('success');
            if (statusResult.output && statusResult.output.length > 0) {
              setResultImages(statusResult.output);
            }
          } else if (status === 'FAILED') {
            clearInterval(pollInterval);
            setGenerationStatus('error');
            const code = (statusResult.errorCode || 'UNKNOWN_ERROR') as ErrorType;
            setErrorCode(code);
          } else {
            setProgress(prev => Math.max(prev, fakeProgress));
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      }, 3000);

    } catch {
      setGenerationStatus('error');
      const code = 'UNKNOWN_ERROR' as ErrorType;
      setErrorCode(code);
    }
  }, [
    productImage,
    userCredits,
    faceReferenceImage,
    modelImage,
    imagePrompt,
    backgroundReference,
    description,
    aspectRatio,
    resolution,
    numVariants,
    isManualModelMode,
    onTopUp,
    uploadAsset
  ]);

  const handleRetry = useCallback(() => {
    setGenerationStatus('idle');
    setProgress(0);
    setResultImages([]);
    setErrorCode(null);
  }, []);

  const handleReset = useCallback(() => {
    setGenerationStatus('idle');
    setProgress(0);
    setResultImages([]);
    setErrorCode(null);
  }, []);

  // Обработчики для модели
  const handleAddModel = useCallback(() => {
    setIsAddModelDialogOpen(true);
  }, []);

  const handleRemoveModel = useCallback(() => {
    setIsManualModelMode(false);
    setModelImage(null);
    setModelPrompt('');
  }, []);

  // ============================================
  // COMPUTED
  // ============================================

  const baseCostPerImage = faceReferenceImage ? 4 : 1;
  const requiredCredits = baseCostPerImage * numVariants;
  const canGenerate = productImage !== null && productImage.s3Key !== undefined && generationStatus === 'idle';
  const hasEnoughCredits = userCredits >= requiredCredits;
  const isProcessing = generationStatus === 'processing';

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Главное рабочее пространство */}
      <div className="flex-1 flex flex-col items-center p-4 md:p-6 overflow-y-auto overflow-x-hidden">
        {/* Заголовок */}
        <Badge className="px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Фото товара на модели
        </Badge>

        <div className={cn("w-full flex-1 flex flex-col", isManualModelMode ? "max-w-5xl" : "max-w-xl")}>
          {(generationStatus === 'processing' || generationStatus === 'success' || generationStatus === 'error') ? (
            <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] flex-1">
              {generationStatus === 'processing' ? (
                <GenerationLoadingState progress={progress} />
              ) : generationStatus === 'error' ? (
                <GenerationErrorState
                  errorType={errorCode || 'UNKNOWN_ERROR'}
                  onRetry={handleRetry}
                  onReset={handleReset}
                />
              ) : (
                <GenerationResultCarousel
                  images={resultImages}
                  onReset={handleReset}
                />
              )}
            </div>
          ) : (
            <div className={cn(
              "flex gap-6 items-center justify-center w-full my-auto py-6",
              isManualModelMode ? "flex-col md:flex-row" : "flex-row"
            )}>
              {/* Загрузчик товара */}
              <ProductImageUploader
                productImage={productImage}
                setProductImage={setProductImage}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
                uploadAsset={uploadAsset}
                disabled={isProcessing}
                className={isManualModelMode ? "w-full md:flex-1" : "w-full"}
              />

              {/* Загрузчик модели (показывается в ручном режиме) */}
              <AnimatePresence mode="popLayout">
                {isManualModelMode && (
                  <ModelImageUploader
                    modelImage={modelImage}
                    setModelImage={setModelImage}
                    setModelPrompt={setModelPrompt}
                    onOpenModelSelection={() => setIsModelSelectionDialogOpen(true)}
                    hasSellerAccess={hasSellerAccess}
                    disabled={isProcessing}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Панель управления */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Мобильная версия */}
          <div className="flex flex-col gap-3 md:hidden">
            <Input
              placeholder="Описание (не обязательно): Светлые волосы, студийная фотосессия"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 text-sm bg-white dark:bg-slate-900 text-foreground"
            />

            <div className="flex gap-2">
              <Button
                onClick={hasEnoughCredits ? handleGenerate : onTopUp}
                disabled={!canGenerate && hasEnoughCredits}
                className="flex-1 h-12 text-sm gradient-primary text-white font-medium shadow-lg shadow-primary/25"
              >
                {hasEnoughCredits ? (
                  `Запустить (${pluralizeTokens(requiredCredits)})`
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Пополнить
                  </>
                )}
              </Button>

              <Sheet open={isMobileSettingsOpen} onOpenChange={setIsMobileSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-12 w-12 p-0 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800">
                    <Settings2 className="w-5 h-5 text-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle>Настройки генерации</SheetTitle>
                  </SheetHeader>

                  <div className="space-y-8 pb-8 px-1">
                    {/* Секция референсов */}
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-foreground">Референсы</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant={modelImage || isManualModelMode ? 'secondary' : 'outline'}
                            size="lg"
                            className="h-auto py-4 justify-start px-4"
                            onClick={() => {
                              if (modelImage || isManualModelMode) {
                                handleRemoveModel();
                              } else {
                                setIsAddModelDialogOpen(true);
                                setIsMobileSettingsOpen(false);
                              }
                            }}
                          >
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="text-sm font-semibold flex items-center">
                                {modelImage || isManualModelMode ? <X className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
                                Модель
                              </span>
                              <span className="text-xs text-muted-foreground font-normal text-left">
                                {modelImage || isManualModelMode ? 'Удалить текущую' : 'Выбрать модель'}
                              </span>
                            </div>
                          </Button>

                          <Button
                            variant={faceReferenceImage ? 'secondary' : 'outline'}
                            size="lg"
                            className="h-auto py-4 justify-start px-4"
                            onClick={() => {
                              if (hasSellerAccess) {
                                setIsFaceReferenceDialogOpen(true);
                                setIsMobileSettingsOpen(false);
                              } else {
                                onTopUp?.();
                              }
                            }}
                            disabled={!hasSellerAccess || !!modelImage || isManualModelMode}
                          >
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="text-sm font-semibold flex items-center">
                                {hasSellerAccess ? <User className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                Лицо
                              </span>
                              <span className="text-xs text-muted-foreground font-normal text-left">
                                {faceReferenceImage ? '✓ Референс добавлен' : 'Референс лица'}
                              </span>
                            </div>
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant={imagePrompt ? 'secondary' : 'outline'}
                            size="lg"
                            className="h-auto py-4 justify-start px-4"
                            onClick={() => {
                              if (hasSellerAccess) {
                                setIsImagePromptDialogOpen(true);
                                setIsMobileSettingsOpen(false);
                              } else {
                                onTopUp?.();
                              }
                            }}
                            disabled={!hasSellerAccess || !!modelImage || isManualModelMode}
                          >
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="text-sm font-semibold flex items-center">
                                {hasSellerAccess ? <ImageIcon className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                Промпт
                              </span>
                              <span className="text-xs text-muted-foreground font-normal text-left">
                                {imagePrompt ? '✓ Промпт добавлен' : 'Промпт изображения'}
                              </span>
                            </div>
                          </Button>

                          <Button
                            variant={backgroundReference ? 'secondary' : 'outline'}
                            size="lg"
                            className="h-auto py-4 justify-start px-4"
                            onClick={() => {
                              if (hasSellerAccess) {
                                setIsBackgroundDialogOpen(true);
                                setIsMobileSettingsOpen(false);
                              } else {
                                onTopUp?.();
                              }
                            }}
                            disabled={!hasSellerAccess || !!modelImage || isManualModelMode}
                          >
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="text-sm font-semibold flex items-center">
                                {hasSellerAccess ? <Palette className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                Фон
                              </span>
                              <span className="text-xs text-muted-foreground font-normal text-left">
                                {backgroundReference ? '✓ Фон добавлен' : 'Референс фона'}
                              </span>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Секция формата */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-foreground">Формат</h4>
                        <span className="text-sm text-foreground font-medium bg-muted px-2 py-1 rounded-md">{aspectRatio}</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="lg" className="w-full h-12">
                            <Ratio className="w-4 h-4 mr-2" />
                            Изменить
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-48px)] p-2" align="center">
                          <div className="grid grid-cols-3 gap-2">
                            {ASPECT_RATIOS.map((ratio) => (
                              <Button
                                key={ratio}
                                variant={aspectRatio === ratio ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setAspectRatio(ratio)}
                                className={cn("text-xs h-10", aspectRatio === ratio && "bg-primary/10 text-primary font-medium border border-primary/20")}
                              >
                                {ratio}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Секция качества */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-foreground">Качество</h4>
                        <span className="text-sm text-foreground font-medium bg-muted px-2 py-1 rounded-md">{resolution}</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="lg" className="w-full h-12 justify-between px-4">
                            <span className="flex items-center"><MonitorUp className="w-4 h-4 mr-2" /> Выбрать качество</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-48px)] p-2" align="center">
                          <div className="space-y-1">
                            {RESOLUTIONS.map((res) => {
                              const isLocked = res.locked && !hasSellerAccess;
                              return (
                                <SellerLockTooltip key={res.value} showTooltip={isLocked}>
                                  <Button
                                    variant={resolution === res.value ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="w-full justify-start h-auto py-3 px-3 flex-col items-start"
                                    onClick={() => !isLocked && setResolution(res.value)}
                                    disabled={isLocked}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-sm font-medium flex items-center">
                                        {isLocked && <Lock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />}
                                        {res.label}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1 text-wrap text-left">{res.description}</span>
                                  </Button>
                                </SellerLockTooltip>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Секция количества */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-foreground">Количество</h4>
                        <span className="text-sm text-foreground font-medium bg-muted px-2 py-1 rounded-md">{numVariants} шт.</span>
                      </div>
                      <div className="flex gap-3">
                        {[1, 2, 3, 4].map(num => {
                          const isLocked = num > 1 && !hasSellerAccess;
                          return (
                            <Tooltip key={num}>
                              <TooltipTrigger asChild>
                                <span className="flex-1">
                                  <Button
                                    variant={numVariants === num ? 'default' : 'outline'}
                                    className={cn("w-full h-12 text-base", numVariants === num && "gradient-primary text-white border-0")}
                                    onClick={() => !isLocked && setNumVariants(num)}
                                    disabled={isLocked}
                                  >
                                    {isLocked && <Lock className="w-3.5 h-3.5 mr-1" />}
                                    {num}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {isLocked && (
                                <TooltipContent className="max-w-xs p-3">
                                  <p className="font-medium">Доступно с пакета Seller</p>
                                  <p className="text-xs text-muted-foreground mt-1">Обновите пакет для генерации нескольких изображений</p>
                                  <a href="/app/billing" className="text-xs text-primary hover:underline mt-2 block">Обновить пакет</a>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Десктопная версия */}
          <GenerationCommandBar
            description={description}
            setDescription={setDescription}
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
            modelImage={modelImage}
            isManualModelMode={isManualModelMode}
            onAddModel={handleAddModel}
            onRemoveModel={handleRemoveModel}
            faceReferenceImage={faceReferenceImage}
            onOpenFaceReference={() => setIsFaceReferenceDialogOpen(true)}
            imagePrompt={imagePrompt}
            onOpenImagePrompt={() => setIsImagePromptDialogOpen(true)}
            backgroundReference={backgroundReference}
            onOpenBackground={() => setIsBackgroundDialogOpen(true)}
            canGenerate={canGenerate}
            hasEnoughCredits={hasEnoughCredits}
            requiredCredits={requiredCredits}
            onGenerate={handleGenerate}
            onTopUp={onTopUp}
            hasSellerAccess={hasSellerAccess}
          />
        </div>
      </div>

      {/* Диалоги */}
      <AddModelDialog
        open={isAddModelDialogOpen}
        onOpenChange={setIsAddModelDialogOpen}
        onGenerateAuto={() => {
          setModelImage(null);
          setIsAddModelDialogOpen(false);
        }}
        onSelectManual={() => {
          setIsAddModelDialogOpen(false);
          setIsManualModelMode(true);
          setFaceReferenceImage(null);
          setImagePrompt(null);
          setBackgroundReference(null);
        }}
      />

      <ModelSelectionDialog
        open={isModelSelectionDialogOpen}
        onOpenChange={setIsModelSelectionDialogOpen}
      />

      <UploadDialog
        open={isFaceReferenceDialogOpen}
        onOpenChange={setIsFaceReferenceDialogOpen}
        title="Референс лица"
        description="Загрузите фото лица для улучшения соответствия модели вашему референсу."
        onUpload={(file) => setFaceReferenceImage(file)}
        currentFile={faceReferenceImage}
        onRemove={() => setFaceReferenceImage(null)}
      />

      <UploadDialog
        open={isImagePromptDialogOpen}
        onOpenChange={setIsImagePromptDialogOpen}
        title="Промпт изображения"
        description="Предоставьте вдохновение для композиции и стиля фотосессии товара."
        onUpload={(file) => setImagePrompt(file)}
        currentFile={imagePrompt}
        onRemove={() => setImagePrompt(null)}
      />

      <UploadDialog
        open={isBackgroundDialogOpen}
        onOpenChange={setIsBackgroundDialogOpen}
        title="Референс фона"
        description="Предоставьте референс для настройки фона и окружения."
        onUpload={(file) => setBackgroundReference(file)}
        currentFile={backgroundReference}
        onRemove={() => setBackgroundReference(null)}
      />
    </div>
  );
}
