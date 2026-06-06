'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SellerLockTooltip } from '@/components/ui/seller-lock-tooltip';
import { ModelGenerationPopover } from '../model-generation-popover';
import { MAX_FILE_SIZE, ACCEPTED_IMAGE_TYPES } from '../shared/constants';

interface ModelImageUploaderProps {
  modelImage: File | null;
  setModelImage: (file: File | null) => void;
  setModelPrompt: (prompt: string) => void;
  onOpenModelSelection: () => void;
  hasSellerAccess: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Компонент загрузки изображения модели
 * Поддерживает ручную загрузку, AI генерацию и выбор из истории
 */
export function ModelImageUploader({
  modelImage,
  setModelImage,
  setModelPrompt,
  onOpenModelSelection,
  hasSellerAccess,
  disabled = false,
  className
}: ModelImageUploaderProps) {
  const [isModelGenerationOpen, setIsModelGenerationOpen] = useState(false);

  // Обработчик загрузки файла
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setModelImage(file);
    }
  }, [setModelImage]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(file => {
        if (file.errors.some(e => e.code === 'file-too-large')) {
          toast.error('Файл слишком большой', {
            description: 'Максимальный размер файла — 20МБ'
          });
        } else if (file.errors.some(e => e.code === 'file-invalid-type')) {
          toast.error('Неподдерживаемый формат', {
            description: 'Поддерживаются: PNG, JPG, WebP'
          });
        }
      });
    },
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModelImage(null);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, width: 0 }}
      animate={{ opacity: 1, x: 0, width: "100%" }}
      exit={{ opacity: 0, x: 20, width: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className={cn("flex flex-col gap-4 overflow-hidden w-full md:flex-1 aspect-[3/4]", className)}
    >
      <Card
        {...getRootProps()}
        onClick={open}
        className={cn(
          "relative border-2 border-dashed transition-all cursor-pointer overflow-hidden flex-1 flex items-center justify-center w-full h-full",
          isDragActive && "border-primary bg-primary/5",
          !modelImage && "hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />

        {/* Фоновое изображение */}
        {!modelImage && (
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/images/input/model-input.webp"
              fill
              className="object-cover opacity-60 dark:opacity-[.04] invert dark:invert-0 mix-blend-overlay dark:mix-blend-screen"
              alt="Заполнитель модели"
            />
          </div>
        )}

        {/* Содержимое модели */}
        {modelImage ? (
          <div className="absolute inset-0 group z-10">
            <Image
              src={URL.createObjectURL(modelImage)}
              alt="Модель"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-sm text-center">
              <div className="flex flex-col items-center gap-2">
                <User className="w-8 h-8 text-muted-foreground mb-1" />
                <p className="text-sm font-medium">Загрузите модель</p>
                <p className="text-xs text-muted-foreground">Нажмите или перетащите</p>
                <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP до 20МБ</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Контейнер кнопок действий и поповера */}
      <div className="relative">
        {/* Поповер появляется над кнопками */}
        <AnimatePresence>
          {isModelGenerationOpen && (
            <ModelGenerationPopover
              isOpen={isModelGenerationOpen}
              onClose={() => setIsModelGenerationOpen(false)}
              onGenerate={(prompt) => {
                setModelPrompt(prompt);
                setIsModelGenerationOpen(false);
              }}
              className="mb-2"
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row gap-3">
          <SellerLockTooltip showTooltip={!hasSellerAccess}>
            <Button
              className="flex-1 h-12 md:h-11 gradient-primary text-white font-medium shadow-lg shadow-primary/20 w-full"
              onClick={() => hasSellerAccess && setIsModelGenerationOpen(!isModelGenerationOpen)}
              disabled={!hasSellerAccess}
            >
              {hasSellerAccess ? (
                <Sparkles className="w-5 h-5 md:w-4 md:h-4 mr-2" />
              ) : (
                <Lock className="w-5 h-5 md:w-4 md:h-4 mr-2" />
              )}
              Сгенерировать AI модель
            </Button>
          </SellerLockTooltip>
          <Button
            variant="outline"
            className="flex-1 h-12 md:h-11 bg-background hover:bg-muted text-foreground"
            onClick={onOpenModelSelection}
          >
            <User className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Мои модели
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
