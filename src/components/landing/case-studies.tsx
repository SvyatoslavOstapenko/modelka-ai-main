'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Quote, TrendingUp, Clock, Wallet, Zap } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// ============================================
// CAROUSEL DOTS COMPONENT
// ============================================

function CarouselDots({ count }: { count: number }) {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    // Subscribe to changes
    api.on('select', onSelect);
    api.on('reInit', onSelect);

    // Initialize state asynchronously to satisfy lint rule
    queueMicrotask(() => {
      setSelectedIndex(api.selectedScrollSnap());
    });

    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      if (!api) return;
      api.scrollTo(index);
    },
    [api]
  );

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: count }).map((_, idx) => (
        <button
          key={idx}
          onClick={() => scrollTo(idx)}
          className={cn(
            'w-2.5 h-2.5 rounded-full transition-all duration-300',
            selectedIndex === idx
              ? 'bg-indigo-500 scale-125'
              : 'bg-slate-300 hover:bg-slate-400'
          )}
          aria-label={`Перейти к слайду ${idx + 1}`}
        />
      ))}
    </div>
  );
}

// ============================================
// ТИПЫ ВИЗУАЛИЗАЦИИ МЕТРИК
// ============================================

type MetricType = 'TIMELINE_COMPARISON' | 'BAR_CHART' | 'LINE_GRAPH' | 'BIG_NUMBER';

interface CaseStudy {
  id: number;
  name: string;
  business: string;
  niche: string;
  pain: string;
  gain: string;
  quote: string;
  metricType: MetricType;
  stat: string;
}

// ============================================
// ВИЗУАЛИЗАТОРЫ МЕТРИК
// ============================================

// Горизонтальное сравнение времени (14 дней vs 1 день)
function TimelineComparison() {
  return (
    <div className="relative h-36 w-full bg-slate-100 rounded-xl p-4 pt-10">
      {/* Бейдж результата */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1"
      >
        <Clock className="w-3 h-3" />
        14× быстрее
      </motion.div>

      <div className="flex flex-col justify-center h-full gap-3">
        {/* Студия - длинная красная полоса */}
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-7 bg-gradient-to-r from-rose-500 to-rose-400 rounded-md flex items-center justify-end pr-3"
          >
            <span className="font-heading text-xs font-bold text-white whitespace-nowrap">
              14 дней · Студия
            </span>
          </motion.div>
        </div>

        {/* Modelka AI - короткая зелёная полоса */}
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: '40%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="h-7 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-md flex items-center justify-center px-2"
            style={{ minWidth: '120px' }}
          >
            <span className="font-heading text-xs font-bold text-white whitespace-nowrap">
              1 день · Modelka AI
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Вертикальные столбики сравнения стоимости (45к vs 1.5к)
function BarChart() {
  return (
    <div className="relative h-36 w-full bg-slate-100 rounded-xl p-4 pt-10">
      {/* Бейдж результата */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
        className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1"
      >
        <Wallet className="w-3 h-3" />
        -97% расходов
      </motion.div>

      <div className="flex items-end justify-center h-full gap-8">
        {/* Фотограф - высокий красный */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-heading text-sm font-bold text-rose-500">45k ₽</span>
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: 60 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-12 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-md"
          />
          <span className="text-[10px] text-slate-500 font-medium">Фотограф</span>
        </div>

        {/* Modelka AI - маленький зелёный */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-heading text-sm font-bold text-emerald-500">1.5k ₽</span>
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: 4 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-12 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md"
            style={{ minHeight: '4px' }}
          />
          <span className="text-[10px] text-slate-500 font-medium">Modelka AI</span>
        </div>
      </div>
    </div>
  );
}

// Линейный график роста CTR
function LineGraph() {
  const dataPoints = [15, 18, 16, 22, 28, 35, 45, 55, 68, 85, 100];

  return (
    <div className="relative h-28 w-full bg-slate-100 rounded-xl p-4 overflow-hidden">
      {/* Сетка */}
      <div className="absolute inset-4 flex flex-col justify-between">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-full h-px bg-slate-200" />
        ))}
      </div>

      {/* SVG линия графика */}
      <svg
        viewBox="0 0 100 50"
        className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)]"
        preserveAspectRatio="none"
      >
        {/* Градиент заливки */}
        <defs>
          <linearGradient id="ctrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Область под линией */}
        <motion.path
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          d={`M0,${50 - dataPoints[0] / 2} ${dataPoints.map((point, i) => `L${(i / (dataPoints.length - 1)) * 100},${50 - point / 2}`).join(' ')} L100,50 L0,50 Z`}
          fill="url(#ctrGradient)"
        />

        {/* Линия графика */}
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          d={`M0,${50 - dataPoints[0] / 2} ${dataPoints.map((point, i) => `L${(i / (dataPoints.length - 1)) * 100},${50 - point / 2}`).join(' ')}`}
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Бейдж результата */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-md"
      >
        <TrendingUp className="w-3 h-3" />
        +190% CTR
      </motion.div>
    </div>
  );
}

// Большое число (время обработки)
function BigNumber({ value }: { value: string }) {
  return (
    <div className="relative h-28 w-full bg-slate-100 rounded-xl p-4 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
        className="text-center"
      >
        <div className="font-heading text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
          <Zap className="w-3 h-3 text-emerald-500" />
          на артикул
        </div>
      </motion.div>
    </div>
  );
}

// Универсальный визуализатор метрик
function MetricVisualizer({ type, stat }: { type: MetricType; stat: string }) {
  switch (type) {
    case 'TIMELINE_COMPARISON':
      return <TimelineComparison />;
    case 'BAR_CHART':
      return <BarChart />;
    case 'LINE_GRAPH':
      return <LineGraph />;
    case 'BIG_NUMBER':
      return <BigNumber value={stat} />;
    default:
      return null;
  }
}

// ============================================
// ДАННЫЕ КЕЙСОВ (4 РЕАЛЬНЫХ СЦЕНАРИЯ)
// ============================================

const caseStudies: CaseStudy[] = [
  {
    id: 1,
    name: 'Алексей',
    business: 'владелец бренда спортодежды',
    niche: 'Спортивные костюмы',
    pain: 'Партия задержалась на таможне. Когда товар доехал, студии были заняты на две недели вперёд - теряли до 50 000 ₽ выручки в день простоя.',
    gain: 'Сфотографировали на складе на телефон, вечером прогнали через Modelka\u00A0AI, утром товар уже был на полке маркетплейса. Запустились в 14 раз быстрее, чем через студию.',
    quote: 'Реально спасли сезон. Пока конкуренты ждали фотографа, мы уже зашли в топ.',
    metricType: 'TIMELINE_COMPARISON',
    stat: '14× быстрее',
  },
  {
    id: 2,
    name: 'Дмитрий',
    business: 'частный продавец',
    niche: 'Рюкзаки',
    pain: 'Ненавидел возиться с организацией съёмок: возить товар, искать моделей, подстраиваться под график студии. Это съедало кучу времени.',
    gain: 'Теперь менеджер просто фотографирует рюкзаки на столе, загружает в Modelka\u00A0AI - и через 20 минут на артикул есть готовые лайфстайл-фото.',
    quote: 'Экономия нервов - бесценна. Никаких созвонов с фотографами, всё делаю сам за чашкой кофе.',
    metricType: 'BIG_NUMBER',
    stat: '20 мин',
  },
  {
    id: 3,
    name: 'Елена',
    business: 'селлер на WB',
    niche: 'Блузки',
    pain: 'Фото на манекене почти не кликали. CTR 1,2%, реклама уходила в минус.',
    gain: 'Переодели весь ассортимент в Modelka\u00A0AI на виртуальных моделей. Карточки стали выглядеть «как у брендов», CTR вырос до 3,5% (+190%), реклама наконец-то в плюсе.',
    quote: 'Клиенты в вопросах спрашивают рост модели - думают, она живая!',
    metricType: 'LINE_GRAPH',
    stat: 'CTR +190%',
  },
  {
    id: 4,
    name: 'Марина',
    business: 'селлер женской одежды',
    niche: 'Платья',
    pain: 'Фотограф выставил счёт 45 000 ₽ за съёмку 10 новинок. Боялась сливать бюджет на товар, который ещё не проверен.',
    gain: 'Купила пакет в Modelka\u00A0AI за 1 490 ₽, сделала фото сама и протестировала линейку. Сэкономила около 43 000 ₽ на старте.',
    quote: 'Для теста гипотез - мастхэв. Зачем платить за съёмку товара, который ещё не продаётся?',
    metricType: 'BAR_CHART',
    stat: '-97% расходов',
  },
];

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ СЕКЦИИ
// ============================================

export function CaseStudies() {
  return (
    <section id="cases" className="py-20 bg-white">
      <div className="container">
        {/* Заголовок секции */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Экономим миллионы селлерам на WB и Ozon
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Реальные истории предпринимателей, которые уже используют Modelka&nbsp;AI
          </p>
        </motion.div>

        {/* Карусель кейсов */}
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-4xl mx-auto"
        >
          <CarouselContent>
            {caseStudies.map((study) => (
              <CarouselItem key={study.id} className="md:basis-1/1 lg:basis-1/1">
                <Card className="p-6 md:p-8 bg-slate-50 border-slate-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Левая сторона - История */}
                    <div>
                      {/* Автор и ниша */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <span className="font-heading font-bold text-white text-lg">
                            {study.name[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-heading font-bold text-slate-900">
                            {study.name}, {study.business}
                          </div>
                          <div className="text-sm text-slate-500">Ниша: {study.niche}</div>
                        </div>
                      </div>

                      {/* Боль → Результат */}
                      <div className="space-y-4 mb-6">
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 uppercase tracking-wide mb-2 bg-rose-50 px-2 py-1 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Было
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">{study.pain}</p>
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2 bg-emerald-50 px-2 py-1 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Стало
                          </div>
                          <p className="text-slate-900 font-medium text-sm leading-relaxed">
                            {study.gain}
                          </p>
                        </div>
                      </div>

                      {/* Цитата - выделенный блок */}
                      <div className="relative bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
                        <Quote className="absolute -top-2 -left-2 w-6 h-6 text-indigo-400 bg-white rounded-full p-1" />
                        <p className="text-slate-700 italic text-sm pl-2 leading-relaxed">
                          &ldquo;{study.quote}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Правая сторона - Визуализация метрики */}
                    <div className="flex flex-col justify-center">
                      {/* Основной показатель */}
                      <div className="text-center mb-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white text-sm font-bold rounded-full">
                          {study.stat}
                        </span>
                      </div>

                      {/* График/Визуализация */}
                      <MetricVisualizer type={study.metricType} stat={study.stat} />
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex items-center justify-center gap-4 mt-6">
            <CarouselPrevious className="relative inset-auto translate-y-0" />
            <CarouselNext className="relative inset-auto translate-y-0" />
          </div>

          {/* Индикатор количества кейсов */}
          <div className="mt-4">
            <CarouselDots count={caseStudies.length} />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
