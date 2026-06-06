'use client';

import { useEffect, useState, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/logo';
import { XCircle } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface ProcessingStep {
  icon: string;
  text: string;
}

export interface ProcessingTip {
  text: string;
}

export interface ProcessingViewProps {
  /**
   * Current progress (0-100)
   */
  progress: number;

  /**
   * Processing steps to cycle through
   */
  steps?: ProcessingStep[];

  /**
   * Tips to show
   */
  tips?: ProcessingTip[];

  /**
   * Title text
   * @default "Создаём вашу генерацию"
   */
  title?: string;

  /**
   * Whether to show cancel button
   */
  canCancel?: boolean;

  /**
   * Callback when cancel is clicked
   */
  onCancel?: () => void;

  /**
   * Estimated time remaining (in seconds)
   */
  estimatedTime?: number;
}

// ============================================
// DEFAULT DATA
// ============================================

const DEFAULT_STEPS: ProcessingStep[] = [
  { icon: '📤', text: 'Загружаем изображения...' },
  { icon: '🧠', text: 'AI анализирует детали...' },
  { icon: '✨', text: 'Генерируем результат...' },
  { icon: '🎨', text: 'Финальная обработка...' },
];

const DEFAULT_TIPS: ProcessingTip[] = [
  { text: 'Используйте фото высокого разрешения для лучших результатов' },
  { text: 'Убедитесь, что освещение на фото равномерное' },
  { text: 'Фото в полный рост дают лучшие результаты' },
  { text: 'Нейтральный фон помогает AI работать точнее' },
];

// ============================================
// COMPONENT
// ============================================

export function ProcessingView({
  progress,
  steps = DEFAULT_STEPS,
  tips = DEFAULT_TIPS,
  title = 'Создаём вашу генерацию',
  canCancel = false,
  onCancel,
  estimatedTime,
}: ProcessingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Cycle through steps based on progress
  useEffect(() => {
    const stepSize = 100 / steps.length;
    const newIndex = Math.min(Math.floor(progress / stepSize), steps.length - 1);
    // Using startTransition to avoid synchronous setState in effect
    startTransition(() => {
      setCurrentStepIndex(newIndex);
    });
  }, [progress, steps.length]);

  // Cycle through tips every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const currentStep = steps[currentStepIndex];
  const currentTip = tips[currentTipIndex];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {/* Logo Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-8"
      >
        <div className="relative">
          <LogoIcon size="lg" className="w-24 h-24" />
          {/* Rotating glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>

      {/* Title */}
      <h2 className="text-2xl font-bold font-heading mb-2 text-center">
        {title}
      </h2>

      {/* Current Step */}
      <div className="h-12 mb-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-muted-foreground text-center flex items-center gap-2"
          >
            <span className="text-xl">{currentStep.icon}</span>
            {currentStep.text}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md space-y-3 mb-8">
        <Progress value={progress} className="h-3" />
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground font-heading">
            {Math.round(progress)}% готово
          </p>
          {estimatedTime !== undefined && estimatedTime > 0 && (
            <p className="text-muted-foreground">
              ~{Math.ceil(estimatedTime / 60)} мин
            </p>
          )}
        </div>
      </div>

      {/* Tips Card */}
      <Card className="max-w-md p-4 bg-muted/30 border-muted mb-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTipIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="text-sm text-muted-foreground text-center"
          >
            💡 <span className="font-medium">{currentTip.text}</span>
          </motion.p>
        </AnimatePresence>
      </Card>

      {/* Cancel Button */}
      {canCancel && onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground hover:text-destructive"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Отменить генерацию
        </Button>
      )}
    </div>
  );
}

// ============================================
// PRESET STEP CONFIGS
// ============================================

export const PROCESSING_STEPS = {
  PRODUCT_TO_MODEL: [
    { icon: '📤', text: 'Загружаем фото товара...' },
    { icon: '🤖', text: 'AI анализирует одежду...' },
    { icon: '👤', text: 'Создаём модель...' },
    { icon: '✨', text: 'Финальная обработка...' },
  ],

  TRY_ON: [
    { icon: '📤', text: 'Загружаем изображения...' },
    { icon: '🧠', text: 'AI анализирует позу модели...' },
    { icon: '🧵', text: 'Подгоняем одежду...' },
    { icon: '🎨', text: 'Рендерим освещение...' },
  ],

  MODEL_SWAP: [
    { icon: '📤', text: 'Загружаем изображение...' },
    { icon: '👤', text: 'Анализируем новую модель...' },
    { icon: '🔄', text: 'Заменяем лицо и тело...' },
    { icon: '✨', text: 'Сохраняем детали...' },
  ],

  FACE_TO_MODEL: [
    { icon: '📤', text: 'Загружаем фото лица...' },
    { icon: '🧠', text: 'Анализируем черты...' },
    { icon: '👗', text: 'Создаём тело и одежду...' },
    { icon: '🎨', text: 'Добавляем детали...' },
  ],

  MODEL_CREATE: [
    { icon: '📝', text: 'Читаем описание...' },
    { icon: '🎨', text: 'Генерируем внешность...' },
    { icon: '👗', text: 'Добавляем одежду...' },
    { icon: '✨', text: 'Финальные штрихи...' },
  ],

  EDIT: [
    { icon: '📤', text: 'Загружаем изображение...' },
    { icon: '🔍', text: 'Анализируем изменения...' },
    { icon: '✏️', text: 'Применяем правки...' },
    { icon: '🎨', text: 'Финальная обработка...' },
  ],

  VIDEO: [
    { icon: '📤', text: 'Загружаем изображение...' },
    { icon: '🎬', text: 'Генерируем кадры...' },
    { icon: '🎞️', text: 'Создаём анимацию...' },
    { icon: '🎨', text: 'Рендерим видео...' },
  ],

  BACKGROUND: [
    { icon: '📤', text: 'Загружаем изображение...' },
    { icon: '✂️', text: 'Отделяем объект от фона...' },
    { icon: '🎨', text: 'Создаём новый фон...' },
    { icon: '✨', text: 'Финальная обработка...' },
  ],

  // Alias for background_change type
  BACKGROUND_CHANGE: [
    { icon: '📤', text: 'Загружаем изображение...' },
    { icon: '✂️', text: 'Отделяем объект от фона...' },
    { icon: '🎨', text: 'Создаём новый фон...' },
    { icon: '✨', text: 'Финальная обработка...' },
  ],
};
