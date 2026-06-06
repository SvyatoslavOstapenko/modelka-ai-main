/**
 * Profile Page - Профиль пользователя
 *
 * Отображает информацию о пользователе, баланс токенов, статистику
 *
 * @route /app/profile
 */

import { auth } from '@/auth';
import { db } from '@/db';
import { users, generations, transactions } from '@/db/schema';
import { eq, sum, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  // Fetch user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    redirect('/');
  }

  // Fetch statistics
  const allGenerations = await db.query.generations.findMany({
    where: eq(generations.userId, session.user.id),
    columns: { status: true },
  });

  const generationStats = {
    total: allGenerations.length,
    completed: allGenerations.filter(g => g.status === 'COMPLETED').length,
  };

  const [transactionStats] = await db
    .select({
      totalSpent: sum(transactions.amount),
    })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id));

  // Fetch recent transactions
  const recentTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, session.user.id),
    orderBy: [desc(transactions.createdAt)],
    limit: 10,
  });

  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    planCode: user.planCode,
    createdAt: user.createdAt.toISOString(),
  };

  const stats = {
    totalGenerations: Number(generationStats?.total || 0),
    completedGenerations: Number(generationStats?.completed || 0),
    totalSpent: Math.abs(Number(transactionStats?.totalSpent || 0)),
  };

  const formattedTransactions = recentTransactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    createdAt: tx.createdAt.toISOString(),
    description: tx.description,
  }));

  return (
    <ProfileClient
      user={userData}
      stats={stats}
      transactions={formattedTransactions}
    />
  );
}
