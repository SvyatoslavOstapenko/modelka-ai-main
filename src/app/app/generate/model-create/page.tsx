/**
 * Model Create Page - Создание модели из текста
 *
 * Генерирует AI модель на основе текстового описания (text-to-image)
 *
 * @route /app/generate/model-create
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
import { Sparkles, Lightbulb, Wand2 } from 'lucide-react';

import {
  GenerationContainer,
  PROCESSING_STEPS,
  type GenerationState,
  type GenerationResult,
  type GenerationError,
} from '@/components/generation';

// ============================================
// STYLE PRESETS
// ============================================

const STYLE_PRESETS = [
  { value: 'realistic', label: 'Реалистичный' },
  { value: 'fashion', label: 'Модный' },
  { value: 'editorial', label: 'Редакционный' },
  { value: 'commercial', label: 'Коммерческий' },
  { value: 'artistic', label: 'Художественный' },
];

const EXAMPLE_PROMPTS = [
  'Молодая девушка в элегантном черном платье, студийное освещение, профессиональная фотосъемка',
  'Мужчина в деловом костюме, уверенная поза, белый фон, высокое качество',
  'Модель в повседневной одежде, естественная поза, мягкое освещение',
];

// ============================================
// PAGE COMPONENT
// ============================================

export default function ModelCreatePage() {
  const [state, setState] = useState<GenerationState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState<string>('realistic');
  const [aspectRatio, setAspectRatio] = useState<string>('3:4');
  const [resolution, setResolution] = useState<string>('1k');
  const [numSamples, setNumSamples] = useState<number>(1);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Опишите желаемую модель');
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
      const response = await fetch('/api/generate/model-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt: negativePrompt || undefined,
          style,
          aspectRatio,
          resolution,
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
  }, [prompt, negativePrompt, style, aspectRatio, resolution, numSamples]);

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
                { label: 'Стиль', value: style },
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
    [style, resolution, aspectRatio]
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

  const canSubmit = prompt.trim().length > 0;

  return (
    <GenerationContainer
      type="model_create"
      state={state}
      progress={progress}
      processingSteps={PROCESSING_STEPS.MODEL_CREATE}
      result={result}
      error={error}
      onReset={handleReset}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Wand2 className="w-4 h-4" />
            Создание модели
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
            Сгенерируйте AI модель из текста
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Опишите желаемую модель, одежду и обстановку- AI создаст реалистичное изображение
          </p>
        </div>

        {/* Main Settings Card */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Описание модели</h2>
          </div>

          <Separator />

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Описание <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              placeholder="Опишите модель, одежду, позу, фон и освещение..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Чем подробнее описание, тем точнее результат. Укажите внешность, одежду, позу, фон, освещение.
            </p>
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Примеры промптов
            </Label>
            <div className="grid gap-2">
              {EXAMPLE_PROMPTS.map((example, index) => (
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

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">Исключить (опционально)</Label>
            <Textarea
              id="negativePrompt"
              placeholder="Что НЕ должно быть на изображении..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Например: плохое качество, размытие, искажения
            </p>
          </div>

          <Separator />

          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Стиль</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Format Settings */}
          <div className="grid md:grid-cols-3 gap-4">
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

            <div className="space-y-2">
              <Label>Количество вариантов</Label>
              <Select value={String(numSamples)} onValueChange={(v) => setNumSamples(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 вариант</SelectItem>
                  <SelectItem value="2">2 варианта</SelectItem>
                  <SelectItem value="3">3 варианта</SelectItem>
                  <SelectItem value="4">4 варианта</SelectItem>
                </SelectContent>
              </Select>
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
            2 токена
          </Badge>
        </Button>
      </div>
    </GenerationContainer>
  );
}
