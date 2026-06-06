/**
 * Video Page - Image to Video
 *
 * Превращает статичное изображение в короткое видео (5-10 секунд)
 * с эффектом оживления
 *
 * @route /app/generate/video
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { Sparkles, Video, Info, Image as ImageIcon } from 'lucide-react';

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
// PRICING CONFIG
// ============================================

const VIDEO_PRICING: Record<string, Record<string, number>> = {
  '5': {
    '480p': 1,
    '720p': 3,
    '1080p': 6,
  },
  '10': {
    '480p': 2,
    '720p': 6,
    '1080p': 12,
  },
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function VideoPage() {
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  const sourceUpload = useAssetUpload();

  const [sourceImage, setSourceImage] = useState<UploadedFile | null>(null);
  const [sourceS3Key, setSourceS3Key] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<string>('5');
  const [resolution, setResolution] = useState<string>('1080p');

  const creditCost = useMemo(() => {
    return VIDEO_PRICING[duration]?.[resolution] || 6;
  }, [duration, resolution]);

  const handleSourceUpload = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setSourceImage({ file, preview });

      const asset = await sourceUpload.uploadAsset(file, 'uploaded_model');
      if (asset) {
        setSourceS3Key(asset.s3Key);
        setSourceMimeType(asset.mimeType);
        toast.success('Изображение загружено');
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

  const handleSubmit = useCallback(async () => {
    if (!sourceS3Key) {
      toast.error('Загрузите изображение');
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
        return prev + 0.5; // Slower progress for video
      });
    }, 500);

    try {
      const response = await fetch('/api/generate/image-to-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceS3Key,
          sourceMimeType: sourceMimeType || 'image/jpeg',
          prompt: prompt || undefined,
          duration,
          resolution,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка генерации видео');
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
  }, [sourceS3Key, sourceMimeType, prompt, duration, resolution]);

  const pollGenerationStatus = useCallback(
    async (generationId: string) => {
      const maxAttempts = 120; // Video takes longer
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
              imageUrl: data.outputs[0]?.url || '', // Actually a video URL
              originalUrl: sourceImage?.preview,
              cost: data.cost,
              metadata: [
                { label: 'Длительность', value: `${duration} сек` },
                { label: 'Разрешение', value: resolution },
              ],
            });
          } else if (data.status === 'FAILED') {
            setState('error');
            setError({
              message: data.errorReason || 'Генерация видео не удалась',
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
    [sourceImage, duration, resolution]
  );

  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const canSubmit = sourceS3Key && !sourceUpload.isUploading;

  return (
    <GenerationContainer
      type="image_to_video"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.VIDEO}
      result={result}
      error={error}
      onReset={handleReset}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Video className="w-4 h-4" />
            Изображение → Видео
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Оживите изображение
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Превратите статичное фото в короткое видео с реалистичными движениями
          </p>
        </div>

        {/* Source Image Upload */}
        <div className="max-w-xl mx-auto">
          <SmartUploader
            title="Исходное изображение"
            description="Фото модели для анимации"
            icon={ImageIcon}
            value={sourceImage}
            onUpload={handleSourceUpload}
            onRemove={handleSourceRemove}
            isUploading={sourceUpload.isUploading}
            uploadProgress={sourceUpload.progress?.percentage}
            aspectRatio="9/16"
          >
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">✓ Одна модель в кадре</p>
              <p className="font-medium">✓ Хорошее освещение</p>
              <p className="font-medium">✓ Высокое разрешение</p>
              <p className="font-medium">✓ Вертикальный формат (9:16)</p>
            </div>
          </SmartUploader>
        </div>

        {/* Video Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Параметры видео</h2>
          </div>

          <Separator />

          {/* Motion Prompt (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Описание движения (опционально)</Label>
            <Textarea
              id="prompt"
              placeholder="Например: легкое покачивание, улыбка, движение волос..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Оставьте пустым для автоматического определения естественных движений
            </p>
          </div>

          <Separator />

          {/* Video Settings Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Длительность</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 секунд</SelectItem>
                  <SelectItem value="10">10 секунд</SelectItem>
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
                  <SelectItem value="480p">480p (SD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Стоимость генерации:</span>
              <Badge variant="secondary" className="text-base">
                {creditCost} {creditCost === 1 ? 'токен' : creditCost < 5 ? 'токена' : 'токенов'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-muted">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Важная информация</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Генерация видео занимает 1-3 минуты</li>
                <li>Лучше всего работает с вертикальными изображениями (9:16)</li>
                <li>Модель должна быть четко видна на изображении</li>
                <li>Видео будет содержать естественные движения и мимику</li>
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
          <Sparkles className="w-5 h-5 mr-2" />
          Создать видео
          <Badge variant="secondary" className="ml-3">
            {creditCost} {creditCost === 1 ? 'токен' : creditCost < 5 ? 'токена' : 'токенов'}
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
