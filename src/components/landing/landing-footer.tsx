'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo, BRAND_NAME } from '@/components/logo';
import { Sparkles } from 'lucide-react';

interface LandingFooterProps {
  onGetStarted: () => void;
}

export function LandingFooter({ onGetStarted }: LandingFooterProps) {
  return (
    <footer className="bg-slate-950">
      {/* CTA Section */}
      <div className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
              Оставьте дорогие фотосессии в прошлом
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Сделайте продающие фото на моделях для Wildberries и Ozon за 5 минут - без студий, кастингов и предоплат фотографам.
            </p>
            <Button
              size="lg"
              onClick={onGetStarted}
              className="h-14 px-10 text-lg font-semibold gradient-primary shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Начать бесплатно
            </Button>
            <p className="text-sm text-slate-500 mt-4">
              3 бесплатных фото на модели после регистрации · без привязки карты
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo variant="dark" />
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} {BRAND_NAME}. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
