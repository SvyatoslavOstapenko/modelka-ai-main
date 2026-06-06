'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProcessingView, ProcessingStep } from './processing-view';
import { ResultView, ResultAction } from './result-view';
import { toast } from 'sonner';
import { Download, ImagePlus, RefreshCw, AlertTriangle } from 'lucide-react';
import type { GenerationType } from '@/db/schema';

// ============================================
// TYPES
// ============================================

export type GenerationState = 'idle' | 'processing' | 'result' | 'error';

export interface GenerationResult {
  id: string;
  imageUrl: string;
  originalUrl?: string;
  metadata?: {
    label: string;
    value: string;
  }[];
  cost?: number;
}

export interface GenerationError {
  message: string;
  code?: string;
  refunded?: boolean;
}

export interface GenerationContainerProps {
  /**
   * Type of generation
   */
  type: GenerationType;

  /**
   * Form component to render in idle state
   */
  children: React.ReactNode;

  /**
   * Current generation state
   */
  state: GenerationState;

  /**
   * Processing progress (0-100)
   */
  progress?: number;

  /**
   * Processing steps specific to this generation type
   */
  processingSteps?: ProcessingStep[];

  /**
   * Result data when generation is complete
   */
  result?: GenerationResult | null;

  /**
   * Error data when generation fails
   */
  error?: GenerationError | null;

  /**
   * Callback to reset to idle state
   */
  onReset: () => void;

  /**
   * Callback to download result
   */
  onDownload?: (result: GenerationResult) => void;

  /**
   * Callback to save to gallery
   */
  onSaveToGallery?: (result: GenerationResult) => void;

  /**
   * Whether generation can be cancelled
   */
  canCancel?: boolean;

  /**
   * Callback to cancel generation
   */
  onCancel?: () => void;

  /**
   * Show comparison slider in result view
   */
  showCompare?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function GenerationContainer({
  type,
  children,
  state,
  progress = 0,
  processingSteps,
  result,
  error,
  onReset,
  onDownload,
  onSaveToGallery,
  canCancel = false,
  onCancel,
  showCompare = false,
}: GenerationContainerProps) {
  // Default download handler
  const handleDownload = useCallback(() => {
    if (!result) return;

    if (onDownload) {
      onDownload(result);
    } else {
      // Default download implementation
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `modelka-ai-${type}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Скачивание началось', {
        description: 'Ваше HD изображение готовится',
      });
    }
  }, [result, onDownload, type]);

  // Default save to gallery handler
  const handleSaveToGallery = useCallback(() => {
    if (!result) return;

    if (onSaveToGallery) {
      onSaveToGallery(result);
    } else {
      // Default save implementation (placeholder)
      toast.success('Сохранено в галерею', {
        description: 'Найдите это в вашей галерее',
      });
    }
  }, [result, onSaveToGallery]);

  // Primary result actions
  const primaryActions: ResultAction[] = [
    {
      label: 'Скачать HD',
      icon: Download,
      onClick: handleDownload,
      variant: 'default',
      className: 'gradient-primary',
    },
    {
      label: 'В галерею',
      icon: ImagePlus,
      onClick: handleSaveToGallery,
      variant: 'outline',
    },
  ];

  // Secondary result actions
  const secondaryActions: ResultAction[] = [
    {
      label: 'Новая генерация',
      icon: RefreshCw,
      onClick: onReset,
      variant: 'ghost',
    },
  ];

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <AnimatePresence mode="wait">
        {state === 'processing' ? (
          // Processing State
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8">
              <ProcessingView
                progress={progress}
                steps={processingSteps}
                canCancel={canCancel}
                onCancel={onCancel}
              />
            </Card>
          </motion.div>
        ) : state === 'result' && result ? (
          // Result State
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8">
              <ResultView
                resultUrl={result.imageUrl}
                originalUrl={result.originalUrl}
                primaryActions={primaryActions}
                secondaryActions={secondaryActions}
                showCompare={showCompare}
                metadata={result.metadata}
                cost={result.cost}
              />
            </Card>
          </motion.div>
        ) : state === 'error' && error ? (
          // Error State
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold font-heading mb-2 text-destructive">
                    Генерация не удалась
                  </h2>
                  <p className="text-muted-foreground">{error.message}</p>
                </div>

                {error.refunded && (
                  <Card className="p-4 bg-muted/30 max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground text-center">
                      💰 Токены за эту генерацию были автоматически возвращены
                    </p>
                  </Card>
                )}

                <Button onClick={onReset} size="lg" className="gradient-primary">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Попробовать снова
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          // Idle State (Form)
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
