'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { GripVertical } from 'lucide-react';
import { useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// ANIMATION CONSTANTS
// ============================================
const INITIAL_POSITION = 95; // Start showing mostly "Before"
const TARGET_POSITION = 35; // End position (shows more "After/Model")
const ANIMATION_DELAY = 500; // ms before animation starts
const ANIMATION_DURATION = 1500; // ms for the slide animation

interface BeforeAfterSliderProps {
  className?: string;
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  className,
  beforeImage = '/landing/clother.webp',
  afterImage = '/landing/model.webp',
  beforeLabel = 'Исходник',
  afterLabel = 'Готовая карточка',
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(INITIAL_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect when component enters viewport
  const isInView = useInView(containerRef, { once: true, amount: 0.5 });

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  // Cancel any ongoing animation
  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Handle user interaction - stops animation and gives control
  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      cancelAnimation();
    }
  }, [hasInteracted, cancelAnimation]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleInteraction();
      setIsDragging(true);
    },
    [handleInteraction]
  );

  // Handle click anywhere on the slider to move position
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      handleInteraction();
      handleMove(e.clientX);
    },
    [handleInteraction, handleMove]
  );

  // Handle touch start anywhere on the slider
  const handleContainerTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleInteraction();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
        setIsDragging(true);
      }
    },
    [handleInteraction, handleMove]
  );

  // Reveal animation when component enters viewport
  useEffect(() => {
    if (!isInView || hasInteracted) return;

    // Start animation after delay
    timeoutRef.current = setTimeout(() => {
      const startTime = performance.now();
      const startPosition = INITIAL_POSITION;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);
        const newPosition = startPosition + (TARGET_POSITION - startPosition) * eased;

        setSliderPosition(newPosition);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }, ANIMATION_DELAY);

    return () => {
      cancelAnimation();
    };
  }, [isInView, hasInteracted, cancelAnimation]);

  // Глобальные обработчики на document для сохранения захвата за пределами элемента
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleGlobalEnd = () => {
      setIsDragging(false);
    };

    // Добавляем слушатели на document
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('touchcancel', handleGlobalEnd);

    // Убираем слушатели при размонтировании или окончании drag
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [isDragging, handleMove]);

  // Determine if handle should pulse (invite interaction)
  const shouldPulse = !hasInteracted && !isDragging;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleInteraction}
      onClick={handleContainerClick}
      onTouchStart={handleContainerTouchStart}
      className={cn(
        'relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl overflow-hidden select-none shadow-2xl shadow-indigo-500/20 border border-slate-200',
        className
      )}
    >
      {/* Левая сторона - До (Исходник) */}
      <div className="absolute inset-0">
        <Image
          src={beforeImage}
          alt={beforeLabel}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
        />
        {/* Лейбл */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm text-white text-xs font-medium rounded-full">
          {beforeLabel}
        </div>
      </div>

      {/* Правая сторона - После (Готовая карточка) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        <Image
          src={afterImage}
          alt={afterLabel}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
        />
        {/* Лейбл */}
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-lg shadow-indigo-500/30">
          {afterLabel}
        </div>
      </div>

      {/* Разделитель и ручка */}
      <div
        className="absolute top-0 bottom-0 w-6 z-10 cursor-ew-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* Белая линия */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white shadow-lg" />

        {/* Круглая ручка с иконкой + пульсация до взаимодействия */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-indigo-500',
            isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-110 cursor-ew-resize',
            shouldPulse && 'animate-pulse-scale'
          )}
        >
          <GripVertical className="w-5 h-5 text-indigo-600" />
        </div>
      </div>

      {/* Подсказка внизу - скрывается при перетаскивании */}
      <div
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-2 transition-opacity',
          isDragging ? 'opacity-0' : 'opacity-100'
        )}
      >
        <span className="opacity-70">←</span>
        Перетащите для сравнения
        <span className="opacity-70">→</span>
      </div>
    </div>
  );
}
