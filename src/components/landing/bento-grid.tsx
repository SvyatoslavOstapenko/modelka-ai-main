'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Clock, Eye, Sparkles, Star, Heart, Shield } from 'lucide-react';

// Анимированный таймер обратного отсчёта (останавливается вне viewport)
function CountdownTimer() {
  const [seconds, setSeconds] = useState(120); // 2 минуты
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Отслеживаем видимость через IntersectionObserver
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Таймер работает только когда виден
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 0) return 120;
        return prev - 1;
      });
    }, 100); // Быстрый отсчёт для демо эффекта

    return () => clearInterval(interval);
  }, [isVisible]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div ref={ref} className="font-heading text-4xl md:text-5xl font-bold text-indigo-600 tabular-nums">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}

// Анимированный график сравнения цен (3500 ₽ vs ~90 ₽)
function CostChart() {
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-6 h-32 pt-8">
        {/* Студия - большой красный столбик */}
        <div className="flex flex-col items-center h-full">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-16 h-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-lg relative"
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="font-heading text-lg font-bold text-rose-500">3 500 ₽</span>
            </div>
          </motion.div>
          <span className="text-xs text-slate-500 mt-2">Студия</span>
        </div>

        {/* AI - маленький зелёный столбик (~90₽ = ~2.5% от 3500) */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: '3px' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="w-16 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg relative"
            style={{ height: '3px' }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="font-heading text-lg font-bold text-emerald-500">90 ₽</span>
            </div>
          </motion.div>
          <span className="text-xs text-slate-500 mt-2">Modelka&nbsp;AI</span>
        </div>
      </div>
      {/* Примечание под графиком */}
      <p className="text-xs text-slate-600 mt-4">
        Расчёт для Modelka&nbsp;AI: тариф «Селлер», 3-4 фото на один артикул. Экономия до ~97%.
      </p>
    </div>
  );
}

// Мокап карточки товара в стиле Wildberries (мобильное приложение)
function WildberriesCardMockup() {
  return (
    <div className="relative w-full max-w-[160px] mx-auto pb-2">
      {/* Карточка товара */}
      <div className="bg-white rounded-xl overflow-hidden shadow-xl border border-slate-200">
        {/* Изображение товара */}
        <div className="relative aspect-[3/4] bg-slate-100">
          <Image
            src="/landing/model.webp"
            alt="Товар"
            fill
            className="object-cover"
            sizes="160px"
          />
          {/* Иконка избранного */}
          <button className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Информация о товаре */}
        <div className="p-2.5">
          {/* Цена с фиолетовым фоном WB стиля */}
          <div className="flex items-baseline gap-1.5 mb-2">
            <span
              className="font-heading text-sm font-bold text-white px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#a73afd' }}
            >
              2 141 ₽
            </span>
            <span className="text-[10px] text-slate-400 line-through">2 990 ₽</span>
          </div>

          {/* Рейтинг */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-3 h-3 text-amber-400 fill-amber-400"
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-500">4.9</span>
          </div>

          {/* Кнопки действий WB */}
          <div className="flex gap-1">
            <button
              className="flex-1 text-[10px] font-bold text-white py-1.5 rounded-md"
              style={{ backgroundColor: '#FF6B00' }}
            >
              Купить
            </button>
            <button
              className="flex-1 text-[10px] font-bold text-white py-1.5 rounded-md"
              style={{ backgroundColor: '#a73afd' }}
            >
              В корзину
            </button>
          </div>
        </div>
      </div>

      {/* Бейдж "100% Легально" */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-0 -right-3"
      >
        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg shadow-emerald-500/30 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          100% Легально
        </Badge>
      </motion.div>
    </div>
  );
}

export function BentoGrid() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="container">
        {/* Заголовок секции */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
            Почему селлеры выбирают Modelka&nbsp;AI
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Экономия, скорость и качество в одном сервисе
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Ячейка 1 - Большая (Экономия) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 lg:col-span-1 lg:row-span-2"
          >
            <Card className="h-full p-4 md:p-5 bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors relative overflow-hidden">
              {/* Большой числовой акцент на фоне */}
              <div className="absolute bottom-4 right-4 font-heading text-[80px] md:text-[100px] font-bold text-emerald-500/[0.07] leading-none select-none pointer-events-none">
                -97%
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  </div>
                  <Badge variant="secondary" className="bg-rose-500/20 text-rose-400 border-0">
                    Экономия
                  </Badge>
                </div>
                <h3 className="font-heading text-xl md:text-2xl font-bold text-white">
                  Сократите расходы на фото до 35 раз
                </h3>
                <div className="space-y-1.5">
                  <p className="text-slate-400 text-sm">
                    Студия: 3 000-5 000 ₽ за артикул с моделью.
                  </p>
                  <p className="text-slate-400 text-sm">
                    Modelka&nbsp;AI: <span className="text-emerald-400 font-semibold">от 90 ₽ за готовое фото на модели</span> (тариф «Селлер»).
                  </p>
                </div>
                <CostChart />
              </div>
            </Card>
          </motion.div>

          {/* Ячейка 2 - Time to Market */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full p-4 md:p-5 bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border-0">
                    Скорость
                  </Badge>
                </div>
                <h3 className="font-heading text-lg font-bold text-white">
                  От фото до карточки - 2 минуты
                </h3>
                <p className="text-slate-400 text-sm">
                  Вместо недели на студию, моделей и ретушь. Сфотографируйте товар на складе, загрузите в Modelka&nbsp;AI - через 30 секунд у вас фото на модели, ещё пара кликов - и за 2 минуты карточка уходит на модерацию в WB и Ozon.
                </p>
                <CountdownTimer />
                <p className="text-xs text-slate-600">
                  Среднее время от загрузки фото до отправки карточки на модерацию.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Ячейка 3 - Качество с мокапом WB карточки */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full p-4 md:p-5 bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-emerald-400" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-0">
                    Качество
                  </Badge>
                </div>
                <h3 className="font-heading text-lg font-bold text-white">
                  Пробивает баннерную слепоту
                </h3>
                <ul className="text-slate-400 text-sm space-y-1.5">
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>Фото как у брендов: до 4K, ровный свет и модели, которые выглядят «дорого».</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>Товар остаётся 1:1 как на исходнике без искажений, меньше возвратов.</span>
                  </li>
                </ul>
                {/* Мокап карточки Wildberries */}
                <WildberriesCardMockup />
              </div>
            </Card>
          </motion.div>

          {/* Ячейка 4 - Простота */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 lg:col-span-1"
          >
            <Card className="h-full p-4 md:p-5 bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <Badge variant="secondary" className="bg-violet-500/20 text-violet-400 border-0">
                    Простота
                  </Badge>
                </div>
                <h3 className="font-heading text-lg font-bold text-white">
                  Освоите за 5 минут, без дизайнера
                </h3>
                <p className="text-slate-400 text-sm">
                  Не нужно разбираться в нейросетях и искать дизайнера. Откройте сервис, загрузите фото товара, выберите модель - готово.
                </p>
                {/* Звёзды и статистика */}
                <div className="flex flex-col gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    Уже сгенерировано 1 000+ фото для карточек на маркетплейсах.
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
