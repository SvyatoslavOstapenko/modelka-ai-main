/**
 * Edit Page - Редактирование изображений
 *
 * Позволяет изменять фото модели по текстовой инструкции
 * (поза, выражение лица, аксессуары, освещение, фон)
 *
 * @route /app/generate/edit
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
import { Sparkles, Wand2, Lightbulb, Image as ImageIcon } from 'lucide-react';

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
// EDIT EXAMPLES
// ============================================

const EDIT_EXAMPLES = [
  'Изменить позу: модель стоит с руками на бедрах',
  'Добавить улыбку и более естественное выражение лица',
  'Изменить фон на студийный белый',
  'Добавить солнечные очки и украшения',
  'Сделать освещение более мягким и теплым',
];

// ============================================
// PAGE COMPONENT
// ============================================

export default function EditPage() {
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  const sourceUpload = useAssetUpload();

  const [sourceImage, setSourceImage] = useState<UploadedFile | null>(null);
  const [sourceS3Key, setSourceS3Key] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<string>('1k');

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
      toast.error('Загрузите изображение для редактирования');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Опишите желаемые изменения');
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
      const response = await fetch('/api/generate/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceS3Key,
          sourceMimeType: sourceMimeType || 'image/jpeg',
          prompt,
          resolution,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка редактирования');
      }

      const data = await response.json();
      await pollGenerationStatus(data.generationId);
    } catch (error) {
      clearInterval(interval);
      setState('error');
      setError({
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        refunded: true,
      });
    }
  }, [sourceS3Key, sourceMimeType, prompt, resolution]);

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
              metadata: [
                { label: 'Разрешение', value: resolution },
              ],
            });
          } else if (data.status === 'FAILED') {
            setState('error');
            setError({
              message: data.errorReason || 'Редактирование не удалось',
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
    [sourceImage, resolution]
  );

  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const handleUseExample = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  const canSubmit = sourceS3Key && prompt.trim() && !sourceUpload.isUploading;

  return (
    <GenerationContainer
      type="edit"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.EDIT}
      result={result}
      error={error}
      onReset={handleReset}
      showCompare={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Wand2 className="w-4 h-4" />
            Редактирование
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Отредактируйте изображение
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Загрузите фото и опишите желаемые изменения- AI внесет правки в изображение
          </p>
        </div>

        {/* Source Image Upload */}
        <div className="max-w-xl mx-auto">
          <SmartUploader
            title="Исходное изображение"
            description="Фото модели для редактирования"
            icon={ImageIcon}
            value={sourceImage}
            onUpload={handleSourceUpload}
            onRemove={handleSourceRemove}
            isUploading={sourceUpload.isUploading}
            uploadProgress={sourceUpload.progress?.percentage}
            aspectRatio="3/4"
          >
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">✓ Четкое изображение</p>
              <p className="font-medium">✓ Хорошее освещение</p>
              <p className="font-medium">✓ Высокое разрешение</p>
            </div>
          </SmartUploader>
        </div>

        {/* Edit Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Инструкция по редактированию</h2>
          </div>

          <Separator />

          {/* Edit Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Что изменить <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              placeholder="Опишите желаемые изменения..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Опишите конкретные изменения: поза, выражение лица, аксессуары, освещение, фон
            </p>
          </div>

          {/* Edit Examples */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Примеры инструкций
            </Label>
            <div className="grid gap-2">
              {EDIT_EXAMPLES.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleUseExample(example)}
                  className="text-left p-3 text-sm border border-border rounded-lg hover:bg-accent hover:border-primary transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Resolution */}
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
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-muted">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Как это работает</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>AI анализирует исходное изображение</li>
                <li>Понимает вашу инструкцию</li>
                <li>Вносит изменения, сохраняя общую композицию</li>
                <li>Результат выглядит естественно и реалистично</li>
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
          Отредактировать
          <Badge variant="secondary" className="ml-3">
            2 токена
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
