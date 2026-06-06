'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Upload, User, Download, Shield } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Upload,
    title: 'Сфотографируйте товар',
    description:
      'Сделайте фото одежды на манекене, на себе или на вешалке. Достаточно телефона и нормального света на складе.',
  },
  {
    number: 2,
    icon: User,
    title: 'Выберите модель',
    description:
      'Укажите пол, возраст и стиль - Modelka\u00A0AI подберёт подходящую модель. Можно загрузить фото своей модели, и сервис аккуратно «наденет» на неё одежду.',
  },
  {
    number: 3,
    icon: Download,
    title: 'Скачайте готовое фото',
    description:
      'Через 30 секунд получите фото на модели без водяных знаков, в нужном разрешении для Wildberries, Ozon и других маркетплейсов.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-slate-50">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            3 шага до топовой карточки товара
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Простой процесс за пару минут, без студии и фотографа
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative h-full p-6 bg-white border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all group">
                {/* Step number */}
                <div className="absolute -top-4 left-6">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-heading font-bold text-sm flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center mb-4 mt-2 transition-colors">
                  <step.icon className="w-7 h-7 text-indigo-600" />
                </div>

                {/* Content */}
                <h3 className="font-heading text-xl font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Connector line (hidden on mobile and last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-slate-300" />
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Guarantee callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Card className="max-w-3xl mx-auto p-6 bg-indigo-50 border-indigo-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-slate-900 mb-1">
                  Полный контроль над товаром
                </h4>
                <p className="text-slate-600 text-sm">
                  Вы решаете, что менять: только модель, фон или весь образ. Но сама вещь не искажается - цвет, ткань, принт и крой остаются такими же, как на исходном фото.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
