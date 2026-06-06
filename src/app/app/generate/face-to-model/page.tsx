/**
 * Face-to-Model Page - Лицо → Модель
 *
 * Создает полноценное фото модели из фото лица
 *
 * @route /app/generate/face-to-model
 */

'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Sparkles, Lock } from 'lucide-react';

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

export default function FaceToModelPage() {
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  const faceUpload = useAssetUpload();

  const [faceImage, setFaceImage] = useState<UploadedFile | null>(null);
  const [faceS3Key, setFaceS3Key] = useState<string | null>(null);
  const [faceMimeType, setFaceMimeType] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('3:4');
  const [resolution, setResolution] = useState<string>('1k');

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

  const handleSubmit = useCallback(async () => {
    if (!faceS3Key) {
      toast.error('Загрузите фото лица');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Опишите желаемый образ');
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
      const response = await fetch('/api/generate/face-to-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceS3Key,
          faceMimeType: faceMimeType || 'image/jpeg',
          prompt,
          aspectRatio,
          resolution,
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
  }, [faceS3Key, faceMimeType, prompt, aspectRatio, resolution]);

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
              cost: data.cost,
              metadata: [
                { label: 'Разрешение', value: resolution },
                { label: 'Формат', value: aspectRatio },
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
    [resolution, aspectRatio]
  );

  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const canSubmit = faceS3Key && prompt.trim() && !faceUpload.isUploading;

  return (
    <GenerationContainer
      type="face_to_model"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.FACE_TO_MODEL}
      result={result}
      error={error}
      onReset={handleReset}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Лицо → Модель
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Создайте модель из фото лица
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Загрузите фото лица и опишите образ- AI создаст полноценное фото модели
          </p>
        </div>

        {/* Face Upload */}
        <div className="max-w-xl mx-auto">
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
          >
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">✓ Одно лицо в кадре</p>
              <p className="font-medium">✓ Хорошее освещение</p>
              <p className="font-medium">✓ Анфас (не профиль)</p>
            </div>
          </SmartUploader>
        </div>

        {/* Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Описание образа</h2>
          </div>

          <Separator />

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Описание одежды и образа <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              placeholder="Например: женщина в деловом костюме, стоит на белом фоне, улыбается..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Опишите желаемую одежду, позу, фон и настроение
            </p>
          </div>

          <Separator />

          {/* Format Settings */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Формат</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Квадрат)</SelectItem>
                  <SelectItem value="3:4">3:4 (Портрет)</SelectItem>
                  <SelectItem value="4:3">4:3 (Альбом)</SelectItem>
                  <SelectItem value="9:16">9:16 (Вертикаль)</SelectItem>
                  <SelectItem value="16:9">16:9 (Горизонталь)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Разрешение</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1k">1024px (Стандарт)</SelectItem>
                  <SelectItem value="4k">4096px (4K)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="p-4 bg-muted">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Приватность и безопасность</p>
              <p>
                Мы не храним ваши личные фото. Все данные удаляются через 72 часа после генерации.
              </p>
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
          <Sparkles className="w-5 h-5 mr-2" />
          Создать модель
          <Badge variant="secondary" className="ml-3">
            3 токена
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
