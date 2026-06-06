'use client';

import { useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '../shared/types';
import { MAX_FILE_SIZE, ACCEPTED_IMAGE_TYPES } from '../shared/constants';

interface ProductImageUploaderProps {
  productImage: UploadedFile | null;
  setProductImage: (file: UploadedFile | null) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  uploadAsset: (file: File, type: 'uploaded_model' | 'uploaded_garment') => Promise<{ s3Key: string; mimeType: string } | null>;
  disabled?: boolean;
  className?: string;
}

/**
 * Компонент загрузки изображения товара
 * Поддерживает drag & drop, отображает прогресс загрузки в S3
 */
export function ProductImageUploader({
  productImage,
  setProductImage,
  isUploading,
  setIsUploading,
  uploadAsset,
  disabled = false,
  className
}: ProductImageUploaderProps) {

  // Обработчик загрузки файла
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const preview = URL.createObjectURL(file);

      // Оптимистичный UI - сразу показываем превью
      setProductImage({ file, preview });
      setIsUploading(true);

      try {
        // Загрузка в S3 в фоне
        const asset = await uploadAsset(file, 'uploaded_garment');
        if (asset) {
          // Успех - обновляем с s3Key
          setProductImage({
            file,
            preview,
            s3Key: asset.s3Key,
            mimeType: asset.mimeType,
          });
        } else {
          // Ошибка - сбрасываем и показываем toast
          URL.revokeObjectURL(preview);
          setProductImage(null);
          toast.error('Не удалось загрузить изображение. Попробуйте ещё раз.');
        }
      } catch (error) {
        console.error('Ошибка загрузки:', error);
        URL.revokeObjectURL(preview);
        setProductImage(null);
        toast.error('Ошибка загрузки изображения. Проверьте подключение к интернету.');
      } finally {
        setIsUploading(false);
      }
    }
  }, [uploadAsset, setProductImage, setIsUploading]);

  // Cleanup blob URLs при unmount
  useEffect(() => {
    return () => {
      if (productImage?.preview) {
        URL.revokeObjectURL(productImage.preview);
      }
    };
  }, [productImage?.preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
    if (productImage?.preview) {
      URL.revokeObjectURL(productImage.preview);
    }
    setProductImage(null);
  };

  return (
    <motion.div
      layout
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className={cn("relative w-full aspect-[3/4]", className)}
    >
      <Card
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed transition-all cursor-pointer overflow-hidden w-full h-full",
          isDragActive && "border-primary bg-primary/5",
          !productImage && "hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />

        {/* Фоновое изображение для пустого состояния */}
        {!productImage && (
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/images/input/product-input.webp"
              fill
              className="object-cover opacity-60 dark:opacity-[.04] invert dark:invert-0 mix-blend-overlay dark:mix-blend-screen"
              alt="Заполнитель товара"
            />
          </div>
        )}

        {productImage ? (
          <div className="absolute inset-0 group z-10">
            <Image
              src={productImage.preview}
              alt="Товар"
              fill
              className="object-cover"
              unoptimized
            />

            {/* Индикатор загрузки */}
            {isUploading && (
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                <span className="text-xs text-white font-medium">Загрузка...</span>
              </div>
            )}

            {/* Галочка успешной загрузки */}
            {!isUploading && productImage.s3Key && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-white font-medium">Готово</span>
              </div>
            )}

            {/* Кнопка удаления при наведении */}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-12 z-10">
            {/* Промпт для загрузки */}
            <div className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-sm text-center">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                <p className="text-sm font-medium">Загрузите товар</p>
                <p className="text-xs text-muted-foreground">Нажмите или перетащите</p>
                <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP до 20МБ</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
