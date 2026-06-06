'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Upload,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface UploadedFile {
  file: File;
  preview: string;
  url?: string;
}

export interface ValidationError {
  type: 'warning' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ProductSmartUploaderProps {
  value: UploadedFile | null;
  onUpload: (file: File) => void | Promise<void>;
  onRemove: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isUploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
  errors?: ValidationError[];
  className?: string;
  emptyStateText?: string;
  emptyStateAction?: React.ReactNode;
}

// ============================================
// UTILITIES
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// COMPONENT
// ============================================

export function ProductSmartUploader({
  value,
  onUpload,
  onRemove,
  title,
  subtitle,
  icon: Icon = ImageIcon,
  isUploading = false,
  uploadProgress = 0,
  disabled = false,
  errors = [],
  className,
  emptyStateText = 'Сгенерируем автоматически',
  emptyStateAction,
}: ProductSmartUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && !disabled) {
        await onUpload(acceptedFiles[0]);
      }
    },
    [onUpload, disabled]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: disabled || isUploading,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const hasErrors = errors.some((e) => e.type === 'error');
  const hasWarnings = errors.some((e) => e.type === 'warning');

  return (
    <Card
      className={cn(
        'overflow-hidden border-2 transition-all',
        isDragActive && 'border-primary bg-primary/5',
        className
      )}
    >
      {/* Compact Header */}
      <div className="px-4 py-2.5 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold font-heading leading-tight">{title}</h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
              )}
            </div>
          </div>
          {value && !isUploading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={disabled}
              className="h-7 px-2 text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Удалить
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'relative aspect-[3/4] transition-all cursor-pointer',
          !value && !isDragActive && 'hover:bg-muted/30',
          (disabled || isUploading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isUploading ? (
            // Uploading State
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm p-6"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium mb-2">Загрузка...</p>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs space-y-1.5">
                  <Progress value={uploadProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-center font-heading">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
            </motion.div>
          ) : value ? (
            // Preview State
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full group"
            >
              {/* Image Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.preview}
                alt={title}
                className="w-full h-full object-cover"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Заменить
                </Button>
              </div>

              {/* Validation Badges */}
              {(hasErrors || hasWarnings) && (
                <div className="absolute top-2 left-2 right-2 flex flex-col gap-1.5">
                  {errors.map((error, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1 text-xs px-2 py-0.5 shadow-sm backdrop-blur-sm flex-1',
                          error.type === 'error' &&
                          'bg-red-50/95 border-red-200 text-red-700',
                          error.type === 'warning' &&
                          'bg-amber-50/95 border-amber-200 text-amber-700'
                        )}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span className="flex-1">{error.message}</span>
                      </Badge>
                      {error.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs bg-white/95 backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            error.action?.onClick();
                          }}
                        >
                          {error.action.label}
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* File Size Badge */}
              {!hasErrors && (
                <div className="absolute bottom-2 right-2">
                  <Badge
                    variant="outline"
                    className="bg-green-50/95 border-green-200 text-green-700 gap-1 text-xs backdrop-blur-sm shadow-sm"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {formatFileSize(value.file.size)}
                  </Badge>
                </div>
              )}
            </motion.div>
          ) : (
            // Empty State
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-muted/80 flex items-center justify-center mb-3">
                <Icon className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {emptyStateText}
              </p>
              {emptyStateAction || (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Upload className="w-3 h-3" />
                  <span>Перетащите или нажмите</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
