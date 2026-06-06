'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, ImageIcon, ArrowRight } from 'lucide-react';

export function GalleryEmptyState() {
  return (
    <Card className="p-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto"
      >
        {/* Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* Ghost-like placeholder shapes */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-200" />
            <div className="absolute top-4 left-1/4 -translate-x-1/2 w-16 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 -rotate-6" />
            <div className="absolute top-4 right-1/4 translate-x-1/2 w-16 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 rotate-6" />
          </motion.div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <ImageIcon className="w-7 h-7 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Text */}
        <h3 className="text-xl font-semibold font-heading mb-2">No try-ons yet</h3>
        <p className="text-muted-foreground mb-8">
          Create your first virtual try-on and it will appear here in your gallery.
        </p>

        {/* CTA */}
        <Link href="/app">
          <Button size="lg" className="gap-2 gradient-primary hover:opacity-90 transition-opacity">
            <Sparkles className="w-4 h-4" />
            Create Your First Try-On
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </Card>
  );
}
