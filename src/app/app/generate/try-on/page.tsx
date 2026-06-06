/**
 * Try-On Page - Виртуальная примерка
 *
 * Примеряет одежду на фото модели
 *
 * @route /app/generate/try-on
 */

'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { User, Shirt, Sparkles, Info, Hand, Footprints, ImageIcon } from 'lucide-react';

import {
  SmartUploader,
  GenerationContainer,
  PROCESSING_STEPS,
  type UploadedFile,
  type GenerationState,
  type GenerationResult,
  type GenerationError,
} from '@/components/generation';

import { useAssetUpload } from '@/hooks/use-asset-upload';

// ============================================
// PAGE COMPONENT
// ============================================

export default function TryOnPage() {
  // Generation state
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  // Upload hooks
  const modelUpload = useAssetUpload();
  const garmentUpload = useAssetUpload();

  // Form state
  const [modelImage, setModelImage] = useState<UploadedFile | null>(null);
  const [modelS3Key, setModelS3Key] = useState<string | null>(null);
  const [modelMimeType, setModelMimeType] = useState<string | null>(null);

  const [garmentImage, setGarmentImage] = useState<UploadedFile | null>(null);
  const [garmentS3Key, setGarmentS3Key] = useState<string | null>(null);
  const [garmentMimeType, setGarmentMimeType] = useState<string | null>(null);

  const [category, setCategory] = useState<string>('auto');
  const [garmentPhotoType, setGarmentPhotoType] = useState<string>('auto');
  const [mode, setMode] = useState<string>('balanced');
  const [adjustHands, setAdjustHands] = useState(false);
  const [coverFeet, setCoverFeet] = useState(false);
  const [restoreBackground, setRestoreBackground] = useState(false);
  const [numSamples, setNumSamples] = useState<number>(1);

  // ============================================
  // HANDLERS
  // ============================================

  const handleModelUpload = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setModelImage({ file, preview });

      const asset = await modelUpload.uploadAsset(file, 'uploaded_model');
      if (asset) {
        setModelS3Key(asset.s3Key);
        setModelMimeType(asset.mimeType);
        toast.success('Фото модели загружено');
      }
    },
    [modelUpload]
  );

  const handleModelRemove = useCallback(() => {
    if (modelImage?.preview) {
      URL.revokeObjectURL(modelImage.preview);
    }
    setModelImage(null);
    setModelS3Key(null);
    setModelMimeType(null);
  }, [modelImage]);

  const handleGarmentUpload = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setGarmentImage({ file, preview });

      const asset = await garmentUpload.uploadAsset(file, 'uploaded_garment');
      if (asset) {
        setGarmentS3Key(asset.s3Key);
        setGarmentMimeType(asset.mimeType);
        toast.success('Фото одежды загружено');
      }
    },
    [garmentUpload]
  );

  const handleGarmentRemove = useCallback(() => {
    if (garmentImage?.preview) {
      URL.revokeObjectURL(garmentImage.preview);
    }
    setGarmentImage(null);
    setGarmentS3Key(null);
    setGarmentMimeType(null);
  }, [garmentImage]);

  const handleSubmit = useCallback(async () => {
    if (!modelS3Key || !garmentS3Key) {
      toast.error('Загрузите оба изображения');
      return;
    }

    setState('processing');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 1;
      });
    }, 300);

    try {
      const response = await fetch('/api/generate/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelS3Key,
          modelMimeType: modelMimeType || 'image/jpeg',
          garmentS3Key,
          garmentMimeType: garmentMimeType || 'image/jpeg',
          category,
          garmentPhotoType,
          mode,
          adjustHands,
          coverFeet,
          restoreBackground,
          numSamples,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка генерации');
      }

      const data = await response.json();
      await pollGenerationStatus(data.generationId);
    } catch {
      clearInterval(interval);
      setState('error');
      setError({
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        refunded: true,
      });
    }
  }, [
    modelS3Key,
    modelMimeType,
    garmentS3Key,
    garmentMimeType,
    category,
    garmentPhotoType,
    mode,
    adjustHands,
    coverFeet,
    restoreBackground,
    numSamples,
  ]);

  const pollGenerationStatus = useCallback(
    async (generationId: string) => {
      const maxAttempts = 60;
      let attempts = 0;

      const poll = async () => {
        attempts++;

        if (attempts > maxAttempts) {
          setState('error');
          setError({
            message: 'Превышено время ожидания генерации',
            refunded: true,
          });
          return;
        }

        try {
          const response = await fetch(`/api/generations/${generationId}`);
          const data = await response.json();

          if (data.status === 'COMPLETED') {
            setProgress(100);
            setState('result');
            setResult({
              id: generationId,
              imageUrl: data.outputs[0]?.url || '',
              originalUrl: modelImage?.preview,
              cost: data.cost,
              metadata: [
                { label: 'Категория', value: category },
                { label: 'Режим', value: mode },
              ],
            });
          } else if (data.status === 'FAILED') {
            setState('error');
            setError({
              message: data.errorReason || 'Генерация не удалась',
              refunded: true,
            });
          } else {
            setTimeout(poll, 5000);
          }
        } catch {
          setState('error');
          setError({
            message: 'Ошибка проверки статуса',
            refunded: true,
          });
        }
      };

      poll();
    },
    [modelImage, category, mode]
  );

  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  // ============================================
  // RENDER
  // ============================================

  const canSubmit =
    modelS3Key &&
    garmentS3Key &&
    !modelUpload.isUploading &&
    !garmentUpload.isUploading;

  return (
    <GenerationContainer
      type="virtual_tryon"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.TRY_ON}
      result={result}
      error={error}
      onReset={handleReset}
      showCompare={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Виртуальная примерка
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Примерьте одежду на модель
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Загрузите фото модели и одежды- AI создаст реалистичную примерку
          </p>
        </div>

        {/* Upload Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <SmartUploader
            title="Фото модели"
            description="Портрет или фото в полный рост"
            icon={User}
            value={modelImage}
            onUpload={handleModelUpload}
            onRemove={handleModelRemove}
            isUploading={modelUpload.isUploading}
            uploadProgress={modelUpload.progress?.percentage}
            aspectRatio="3/4"
          >
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">✓ Лицо видно</p>
              <p className="font-medium">✓ По пояс или полный рост</p>
              <p className="font-medium">✓ Нейтральный фон</p>
            </div>
          </SmartUploader>

          <SmartUploader
            title="Фото одежды"
            description="Фото товара или на человеке"
            icon={Shirt}
            value={garmentImage}
            onUpload={handleGarmentUpload}
            onRemove={handleGarmentRemove}
            isUploading={garmentUpload.isUploading}
            uploadProgress={garmentUpload.progress?.percentage}
            aspectRatio="3/4"
          >
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">✓ Одежда полностью видна</p>
              <p className="font-medium">✓ Светлый фон</p>
              <p className="font-medium">✓ Хорошее освещение</p>
            </div>
          </SmartUploader>
        </div>

        {/* Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Настройки примерки</h2>
          </div>

          <Separator />

          {/* Main Settings */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Категория одежды</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто-определение</SelectItem>
                  <SelectItem value="tops">Верх (топы, рубашки)</SelectItem>
                  <SelectItem value="bottoms">Низ (брюки, юбки)</SelectItem>
                  <SelectItem value="one-pieces">Платья, комбинезоны</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Garment Photo Type */}
            <div className="space-y-2">
              <Label>Тип фото одежды</Label>
              <Select value={garmentPhotoType} onValueChange={setGarmentPhotoType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто-определение</SelectItem>
                  <SelectItem value="model">На человеке</SelectItem>
                  <SelectItem value="flat-lay">На манекене/плоско</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <Label>Режим качества</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Быстро (15 сек)</SelectItem>
                  <SelectItem value="balanced">Баланс (20 сек)</SelectItem>
                  <SelectItem value="quality">Качество (30 сек)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Advanced Options */}
          <div className="space-y-4">
            <Label>Дополнительные опции</Label>

            <div className="space-y-3">
              <TooltipProvider>
                {/* Adjust Hands */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hand className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="adjustHands" className="cursor-pointer">
                      Коррекция рук
                    </Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Исправляет наложение рук на одежду</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    id="adjustHands"
                    checked={adjustHands}
                    onCheckedChange={setAdjustHands}
                  />
                </div>

                {/* Cover Feet */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="coverFeet" className="cursor-pointer">
                      Закрыть ноги
                    </Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Для длинных платьев и юбок в пол</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    id="coverFeet"
                    checked={coverFeet}
                    onCheckedChange={setCoverFeet}
                  />
                </div>

                {/* Restore Background */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="restoreBackground" className="cursor-pointer">
                      Сохранить фон
                    </Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Сохраняет оригинальный фон фотографии</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    id="restoreBackground"
                    checked={restoreBackground}
                    onCheckedChange={setRestoreBackground}
                  />
                </div>
              </TooltipProvider>
            </div>
          </div>

          {/* Number of Samples */}
          <div className="space-y-2">
            <Label>Количество вариантов</Label>
            <Select value={String(numSamples)} onValueChange={(v) => setNumSamples(Number(v))}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 вариант</SelectItem>
                <SelectItem value="2">2 варианта (+1 токен)</SelectItem>
                <SelectItem value="3">3 варианта (+2 токена)</SelectItem>
                <SelectItem value="4">4 варианта (+3 токена)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 text-lg font-semibold gradient-primary"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Примерить одежду
          <Badge variant="secondary" className="ml-3">
            {numSamples} токен{numSamples > 1 ? `a` : ''}
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
