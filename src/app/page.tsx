'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthModal } from '@/components/auth/auth-modal';
import {
  LandingHeader,
  HeroSection,
  BentoGrid,
  HowItWorks,
  ExamplesGallery,
  CaseStudies,
  PricingTable,
  FAQSection,
  LandingFooter,
} from '@/components/landing';

// ============================================
// LANDING PAGE - MODELKA AI
// ============================================

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isAuthenticated = status === 'authenticated';

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/app');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <LandingHeader onOpenAuthModal={() => setShowAuthModal(true)} />

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <HeroSection onGetStarted={handleGetStarted} />

      {/* ============================================ */}
      {/* BENTO GRID (FEATURES) */}
      {/* ============================================ */}
      <div id="features">
        <BentoGrid />
      </div>

      {/* ============================================ */}
      {/* HOW IT WORKS */}
      {/* ============================================ */}
      <HowItWorks />

      {/* ============================================ */}
      {/* EXAMPLES GALLERY */}
      {/* ============================================ */}
      <ExamplesGallery />

      {/* ============================================ */}
      {/* PRICING (Dark Theme) */}
      {/* ============================================ */}
      <PricingTable onGetStarted={handleGetStarted} />

      {/* ============================================ */}
      {/* CASE STUDIES */}
      {/* ============================================ */}
      <CaseStudies />

      {/* ============================================ */}
      {/* FAQ */}
      {/* ============================================ */}
      <FAQSection />

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <LandingFooter onGetStarted={handleGetStarted} />

      {/* ============================================ */}
      {/* AUTH MODAL */}
      {/* ============================================ */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
