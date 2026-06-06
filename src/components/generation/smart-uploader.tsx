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
  url?: string; // For S3 uploaded files
}

export interface ValidationError {
  type: 'warning' | 'error';
  message: string;
}

export interface SmartUploaderProps {
  /**
   * Current uploaded file
   */
  value: UploadedFile | null;

  /**
   * Callback when file is uploaded
   */
  onUpload: (file: File) => void | Promise<void>;

  /**
   * Callback when file is removed
   */
  onRemove: () => void;

  /**
   * Title of the uploader
   */
  title: string;

  /**
   * Description/hint text
   */
  description?: string;

  /**
   * Icon component to display
   */
  icon?: React.ComponentType<{ className?: string }>;

  /**
   * Aspect ratio of the preview (e.g., "3/4", "16/9", "1/1")
   */
  aspectRatio?: string;

  /**
   * Maximum file size in bytes
   * @default 10MB
   */
  maxSize?: number;

  /**
   * Accepted file types
   * @default ['image/png', 'image/jpeg', 'image/webp']
   */
  accept?: Record<string, string[]>;

  /**
   * Whether upload is in progress
   */
  isUploading?: boolean;

  /**
   * Upload progress (0-100)
   */
  uploadProgress?: number;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Validation errors to display
   */
  errors?: ValidationError[];

  /**
   * Custom className
   */
  className?: string;

  /**
   * Show file size in badge
   */
  showFileSize?: boolean;

  /**
   * Additional content to render below the uploader
   */
  children?: React.ReactNode;
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

export function SmartUploader({
  value,
  onUpload,
  onRemove,
  title,
  description = 'Перетащите или нажмите для загрузки',
  icon: Icon = ImageIcon,
  aspectRatio = '3/4',
  maxSize = 20 * 1024 * 1024, // 20MB
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
  isUploading = false,
  uploadProgress = 0,
  disabled = false,
  errors = [],
  className,
  showFileSize = true,
  children,
}: SmartUploaderProps) {
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
    accept,
    maxFiles: 1,
    maxSize,
    disabled: disabled || isUploading,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const hasErrors = errors.some((e) => e.type === 'error');
  const hasWarnings = errors.some((e) => e.type === 'warning');

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold font-heading">{title}</h3>
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
            >
              <X className="w-4 h-4 mr-1" />
              Удалить
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          'relative transition-all duration-300 cursor-pointer',
          aspectRatio === '3/4' && 'aspect-[3/4]',
          aspectRatio === '16/9' && 'aspect-video',
          aspectRatio === '1/1' && 'aspect-square',
          isDragActive && 'ring-2 ring-primary ring-inset bg-primary/5',
          !value && !isDragActive && 'hover:bg-muted/50',
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-6"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium mb-2">Загрузка...</p>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
            </motion.div>
          ) : value ? (
            // Preview State
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger file dialog
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Заменить
                </Button>
              </div>

              {/* Validation Badges */}
              {(hasErrors || hasWarnings || showFileSize) && (
                <div className="absolute top-3 left-3 right-3 flex flex-col gap-2">
                  {errors.map((error, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1.5',
                          error.type === 'error' &&
                          'bg-red-50 border-red-200 text-red-700',
                          error.type === 'warning' &&
                          'bg-amber-50 border-amber-200 text-amber-700'
                        )}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {error.message}
                      </Badge>
                    </motion.div>
                  ))}

                  {!hasErrors && showFileSize && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 border-green-200 text-green-700 gap-1.5 self-start"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formatFileSize(value.file.size)}
                    </Badge>
                  )}
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
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-muted-foreground/25 m-4 rounded-xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {isDragActive ? 'Отпустите изображение' : 'Перетащите или нажмите'}
              </p>
              <p className="text-xs text-muted-foreground mb-4">{description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="w-3.5 h-3.5" />
                <span>PNG, JPG, WebP до {formatFileSize(maxSize)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Additional Content */}
      {children && <div className="p-4 border-t bg-muted/20">{children}</div>}
    </Card>
  );
}
