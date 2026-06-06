import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppHeader } from '@/components/layout/app-header';
import { CreditsProvider } from '@/contexts/credits-context';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: {
    default: 'Приложение | Modelka AI',
    template: '%s | Modelka AI',
  },
  description: 'Виртуальная примерка и AI генерация изображений моделей',
};

// ============================================
// LAYOUT
// ============================================

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Protect all /app routes - redirect to landing if not authenticated
  if (!session?.user) {
    redirect('/');
  }

  // Fetch user credits from database
  let credits = 0;
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        credits: true,
      },
    });
    credits = user?.credits || 0;
  } catch (error) {
    console.error('Failed to fetch user credits:', error);
  }

  return (
    <CreditsProvider initialCredits={credits}>
      <div className="dark min-h-screen bg-slate-950 flex flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </CreditsProvider>
  );
}

