/**
 * Gallery Page - History of Virtual Try-Ons
 *
 * @route /gallery
 */

import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { NameModalWrapper } from '@/components/auth/name-modal-wrapper';
import { getGalleryAction } from '@/app/actions/gallery';
import { GalleryGrid } from '@/components/gallery/gallery-grid';
import { GalleryEmptyState } from '@/components/gallery/gallery-empty-state';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: 'Gallery | Modelka AI',
  description: 'Your virtual try-on history',
};

// ============================================
// PAGE COMPONENT
// ============================================

export default async function GalleryPage() {
  const result = await getGalleryAction(50);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container max-w-7xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight mb-2">
            Gallery
          </h1>
          <p className="text-muted-foreground">Your virtual try-on history</p>
        </div>

        {/* Error State */}
        {!result.success && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{result.error || 'Error loading gallery'}</p>
            <Link href="/app" className="text-primary hover:underline mt-4 inline-block">
              Back to Try-On
            </Link>
          </Card>
        )}

        {/* Empty State */}
        {result.success && result.gallery.length === 0 && <GalleryEmptyState />}

        {/* Gallery Grid */}
        {result.success && result.gallery.length > 0 && <GalleryGrid items={result.gallery} />}
      </main>

      <NameModalWrapper />

      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>&copy; 2025 Modelka AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
