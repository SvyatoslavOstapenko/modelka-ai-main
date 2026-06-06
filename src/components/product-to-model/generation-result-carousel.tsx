'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface GenerationResultCarouselProps {
  images: string[];
  onReset?: () => void;
}

export function GenerationResultCarousel({
  images,
  onReset,
}: GenerationResultCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `modelka-ai-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 space-y-6"
    >
      {/* Main Image Display */}
      <div className="relative w-full">
        <div className="relative aspect-[3/4] w-full max-w-2xl mx-auto bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedIndex}
              src={images[selectedIndex]}
              alt={`Результат ${selectedIndex + 1}`}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>

          {/* Download Icon Overlay */}
          <button
            onClick={() => handleDownload(images[selectedIndex], selectedIndex)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors group"
            aria-label="Скачать изображение"
          >
            <Download className="w-5 h-5 text-gray-900 dark:text-gray-100 group-hover:scale-110 transition-transform" />
          </button>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors"
                aria-label="Предыдущее изображение"
              >
                <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-gray-100" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors"
                aria-label="Следующее изображение"
              >
                <ChevronRight className="w-6 h-6 text-gray-900 dark:text-gray-100" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex gap-3 justify-center min-w-min px-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden transition-all",
                  selectedIndex === index
                    ? "ring-4 ring-primary shadow-lg scale-110"
                    : "ring-2 ring-gray-300 dark:ring-gray-700 hover:ring-primary/50 opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={image}
                  alt={`Превью ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 w-full max-w-2xl justify-center">
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="flex-1 min-w-[200px] h-12 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Создать еще
        </Button>
        <Button
          asChild
          size="lg"
          className="flex-1 min-w-[200px] h-12 gradient-primary text-white"
        >
          <Link href="/app/generate/edit">
            <Edit className="w-4 h-4 mr-2" />
            Изменить
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
