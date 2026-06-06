'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from './before-after-slider';
import { CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-transparent to-transparent" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left Side - Text Content */}
          <div className="text-center lg:text-left max-w-[600px] mx-auto lg:mx-0">
            {/* Small tagline above heading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm md:text-base text-slate-500 mb-4"
            >
              Для селлеров Wildberries, Ozon и других маркетплейсов
            </motion.p>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6"
            >
              Фото товаров на моделях
              <br />
              <span className="gradient-text">для маркетплейсов за 30 секунд</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Сделайте фото вещи на телефон и загрузите в Modelka&nbsp;AI - через 30 секунд получите глянцевый кадр на модели, который проходит модерацию Wildberries и Ozon и поднимает CTR без дорогих фотосессий.
            </motion.p>

            {/* CTA Button with glow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <Button
                size="lg"
                onClick={onGetStarted}
                className="h-14 px-10 text-lg font-semibold gradient-primary hover:opacity-90 transition-all rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
              >
                Попробовать бесплатно
              </Button>
              <p className="text-sm text-slate-500 mt-3">
                Без привязки карты · 3 фото на пробу
              </p>
            </motion.div>

            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-slate-600"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>100% легально для маркетплейсов</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Оплата картами РФ и СБП</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Результат за 30 секунд</span>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Interactive Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <BeforeAfterSlider />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
