/**
 * SmartUploader Component
 * Direct-to-S3 upload with client-side compression and progress tracking
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { getPresignedUploadUrl } from '@/app/actions/upload';
import { Upload, X, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

/**
 * Configuration options for image compression
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 4,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: 'image/webp', // Convert to WebP for best compression
};

/**
 * Upload state type
 */
type UploadState = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

/**
 * Props for SmartUploader component
 */
export interface SmartUploaderProps {
  /**
   * Type of asset being uploaded (для отображения)
   */
  assetType: 'uploaded_model' | 'uploaded_garment';

  /**
   * Callback when upload succeeds
   * @param s3Key - S3 key of uploaded file (tmp/{userId}/...)
   * @param mimeType - MIME type of uploaded file
   */
  onUploadSuccess?: (s3Key: string, mimeType: string) => void;

  /**
   * Callback when upload fails
   */
  onUploadError?: (error: string) => void;

  /**
   * Label text for the uploader
   */
  label?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * SmartUploader - Handles file upload with compression and S3 integration
 */
export function SmartUploader({
  assetType,
  onUploadSuccess,
  onUploadError,
  label,
  className,
}: SmartUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  /**
   * Cleanup preview URL on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Handle file upload process
   */
  const handleUpload = useCallback(
    async (file: File) => {
      try {
        setUploadState('compressing');
        setUploadProgress(0);

        // Create preview
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);

        // 1. Client-side compression
        const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
        setUploadProgress(20);

        console.log(`Compressed: ${file.size} → ${compressedFile.size} bytes`);

        // 2. Request presigned URL
        setUploadState('uploading');
        const presignedResult = await getPresignedUploadUrl(
          compressedFile.type,
          compressedFile.size,
          assetType
        );

        if (!presignedResult.success) {
          throw new Error(presignedResult.error);
        }

        setUploadProgress(30);

        // 3. Upload to S3 with progress tracking
        await axios.put(presignedResult.url, compressedFile, {
          headers: {
            'Content-Type': compressedFile.type,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                30 + (progressEvent.loaded / progressEvent.total) * 60
              );
              setUploadProgress(percentCompleted);
            }
          },
        });

        // 4. Success!
        setUploadProgress(100);
        setUploadState('success');

        toast.success(`${assetType === 'uploaded_model' ? 'Model' : 'Garment'} uploaded successfully!`);

        // Call success callback with s3Key (НЕ создаём запись в БД!)
        if (onUploadSuccess) {
          onUploadSuccess(presignedResult.key, compressedFile.type);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setUploadState('error');
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed. Please try again.';
        toast.error(errorMessage);

        // Call error callback
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    },
    [assetType, onUploadSuccess, onUploadError]
  );

  /**
   * Setup dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: uploadState === 'compressing' || uploadState === 'uploading',
  });

  /**
   * Reset uploader
   */
  const handleReset = () => {
    // Revoke old preview URL before resetting
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setUploadState('idle');
    setUploadProgress(0);
    setPreviewUrl(null);
  };

  /**
   * Render upload UI based on state
   */
  const renderContent = () => {
    // Success state
    if (uploadState === 'success' && previewUrl) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden border-2 border-green-500">
            <Image
              src={previewUrl}
              alt="Uploaded preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-medium">Upload complete!</p>
          </div>
          <Button onClick={handleReset} variant="outline" size="sm">
            Upload Another
          </Button>
        </div>
      );
    }

    // Uploading state
    if (uploadState === 'compressing' || uploadState === 'uploading') {
      return (
        <div className="flex flex-col items-center gap-4 w-full">
          {previewUrl && (
            <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden border">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-cover opacity-50"
                unoptimized
              />
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">
              {uploadState === 'compressing' ? 'Compressing image...' : 'Uploading...'}
            </p>
          </div>
          <div className="w-full max-w-md">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {uploadProgress}%
            </p>
          </div>
        </div>
      );
    }

    // Error state
    if (uploadState === 'error') {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-sm text-destructive">Upload failed</p>
          <Button onClick={handleReset} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    // Idle state (default)
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div
          className={cn(
            'rounded-full bg-muted p-6 transition-colors',
            isDragActive && 'bg-primary/10'
          )}
        >
          {isDragActive ? (
            <Upload className="h-10 w-10 text-primary" />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="text-center">
          <p className="text-base font-medium">
            {isDragActive ? 'Drop image here' : label || 'Upload Image'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag & drop or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG, or WebP (max 10MB)
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card
      {...getRootProps()}
      className={cn(
        'relative cursor-pointer transition-colors border-2 border-dashed hover:border-primary/50',
        isDragActive && 'border-primary bg-primary/5',
        (uploadState === 'compressing' || uploadState === 'uploading') &&
        'cursor-not-allowed opacity-75',
        uploadState === 'success' && 'border-green-500 border-solid',
        className
      )}
    >
      <input {...getInputProps()} />
      {renderContent()}
    </Card>
  );
}
