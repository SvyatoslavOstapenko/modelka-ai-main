'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Lock, Check, Sparkles, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface PricingPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  badge?: string;
  icon: React.ElementType;
  popular?: boolean;
}

interface BillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================
// CONSTANTS
// ============================================

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Старт',
    credits: 15,
    price: 300,
    pricePerCredit: 20,
    icon: Zap,
  },
  {
    id: 'popular',
    name: 'Популярный',
    credits: 50,
    price: 800,
    pricePerCredit: 16,
    badge: '-20%',
    icon: Sparkles,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Про',
    credits: 100,
    price: 1400,
    pricePerCredit: 14,
    badge: 'ВЫГОДНО',
    icon: Crown,
  },
];

// ============================================
// PRICING CARD COMPONENT
// ============================================

interface PricingCardProps {
  plan: PricingPlan;
  selected: boolean;
  onSelect: () => void;
}

function PricingCard({ plan, selected, onSelect }: PricingCardProps) {
  const Icon = plan.icon;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative flex flex-col p-5 rounded-xl border-2 text-left transition-all w-full',
        selected
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : 'border-slate-200 hover:border-slate-300 bg-white',
        plan.popular && !selected && 'border-indigo-200 bg-indigo-50/30'
      )}
    >
      {/* Popular Label */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white px-3 shadow-md">
            Популярный
          </Badge>
        </div>
      )}

      {/* Selection Indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          selected ? 'border-primary bg-primary' : 'border-slate-300'
        )}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
          selected ? 'bg-primary/10' : 'bg-slate-100',
          plan.popular && !selected && 'bg-indigo-100'
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5',
            selected ? 'text-primary' : 'text-slate-500',
            plan.popular && !selected && 'text-indigo-600'
          )}
        />
      </div>

      {/* Plan Name & Badge */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-foreground">{plan.name}</h3>
        {plan.badge && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0',
              plan.popular ? 'border-indigo-300 text-indigo-600' : 'border-emerald-300 text-emerald-600'
            )}
          >
            {plan.badge}
          </Badge>
        )}
      </div>

      {/* Credits */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold font-heading text-foreground">{plan.credits}</span>
        <span className="text-sm text-muted-foreground">токенов</span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold font-heading text-foreground">{plan.price} ₽</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">~{plan.pricePerCredit}₽ за примерку</p>
    </motion.button>
  );
}

// ============================================
// BILLING DIALOG COMPONENT
// ============================================

export function BillingDialog({ open, onOpenChange }: BillingDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('popular');
  const [isProcessing, setIsProcessing] = useState(false);

  const selected = PRICING_PLANS.find((p) => p.id === selectedPlan);

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsProcessing(false);
    onOpenChange(false);

    toast.success('Оплата инициирована', {
      description: 'Переход на страницу ЮKassa...',
    });

    // In real implementation, redirect to payment gateway
    // window.location.href = paymentUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b bg-slate-50/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Пополнение баланса
            </DialogTitle>
            <DialogDescription className="text-sm">
              1 токен = 1 примерка. Выберите подходящий пакет.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Pricing Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t bg-slate-50/50">
          {/* Total */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">К оплате:</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={selected?.price}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-2xl font-bold font-heading"
              >
                {selected?.price || 0} ₽
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Payment Button */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-opacity rounded-xl"
          >
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Coins className="w-5 h-5" />
              </motion.div>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Оплатить через ЮKassa
              </>
            )}
          </Button>

          {/* Secure Badge */}
          <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Безопасная оплата
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
