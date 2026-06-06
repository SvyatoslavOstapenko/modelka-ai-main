/**
 * Background Change Page - Замена фона
 *
 * Вырезает модель и помещает на новый фон
 * (фон можно загрузить или описать текстом)
 *
 * @route /app/generate/background-change
 */

'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Sparkles, Image as ImageIcon, Type, Lightbulb, Info } from 'lucide-react';

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
// BACKGROUND EXAMPLES
// ============================================

const BACKGROUND_EXAMPLES = [
  'Белый студийный фон с профессиональным освещением',
  'Розовый градиентный фон в минималистичном стиле',
  'Городская улица с размытым фоном, золотой час',
  'Природный пейзаж с зеленью и мягким светом',
  'Абстрактный геометрический фон в пастельных тонах',
];

// ============================================
// PAGE COMPONENT
// ============================================

export default function BackgroundChangePage() {
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  const sourceUpload = useAssetUpload();
  const backgroundUpload = useAssetUpload();

  const [sourceImage, setSourceImage] = useState<UploadedFile | null>(null);
  const [sourceS3Key, setSourceS3Key] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState<string | null>(null);

  const [backgroundImage, setBackgroundImage] = useState<UploadedFile | null>(null);
  const [backgroundS3Key, setBackgroundS3Key] = useState<string | null>(null);
  const [backgroundMimeType, setBackgroundMimeType] = useState<string | null>(null);

  const [backgroundMode, setBackgroundMode] = useState<'upload' | 'describe'>('describe');
  const [backgroundPrompt, setBackgroundPrompt] = useState('');

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

  const handleBackgroundUpload = useCallback(
    async (file: File) => {
      const preview = URL.createObjectURL(file);
      setBackgroundImage({ file, preview });

      const asset = await backgroundUpload.uploadAsset(file, 'uploaded_garment');
      if (asset) {
        setBackgroundS3Key(asset.s3Key);
        setBackgroundMimeType(asset.mimeType);
        toast.success('Фон загружен');
      }
    },
    [backgroundUpload]
  );

  const handleBackgroundRemove = useCallback(() => {
    if (backgroundImage?.preview) {
      URL.revokeObjectURL(backgroundImage.preview);
    }
    setBackgroundImage(null);
    setBackgroundS3Key(null);
    setBackgroundMimeType(null);
  }, [backgroundImage]);

  const handleSubmit = useCallback(async () => {
    if (!sourceS3Key) {
      toast.error('Загрузите исходное изображение');
      return;
    }

    if (backgroundMode === 'upload' && !backgroundS3Key) {
      toast.error('Загрузите изображение фона');
      return;
    }

    if (backgroundMode === 'describe' && !backgroundPrompt.trim()) {
      toast.error('Опишите желаемый фон');
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
        sourceMimeType: sourceMimeType || 'image/jpeg'
      };

      if (backgroundMode === 'upload' && backgroundS3Key) {
        body.backgroundS3Key = backgroundS3Key;
        body.backgroundMimeType = backgroundMimeType || 'image/jpeg';
      } else if (backgroundMode === 'describe' && backgroundPrompt) {
        body.prompt = backgroundPrompt;
      }

      const response = await fetch('/api/generate/background-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка замены фона');
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
  }, [sourceS3Key, sourceMimeType, backgroundMode, backgroundS3Key, backgroundMimeType, backgroundPrompt]);

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
                { label: 'Метод', value: backgroundMode === 'upload' ? 'Загруженный фон' : 'Сгенерированный фон' },
              ],
            });
          } else if (data.status === 'FAILED') {
            setState('error');
            setError({
              message: data.errorReason || 'Замена фона не удалась',
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
    [sourceImage, backgroundMode]
  );

  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const handleUseExample = useCallback((example: string) => {
    setBackgroundPrompt(example);
  }, []);

  const canSubmit =
    sourceS3Key &&
    !sourceUpload.isUploading &&
    !backgroundUpload.isUploading &&
    ((backgroundMode === 'upload' && backgroundS3Key) ||
      (backgroundMode === 'describe' && backgroundPrompt.trim()));

  return (
    <GenerationContainer
      type="background_change"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.BACKGROUND_CHANGE}
      result={result}
      error={error}
      onReset={handleReset}
      showCompare={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <ImageIcon className="w-4 h-4" />
            Замена фона
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Замените фон изображения
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Вырежем модель и поместим на новый фон с гармонизацией цвета и освещения
          </p>
        </div>

        {/* Source Image Upload */}
        <div className="max-w-xl mx-auto">
          <SmartUploader
            title="Исходное изображение"
            description="Фото модели или объекта"
            icon={ImageIcon}
            value={sourceImage}
            onUpload={handleSourceUpload}
            onRemove={handleSourceRemove}
            isUploading={sourceUpload.isUploading}
            uploadProgress={sourceUpload.progress?.percentage}
            aspectRatio="3/4"
          >
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">✓ Четкий объект/модель</p>
              <p className="font-medium">✓ Контрастный фон</p>
              <p className="font-medium">✓ Высокое качество</p>
            </div>
          </SmartUploader>
        </div>

        {/* Background Settings */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Новый фон</h2>
          </div>

          <Separator />

          <Tabs value={backgroundMode} onValueChange={(v) => setBackgroundMode(v as 'upload' | 'describe')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="describe" className="gap-2">
                <Type className="w-4 h-4" />
                Описать текстом
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                Загрузить фото
              </TabsTrigger>
            </TabsList>

            <TabsContent value="describe" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="backgroundPrompt">
                  Описание фона <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="backgroundPrompt"
                  placeholder="Опишите желаемый фон..."
                  value={backgroundPrompt}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Опишите цвета, стиль, атмосферу и детали фона
                </p>
              </div>

              {/* Examples */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Примеры описаний
                </Label>
                <div className="grid gap-2">
                  {BACKGROUND_EXAMPLES.map((example, index) => (
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
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <SmartUploader
                title="Фоновое изображение"
                description="Загрузите фото для фона"
                icon={ImageIcon}
                value={backgroundImage}
                onUpload={handleBackgroundUpload}
                onRemove={handleBackgroundRemove}
                isUploading={backgroundUpload.isUploading}
                uploadProgress={backgroundUpload.progress?.percentage}
                aspectRatio="16/9"
              />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-muted">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Как это работает</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>AI автоматически вырезает модель/объект</li>
                <li>Помещает на новый фон (загруженный или сгенерированный)</li>
                <li>Гармонизирует цвета и освещение</li>
                <li>Добавляет реалистичные тени и отражения</li>
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
          Заменить фон
          <Badge variant="secondary" className="ml-3">
            1 токен
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
