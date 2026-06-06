/**
 * Hook для загрузки файлов как assets в S3
 *
 * Используется для загрузки изображений перед отправкой на генерацию
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface UploadedAsset {
  s3Key: string;
  mimeType: string;
  preview: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseAssetUploadReturn {
  /**
   * Upload file to S3 (tmp/ folder, no DB record)
   */
  uploadAsset: (file: File, type: 'uploaded_model' | 'uploaded_garment') => Promise<UploadedAsset | null>;

  /**
   * Current upload progress
   */
  progress: UploadProgress | null;

  /**
   * Whether upload is in progress
   */
  isUploading: boolean;

  /**
   * Upload error message
   */
  error: string | null;

  /**
   * Reset upload state
   */
  reset: () => void;
}

// ============================================
// HOOK
// ============================================

export function useAssetUpload(): UseAssetUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadAsset = useCallback(
    async (
      file: File,
      type: 'uploaded_model' | 'uploaded_garment'
    ): Promise<UploadedAsset | null> => {
      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      try {
        // 1. Get presigned upload URL
        const presignedResponse = await fetch('/api/assets/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            assetType: type,
          }),
        });

        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.json();
          throw new Error(errorData.error || 'Не удалось получить ссылку для загрузки');
        }

        const { presignedUrl, s3Key } = await presignedResponse.json();

        // 2. Upload file to S3 using presigned URL
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Не удалось загрузить файл в хранилище');
        }

        // 3. Create preview URL
        const preview = URL.createObjectURL(file);

        setProgress({ loaded: file.size, total: file.size, percentage: 100 });

        return {
          s3Key,
          mimeType: file.type,
          preview,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка загрузки файла';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    uploadAsset,
    progress,
    isUploading,
    error,
    reset,
  };
}
