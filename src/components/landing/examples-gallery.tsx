'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BeforeAfterSlider } from './before-after-slider';
import { Lightbulb } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ============================================
// ДАННЫЕ ПРИМЕРОВ ПО КАТЕГОРИЯМ
// Порядок: по визуальному импакту (High-Ticket → Mass Market)
// ============================================

interface ExampleData {
  id: string;
  label: string;
  beforeImage: string;
  afterImage: string;
}

// Единые лейблы для всех слайдеров
const SLIDER_LABELS = {
  before: 'Исходник (Товар)',
  after: 'Результат (На модели)',
} as const;

const EXAMPLES_DATA: Record<string, ExampleData> = {
  dresses: {
    id: 'dresses',
    label: 'Платья',
    beforeImage: '/images/examples/dress-before.webp',
    afterImage: '/images/examples/dress-after.webp',
  },
  outerwear: {
    id: 'outerwear',
    label: 'Верхняя одежда',
    beforeImage: '/images/examples/outerwear-before.webp',
    afterImage: '/images/examples/outerwear-after.webp',
  },
  suits: {
    id: 'suits',
    label: 'Деловые костюмы',
    beforeImage: '/images/examples/suit-before.webp',
    afterImage: '/images/examples/suit-after.webp',
  },
  street: {
    id: 'street',
    label: 'Повседневная одежда',
    beforeImage: '/images/examples/street-before.webp',
    afterImage: '/images/examples/street-after.webp',
  },
  sport: {
    id: 'sport',
    label: 'Спорт и отдых',
    beforeImage: '/images/examples/sport-before.webp',
    afterImage: '/images/examples/sport-after.webp',
  },
  bags: {
    id: 'bags',
    label: 'Сумки и аксессуары',
    beforeImage: '/images/examples/bag-before.webp',
    afterImage: '/images/examples/bag-after.webp',
  },
};

const TABS_ORDER = ['dresses', 'outerwear', 'suits', 'street', 'sport', 'bags'] as const;

// ============================================
// PLACEHOLDER КОМПОНЕНТ (если изображение не загружено)
// ============================================

interface PlaceholderImageProps {
  type: 'before' | 'after';
  categoryLabel: string;
}

function PlaceholderImage({ type, categoryLabel }: PlaceholderImageProps) {
  const label = type === 'before' ? SLIDER_LABELS.before : SLIDER_LABELS.after;
  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center',
        type === 'before' ? 'bg-slate-200' : 'bg-indigo-100'
      )}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-3',
          type === 'before' ? 'bg-slate-300' : 'bg-indigo-200'
        )}
      >
        <span className="text-2xl">{type === 'before' ? '👕' : '👤'}</span>
      </div>
      <span
        className={cn(
          'text-sm font-medium text-center px-2',
          type === 'before' ? 'text-slate-500' : 'text-indigo-600'
        )}
      >
        {categoryLabel}: {label}
      </span>
    </div>
  );
}

// ============================================
// СЛАЙДЕР С ОБРАБОТКОЙ ОШИБОК ЗАГРУЗКИ
// ============================================

interface ExampleSliderProps {
  example: ExampleData;
}

function ExampleSlider({ example }: ExampleSliderProps) {
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);

  // Если обе картинки не загрузились - показываем плейсхолдеры
  if (beforeError && afterError) {
    return (
      <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-slate-200">
        <div className="absolute inset-0 grid grid-cols-2">
          <PlaceholderImage type="before" categoryLabel={example.label} />
          <PlaceholderImage type="after" categoryLabel={example.label} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-full bg-white" />
        </div>
      </div>
    );
  }

  // Если только одна картинка не загрузилась - используем слайдер с плейсхолдером
  if (beforeError || afterError) {
    return (
      <div className="relative aspect-[3/4] w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-slate-200">
        {/* Before image or placeholder */}
        <div className="absolute inset-0">
          {beforeError ? (
            <PlaceholderImage type="before" categoryLabel={example.label} />
          ) : (
            <Image
              src={example.beforeImage}
              alt={SLIDER_LABELS.before}
              fill
              sizes="(max-width: 640px) 100vw, 450px"
              className="object-cover"
              onError={() => setBeforeError(true)}
            />
          )}
        </div>
        {/* After image or placeholder */}
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 0 0 50%)' }}>
          {afterError ? (
            <PlaceholderImage type="after" categoryLabel={example.label} />
          ) : (
            <Image
              src={example.afterImage}
              alt={SLIDER_LABELS.after}
              fill
              sizes="(max-width: 640px) 100vw, 450px"
              className="object-cover"
              onError={() => setAfterError(true)}
            />
          )}
        </div>
      </div>
    );
  }

  // Нормальный слайдер с blur placeholder для плавной загрузки
  return (
    <BeforeAfterSlider
      beforeImage={example.beforeImage}
      afterImage={example.afterImage}
      beforeLabel={SLIDER_LABELS.before}
      afterLabel={SLIDER_LABELS.after}
    />
  );
}

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ ГАЛЕРЕИ
// ============================================

export function ExamplesGallery() {
  const sectionRef = useRef<HTMLElement>(null);

  // State для отложенной загрузки остальных изображений
  const [shouldPreload, setShouldPreload] = useState(false);

  useEffect(() => {
    // Откладываем загрузку тяжелых изображений, чтобы не блокировать LCP/FCP
    const timer = setTimeout(() => {
      setShouldPreload(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section ref={sectionRef} id="examples" className="py-20 bg-white">
      <div className="container">
        {/* Заголовок секции */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Как будут выглядеть ваши товары на моделях
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Сервис сохраняет цвет, ткань и крой одежды. Ниже примеры по популярным категориям:
          </p>
        </motion.div>

        {/* Табы с примерами */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="dresses" className="w-full">
            {/* Навигация по табам - горизонтальный скролл на мобильных */}
            <div className="flex justify-center mb-8 -mx-4 px-4">
              <div className="overflow-x-auto scrollbar-hide max-w-full">
                <TabsList className="bg-slate-100 p-1 rounded-full h-auto gap-1 inline-flex min-w-max">
                  {TABS_ORDER.map((key) => {
                    const example = EXAMPLES_DATA[key];
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/30 transition-all whitespace-nowrap"
                      >
                        {example.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            {/* Контент табов */}
            {TABS_ORDER.map((key) => {
              const example = EXAMPLES_DATA[key];
              return (
                <TabsContent key={key} value={key} className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-center"
                  >
                    <ExampleSlider example={example} />
                  </motion.div>
                </TabsContent>
              );
            })}
          </Tabs>
        </motion.div>

        {/* Примечание внизу */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-800">
            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              Сохраняем цвет, крой и принт 1 в 1 - меняем только модель и фон.
            </span>
          </div>
        </motion.div>
        {/* Preloader для оптимизированных изображений Next.js */}
        <div
          className="fixed inset-0 w-px h-px overflow-hidden opacity-0 pointer-events-none -z-50"
          aria-hidden="true"
        >
          {shouldPreload &&
            Object.values(EXAMPLES_DATA).map((example) => (
              <div key={`preload-${example.id}`} className="relative w-full h-full">
                <Image src={example.beforeImage} alt="" fill sizes="(max-width: 640px) 100vw, 450px" />
                <Image src={example.afterImage} alt="" fill sizes="(max-width: 640px) 100vw, 450px" />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
