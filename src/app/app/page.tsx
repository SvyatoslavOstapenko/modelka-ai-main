/**
 * App Dashboard - Главная страница приложения
 *
 * @route /app
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { AppCard } from '@/components/app';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Image as ImageIcon,
  User,
  Shuffle,
  Wand2,
  Edit3,
  Video,
  Palette,
  ArrowRight,
  ImagePlus,
} from 'lucide-react';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Главная',
  description: 'Добро пожаловать в Modelka AI',
};

// ============================================
// CONSTANTS
// ============================================

const MARKETPLACE_TOOLS = [
  {
    title: 'Фото товара на модели',
    description: 'Загрузите фото товара с манекена, на себе или на вешалке - получите готовый кадр на модели за 30 секунд.',
    icon: Sparkles,
    href: '/app/generate/product-to-model',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    popular: true,
    badge: 'Популярно'
  },
  {
    title: 'Виртуальная примерка',
    description: 'Примеряйте один и тот же товар на разных моделях, позах и фонах, чтобы выбрать лучший вариант для карточки и рекламы.',
    icon: ImageIcon,
    href: '/app/generate/try-on',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    badge: 'Для теста образов'
  },
  {
    title: 'Редактирование фото',
    description: 'Доработайте уже сгенерированные фото: поменяйте фон, позу и мелкие детали без новой съёмки.',
    icon: Edit3,
    href: '/app/generate/edit',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    title: 'Замена модели на фото',
    description: 'Сохраните фон и одежду со старой съёмки - замените только модель на более подходящий типаж.',
    icon: Shuffle,
    href: '/app/generate/model-swap',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
];

const ADDITIONAL_TOOLS = [
  {
    title: 'Лицо → виртуальная модель',
    description: 'Создайте постоянную виртуальную модель по фото сотрудника или амбассадора бренда.',
    icon: User,
    href: '/app/generate/face-to-model',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
  {
    title: 'Создание модели по описанию',
    description: 'Опишите типаж (возраст, стиль, внешность) - сервис создаст под задачу виртуальную модель.',
    icon: Wand2,
    href: '/app/generate/model-create',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    title: 'Видео из фото',
    description: 'Соберите короткое видео с моделями из сгенерированных кадров для промо и соцсетей.',
    icon: Video,
    href: '/app/generate/video',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    title: 'Смена фона',
    description: 'Замените фон вокруг модели (улица, студия, интерьер), сохранив одежду 1 в 1 без искажений.',
    icon: Palette,
    href: '/app/generate/background-change',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
];

const QUICK_ACTIONS = [
  {
    title: 'Галерея',
    description: 'Посмотрите и скачайте готовые фото, которые вы сохранили.',
    icon: ImagePlus,
    href: '/app/gallery',
  },
];

// ============================================
// PAGE COMPONENT
// ============================================

export default async function AppHomePage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] || '';

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-12">
      {/* Welcome Section */}
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight text-white">
          {firstName ? `Добро пожаловать, ${firstName}!` : 'Добро пожаловать в Modelka AI!'}
        </h1>
        <p className="text-lg text-slate-400 max-w-3xl">
          Здесь вы делаете фото товаров на моделях для Wildberries, Ozon и других маркетплейсов. Выберите сценарий и запустите первую генерацию.
        </p>
      </div>

      {/* Marketplace Tools */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold font-heading text-white mb-1">Инструменты для маркетплейсов</h2>
          <p className="text-slate-400">Основные сценарии для создания фото на моделях. Рекомендуем начать с первого.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MARKETPLACE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}>
                <AppCard
                  glowOnHover
                  glowColor={tool.color.includes('violet') ? 'violet' :
                    tool.color.includes('blue') ? 'blue' :
                      tool.color.includes('emerald') ? 'emerald' :
                        tool.color.includes('cyan') ? 'cyan' : 'indigo'}
                  className="relative h-full p-5 cursor-pointer group"
                >
                  {tool.badge && (
                    <Badge className="absolute top-3 right-3 text-xs" variant={tool.popular ? "default" : "secondary"}>
                      {tool.badge}
                    </Badge>
                  )}

                  <div
                    className={`w-12 h-12 rounded-xl ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`w-6 h-6 ${tool.color}`} />
                  </div>

                  <h3 className="font-semibold mb-2 text-slate-100 group-hover:text-white transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {tool.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Открыть
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </AppCard>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Additional Tools */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold font-heading text-white mb-1">Дополнительные инструменты</h2>
          <p className="text-slate-400">Опции для тонкой настройки контента и экспериментов.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ADDITIONAL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}>
                <AppCard
                  glowOnHover
                  glowColor={tool.color.includes('pink') ? 'pink' :
                    tool.color.includes('amber') ? 'amber' :
                      tool.color.includes('red') ? 'red' :
                        tool.color.includes('indigo') ? 'indigo' : 'violet'}
                  className="relative h-full p-5 cursor-pointer group"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`w-5 h-5 ${tool.color}`} />
                  </div>

                  <h3 className="font-semibold mb-2 text-slate-200 group-hover:text-white transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-slate-500 group-hover:text-slate-400 leading-relaxed transition-colors">
                    {tool.description}
                  </p>
                </AppCard>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions (Gallery) */}
      <div>
        <h2 className="text-2xl font-semibold font-heading text-white mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <AppCard glowOnHover glowColor="indigo" className="p-5 cursor-pointer group h-full">
                  <div className="flex items-start gap-4 h-full items-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 text-slate-100 group-hover:text-white transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-slate-400">{action.description}</p>
                    </div>
                  </div>
                </AppCard>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Getting Started Tips */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold font-heading text-white">Советы для первых запусков</h2>
        </div>
        <AppCard className="p-6 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Снимайте товар при ровном освещении, без жёстких теней и пересветов.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Следите, чтобы вся одежда попадала в кадр, без обрезанных краёв и сильных помятостей.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Для верхней одежды и костюмов делайте 2–3 ракурса - так карточки на моделях выглядят лучше.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Если результат не нравится, попробуйте другой ракурс или типаж модели и запустите генерацию ещё раз.</span>
                </li>
              </ul>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
