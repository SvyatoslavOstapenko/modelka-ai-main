/**
 * Gallery Client Component
 *
 * Interactive gallery view for completed generations
 */

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

type GenerationType =
  | 'product_to_model'
  | 'virtual_tryon'
  | 'model_swap'
  | 'face_to_model'
  | 'model_create'
  | 'model_variation'
  | 'edit'
  | 'reframe'
  | 'image_to_video'
  | 'background_change';

interface Generation {
  id: string;
  type: GenerationType;
  createdAt: string;
  outputs: Array<{ url: string }>;
  parameters?: Record<string, unknown>;
}

interface GalleryClientProps {
  generations: Generation[];
}

// ============================================
// TYPE LABELS
// ============================================

const TYPE_LABELS: Record<GenerationType, string> = {
  product_to_model: 'Товар → Модель',
  virtual_tryon: 'Примерка',
  model_swap: 'Замена модели',
  face_to_model: 'Лицо → Модель',
  model_create: 'Создание модели',
  model_variation: 'Вариация модели',
  edit: 'Редактирование',
  reframe: 'Рефрейм',
  image_to_video: 'Видео',
  background_change: 'Замена фона',
};

// ============================================
// COMPONENT
// ============================================

export function GalleryClient({ generations }: GalleryClientProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredGenerations = useMemo(() => {
    if (filterType === 'all') {
      return generations;
    }
    return generations.filter((gen) => gen.type === filterType);
  }, [generations, filterType]);

  const handleDownload = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `modelka-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (generations.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading">Галерея пуста</h2>
          <p className="text-muted-foreground max-w-md">
            Здесь будут отображаться ваши завершенные генерации. Создайте первое изображение!
          </p>
        </div>
        <Button asChild className="mt-4">
          <a href="/app">
            <Sparkles className="w-4 h-4 mr-2" />
            Начать генерацию
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">Галерея</h1>
          <p className="text-muted-foreground mt-1">
            {filteredGenerations.length} {filteredGenerations.length === 1 ? 'изображение' : 'изображений'}
          </p>
        </div>

        {/* Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGenerations.map((generation) => (
          <Card key={generation.id} className="group overflow-hidden">
            {/* Image */}
            <div className="relative aspect-[3/4] bg-muted">
              <Image
                src={generation.outputs[0].url}
                alt="Generated image"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(generation.outputs[0].url, generation.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {TYPE_LABELS[generation.type as GenerationType]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(generation.createdAt), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredGenerations.length === 0 && filterType !== 'all' && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Нет генераций этого типа
          </p>
        </div>
      )}
    </div>
  );
}
