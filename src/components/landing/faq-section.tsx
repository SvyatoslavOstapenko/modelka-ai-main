'use client';

import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Wildberries или Ozon не заблокируют карточку?',
    answer:
      'Нет. Мы генерируем уникальные изображения, которые проходят модерацию маркетплейсов. Лица моделей созданы ИИ - это не реальные люди, поэтому никто не может предъявить права на фото. Вы получаете права на коммерческое использование без рисков блокировки.',
  },
  {
    question: 'Нужно ли мне снимать одежду на манекене?',
    answer:
      'Не обязательно. Идеально - манекен или фото на себе (можно без лица). Но сервис справляется и с “раскладкой” на полу или фото на вешалке. Главное - нормальный свет, чтобы одежда была хорошо видна.',
  },
  {
    question: 'Смогу ли я использовать одну и ту же модель для разных товаров?',
    answer:
      'Да. Можно выбрать типаж модели и сохранять его для всех будущих карточек. Так вы соберёте единый визуальный стиль магазина и будете узнаваемы на витрине.',
  },
  {
    question: 'Что делать, если произошла ошибка генерации?',
    answer:
      'Если случается технический сбой и фото не сгенерировалось, токены за эту попытку возвращаются на баланс автоматически. Мы не списываем токены за ошибки на нашей стороне.',
  },
  {
    question: 'Как получить чек для бухгалтерии?',
    answer:
      'Оплата проходит любыми картами РФ и через СБП - после оплаты на почту приходит электронный чек по 54-ФЗ. Его достаточно большинству ИП и ООО как подтверждения расходов. Если вам нужны счёт и закрывающие документы, мы можем оформить их просто напишите в поддержку.',
  },
  {
    question: 'Одежда останется такой же или ИИ её перерисует?',
    answer:
      'ИИ переносит одежду с вашего фото на модель, подстраивая только посадку по фигуре. Цвет, принт, ткань и крой остаются такими же, как на исходном снимке. Карточка выглядит дороже, а товар - честно.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Это безопасно? Отвечаем прямо.
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Самые частые вопросы от селлеров
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-slate-200"
              >
                <AccordionTrigger className="text-left font-heading font-semibold text-slate-900 hover:text-indigo-600 py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
