/**
 * Model Swap Page - Замена модели
 *
 * Меняет модель на фото, сохраняя одежду, позу и фон
 *
 * @route /app/generate/model-swap
 */

'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Shuffle, User, ImageIcon, Sparkles, Info } from 'lucide-react';

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

export default function ModelSwapPage() {
  // Generation state
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  // Upload hooks
  const sourceUpload = useAssetUpload();
  const faceUpload = useAssetUpload();
  const modelUpload = useAssetUpload();

  // Form state
  const [sourceImage, setSourceImage] = useState<UploadedFile | null>(null);
  const [sourceS3Key, setSourceS3Key] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string | null>(null);

  const [faceImage, setFaceImage] = useState<UploadedFile | null>(null);
  const [faceS3Key, setFaceS3Key] = useState<string | null>(null);
  const [faceMimeType, setFaceMimeType] = useState<string | null>(null);

  const [modelImage, setModelImage] = useState<UploadedFile | null>(null);
  const [modelS3Key, setModelS3Key] = useState<string | null>(null);
  const [modelMimeType, setModelMimeType] = useState<string | null>(null);

  const [referenceType, setReferenceType] = useState<'face' | 'model'>('face');

  // ============================================
  // HANDLERS
  // ============================================

  const handleSourceUpload = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setSourceImage({ file, preview });

      const asset = await sourceUpload.uploadAsset(file, 'uploaded_model');
      if (asset) {
        setSourceS3Key(asset.s3Key);
        setSourceMimeType(asset.mimeType);
        toast.success('Исходное фото загружено');
      }
    },
    [sourceUpload]
  );

  const handleSourceRemove = useCallback(() => {
    if (sourceImage?.preview) {
      URL.revokeObjectURL(sourceImage.preview);
    }
    setSourceImage(null);
    setSourceS3Key(null);
    setSourceMimeType(null);
  }, [sourceImage]);

  const handleFaceUpload = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setFaceImage({ file, preview });

      const asset = await faceUpload.uploadAsset(file, 'uploaded_model');
      if (asset) {
        setFaceS3Key(asset.s3Key);
        setFaceMimeType(asset.mimeType);
        toast.success('Фото лица загружено');
      }
    },
    [faceUpload]
  );

  const handleFaceRemove = useCallback(() => {
    if (faceImage?.preview) {
      URL.revokeObjectURL(faceImage.preview);
    }
    setFaceImage(null);
    setFaceS3Key(null);
    setFaceMimeType(null);
  }, [faceImage]);

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

  const handleSubmit = useCallback(async () => {
    if (!sourceS3Key) {
      toast.error('Загрузите исходное фото');
      return;
    }

    if (referenceType === 'face' && !faceS3Key) {
      toast.error('Загрузите фото лица');
      return;
    }

    if (referenceType === 'model' && !modelS3Key) {
      toast.error('Загрузите фото модели');
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
      const body: Record<string, string> = {
        sourceS3Key,
        sourceMimeType: sourceMimeType || 'image/jpeg',
      };

      if (referenceType === 'face' && faceS3Key) {
        body.faceReferenceS3Key = faceS3Key;
        body.faceReferenceMimeType = faceMimeType || 'image/jpeg';
      } else if (referenceType === 'model' && modelS3Key) {
        body.modelS3Key = modelS3Key;
        body.modelMimeType = modelMimeType || 'image/jpeg';
      }

      const response = await fetch('/api/generate/model-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  }, [sourceS3Key, sourceMimeType, faceS3Key, faceMimeType, modelS3Key, modelMimeType, referenceType]);

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
              originalUrl: sourceImage?.preview,
              cost: data.cost,
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
    [sourceImage]
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
    sourceS3Key &&
    ((referenceType === 'face' && faceS3Key) || (referenceType === 'model' && modelS3Key)) &&
    !sourceUpload.isUploading &&
    !faceUpload.isUploading &&
    !modelUpload.isUploading;

  return (
    <GenerationContainer
      type="model_swap"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.MODEL_SWAP}
      result={result}
      error={error}
      onReset={handleReset}
      showCompare={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Shuffle className="w-4 h-4" />
            Замена модели
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Замените модель на фото
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Сохраняем одежду, позу и фон- меняем только внешность человека
          </p>
        </div>

        {/* Source Image */}
        <div className="max-w-xl mx-auto">
          <SmartUploader
            title="Исходное фото"
            description="Фото с моделью, одежду и позу которой нужно сохранить"
            icon={ImageIcon}
            value={sourceImage}
            onUpload={handleSourceUpload}
            onRemove={handleSourceRemove}
            isUploading={sourceUpload.isUploading}
            uploadProgress={sourceUpload.progress?.percentage}
            aspectRatio="3/4"
          />
        </div>

        {/* Reference Selection */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Новая модель</h2>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Тип референса</Label>
              <Tabs
                value={referenceType}
                onValueChange={(v) => setReferenceType(v as 'face' | 'model')}
              >
                <TabsList>
                  <TabsTrigger value="face">Фото лица</TabsTrigger>
                  <TabsTrigger value="model">Полное фото</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {referenceType === 'face' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <p>Загрузите портретное фото лица, которое нужно использовать</p>
                </div>
                <SmartUploader
                  title="Фото лица"
                  description="Портрет анфас, нейтральное выражение"
                  icon={User}
                  value={faceImage}
                  onUpload={handleFaceUpload}
                  onRemove={handleFaceRemove}
                  isUploading={faceUpload.isUploading}
                  uploadProgress={faceUpload.progress?.percentage}
                  aspectRatio="1/1"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <p>Загрузите полное фото модели с нужной внешностью</p>
                </div>
                <SmartUploader
                  title="Фото модели"
                  description="Полное фото в той же позе"
                  icon={User}
                  value={modelImage}
                  onUpload={handleModelUpload}
                  onRemove={handleModelRemove}
                  isUploading={modelUpload.isUploading}
                  uploadProgress={modelUpload.progress?.percentage}
                  aspectRatio="3/4"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-medium">Как это работает:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>AI сохранит одежду, позу и фон с исходного фото</li>
                <li>Лицо и внешность будут заменены на новую модель</li>
                <li>Освещение автоматически адаптируется</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 text-lg font-semibold gradient-primary"
          size="lg"
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Заменить модель
          <Badge variant="secondary" className="ml-3">
            2 токена
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
