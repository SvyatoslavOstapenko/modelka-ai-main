'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingTableProps {
  onGetStarted: () => void;
}

const plans = [
  {
    id: 'test',
    name: 'Тест-драйв',
    description: 'Для тех, кто хочет проверить качество на 3-5 товарах',
    price: 490,
    pricePerPhoto: 33,
    photos: 15,
    tokens: 15,
    icon: Zap,
    highlighted: false,
    features: [
      'Качество Standard (HD)',
      'Каталог готовых моделей',
      'Хранение фото: 7 дней',
      'Стандартная скорость генерации',
    ],
  },
  {
    id: 'seller',
    name: 'Селлер',
    description: 'Оптимально для 10-15 артикулов',
    price: 1490,
    pricePerPhoto: 25,
    photos: 60,
    tokens: 60,
    icon: Crown,
    highlighted: true,
    badge: 'Выбор селлеров',
    features: [
      'Выгоднее на ~25%, чем «Тест-драйв»',
      'Максимальное качество (Ultra / до 4K)',
      'Создание своих виртуальных моделей',
      'Хранение фото: 30 дней',
      'Быстрая генерация',
    ],
  },
  {
    id: 'brand',
    name: 'Бренд',
    description: 'Для магазинов и брендов с большим ассортиментом',
    price: 3990,
    pricePerPhoto: 20,
    photos: 200,
    tokens: 200,
    icon: Building2,
    highlighted: false,
    features: [
      'Минимальная цена за фото',
      'Все возможности тарифа «Селлер»',
      'Приоритетная генерация (Turbo)',
      'Хранение фото: 180 дней',
      'Приоритетная поддержка в чате',
    ],
  },
];

export function PricingTable({ onGetStarted }: PricingTableProps) {
  return (
    <section id="pricing" className="py-20 bg-slate-950">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="mb-4 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Без подписок и автосписаний
          </Badge>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
            Платите только за готовые фото
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Купили пакет токенов - меняете их на фото, когда нужно. Токены не сгорают.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'relative',
                plan.highlighted && 'md:-mt-4 md:mb-4'
              )}
            >
              <Card
                className={cn(
                  'h-full p-6 transition-all flex flex-col',
                  plan.highlighted
                    ? 'bg-white border-2 border-indigo-500 shadow-2xl shadow-indigo-500/40 scale-105 ring-1 ring-indigo-400/50'
                    : 'bg-white/95 border-slate-200/50 hover:border-indigo-300/50 hover:shadow-lg'
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1">
                    🔥 {plan.badge}
                  </Badge>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center',
                      plan.highlighted ? 'bg-indigo-100' : 'bg-slate-100'
                    )}
                  >
                    <plan.icon
                      className={cn(
                        'w-6 h-6',
                        plan.highlighted ? 'text-indigo-600' : 'text-slate-600'
                      )}
                    />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="font-heading text-4xl font-bold text-slate-900">
                    {plan.price.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="mt-2 space-y-1">
                    <div
                      className={cn(
                        'text-sm font-medium',
                        plan.highlighted ? 'text-indigo-600' : 'text-slate-700'
                      )}
                    >
                      {plan.photos} фото на модели
                    </div>
                    <div className="text-xs text-slate-500">
                      {plan.tokens} токенов · ~{plan.pricePerPhoto} ₽ за фото
                    </div>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2
                        className={cn(
                          'w-5 h-5 flex-shrink-0 mt-0.5',
                          plan.highlighted ? 'text-indigo-500' : 'text-emerald-500'
                        )}
                      />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={onGetStarted}
                  className={cn(
                    'w-full mt-auto',
                    plan.highlighted
                      ? 'gradient-primary shadow-lg shadow-indigo-500/30'
                      : ''
                  )}
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="lg"
                >
                  {plan.highlighted ? 'Выбрать этот тариф' : 'Купить пакет'}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Token note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-slate-500 mt-6"
        >
          1 токен = 1 готовое фото на модели. Платите только за созданные фото, без автосписаний.
        </motion.p>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-slate-400 mt-4"
        >
          🔒 Безопасная оплата картами РФ и СБП. Для юрлиц- счёт и закрывающие документы.
        </motion.p>
      </div>
    </section>
  );
}
