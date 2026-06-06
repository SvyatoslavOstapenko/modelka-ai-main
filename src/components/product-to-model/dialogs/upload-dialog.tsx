'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// ТИПЫ
// ============================================

export interface UploadDialogProps {
  /** Открыт ли диалог */
  open: boolean;
  /** Коллбэк изменения состояния открытия */
  onOpenChange: (open: boolean) => void;
  /** Заголовок диалога */
  title: string;
  /** Описание */
  description: string;
  /** Коллбэк при загрузке файла */
  onUpload: (file: File) => void | Promise<void>;
  /** Текущее состояние загрузки */
  isUploading?: boolean;
  /** Текущий загруженный файл (для отображения) */
  currentFile?: File | null;
  /** Коллбэк при удалении текущего файла */
  onRemove?: () => void;
}

// ============================================
// КОМПОНЕНТ
// ============================================

/**
 * Универсальный диалог загрузки файла
 *
 * Используется для Face Reference, Image Prompt, Background Reference
 */
export function UploadDialog({
  open,
  onOpenChange,
  title,
  description,
  onUpload,
  isUploading = false,
  currentFile = null,
  onRemove,
}: UploadDialogProps) {
  // Локальное состояние превью
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Показываем preview
  const displayPreview = preview || (currentFile ? URL.createObjectURL(currentFile) : null);

  // Обработчик drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: isUploading,
  });

  // Обработчик удаления
  const handleRemove = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);

    // Если удаляем уже загруженный файл
    if (currentFile && onRemove) {
      onRemove();
      onOpenChange(false);
    }
  }, [preview, currentFile, onRemove, onOpenChange]);

  // Обработчик применения
  const handleApply = useCallback(async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      handleRemove();
      onOpenChange(false);
    }
  }, [selectedFile, onUpload, handleRemove, onOpenChange]);

  // Cleanup при закрытии - только для нового выбранного файла
  const handleClose = useCallback(() => {
    // Очищаем только локально выбранный файл, но НЕ текущий загруженный
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    onOpenChange(false);
  }, [preview, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Область загрузки */}
        <div className="py-4">
          <div
            {...getRootProps()}
            className={cn(
              "relative aspect-square border-2 border-dashed rounded-lg transition-all cursor-pointer overflow-hidden",
              isDragActive && "border-primary bg-primary/5",
              !displayPreview && "hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-white/90"
                >
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </motion.div>
              ) : displayPreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative w-full h-full group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayPreview}
                    alt="Превью"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {currentFile && !selectedFile ? 'Удалить' : 'Убрать'}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Перетащите изображение сюда
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">или</p>
                  <Button variant="outline" size="sm" type="button">
                    <Upload className="w-4 h-4 mr-2" />
                    Выбрать файл
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              {currentFile && !selectedFile && onRemove && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onRemove();
                    onOpenChange(false);
                  }}
                  disabled={isUploading}
                  size="sm"
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                >
                  <X className="w-4 h-4 mr-2" />
                  Убрать
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Отмена
              </Button>
              {selectedFile && (
                <Button
                  onClick={handleApply}
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    'Применить'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
