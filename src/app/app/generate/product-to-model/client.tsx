'use client';

import { SingleUploaderWorkspace } from '@/components/product-to-model';
import { useRouter } from 'next/navigation';
import { useCredits } from '@/contexts/credits-context';

// ============================================
// CLIENT COMPONENT
// ============================================

export interface ProductToModelClientProps {
  userPlan: string;
}

export function ProductToModelClient({ userPlan }: ProductToModelClientProps) {
  const router = useRouter();
  const { credits } = useCredits();

  const handleTopUp = () => {
    router.push('/app/billing');
  };

  return (
    <div className="h-[calc(100vh-65px)]">
      <SingleUploaderWorkspace
        userCredits={credits}
        userPlan={userPlan}
        onTopUp={handleTopUp}
      />
    </div>
  );
}
