'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Download,
  RefreshCw,
  Sparkles,
  ArrowLeftRight,
  Share2,
  Eye,
  ImagePlus,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface ResultAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
}

export interface ResultViewProps {
  /**
   * URL of the generated result image
   */
  resultUrl: string;

  /**
   * Optional original image URL for comparison
   */
  originalUrl?: string;

  /**
   * Title to display
   * @default "Готово!"
   */
  title?: string;

  /**
   * Description text
   */
  description?: string;

  /**
   * Primary actions (e.g., Download, Save)
   */
  primaryActions?: ResultAction[];

  /**
   * Secondary actions (e.g., New generation, Share)
   */
  secondaryActions?: ResultAction[];

  /**
   * Whether to show compare slider
   * Requires originalUrl to be provided
   */
  showCompare?: boolean;

  /**
   * Custom success message
   */
  successMessage?: string;

  /**
   * Generation metadata to display
   */
  metadata?: {
    label: string;
    value: string;
  }[];

  /**
   * Cost in credits
   */
  cost?: number;

  /**
   * Custom className
   */
  className?: string;
}

// ============================================
// COMPARE SLIDER
// ============================================

interface CompareSliderProps {
  beforeImage: string;
  afterImage: string;
}

function CompareSlider({ beforeImage, afterImage }: CompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-ew-resize select-none group"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Before Image */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeImage} alt="До" className="w-full h-full object-cover" />
      </div>

      {/* After Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterImage} alt="После" className="w-full h-full object-cover" />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <ArrowLeftRight className="w-6 h-6 text-slate-600" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
        Оригинал
      </div>
      <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
        Результат
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ResultView({
  resultUrl,
  originalUrl,
  title = 'Готово!',
  description = 'Ваше изображение успешно сгенерировано',
  primaryActions,
  secondaryActions,
  showCompare = false,
  successMessage,
  metadata,
  cost,
  className,
}: ResultViewProps) {
  const [viewMode, setViewMode] = useState<'result' | 'compare'>(
    showCompare && originalUrl ? 'compare' : 'result'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-6', className)}
    >
      {/* Success Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-emerald-600" />
        </motion.div>

        <h2 className="text-2xl font-bold font-heading mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <Badge variant="secondary" className="gap-1.5 px-4 py-2">
              <Sparkles className="w-4 h-4" />
              {successMessage}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* View Toggle (if compare is available) */}
      {showCompare && originalUrl && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={viewMode === 'result' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('result')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Результат
          </Button>
          <Button
            variant={viewMode === 'compare' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('compare')}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Сравнить
          </Button>
        </div>
      )}

      {/* Image Display */}
      <div className="max-w-2xl mx-auto">
        {viewMode === 'compare' && originalUrl ? (
          <CompareSlider beforeImage={originalUrl} afterImage={resultUrl} />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="Результат генерации"
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}
      </div>

      {/* Metadata */}
      {metadata && metadata.length > 0 && (
        <Card className="p-4 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metadata.map((item, idx) => (
              <div key={idx} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-semibold">{item.value}</p>
              </div>
            ))}
            {cost !== undefined && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Стоимость</p>
                <p className="font-semibold">{cost} токенов</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Primary Actions */}
      {primaryActions && primaryActions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {primaryActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Button
                key={idx}
                onClick={action.onClick}
                variant={action.variant || 'default'}
                size="lg"
                className={cn('flex-1 h-12', action.className)}
              >
                <Icon className="w-5 h-5 mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Secondary Actions */}
      {secondaryActions && secondaryActions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {secondaryActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Button
                key={idx}
                onClick={action.onClick}
                variant={action.variant || 'ghost'}
                size="sm"
                className={action.className}
              >
                <Icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-muted-foreground text-center">
          💡 <span className="font-medium">Совет:</span> Попробуйте разные настройки для получения различных вариантов
        </p>
      </Card>
    </motion.div>
  );
}

// ============================================
// PRESET ACTIONS
// ============================================

export const createDefaultActions = (
  onDownload: () => void,
  onSaveToGallery: () => void,
  onNewGeneration: () => void
): { primary: ResultAction[]; secondary: ResultAction[] } => ({
  primary: [
    {
      label: 'Скачать HD',
      icon: Download,
      onClick: onDownload,
      variant: 'default',
      className: 'gradient-primary',
    },
    {
      label: 'В галерею',
      icon: ImagePlus,
      onClick: onSaveToGallery,
      variant: 'outline',
    },
  ],
  secondary: [
    {
      label: 'Новая генерация',
      icon: RefreshCw,
      onClick: onNewGeneration,
      variant: 'ghost',
    },
    {
      label: 'Поделиться',
      icon: Share2,
      onClick: () => {
        /* Share logic */
      },
      variant: 'ghost',
    },
  ],
});
