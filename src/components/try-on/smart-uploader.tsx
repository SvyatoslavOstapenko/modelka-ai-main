/**
 * SmartUploader - Умный загрузчик изображений в S3
 *
 * Функции:
 * - Drag & Drop или выбор файла
 * - Автоматическое сжатие изображений > 5MB в WebP (quality 0.9)
 * - Прямая загрузка в S3 через Presigned URL
 * - Прогресс-бар загрузки
 * - Превью изображения
 * - Обработка ошибок с возможностью повтора
 *
 * @module components/try-on/smart-uploader
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { getPresignedUploadUrl } from '@/app/actions/upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ============================================
// КОНСТАНТЫ
// ============================================

const MAX_SIZE_FOR_COMPRESSION = 5 * 1024 * 1024; // 5MB
const COMPRESSION_OPTIONS = {
  maxSizeMB: 5,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.9,
} as const;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ============================================
// TYPES
// ============================================

type UploadState = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

interface SmartUploaderProps {
  /**
   * Тип asset (uploaded_model или uploaded_garment)
   */
  assetType: 'uploaded_model' | 'uploaded_garment';

  /**
   * Заголовок компонента
   */
  label: string;

  /**
   * Описание/подсказка
   */
  description?: string;

  /**
   * Callback при успешной загрузке
   */
  onUploadComplete: (data: { s3Key: string; previewUrl: string }) => void;

  /**
   * Callback при сбросе
   */
  onReset?: () => void;

  /**
   * Значение ошибки валидации (из React Hook Form)
   */
  error?: string;

  /**
   * Дизейблить компонент
   */
  disabled?: boolean;
}

// ============================================
// КОМПОНЕНТ
// ============================================

export function SmartUploader({
  assetType,
  label,
  description,
  onUploadComplete,
  onReset,
  error,
  disabled,
}: SmartUploaderProps) {
  // ========================================
  // STATE
  // ========================================

  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Обработка выбранного файла
   */
  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      // Валидация типа файла
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrorMessage('Неподдерживаемый формат. Используйте JPEG, PNG или WebP');
        setState('error');
        return;
      }

      try {
        setState('compressing');
        setProgress(10);
        setErrorMessage(null);

        // Шаг 1: Сжатие если файл большой
        let processedFile: File = file;

        if (file.size > MAX_SIZE_FOR_COMPRESSION) {
          console.log(
            `[SmartUploader] Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
          );

          processedFile = await imageCompression(file, COMPRESSION_OPTIONS);

          console.log(
            `[SmartUploader] Compressed to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`
          );
        }

        setProgress(30);

        // Шаг 2: Получение Presigned URL
        const presignedResult = await getPresignedUploadUrl(
          processedFile.type,
          processedFile.size,
          assetType
        );

        if (!presignedResult.success) {
          throw new Error(presignedResult.error);
        }

        setProgress(40);

        // Шаг 3: Загрузка в S3
        setState('uploading');

        const xhr = new XMLHttpRequest();

        // Отслеживание прогресса загрузки
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round(40 + (e.loaded / e.total) * 50); // 40-90%
            setProgress(percentComplete);
          }
        });

        // Promise-обертка для XMLHttpRequest
        await new Promise<void>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
          });

          xhr.open('PUT', presignedResult.url);
          xhr.setRequestHeader('Content-Type', processedFile.type);
          xhr.send(processedFile);
        });

        setProgress(100);

        // Шаг 4: Создание preview URL
        const objectUrl = URL.createObjectURL(processedFile);
        setPreviewUrl(objectUrl);

        // Шаг 5: Уведомление родителя
        onUploadComplete({
          s3Key: presignedResult.key,
          previewUrl: presignedResult.publicUrl,
        });

        setState('success');
      } catch (err) {
        console.error('[SmartUploader] Upload error:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Ошибка загрузки');
        setState('error');
        setProgress(0);
      }
    },
    [assetType, disabled, onUploadComplete]
  );

  /**
   * Обработка клика на инпут
   */
  const handleClick = useCallback(() => {
    if (disabled || state === 'uploading' || state === 'compressing') return;
    fileInputRef.current?.click();
  }, [disabled, state]);

  /**
   * Обработка выбора файла через input
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  /**
   * Drag & Drop handlers
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || state === 'uploading' || state === 'compressing') return;
      setIsDragOver(true);
    },
    [disabled, state]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || state === 'uploading' || state === 'compressing') return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, state, handleFile]
  );

  /**
   * Сброс компонента
   */
  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setPreviewUrl(null);
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onReset?.();
  }, [onReset]);

  /**
   * Повторить загрузку
   */
  const handleRetry = useCallback(() => {
    handleReset();
    handleClick();
  }, [handleReset, handleClick]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-2">
      {/* Label */}
      <div>
        <label className="text-sm font-medium">{label}</label>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>

      {/* Скрытый input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      <Card
        className={cn(
          'relative overflow-hidden transition-all',
          isDragOver && 'ring-2 ring-primary',
          error && 'border-destructive',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* SUCCESS: Preview */}
        {state === 'success' && previewUrl && (
          <div className="relative aspect-video bg-muted">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized // Используем object URL
            />

            {/* Overlay с кнопкой удаления */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReset}
                disabled={disabled}
              >
                <X className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            </div>

            {/* Success badge */}
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Загружено
            </div>
          </div>
        )}

        {/* UPLOADING / COMPRESSING: Progress */}
        {(state === 'uploading' || state === 'compressing') && (
          <div className="p-8 space-y-4">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="mt-4 text-sm font-medium">
                {state === 'compressing' ? 'Сжатие изображения...' : 'Загрузка...'}
              </p>
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>

            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* ERROR: Show error message */}
        {state === 'error' && (
          <div className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Ошибка загрузки</p>
              <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
            </div>

            <Button size="sm" variant="outline" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Попробовать снова
            </Button>
          </div>
        )}

        {/* IDLE: Drop zone */}
        {state === 'idle' && (
          <div
            className="p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleClick}
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">
              Нажмите или перетащите изображение
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG или WebP до 10MB
            </p>
          </div>
        )}
      </Card>

      {/* External Error (from React Hook Form) */}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
