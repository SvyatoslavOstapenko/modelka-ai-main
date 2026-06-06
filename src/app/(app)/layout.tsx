import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppHeader } from '@/components/layout/app-header';

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
