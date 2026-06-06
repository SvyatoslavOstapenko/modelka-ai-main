/**
 * Profile Client Component
 *
 * Interactive profile view with user info and statistics
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { User, Coins, TrendingUp, Calendar, Mail, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { signOut } from 'next-auth/react';

// ============================================
// TYPES
// ============================================

type TransactionType = 'DEPOSIT' | 'SPEND' | 'REFUND' | 'BONUS';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  planCode: string;
  createdAt: string;
}

interface Stats {
  totalGenerations: number;
  completedGenerations: number;
  totalSpent: number;
}

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  createdAt: string;
  description: string | null;
}

interface ProfileClientProps {
  user: UserData;
  stats: Stats;
  transactions: Transaction[];
}

// ============================================
// CONSTANTS
// ============================================

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  test: { label: 'Тестовый', color: 'bg-gray-500' },
  seller: { label: 'Продавец', color: 'bg-blue-500' },
  brand: { label: 'Бренд', color: 'bg-purple-500' },
};

const TRANSACTION_CONFIG: Record<TransactionType, { icon: typeof ArrowUpRight; color: string }> = {
  DEPOSIT: { icon: ArrowUpRight, color: 'text-green-500' },
  SPEND: { icon: ArrowDownRight, color: 'text-red-500' },
  REFUND: { icon: ArrowUpRight, color: 'text-blue-500' },
  BONUS: { icon: ArrowUpRight, color: 'text-purple-500' },
};

// ============================================
// COMPONENT
// ============================================

export function ProfileClient({ user, stats, transactions }: ProfileClientProps) {
  const tierConfig = TIER_LABELS[user.planCode] || TIER_LABELS.test;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-heading">Профиль</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Выйти
        </Button>
      </div>

      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-2xl font-bold font-heading">{user.name || 'Пользователь'}</h2>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tierConfig.color}`} />
                <span className="text-sm font-medium">{tierConfig.label}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Зарегистрирован{' '}
                {formatDistanceToNow(new Date(user.createdAt), {
                  addSuffix: true,
                  locale: ru,
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Credits */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Баланс</p>
              <p className="text-2xl font-bold">{user.credits}</p>
            </div>
          </div>
        </Card>

        {/* Total Generations */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Генераций</p>
              <p className="text-2xl font-bold">{stats.completedGenerations}</p>
            </div>
          </div>
        </Card>

        {/* Total Spent */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Потрачено</p>
              <p className="text-2xl font-bold">{stats.totalSpent}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-heading">История транзакций</h2>
          <Badge variant="secondary">{transactions.length}</Badge>
        </div>

        <Separator />

        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Нет транзакций
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => {
              const config = TRANSACTION_CONFIG[transaction.type];
              const Icon = config.icon;
              const isPositive = transaction.amount > 0;

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div>
                      <p className="font-medium">
                        {transaction.description || 'Транзакция'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.createdAt), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`font-bold ${isPositive ? 'text-green-500' : 'text-red-500'
                      }`}
                  >
                    {isPositive ? '+' : ''}
                    {transaction.amount}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
