/**
 * Billing Page - Тарифы и пополнение баланса
 *
 * Отображает доступные пакеты токенов для покупки
 *
 * @route /app/billing
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Coins, Check, Sparkles, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// CREDIT PACKAGES
// ============================================

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Стартовый',
    credits: 10,
    price: 299,
    popular: false,
    icon: Coins,
    color: 'bg-gray-500',
  },
  {
    id: 'basic',
    name: 'Базовый',
    credits: 25,
    price: 699,
    popular: false,
    icon: Sparkles,
    color: 'bg-blue-500',
    bonus: 5,
  },
  {
    id: 'pro',
    name: 'Профессиональный',
    credits: 50,
    price: 1299,
    popular: true,
    icon: Zap,
    color: 'bg-purple-500',
    bonus: 15,
  },
  {
    id: 'ultimate',
    name: 'Максимальный',
    credits: 100,
    price: 2399,
    popular: false,
    icon: Crown,
    color: 'bg-yellow-500',
    bonus: 35,
  },
];

// ============================================
// FEATURES
// ============================================

const FEATURES = [
  'Все инструменты генерации доступны',
  'Высокое качество изображений',
  'Быстрая обработка',
  'Приоритетная поддержка',
  'Без водяных знаков',
];

// ============================================
// PAGE COMPONENT
// ============================================

export default function BillingPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    setIsProcessing(true);

    // TODO: Implement actual payment integration
    // This is a placeholder for payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.error('Оплата временно недоступна. Функция в разработке.');
    setIsProcessing(false);
    setSelectedPackage(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading">
          Пополните баланс токенов
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Выберите подходящий пакет токенов для создания AI-изображений
        </p>
      </div>

      {/* Packages Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CREDIT_PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const totalCredits = pkg.credits + (pkg.bonus || 0);

          return (
            <Card
              key={pkg.id}
              className={`relative p-6 space-y-4 ${pkg.popular ? 'border-primary shadow-lg' : ''
                }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Популярный
                </Badge>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-full ${pkg.color}/10 flex items-center justify-center`}>
                <Icon className={`w-6 h-6 text-white`} style={{ color: pkg.color.replace('bg-', '') }} />
              </div>

              {/* Package Name */}
              <div>
                <h3 className="text-xl font-bold font-heading">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {pkg.credits} токенов
                  {pkg.bonus && ` + ${pkg.bonus} бонус`}
                </p>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <p className="text-3xl font-bold">{pkg.price} ₽</p>
                {pkg.bonus && (
                  <p className="text-xs text-green-500 font-medium">
                    Всего {totalCredits} токенов
                  </p>
                )}
              </div>

              <Separator />

              {/* Button */}
              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={isProcessing}
                className={`w-full ${pkg.popular ? 'gradient-primary' : ''}`}
                variant={pkg.popular ? 'default' : 'outline'}
              >
                {isProcessing && selectedPackage === pkg.id ? (
                  <>Обработка...</>
                ) : (
                  <>Купить</>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Features */}
      <Card className="p-6 space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold font-heading">Что входит в пакеты</h2>
          <p className="text-muted-foreground mt-2">
            Все пакеты включают полный доступ к функциям платформы
          </p>
        </div>

        <Separator />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm">{feature}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted">
        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p className="font-medium text-foreground">Важная информация</p>
          <p>
            токены не имеют срока действия и не сгорают. Стоимость генерации зависит от типа и настроек.
          </p>
        </div>
      </Card>
    </div>
  );
}
