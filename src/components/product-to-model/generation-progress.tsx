'use client';

import { useEffect, useState, useMemo, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Download,
  ImagePlus,
  Coins,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface NarrativeStep {
  label: string;
  duration: number; // seconds
}

export interface GenerationProgressProps {
  status: 'processing' | 'success' | 'error';
  progress: number;
  steps: NarrativeStep[];
  resultImageUrl?: string;
  errorMessage?: string;
  refunded?: boolean;
  onRetry?: () => void;
  onDownload?: () => void;
  onSaveToGallery?: () => void;
  onGenerateMore?: () => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function GenerationProgress({
  status,
  progress,
  steps,
  resultImageUrl,
  errorMessage = 'AI моргнул. Попробуем ещё раз?',
  refunded = true,
  onRetry,
  onDownload,
  onSaveToGallery,
  onGenerateMore,
  className,
}: GenerationProgressProps) {
  const [showRefundAnimation, setShowRefundAnimation] = useState(false);

  // Calculate current step based on progress using useMemo to avoid setState in useEffect
  const currentStepIndex = useMemo(() => {
    if (status !== 'processing') return 0;

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    let accumulatedDuration = 0;

    for (let i = 0; i < steps.length; i++) {
      accumulatedDuration += steps[i].duration;
      const stepThreshold = (accumulatedDuration / totalDuration) * 100;

      if (progress < stepThreshold) {
        return i;
      }
    }

    return steps.length - 1;
  }, [progress, steps, status]);

  // Show refund animation on error
  useEffect(() => {
    if (status === 'error' && refunded) {
      // Using startTransition to avoid synchronous setState in effect
      startTransition(() => {
        setShowRefundAnimation(true);
      });
      const timer = setTimeout(() => {
        startTransition(() => {
          setShowRefundAnimation(false);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, refunded]);

  if (status === 'processing') {
    return (
      <div className={cn('absolute inset-0 z-10', className)}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8"
        >
          {/* Animated Icon */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="mb-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          {/* Current Step */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-6"
            >
              <h3 className="text-xl font-semibold font-heading mb-2">
                {steps[currentStepIndex]?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                Шаг {currentStepIndex + 1} из {steps.length}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress Bar */}
          <div className="w-full max-w-md space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground font-heading">
              <span>Обработка...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center gap-2 mt-8">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  idx < currentStepIndex && 'w-8 bg-primary',
                  idx === currentStepIndex && 'w-12 bg-primary',
                  idx > currentStepIndex && 'w-6 bg-muted'
                )}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'success' && resultImageUrl) {
    return (
      <div className={cn('absolute inset-0 z-10', className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="mb-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </motion.div>

          <h3 className="text-xl font-semibold font-heading mb-2">Готово!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Ваше изображение успешно сгенерировано
          </p>

          {/* Result Preview */}
          <Card className="overflow-hidden mb-6 shadow-lg max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultImageUrl}
              alt="Result"
              className="w-full aspect-[3/4] object-cover"
            />
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {onDownload && (
              <Button onClick={onDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>
            )}
            {onSaveToGallery && (
              <Button onClick={onSaveToGallery} variant="outline" size="sm">
                <ImagePlus className="w-4 h-4 mr-2" />
                В галерею
              </Button>
            )}
            {onGenerateMore && (
              <Button onClick={onGenerateMore} className="gradient-primary" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Сделать ещё
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn('absolute inset-0 z-10', className)}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8"
        >
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
            className="mb-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </motion.div>

          <h3 className="text-xl font-semibold font-heading mb-2">{errorMessage}</h3>
          {refunded && (
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Токен возвращён
            </Badge>
          )}

          {/* Refund Animation */}
          <AnimatePresence>
            {showRefundAnimation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: -60 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2"
              >
                <Coins className="w-8 h-8 text-green-500" />
              </motion.div>
            )}
          </AnimatePresence>

          {onRetry && (
            <Button onClick={onRetry} className="gradient-primary mt-4" size="lg">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Попробовать ещё раз
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
}

// ============================================
// PREDEFINED STEPS
// ============================================

export const PRODUCT_TO_MODEL_STEPS: NarrativeStep[] = [
  { label: 'Анализируем товар...', duration: 4 },
  { label: 'Подбираем посадку...', duration: 5 },
  { label: 'Рендерим свет...', duration: 5 },
  { label: 'Финальные детали...', duration: 3 },
];
